import { randomBytes } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { hostname } from 'node:os';
import { resolveArtifact, ArtifactError } from '../../src/artifacts/resolve.js';
import { loadConfig } from '../../src/config.js';
import { openDb } from '../../src/db/db.js';
import { JobRepo } from '../../src/jobs/repo.js';
import { loadPolicyFile } from '../../src/policies/load.js';
import { newSalt, policyCommitment } from '../../src/policies/commit.js';
import { PolicyError } from '../../src/schemas/policy.js';
import { loadProfile } from '../../runner/harness/run.js';
import { DependencyUnavailable } from '../../runner/harness/docker.js';
import { processJob } from '../../worker/pipeline.js';

// Exit codes: 0 ALLOW, 2 BLOCK, 3 REVIEW, 5 the audit could not be completed
// (missing dependency such as Docker, or any other FAILED job), 6 bad input.
const args = process.argv.slice(2);
const json = args.includes('--json');
const policyIdx = args.indexOf('--policy');
const policyPath = policyIdx >= 0 ? args[policyIdx + 1]! : 'config/policies/research-agent.yaml';
const fixture = args.find((a) => !a.startsWith('--') && a !== policyPath);
const log = (m: string) => console.error(m);
// Explicitly typed so TypeScript treats a call as unreachable-after (never) and narrows `fixture`.
const exit: (code: number, out: unknown) => never = (code, out) => { if (json) console.log(JSON.stringify(out, null, 2)); process.exit(code); };
if (!fixture) exit(6, { error: 'usage: local-audit <fixture-dir> [--policy file] [--json]' });

try {
  const config = loadConfig();
  const repo = new JobRepo(openDb(config.dbPath));
  const artifact = resolveArtifact(resolve(fixture)); repo.insertArtifact(artifact);
  const policy = loadPolicyFile(resolve(policyPath));
  const policyId = `${policy.name}@1`;
  if (!repo.getPolicy(policyId)) { const salt = newSalt(); repo.upsertPolicy({ policyId, name: policy.name, version: 1, policy, salt, commitment: policyCommitment(policy, salt) }); }
  const { profile, profileHash } = loadProfile(config.profilePath);
  const auditId = `audit_${randomBytes(6).toString('hex')}`;
  repo.createJob({ auditId, artifactHash: artifact.artifactHash, policyId, subjectId: config.subjectId, profileId: profile.profileId, profileHash });
  log(`[local-audit] ${basename(fixture)} artifact=${artifact.artifactHash.slice(0, 23)}… audit=${auditId}`);
  const job = repo.claimNext(`${hostname()}-${process.pid}`)!;
  await processJob({ repo, config, owner: job.lease_owner! }, job);
  const final = repo.getJob(auditId)!; const cap = repo.getCapsuleByAudit(auditId); const rep = repo.getReportByAudit(auditId);
  const capsule = cap?.capsule as { decision: string; reasonCodes: string[] } | undefined;
  const out = { auditId, status: final.status, decision: capsule?.decision ?? null, reasonCodes: capsule?.reasonCodes ?? [], reportId: rep?.reportId ?? null, artifactHash: artifact.artifactHash, lastError: final.last_error, confidentialExecutionMode: 'LOCAL' };
  if (!json) { log(`status=${out.status} decision=${out.decision} reasons=${out.reasonCodes.join(',')} report=${out.reportId}`); if (out.lastError) log(`error: ${out.lastError}`); }
  if (final.status !== 'COMPLETED') {
    // Same exit code either way — the audit produced no decision — but say which it was.
    const dependency = /docker|dependency/i.test(final.last_error ?? '');
    log(`[local-audit] ${dependency ? 'dependency unavailable' : 'audit failed'}; no decision`);
    exit(5, { ...out, failure: dependency ? 'DEPENDENCY_UNAVAILABLE' : 'JOB_FAILED' });
  }
  exit(out.decision === 'ALLOW' ? 0 : out.decision === 'BLOCK' ? 2 : 3, out);
} catch (e) {
  const err = e as Error;
  const badInput = err instanceof ArtifactError || err instanceof PolicyError;
  const code = badInput ? 6 : 5;
  log(`[local-audit] ${err instanceof DependencyUnavailable ? 'dependency unavailable: ' : ''}${err.message}`);
  exit(code, { error: err.message, failure: badInput ? 'BAD_INPUT' : err instanceof DependencyUnavailable ? 'DEPENDENCY_UNAVAILABLE' : 'ERROR' });
}
