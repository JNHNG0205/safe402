import { createPublicKey, verify } from 'node:crypto';
import { hashCanonical } from '../canonical/hash.js';

// DER prefix for an SPKI-wrapped raw Ed25519 public key.
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const HEX32 = /^[0-9a-fA-F]{64}$/;

export type VerifyCheck = 'schema' | 'reportHash' | 'issuer' | 'signature' | 'capsuleHash' | 'expiry';
export interface VerifyResult { ok: boolean; failedCheck: string | null; checks: string[] }

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
  const checks: string[] = [];
  const fail = (c: VerifyCheck): VerifyResult => ({ ok: false, failedCheck: c, checks });
  let current: VerifyCheck = 'schema';
  try {
    if (!isRecord(env)) return fail('schema');
    const { report, reportHash, issuer, signature } = env;
    if (typeof reportHash !== 'string' || typeof issuer !== 'string' || typeof signature !== 'string') return fail('schema');
    if (!isRecord(report) || typeof report['capsuleHash'] !== 'string' || !isRecord(report['capsule'])) return fail('schema');
    const capsule = report['capsule'];
    checks.push('schema');

    current = 'reportHash';
    if (hashCanonical('safe402/report/v1', report) !== reportHash) return fail('reportHash');
    checks.push('reportHash');

    current = 'issuer';
    const publicKeyHex = trusted[issuer];
    if (typeof publicKeyHex !== 'string' || !HEX32.test(publicKeyHex)) return fail('issuer');
    checks.push('issuer');

    current = 'signature';
    const publicKey = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]), format: 'der', type: 'spki',
    });
    const signatureBytes = Buffer.from(signature, 'hex');
    if (signatureBytes.length !== 64) return fail('signature');
    if (!verify(null, Buffer.from(reportHash, 'utf8'), publicKey, signatureBytes)) return fail('signature');
    checks.push('signature');

    current = 'capsuleHash';
    if (hashCanonical('safe402/capsule/v1', capsule) !== report['capsuleHash']) return fail('capsuleHash');
    checks.push('capsuleHash');

    current = 'expiry';
    const expiresAt = capsule['expiresAt'];
    if (expiresAt !== null) {
      if (typeof expiresAt !== 'number' || !Number.isInteger(expiresAt)) return fail('expiry');
      if (expiresAt <= now) return fail('expiry');
    }
    checks.push('expiry');

    return { ok: true, failedCheck: null, checks };
  } catch {
    return fail(current);
  }
}
