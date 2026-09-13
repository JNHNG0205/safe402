import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePolicy, PolicyError } from '../src/schemas/policy.js';
import { loadPolicyFile, parsePolicyYaml } from '../src/policies/load.js';
import { newSalt, policyCommitment } from '../src/policies/commit.js';

const FILE = join(import.meta.dirname, '..', 'config', 'policies', 'research-agent.yaml');

describe('policy', () => {
  it('loads the research policy', () => {
    const p = loadPolicyFile(FILE);
    expect(p.name).toBe('research-agent');
    expect(p.rules.network.allowedHosts).toEqual(['prices.example.test']);
  });
  it('rejects unknown fields, bad ttl, bad host', () => {
    const base = loadPolicyFile(FILE) as any;
    expect(() => parsePolicy({ ...base, extra: true })).toThrow(PolicyError);
    expect(() => parsePolicy({ ...base, authorization: { ttlSeconds: 10 } })).toThrow(PolicyError);
    expect(() => parsePolicy({ ...base, rules: { ...base.rules, network: { allowedHosts: ['Bad Host'] } } })).toThrow(PolicyError);
  });
  it('commitment depends on salt and policy', () => {
    const p = loadPolicyFile(FILE);
    const s1 = newSalt(); const s2 = newSalt();
    expect(s1).toMatch(/^[0-9a-f]{32}$/);
    expect(policyCommitment(p, s1)).not.toBe(policyCommitment(p, s2));
    expect(policyCommitment(p, s1)).toBe(policyCommitment(structuredClone(p), s1));
    expect(policyCommitment({ ...p, name: 'other' }, s1)).not.toBe(policyCommitment(p, s1));
  });
  it('rejects duplicate YAML keys', () => {
    expect(() => parsePolicyYaml('schemaVersion: "1.0"\nschemaVersion: "1.0"\n')).toThrow(PolicyError);
  });
});
