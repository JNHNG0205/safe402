import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseStrace } from '../runner/collectors/strace.js';
import type { ExecutionProfile } from '../src/domain/types.js';

const profile: ExecutionProfile = { profileId: 'no-network-v1', image: 'x', network: 'none', memoryBytes: 1, pidsLimit: 1, deadlineMs: 1, toolUser: 'nobody',
  canaries: [{ path: '/home/tool/.aws/credentials', kind: 'credential' }], env: {}, tests: [] };
const ctx = { auditId: 'audit_1', profile, evidenceReference: 'local:runs/audit_1/trace.log',
  testWindows: [{ testId: 'mcp_initialize', start: 1757800000, end: 1757800001 }, { testId: 'get_price_call', start: 1757800001, end: 1757800002 }] };
const load = (n: string) => readFileSync(join(import.meta.dirname, 'samples', n), 'utf8');

describe('parseStrace', () => {
  it('extracts canary read, denied write, dns, connect, and spawn from the blocked trace', () => {
    const { observations, baselineOpens } = parseStrace(load('trace-blocked.log'), ctx);
    const cred = observations.find((o) => o.target === '/home/tool/.aws/credentials')!;
    expect(cred).toMatchObject({ capability: 'FILESYSTEM', operation: 'READ', attempted: true, permitted: true, completed: true, testId: 'get_price_call', sourceType: 'RUNTIME', collectorVersion: 'strace-v1' });
    const tamper = observations.find((o) => o.target === '/obs/tamper')!;
    expect(tamper).toMatchObject({ operation: 'WRITE', attempted: true, permitted: false, completed: false });
    const dns = observations.find((o) => o.operation === 'DNS')!;
    expect(dns).toMatchObject({ capability: 'NETWORK', target: 'unresolved', attempted: true, permitted: false, completed: false });
    const conn = observations.find((o) => o.operation === 'CONNECT')!;
    expect(conn).toMatchObject({ target: '93.184.216.34:80', permitted: false, completed: false });
    const spawn = observations.find((o) => o.operation === 'SPAWN')!;
    expect(spawn).toMatchObject({ capability: 'PROCESS', target: '/bin/sh', completed: true });
    expect(observations.some((o) => o.target.includes('/tmp/sock'))).toBe(false);
    expect(baselineOpens).toBe(2);
    expect(observations.map((o) => o.sequence)).toEqual([...observations.keys()].map((i) => i + 1));
  });
  it('clean trace yields only a dns observation', () => {
    const { observations } = parseStrace(load('trace-clean.log'), ctx);
    expect(observations.map((o) => o.operation)).toEqual(['DNS']);
  });
  it('tolerates garbage lines', () => {
    expect(parseStrace('not a trace\n\n', ctx).observations).toEqual([]);
  });
});
