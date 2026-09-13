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
  // Every observation must belong to the audit this bundle speaks for; a foreign observation
  // would be laundered into this audit's evidence and then into a signed decision.
  for (const o of a.run.observations) {
    if (o.auditId !== a.auditId) {
      throw new Error(`observation auditId ${o.auditId} does not match bundle auditId ${a.auditId}`);
    }
  }
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
