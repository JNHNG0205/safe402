import { randomBytes } from 'node:crypto';
import { resolveArtifact } from '../src/artifacts/resolve.js';
import { decide } from '../src/domain/decide.js';
import { buildEvidence } from '../src/evidence/bundle.js';
import { authorizationKey } from '../src/reports/capsule.js';
import { buildReport } from '../src/reports/report.js';
import { issuerFromSeed, signReport } from '../src/reports/sign.js';
import { scanArtifact, ANALYZER_VERSION } from '../src/scanner/scan.js';
import { loadProfile, runArtifact } from '../runner/harness/run.js';
import type { JobRepo, JobRow } from '../src/jobs/repo.js';
import type { Config } from '../src/config.js';

/** The isolated run step, injectable so lease behaviour can be tested without Docker. */
export type ArtifactRunner = typeof runArtifact;

/** Comfortably under the lease, so a run that outlives one interval still keeps the lease alive. */
const HEARTBEAT_MS = 20_000;

export interface PipelineContext { repo: JobRepo; config: Config; owner: string; straceBin?: string; runner?: ArtifactRunner; heartbeatMs?: number }

/**
 * Runs one claimed job through PREPARING → SCANNING → TESTING → EVALUATING → COMPLETED.
 * Every transition is lease-scoped to `ctx.owner`, so a worker whose lease was reassigned
 * stops here instead of overwriting the new owner's work. Any thrown error ends the job in
 * FAILED with `last_error` and an `error` event — unless the lease has moved on, in which case the
 * error is recorded and the status is left to whoever owns the job now. Nothing is ever decided
 * from a caught error.
 */
export async function processJob(ctx: PipelineContext, job: JobRow): Promise<void> {
  const { repo, config } = ctx; const id = job.audit_id;
  const step = (to: Parameters<JobRepo['transition']>[1], checkpoint: string) => { repo.transition(id, to, { stageCheckpoint: checkpoint }, ctx.owner); repo.appendEvent(id, 'stage', { to, checkpoint }); repo.heartbeat(id, ctx.owner); };
  try {
    const artifact = repo.getArtifact(job.artifact_hash); if (!artifact) throw new Error('artifact missing');
    const pol = repo.getPolicy(job.policy_id); if (!pol) throw new Error('policy missing');
    const { profile, profileHash } = loadProfile(config.profilePath);
    if (profileHash !== job.profile_hash) throw new Error('profile hash mismatch');
    // The stored artifact row is a claim about a directory on disk; re-resolve it so the static
    // scan, and everything downstream, runs over content that still hashes to the audited artifact.
    // The runner repeats this check on the copy it is about to mount.
    const onDisk = resolveArtifact(artifact.sourceDir);
    if (onDisk.artifactHash !== artifact.artifactHash) throw new Error('artifact hash mismatch: source directory no longer matches the audited artifact');
    step('SCANNING', 'artifact-verified');
    const scan = scanArtifact(artifact);
    repo.appendEvent(id, 'findings', { count: scan.findings.length });
    step('TESTING', 'static-complete');
    // The run is the only step that can outlast a lease, so beat through it: without this a slow
    // but healthy run is swept mid-TESTING and a second worker starts a duplicate container over
    // the same observation directory.
    const beat = setInterval(() => { try { repo.heartbeat(id, ctx.owner); } catch { /* the sweep will decide */ } }, ctx.heartbeatMs ?? HEARTBEAT_MS);
    let run;
    try {
      run = await (ctx.runner ?? runArtifact)({ artifact, profile, auditId: id, dataDir: config.dataDir, attempt: job.attempts, ...(ctx.straceBin ? { straceBin: ctx.straceBin } : {}) });
    } finally {
      clearInterval(beat);
    }
    repo.appendEvent(id, 'runtime', { observations: run.observations.length, timedOut: run.timedOut, collectorError: run.collectorError, testsCompleted: run.coverage.testsCompleted });
    step('EVALUATING', 'runtime-complete');
    const { bundle, evidenceHash } = buildEvidence({ auditId: id, artifactHash: artifact.artifactHash, executionProfileHash: profileHash, run, findings: scan.findings, staticIncomplete: scan.staticIncomplete, analyzerVersion: ANALYZER_VERSION });
    repo.saveEvidence(evidenceHash, id, bundle);
    const result = decide({ evidence: bundle, policy: pol.policy, manifest: artifact.manifest, profile, bindings: { artifactHash: job.artifact_hash, executionProfileHash: job.profile_hash } });
    const key = authorizationKey(job.subject_id, artifact.artifactHash, pol.commitment, profileHash);
    // Sequence allocation and the capsule write share one transaction: read-then-write across two
    // calls lets two workers mint the same link in an authorization chain.
    const { capsule, capsuleHash } = repo.saveCapsuleWithNextSequence(id, { auditId: id, artifactHash: artifact.artifactHash, executionProfileHash: profileHash, evidenceHash, policyCommitment: pol.commitment, subjectId: job.subject_id,
      decision: result.decision, reasonCodes: result.reasonCodes, issuedAt: Math.floor(Date.now() / 1000), ttlSeconds: pol.policy.authorization.ttlSeconds }, key);
    const reportId = `report_${randomBytes(8).toString('hex')}`;
    const { report, reportHash } = buildReport({ reportId, capsule, capsuleHash, manifest: artifact.manifest, evidence: bundle, evidenceReference: `local:runs/${id}/obs/trace.log` });
    const issuer = issuerFromSeed(config.issuerSeedHex);
    repo.saveReport(reportId, id, capsuleHash, reportHash, signReport(report, reportHash, config.issuerId, issuer.privateKey));
    repo.appendEvent(id, 'decision', { decision: result.decision, reasonCodes: result.reasonCodes, reportId });
    step('COMPLETED', 'report-signed');
  } catch (e) {
    const msg = (e as Error).message;
    try {
      repo.transition(id, 'FAILED', { lastError: msg }, ctx.owner);
    } catch (t) {
      // The lease is gone (or the job is already terminal): this worker no longer speaks for the
      // job, so it records what happened and leaves the status to whoever owns it now.
      repo.appendEvent(id, 'error', { message: msg, unrecorded: (t as Error).message });
      return;
    }
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
