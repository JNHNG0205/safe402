import { createHash } from 'node:crypto';
import { canonicalJson } from './json.js';

export type DomainTag =
  | 'safe402/artifact/v1' | 'safe402/evidence/v1' | 'safe402/capsule/v1'
  | 'safe402/report/v1' | 'safe402/policy/v1' | 'safe402/profile/v1';

export function hashCanonical(domain: DomainTag, value: unknown): string {
  const digest = createHash('sha256').update(domain + '\n' + canonicalJson(value), 'utf8').digest('hex');
  return `sha256:${digest}`;
}

export function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}
