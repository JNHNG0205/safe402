import { randomBytes } from 'node:crypto';
import { hashCanonical } from '../canonical/hash.js';
import type { Policy } from '../domain/types.js';

export function newSalt(): string {
  return randomBytes(16).toString('hex');
}

export function policyCommitment(policy: Policy, saltHex: string): string {
  return hashCanonical('safe402/policy/v1', { policy, salt: saltHex });
}
