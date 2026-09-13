import { createPrivateKey, createPublicKey, sign, type KeyObject } from 'node:crypto';
import type { Report, SignedReportEnvelope } from '../domain/types.js';

// DER prefix for a PKCS#8 Ed25519 private key wrapping a 32-byte seed.
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export function issuerFromSeed(seedHex: string): { privateKey: KeyObject; publicKeyHex: string } {
  const seed = Buffer.from(seedHex.replace(/^0x/, ''), 'hex');
  if (seed.length !== 32) throw new Error('issuer seed must be 32 bytes');
  const privateKey = createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
  // An Ed25519 SPKI export is 44 bytes: a 12-byte header plus the raw 32-byte public key.
  const spki = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  return { privateKey, publicKeyHex: spki.subarray(spki.length - 32).toString('hex') };
}

/** Signs the report hash, not the body: the hash is the canonical commitment to the body. */
export function signReport(report: Report, reportHash: string, issuer: string, privateKey: KeyObject): SignedReportEnvelope {
  const signature = sign(null, Buffer.from(reportHash, 'utf8'), privateKey).toString('hex');
  return { report, reportHash, issuer, signature, publication: {} };
}
