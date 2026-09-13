CREATE TABLE IF NOT EXISTS artifacts (
  artifact_hash TEXT PRIMARY KEY, executable_digest TEXT NOT NULL, entrypoint TEXT NOT NULL, manifest_json TEXT NOT NULL,
  file_count INTEGER NOT NULL, byte_size INTEGER NOT NULL, source_dir TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS policy_versions (
  policy_id TEXT PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL, policy_json TEXT NOT NULL, salt TEXT NOT NULL, commitment TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_jobs (
  audit_id TEXT PRIMARY KEY, artifact_hash TEXT NOT NULL, policy_id TEXT NOT NULL, subject_id TEXT NOT NULL, profile_id TEXT NOT NULL, profile_hash TEXT NOT NULL,
  status TEXT NOT NULL, stage_checkpoint TEXT, attempts INTEGER NOT NULL DEFAULT 0, lease_owner TEXT, lease_expires_at INTEGER, last_error TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS job_events (
  audit_id TEXT NOT NULL, sequence INTEGER NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (audit_id, sequence));
CREATE TABLE IF NOT EXISTS evidence_bundles (evidence_hash TEXT PRIMARY KEY, audit_id TEXT NOT NULL, bundle_json TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS decision_capsules (
  capsule_hash TEXT PRIMARY KEY, audit_id TEXT NOT NULL, capsule_json TEXT NOT NULL, decision TEXT NOT NULL, authorization_key TEXT NOT NULL, authorization_sequence INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reports (report_id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, capsule_hash TEXT NOT NULL, report_hash TEXT NOT NULL, envelope_json TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON audit_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_capsules_key ON decision_capsules(authorization_key, authorization_sequence);
