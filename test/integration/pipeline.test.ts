import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveArtifact } from '../../src/artifacts/resolve.js';
import { openDb } from '../../src/db/db.js';
import { JobRepo } from '../../src/jobs/repo.js';
import { loadPolicyFile } from '../../src/policies/load.js';
import { newSalt, policyCommitment } from '../../src/policies/commit.js';
import { loadProfile } from '../../runner/harness/run.js';
import { verifyEnvelope } from '../../src/reports/verify.js';
import { issuerFromSeed } from '../../src/reports/sign.js';
import { processJob, runWorkerOnce } from '../../worker/pipeline.js';
import type { Config } from '../../src/config.js';

const ROOT = join(import.meta.dirname, '..', '..');
let docker = true; try { execFileSync('docker', ['info'], { stdio: 'ignore' }); } catch { docker = false; }
const SEED = 'cd'.repeat(32);

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 's402pipe-'));
  const config: Config = { dataDir: dir, dbPath: join(dir, 'db.sqlite'), subjectId: 'subj', issuerId: 'iss', issuerSeedHex: SEED, trustedIssuers: ['iss'], profilePath: join(ROOT, 'runner/profiles/no-network-v1.json') };
  const repo = new JobRepo(openDb(config.dbPath));
  const policy = loadPolicyFile(join(ROOT, 'config/policies/research-agent.yaml')); const salt = newSalt();
  repo.upsertPolicy({ policyId: 'research-agent@1', name: policy.name, version: 1, policy, salt, commitment: policyCommitment(policy, salt) });
  const { profile, profileHash } = loadProfile(config.profilePath);
  const enqueue = (fixture: string, auditId: string) => { const a = resolveArtifact(join(ROOT, fixture)); repo.insertArtifact(a); repo.createJob({ auditId, artifactHash: a.artifactHash, policyId: 'research-agent@1', subjectId: 'subj', profileId: profile.profileId, profileHash }); };
  return { config, repo, enqueue };
}

describe.skipIf(!docker)('pipeline', () => {
  it('clean → ALLOW, blocked → BLOCK with RUNTIME evidence, both signed and verifiable', async () => {
    const { config, repo, enqueue } = setup();
    enqueue('fixtures/clean-price-tool', 'a_clean'); enqueue('fixtures/credential-attempt', 'a_blocked');
    while (await runWorkerOnce({ repo, config, owner: 'w' })) { /* drain */ }
    const clean = repo.getCapsuleByAudit('a_clean')!.capsule as any; const blocked = repo.getCapsuleByAudit('a_blocked')!.capsule as any;
    expect(clean.decision).toBe('ALLOW'); expect(clean.expiresAt).toBeGreaterThan(clean.issuedAt);
    expect(blocked.decision).toBe('BLOCK'); expect(blocked.reasonCodes).toEqual(expect.arrayContaining(['CREDENTIAL_ACCESS_OBSERVED', 'UNDECLARED_FILE_ACCESS']));
    const env = repo.getReportByAudit('a_blocked')!.envelope as any;
    expect(env.report.declaredVsObserved.find((r: any) => r.capability === 'FILESYSTEM').undeclared).toContain('/home/tool/.aws/credentials');
    expect(env.report.findings.some((f: any) => f.sourceType === 'STATIC')).toBe(true);
    expect(verifyEnvelope(env, { iss: issuerFromSeed(SEED).publicKeyHex }, Math.floor(Date.now() / 1000)).ok).toBe(true);
    expect(repo.getJob('a_clean')!.status).toBe('COMPLETED');
  });
  it('collector failure → REVIEW, never ALLOW', async () => {
    const { config, repo, enqueue } = setup(); enqueue('fixtures/clean-price-tool', 'a_nocol');
    const job = repo.claimNext('w')!; await processJob({ repo, config, owner: 'w', straceBin: '/nonexistent/strace' }, job);
    const cap = repo.getCapsuleByAudit('a_nocol')!.capsule as any;
    expect(cap.decision).toBe('REVIEW'); expect(cap.reasonCodes).toContain('COLLECTOR_FAILURE'); expect(cap.expiresAt).toBeNull();
  });
  it('a job interrupted mid-stage is recovered after restart with the same auditId', async () => {
    const { config, repo, enqueue } = setup(); enqueue('fixtures/clean-price-tool', 'a_restart');
    const job = repo.claimNext('w-crashed', 1000)!; repo.transition(job.audit_id, 'SCANNING'); // simulate crash after claiming
    const repo2 = new JobRepo(openDb(config.dbPath));
    expect(repo2.sweepExpiredLeases(Math.floor(Date.now() / 1000))).toBe(1);
    expect(repo2.getJob('a_restart')!.status).toBe('QUEUED');
    while (await runWorkerOnce({ repo: repo2, config, owner: 'w-new' })) { /* drain */ }
    expect(repo2.getJob('a_restart')!.status).toBe('COMPLETED'); expect(repo2.getJob('a_restart')!.attempts).toBe(2);
    const repo3 = new JobRepo(openDb(config.dbPath));
    expect((repo3.getCapsuleByAudit('a_restart')!.capsule as any).decision).toBe('ALLOW');
  });
});
