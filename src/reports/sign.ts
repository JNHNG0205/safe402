import { createPrivateKey, createPublicKey, sign, type KeyObject } from 'node:crypto';
import { hashCanonical } from '../canonical/hash.js';
import type { Report, SignedReportEnvelope } from '../domain/types.js';

// DER prefix for a PKCS#8 Ed25519 private key wrapping a 32-byte seed.
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SEED_HEX = /^(0x)?[0-9a-fA-F]{64}$/;

export function issuerFromSeed(seedHex: string): { privateKey: KeyObject; publicKeyHex: string } {
  // Validate before decoding: Buffer.from(_, 'hex') truncates at the first non-hex character,
  // so a typo would silently yield a different, shorter key rather than an error.
  if (typeof seedHex !== 'string' || !SEED_HEX.test(seedHex)) throw new Error('issuer seed must be 32 bytes of hex');
  const seed = Buffer.from(seedHex.replace(/^0x/, ''), 'hex');
  const privateKey = createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
  // An Ed25519 SPKI export is 44 bytes: a 12-byte header plus the raw 32-byte public key.
  const spki = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  return { privateKey, publicKeyHex: spki.subarray(spki.length - 32).toString('hex') };
}

/**
 * Signs the report hash, not the body: the hash is the canonical commitment to the body.
 * The supplied `reportHash` is recomputed from `report` first, so the issuer can never be
 * induced to sign a hash that does not belong to the body travelling with it.
 */
export function signReport(report: Report, reportHash: string, issuer: string, privateKey: KeyObject): SignedReportEnvelope {
  if (hashCanonical('safe402/report/v1', report) !== reportHash) throw new Error('reportHash mismatch');
  const signature = sign(null, Buffer.from(reportHash, 'utf8'), privateKey).toString('hex');
  return { report, reportHash, issuer, signature, publication: {} };
}
