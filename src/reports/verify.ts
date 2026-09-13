import { createPublicKey, verify } from 'node:crypto';
import { hashCanonical } from '../canonical/hash.js';
import type { Decision } from '../domain/types.js';

// DER prefix for an SPKI-wrapped raw Ed25519 public key.
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const PUBLIC_KEY_HEX = /^[0-9a-fA-F]{64}$/;
// Signatures are produced by signReport as lowercase hex; anything else is not our encoding.
const SIGNATURE_HEX = /^[0-9a-f]{128}$/;
const DECISIONS = new Set<string>(['ALLOW', 'REVIEW', 'BLOCK'] satisfies Decision[]);

export type VerifyCheck = 'schema' | 'reportHash' | 'issuer' | 'signature' | 'capsuleHash' | 'expiry';

/**
 * The outcome of the cryptographic and structural checks on an envelope.
 *
 * `ok: true` means only this: the envelope is well-formed, its body hashes to `reportHash`,
 * a trusted issuer signed that hash, the embedded `capsuleHash` binds the embedded capsule,
 * and the capsule has not expired at `now`.
 *
 * It does NOT discharge the remaining PRD 19.5 obligations, which need context this function
 * does not have. The caller must still check:
 *  - **artifact binding** — `capsule.artifactHash` is the artifact the caller is about to run;
 *  - **policy and subject binding** — `capsule.policyCommitment` is the policy the caller
 *    enforces and `capsule.subjectId` is the subject presenting the capsule;
 *  - **execution profile binding** — `capsule.executionProfileHash` is the profile the
 *    evidence was produced under;
 *  - **revocation** — the capsule (or its issuer key) has not been revoked since issuance.
 */
export interface VerifyResult { ok: boolean; failedCheck: VerifyCheck | null; checks: VerifyCheck[] }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Checks an envelope in the spec order: schema, reportHash, issuer, signature, capsuleHash,
 * expiry. Returns the first failing check and the checks that passed before it. Never throws:
 * any error raised while evaluating a check fails that check.
 *
 * `env` is `unknown` on purpose — this is a trust boundary and callers hand it untrusted input.
 */
export function verifyEnvelope(env: unknown, trusted: Record<string, string>, now: number): VerifyResult {
  const checks: VerifyCheck[] = [];
  const fail = (c: VerifyCheck): VerifyResult => ({ ok: false, failedCheck: c, checks });
  let current: VerifyCheck = 'schema';
  try {
    if (!isRecord(env)) return fail('schema');
    const { report, reportHash, issuer, signature } = env;
    if (typeof reportHash !== 'string' || typeof issuer !== 'string' || typeof signature !== 'string') return fail('schema');
    if (!isRecord(report) || typeof report['capsuleHash'] !== 'string' || !isRecord(report['capsule'])) return fail('schema');
    if (report['schemaVersion'] !== '1.0') return fail('schema');
    const capsule = report['capsule'];
    if (typeof capsule['decision'] !== 'string' || !DECISIONS.has(capsule['decision'])) return fail('schema');
    checks.push('schema');

    current = 'reportHash';
    if (hashCanonical('safe402/report/v1', report) !== reportHash) return fail('reportHash');
    checks.push('reportHash');

    current = 'issuer';
    // Own-property lookup only: an issuer name that merely resolves through Object.prototype
    // (or any inherited key) is not a trusted issuer.
    if (!Object.hasOwn(trusted, issuer)) return fail('issuer');
    const publicKeyHex = trusted[issuer];
    if (typeof publicKeyHex !== 'string' || !PUBLIC_KEY_HEX.test(publicKeyHex)) return fail('issuer');
    checks.push('issuer');

    current = 'signature';
    if (!SIGNATURE_HEX.test(signature)) return fail('signature');
    const publicKey = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]), format: 'der', type: 'spki',
    });
    if (!verify(null, Buffer.from(reportHash, 'utf8'), publicKey, Buffer.from(signature, 'hex'))) return fail('signature');
    checks.push('signature');

    current = 'capsuleHash';
    if (hashCanonical('safe402/capsule/v1', capsule) !== report['capsuleHash']) return fail('capsuleHash');
    checks.push('capsuleHash');

    current = 'expiry';
    // A caller that cannot supply a real clock cannot be told the capsule is live.
    if (!Number.isInteger(now)) return fail('expiry');
    const expiresAt = capsule['expiresAt'];
    if (expiresAt !== null) {
      if (!Number.isInteger(expiresAt)) return fail('expiry');
      if ((expiresAt as number) <= now) return fail('expiry');
    }
    checks.push('expiry');

    return { ok: true, failedCheck: null, checks };
  } catch {
    return fail(current);
  }
}
