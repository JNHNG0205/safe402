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
    expect(observations).toHaveLength(5);
    expect(cred.sequence).toBe(1);
    expect(tamper.sequence).toBe(2);
    expect(dns.sequence).toBe(3);
    expect(conn.sequence).toBe(4);
    expect(spawn.sequence).toBe(5);
  });
  it('clean trace yields only a dns observation', () => {
    const { observations } = parseStrace(load('trace-clean.log'), ctx);
    expect(observations.map((o) => o.operation)).toEqual(['DNS']);
  });
  it('tolerates garbage lines', () => {
    expect(parseStrace('not a trace\n\n', ctx).observations).toEqual([]);
  });
  it('emits a canary read outside /home/tool and excludes it from baseline', () => {
    const canaryProfile: ExecutionProfile = { ...profile, canaries: [{ path: '/srv/secret.json', kind: 'credential' }] };
    const canaryCtx = { ...ctx, profile: canaryProfile };
    const trace = [
      '12    1757800000.100000 execve("/usr/local/bin/node", ["node", "/artifact/server.js"], 0x7ffd /* 3 vars */) = 0',
      '12    1757800000.300000 openat(AT_FDCWD, "/srv/secret.json", O_RDONLY|O_CLOEXEC) = 9',
    ].join('\n');
    const { observations, baselineOpens } = parseStrace(trace, canaryCtx);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ capability: 'FILESYSTEM', operation: 'READ', target: '/srv/secret.json' });
    expect(baselineOpens).toBe(0);
  });
  it('does not flip a read-only open to WRITE because the filename contains O_TRUNC', () => {
    const trace = [
      '12    1757800000.100000 execve("/usr/local/bin/node", ["node", "/artifact/server.js"], 0x7ffd /* 3 vars */) = 0',
      '12    1757800000.300000 openat(AT_FDCWD, "/home/tool/O_TRUNC_marker", O_RDONLY|O_CLOEXEC) = 5',
    ].join('\n');
    const { observations } = parseStrace(trace, ctx);
    const obs = observations.find((o) => o.target === '/home/tool/O_TRUNC_marker')!;
    expect(obs.operation).toBe('READ');
  });
  it('attributes an unfinished/resumed call to the window where it was attempted, not where it resumed', () => {
    const trace = [
      '12    1757800000.100000 execve("/usr/local/bin/node", ["node", "/artifact/server.js"], 0x7ffd /* 3 vars */) = 0',
      '19    1757800000.900000 connect(20, {sa_family=AF_INET, sin_port=htons(80), sin_addr=inet_addr("93.184.216.34")}, 16 <unfinished ...>',
      '19    1757800001.100000 <... connect resumed>) = 0',
    ].join('\n');
    const { observations } = parseStrace(trace, ctx);
    const conn = observations.find((o) => o.operation === 'CONNECT')!;
    expect(conn).toMatchObject({ testId: 'mcp_initialize', target: '93.184.216.34:80' });
  });
  it('ignores clone3, exit, signal, and sendto-with-null-address lines without throwing or emitting', () => {
    const trace = [
      '12    1757800000.100000 execve("/usr/local/bin/node", ["node", "/artifact/server.js"], 0x7ffd /* 3 vars */) = 0',
      '12    1757800000.200000 clone3({flags=CLONE_VM|CLONE_VFORK, exit_signal=SIGCHLD}, 88) = 19',
      '19    1757800000.300000 +++ exited with 0 +++',
      '12    1757800000.400000 --- SIGCHLD {si_signo=SIGCHLD, si_code=CLD_EXITED, si_pid=19, si_uid=0, si_status=0} ---',
      '12    1757800000.500000 sendto(5, "ping", 12, 0, NULL, 0) = 12',
    ].join('\n');
    expect(() => parseStrace(trace, ctx)).not.toThrow();
    expect(parseStrace(trace, ctx).observations).toEqual([]);
  });
});
