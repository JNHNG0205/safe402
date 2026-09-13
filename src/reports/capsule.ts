import { createHash } from 'node:crypto';
import { hashCanonical } from '../canonical/hash.js';
import type { Decision, DecisionCapsule } from '../domain/types.js';
import type { ReasonCode } from '../domain/reasonCodes.js';

/**
 * Stable identity for an authorization lineage: the same subject running the same artifact
 * under the same policy and execution profile. `authorizationSequence` counts within this key.
 */
export function authorizationKey(
  subjectId: string,
  artifactHash: string,
  policyCommitment: string,
  executionProfileHash: string,
): string {
  const digest = createHash('sha256')
    .update(['safe402/authorization/v1', subjectId, artifactHash, policyCommitment, executionProfileHash].join('\n'), 'utf8')
    .digest('hex');
  return `sha256:${digest}`;
}

export function buildCapsule(a: {
  auditId: string;
  artifactHash: string;
  executionProfileHash: string;
  evidenceHash: string;
  policyCommitment: string;
  subjectId: string;
  decision: Decision;
  reasonCodes: ReasonCode[];
  issuedAt: number;
  ttlSeconds: number;
  authorizationSequence: number;
}): { capsule: DecisionCapsule; capsuleHash: string } {
  const capsule: DecisionCapsule = {
    schemaVersion: '1.0',
    auditId: a.auditId,
    artifactHash: a.artifactHash,
    executionProfileHash: a.executionProfileHash,
    evidenceHash: a.evidenceHash,
    policyCommitment: a.policyCommitment,
    subjectId: a.subjectId,
    decision: a.decision,
    reasonCodes: [...a.reasonCodes].sort(),
    issuedAt: a.issuedAt,
    // Only an ALLOW grants execution, so only an ALLOW can expire. BLOCK and REVIEW never
    // become executable with the passage of time.
    expiresAt: a.decision === 'ALLOW' ? a.issuedAt + a.ttlSeconds : null,
    authorizationSequence: a.authorizationSequence,
    confidentialExecutionMode: 'LOCAL',
  };
  return { capsule, capsuleHash: hashCanonical('safe402/capsule/v1', capsule) };
}
