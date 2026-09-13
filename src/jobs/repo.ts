import type { DatabaseSync } from 'node:sqlite';
import type { Artifact, JobStatus, Policy } from '../domain/types.js';
import { assertTransition } from './stateMachine.js';

export interface JobRow {
  audit_id: string;
  artifact_hash: string;
  policy_id: string;
  subject_id: string;
  profile_id: string;
  profile_hash: string;
  status: JobStatus;
  stage_checkpoint: string | null;
  attempts: number;
  lease_owner: string | null;
  lease_expires_at: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

const LEASE_SECONDS = 60;
const MAX_ATTEMPTS = 3;
const ACTIVE: JobStatus[] = ['PREPARING', 'SCANNING', 'TESTING', 'EVALUATING'];
const now = () => Math.floor(Date.now() / 1000);

export class JobRepo {
  constructor(private readonly db: DatabaseSync) {}

  insertArtifact(a: Artifact) {
    this.db
      .prepare(`INSERT OR IGNORE INTO artifacts VALUES (?,?,?,?,?,?,?,?)`)
      .run(a.artifactHash, a.executableDigest, a.entrypoint, JSON.stringify(a.manifest), a.fileCount, a.byteSize, a.sourceDir, now());
  }

  getArtifact(hash: string): Artifact | null {
    const r = this.db.prepare(`SELECT * FROM artifacts WHERE artifact_hash = ?`).get(hash) as any;
    if (!r) return null;
    return {
      artifactHash: r.artifact_hash,
      executableDigest: r.executable_digest,
      entrypoint: r.entrypoint,
      manifest: JSON.parse(r.manifest_json),
      fileCount: r.file_count,
      byteSize: r.byte_size,
      sourceDir: r.source_dir,
    };
  }

  upsertPolicy(p: { policyId: string; name: string; version: number; policy: Policy; salt: string; commitment: string }) {
    this.db
      .prepare(`INSERT OR IGNORE INTO policy_versions VALUES (?,?,?,?,?,?,?)`)
      .run(p.policyId, p.name, p.version, JSON.stringify(p.policy), p.salt, p.commitment, now());
  }

  getPolicy(policyId: string): { policy: Policy; salt: string; commitment: string } | null {
    const r = this.db.prepare(`SELECT * FROM policy_versions WHERE policy_id = ?`).get(policyId) as any;
    if (!r) return null;
    return { policy: JSON.parse(r.policy_json), salt: r.salt, commitment: r.commitment };
  }

  createJob(j: { auditId: string; artifactHash: string; policyId: string; subjectId: string; profileId: string; profileHash: string }) {
    const t = now();
    this.db
      .prepare(
        `INSERT INTO audit_jobs (audit_id, artifact_hash, policy_id, subject_id, profile_id, profile_hash, status, attempts, created_at, updated_at) VALUES (?,?,?,?,?,?,'QUEUED',0,?,?)`,
      )
      .run(j.auditId, j.artifactHash, j.policyId, j.subjectId, j.profileId, j.profileHash, t, t);
  }

  getJob(auditId: string): JobRow | null {
    return (this.db.prepare(`SELECT * FROM audit_jobs WHERE audit_id = ?`).get(auditId) as JobRow | undefined) ?? null;
  }

  claimNext(owner: string, at: number = now()): JobRow | null {
    const row = this.db
      .prepare(
        `UPDATE audit_jobs SET status='PREPARING', lease_owner=?, lease_expires_at=?, attempts=attempts+1, updated_at=?, stage_checkpoint=NULL
      WHERE audit_id = (SELECT audit_id FROM audit_jobs WHERE status='QUEUED' AND attempts < ? ORDER BY created_at LIMIT 1) RETURNING *`,
      )
      .get(owner, at + LEASE_SECONDS, at, MAX_ATTEMPTS) as JobRow | undefined;
    return row ?? null;
  }

  heartbeat(auditId: string, owner: string, at: number = now()) {
    this.db.prepare(`UPDATE audit_jobs SET lease_expires_at=?, updated_at=? WHERE audit_id=? AND lease_owner=?`).run(at + LEASE_SECONDS, at, auditId, owner);
  }

