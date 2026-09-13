import { hashCanonical } from '../canonical/hash.js';
import type { EvidenceBundle, Finding } from '../domain/types.js';
import type { RunResult } from '../../runner/harness/run.js';

export const COLLECTOR_VERSION = 'strace-v1';

/**
 * Packages collector output and static findings into the evidence bundle that the decision
 * engine consumes. `evidenceMode` is always REAL_ARTIFACT_TEST: every observation in this
 * phase comes from a real run of the real artifact under the strace collector.
 */
export function buildEvidence(a: {
  auditId: string;
  artifactHash: string;
  executionProfileHash: string;
  run: RunResult;
  findings: Finding[];
  staticIncomplete: boolean;
  analyzerVersion: string;
}): { bundle: EvidenceBundle; evidenceHash: string } {
  const bundle: EvidenceBundle = {
    schemaVersion: '1.0',
    auditId: a.auditId,
    artifactHash: a.artifactHash,
    executionProfileHash: a.executionProfileHash,
    evidenceMode: 'REAL_ARTIFACT_TEST',
    observations: a.run.observations,
    findings: a.findings,
    coverage: { ...a.run.coverage, staticIncomplete: a.staticIncomplete },
    collectorVersion: COLLECTOR_VERSION,
    analyzerVersion: a.analyzerVersion,
  };
  return { bundle, evidenceHash: hashCanonical('safe402/evidence/v1', bundle) };
}
