import { randomBytes } from 'node:crypto';
import { decide } from '../src/domain/decide.js';
import { buildEvidence } from '../src/evidence/bundle.js';
import { authorizationKey, buildCapsule } from '../src/reports/capsule.js';
import { buildReport } from '../src/reports/report.js';
import { issuerFromSeed, signReport } from '../src/reports/sign.js';
import { scanArtifact, ANALYZER_VERSION } from '../src/scanner/scan.js';
import { loadProfile, runArtifact } from '../runner/harness/run.js';
import type { JobRepo, JobRow } from '../src/jobs/repo.js';
import type { Config } from '../src/config.js';

export interface PipelineContext { repo: JobRepo; config: Config; owner: string; straceBin?: string }

/**
 * Runs one claimed job through PREPARING → SCANNING → TESTING → EVALUATING → COMPLETED.
 * Every transition is lease-scoped to `ctx.owner`, so a worker whose lease was reassigned
 * stops here instead of overwriting the new owner's work. Any thrown error ends the job in
 * FAILED with `last_error` and an `error` event; nothing is ever decided from a caught error.
 */
export async function processJob(ctx: PipelineContext, job: JobRow): Promise<void> {
  const { repo, config } = ctx; const id = job.audit_id;
  const step = (to: Parameters<JobRepo['transition']>[1], checkpoint: string) => { repo.transition(id, to, { stageCheckpoint: checkpoint }, ctx.owner); repo.appendEvent(id, 'stage', { to, checkpoint }); repo.heartbeat(id, ctx.owner); };
  try {
    const artifact = repo.getArtifact(job.artifact_hash); if (!artifact) throw new Error('artifact missing');
    const pol = repo.getPolicy(job.policy_id); if (!pol) throw new Error('policy missing');
    const { profile, profileHash } = loadProfile(config.profilePath);
    if (profileHash !== job.profile_hash) throw new Error('profile hash mismatch');
    step('SCANNING', 'artifact-verified');
    const scan = scanArtifact(artifact);
    repo.appendEvent(id, 'findings', { count: scan.findings.length });
    step('TESTING', 'static-complete');
    const run = await runArtifact({ artifact, profile, auditId: id, dataDir: config.dataDir, ...(ctx.straceBin ? { straceBin: ctx.straceBin } : {}) });
    repo.appendEvent(id, 'runtime', { observations: run.observations.length, timedOut: run.timedOut, collectorError: run.collectorError, testsCompleted: run.coverage.testsCompleted });
    step('EVALUATING', 'runtime-complete');
    const { bundle, evidenceHash } = buildEvidence({ auditId: id, artifactHash: artifact.artifactHash, executionProfileHash: profileHash, run, findings: scan.findings, staticIncomplete: scan.staticIncomplete, analyzerVersion: ANALYZER_VERSION });
    repo.saveEvidence(evidenceHash, id, bundle);
    const result = decide({ evidence: bundle, policy: pol.policy, manifest: artifact.manifest, profile, bindings: { artifactHash: job.artifact_hash, executionProfileHash: job.profile_hash } });
    const key = authorizationKey(job.subject_id, artifact.artifactHash, pol.commitment, profileHash);
    const { capsule, capsuleHash } = buildCapsule({ auditId: id, artifactHash: artifact.artifactHash, executionProfileHash: profileHash, evidenceHash, policyCommitment: pol.commitment, subjectId: job.subject_id,
      decision: result.decision, reasonCodes: result.reasonCodes, issuedAt: Math.floor(Date.now() / 1000), ttlSeconds: pol.policy.authorization.ttlSeconds, authorizationSequence: repo.nextAuthorizationSequence(key) });
    repo.saveCapsule(capsuleHash, id, capsule, key);
    const reportId = `report_${randomBytes(8).toString('hex')}`;
    const { report, reportHash } = buildReport({ reportId, capsule, capsuleHash, manifest: artifact.manifest, evidence: bundle, evidenceReference: `local:runs/${id}/trace.log` });
    const issuer = issuerFromSeed(config.issuerSeedHex);
    repo.saveReport(reportId, id, capsuleHash, reportHash, signReport(report, reportHash, config.issuerId, issuer.privateKey));
    repo.appendEvent(id, 'decision', { decision: result.decision, reasonCodes: result.reasonCodes, reportId });
    repo.transition(id, 'COMPLETED', { stageCheckpoint: 'report-signed' }, ctx.owner);
  } catch (e) {
    const msg = (e as Error).message;
    try { repo.transition(id, 'FAILED', { lastError: msg }, ctx.owner); } catch { /* already terminal, or the lease moved on */ }
    repo.appendEvent(id, 'error', { message: msg });
  }
}

/** Claims and runs at most one job. Returns false when the queue is empty. */
export async function runWorkerOnce(ctx: PipelineContext): Promise<boolean> {
  ctx.repo.sweepExpiredLeases();
  const job = ctx.repo.claimNext(ctx.owner); if (!job) return false;
  ctx.repo.appendEvent(job.audit_id, 'claimed', { owner: ctx.owner, attempt: job.attempts });
  await processJob(ctx, job); return true;
}