  transition(auditId: string, to: JobStatus, patch: { stageCheckpoint?: string; lastError?: string } = {}) {
    const job = this.getJob(auditId);
    if (!job) throw new Error(`job ${auditId} missing`);
    assertTransition(job.status, to);
    this.db
      .prepare(`UPDATE audit_jobs SET status=?, stage_checkpoint=COALESCE(?, stage_checkpoint), last_error=COALESCE(?, last_error), updated_at=? WHERE audit_id=?`)
      .run(to, patch.stageCheckpoint ?? null, patch.lastError ?? null, now(), auditId);
  }

  appendEvent(auditId: string, kind: string, payload: unknown) {
    const seq = (this.db.prepare(`SELECT COALESCE(MAX(sequence),0)+1 AS s FROM job_events WHERE audit_id=?`).get(auditId) as any).s as number;
    this.db.prepare(`INSERT INTO job_events VALUES (?,?,?,?,?)`).run(auditId, seq, kind, JSON.stringify(payload), now());
  }

  listEvents(auditId: string): { sequence: number; kind: string; payload: unknown; created_at: number }[] {
    return (this.db.prepare(`SELECT * FROM job_events WHERE audit_id=? ORDER BY sequence`).all(auditId) as any[]).map((r) => ({
      sequence: r.sequence,
      kind: r.kind,
      payload: JSON.parse(r.payload_json),
      created_at: r.created_at,
    }));
  }

  saveEvidence(evidenceHash: string, auditId: string, bundle: unknown) {
    this.db.prepare(`INSERT OR IGNORE INTO evidence_bundles VALUES (?,?,?,?)`).run(evidenceHash, auditId, JSON.stringify(bundle), now());
  }

  nextAuthorizationSequence(key: string): number {
    return (
      ((this.db.prepare(`SELECT COALESCE(MAX(authorization_sequence),0) AS m FROM decision_capsules WHERE authorization_key=?`).get(key) as any).m as number) + 1
    );
  }

  saveCapsule(capsuleHash: string, auditId: string, capsule: { decision: string; authorizationSequence?: number }, authorizationKey: string) {
    const seq = capsule.authorizationSequence ?? this.nextAuthorizationSequence(authorizationKey);
    this.db
      .prepare(`INSERT OR IGNORE INTO decision_capsules VALUES (?,?,?,?,?,?,?)`)
      .run(capsuleHash, auditId, JSON.stringify(capsule), capsule.decision, authorizationKey, seq, now());
  }

  saveReport(reportId: string, auditId: string, capsuleHash: string, reportHash: string, envelope: unknown) {
    this.db.prepare(`INSERT OR IGNORE INTO reports VALUES (?,?,?,?,?,?)`).run(reportId, auditId, capsuleHash, reportHash, JSON.stringify(envelope), now());
  }

  getReportByAudit(auditId: string): { reportId: string; envelope: unknown } | null {
    const r = this.db.prepare(`SELECT report_id, envelope_json FROM reports WHERE audit_id=? ORDER BY created_at DESC LIMIT 1`).get(auditId) as any;
    return r ? { reportId: r.report_id, envelope: JSON.parse(r.envelope_json) } : null;
  }

  getCapsuleByAudit(auditId: string): { capsuleHash: string; capsule: unknown } | null {
    const r = this.db.prepare(`SELECT capsule_hash, capsule_json FROM decision_capsules WHERE audit_id=? ORDER BY created_at DESC LIMIT 1`).get(auditId) as any;
    return r ? { capsuleHash: r.capsule_hash, capsule: JSON.parse(r.capsule_json) } : null;
  }

  sweepExpiredLeases(at: number = now()): number {
    const placeholders = ACTIVE.map(() => '?').join(',');
    const requeued = this.db
      .prepare(`UPDATE audit_jobs SET status='QUEUED', lease_owner=NULL, lease_expires_at=NULL, updated_at=? WHERE status IN (${placeholders}) AND lease_expires_at < ? AND attempts < ?`)
      .run(at, ...ACTIVE, at, MAX_ATTEMPTS).changes;
    this.db
      .prepare(`UPDATE audit_jobs SET status='FAILED', last_error='lease expired after max attempts', updated_at=? WHERE status IN (${placeholders}) AND lease_expires_at < ? AND attempts >= ?`)
      .run(at, ...ACTIVE, at, MAX_ATTEMPTS);
    return Number(requeued);
  }
}
