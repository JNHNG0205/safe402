import { describe, expect, it } from 'vitest';
import { decide, type DecideInput } from '../src/domain/decide.js';
import type { EvidenceBundle, Observation, Policy, CapabilityManifest, ExecutionProfile } from '../src/domain/types.js';

const manifest: CapabilityManifest = { schemaVersion: '1.0', tool: { name: 't', version: '1', functionId: 'f' }, runtime: { type: 'node', entrypoint: 'server.js' },
  capabilities: { network: [{ host: 'prices.example.test', port: 80, methods: ['GET'] }], filesystem: [], process: [], wallet: [] } };
const policy: Policy = { schemaVersion: '1.0', name: 'p', rules: { requireCompleteCoverage: true, blockUndeclaredCapabilities: true,
  wallet: { allowSigning: false, allowTransactions: false }, process: { allowSpawn: false }, filesystem: { allowedPaths: [] }, network: { allowedHosts: ['prices.example.test'] } }, authorization: { ttlSeconds: 3600 } };
const profile: ExecutionProfile = { profileId: 'no-network-v1', image: 'x', network: 'none', memoryBytes: 1, pidsLimit: 1, deadlineMs: 1, toolUser: 'nobody',
  canaries: [{ path: '/home/tool/.aws/credentials', kind: 'credential' }], env: {},
  tests: [{ testId: 'mcp_initialize', required: true }, { testId: 'get_price_call', required: true }, { testId: 'network_egress', required: false }] };

function obs(p: Partial<Observation>): Observation {
  return { schemaVersion: '1.0', auditId: 'a', sequence: 1, testId: 'get_price_call', sourceType: 'RUNTIME', capability: 'FILESYSTEM', operation: 'READ', target: '/x',
    attempted: true, permitted: true, completed: true, collectorVersion: 'strace-v1', evidenceReference: 'local:x', timestamp: 1, ...p };
}
function input(over: Partial<EvidenceBundle> = {}, covOver: Partial<EvidenceBundle['coverage']> = {}, bindOver: Partial<DecideInput['bindings']> = {}): DecideInput {
  const evidence: EvidenceBundle = { schemaVersion: '1.0', auditId: 'a', artifactHash: 'sha256:art', executionProfileHash: 'sha256:prof', evidenceMode: 'REAL_ARTIFACT_TEST',
    observations: [], findings: [], coverage: { profileId: 'no-network-v1', testsRequested: ['mcp_initialize', 'get_price_call'], testsCompleted: ['mcp_initialize', 'get_price_call'],
      testsSkipped: [{ testId: 'network_egress', reason: 'network disabled by profile' }], unsupported: [], collectorErrors: [], timedOut: false, baselineOpens: 12, staticIncomplete: false, fixtureVersion: 'sha256:art', ...covOver },
    collectorVersion: 'strace-v1', analyzerVersion: 'regex-v1', ...over };
  return { evidence, policy, manifest, profile, bindings: { artifactHash: 'sha256:art', executionProfileHash: 'sha256:prof', ...bindOver } };
}

describe('decide', () => {
  it('allows when everything is satisfied', () => {
    expect(decide(input())).toEqual({ decision: 'ALLOW', reasonCodes: ['ALL_CHECKS_SATISFIED'] });
  });
  it('binding failure wins over everything', () => {
    const r = decide(input({ observations: [obs({ target: '/home/tool/.aws/credentials' })] }, {}, { artifactHash: 'sha256:other' }));
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes[0]).toBe('BINDING_FAILURE');
  });
  it('completed canary read blocks with credential + undeclared codes', () => {
    const r = decide(input({ observations: [obs({ target: '/home/tool/.aws/credentials' })] }));
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['CREDENTIAL_ACCESS_OBSERVED', 'UNDECLARED_FILE_ACCESS']));
  });
  it('attempted but denied canary read still blocks', () => {
    const r = decide(input({ observations: [obs({ target: '/home/tool/.aws/credentials', permitted: false, completed: false })] }));
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('CREDENTIAL_ACCESS_ATTEMPTED');
  });
  it('a non-read canary touch is critical too', () => {
    const r = decide(input({ observations: [obs({ operation: 'WRITE', target: '/home/tool/.aws/credentials' })] }));
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('CREDENTIAL_ACCESS_ATTEMPTED');
  });
  it('process spawn blocks under allowSpawn=false', () => {
    const r = decide(input({ observations: [obs({ capability: 'PROCESS', operation: 'SPAWN', target: '/bin/sh' })] }));
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('PROCESS_SPAWN_FORBIDDEN');
  });
  it('completed connect to undeclared resolved host blocks', () => {
    const r = decide(input({ observations: [obs({ capability: 'NETWORK', operation: 'CONNECT', target: 'evil.example.test:80' })] }));
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('UNDECLARED_NETWORK_ACCESS');
  });
  it('blocked unresolved network attempts do not affect the verdict', () => {
    const r = decide(input({ observations: [
      obs({ capability: 'NETWORK', operation: 'DNS', target: 'unresolved', permitted: false, completed: false }),
      obs({ capability: 'NETWORK', operation: 'CONNECT', target: '10.0.0.1:80', permitted: false, completed: false }) ] }));
    expect(r.decision).toBe('ALLOW');
  });
  it('critical violation beats missing coverage', () => {
    const r = decide(input({ observations: [obs({ target: '/home/tool/.aws/credentials' })] }, { collectorErrors: ['x'] }));
    expect(r.decision).toBe('BLOCK');
  });
  it('collector failure, timeout, incomplete required test, static incomplete → REVIEW', () => {
    expect(decide(input({}, { collectorErrors: ['trace log missing'] })).reasonCodes).toContain('COLLECTOR_FAILURE');
    expect(decide(input({}, { timedOut: true })).reasonCodes).toContain('RUNTIME_TIMEOUT');
    expect(decide(input({}, { testsCompleted: ['mcp_initialize'] })).reasonCodes).toContain('REQUIRED_TEST_INCOMPLETE');
    expect(decide(input({}, { staticIncomplete: true })).reasonCodes).toContain('STATIC_COVERAGE_INCOMPLETE');
    for (const c of [{ collectorErrors: ['x'] }, { timedOut: true }, { testsCompleted: [] }, { staticIncomplete: true }]) expect(decide(input({}, c)).decision).toBe('REVIEW');
  });
  it('declared host not in policy allowlist blocks', () => {
    const m = structuredClone(manifest); m.capabilities.network.push({ host: 'other.example.test', port: 443, methods: ['GET'] });
    const r = decide({ ...input(), manifest: m });
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('DECLARED_HOST_NOT_ALLOWED');
  });
  it('declared wallet / process / path not allowed block', () => {
    const w = structuredClone(manifest); w.capabilities.wallet = ['sign'];
    expect(decide({ ...input(), manifest: w }).reasonCodes).toContain('DECLARED_WALLET_NOT_ALLOWED');
    const p = structuredClone(manifest); p.capabilities.process = ['spawn'];
    expect(decide({ ...input(), manifest: p }).reasonCodes).toContain('DECLARED_PROCESS_NOT_ALLOWED');
    const f = structuredClone(manifest); f.capabilities.filesystem = ['/etc/passwd'];
    expect(decide({ ...input(), manifest: f }).reasonCodes).toContain('DECLARED_PATH_NOT_ALLOWED');
  });
  it('a declared path within allowedPaths does not block', () => {
    const pol = structuredClone(policy); pol.rules.filesystem.allowedPaths = ['/home/tool/.cache'];
    const f = structuredClone(manifest); f.capabilities.filesystem = ['/home/tool/.cache/prices'];
    expect(decide({ ...input(), manifest: f, policy: pol }).decision).toBe('ALLOW');
  });

  // --- coverage of the remaining reason code and the fail-closed invariant ---

  it('a wallet observation blocks with WALLET_ACCESS_OBSERVED', () => {
    const r = decide(input({ observations: [obs({ capability: 'WALLET', operation: 'SIGN', target: 'solana:sign' })] }));
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('WALLET_ACCESS_OBSERVED');
    // spec 11.2: "any WALLET observation" is critical, attempted or not
    const q = decide(input({ observations: [obs({ capability: 'WALLET', operation: 'SIGN', target: 'solana:sign', attempted: false, permitted: false, completed: false })] }));
    expect(q.decision).toBe('BLOCK'); expect(q.reasonCodes).toContain('WALLET_ACCESS_OBSERVED');
  });

  it('an empty observation list with complete coverage but a collector error is REVIEW, never ALLOW', () => {
    const r = decide(input({ observations: [] }, { collectorErrors: ['x'] }));
    expect(r.decision).toBe('REVIEW');
    expect(r.reasonCodes).toEqual(['COLLECTOR_FAILURE']);
    expect(r.reasonCodes).not.toContain('ALL_CHECKS_SATISFIED');
  });

  it('an invalid manifest is a binding failure', () => {
    const broken = structuredClone(manifest) as unknown as { capabilities?: unknown };
    delete broken.capabilities;
    expect(decide({ ...input(), manifest: broken as unknown as CapabilityManifest })).toEqual({ decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] });
    const junk = structuredClone(manifest); (junk.capabilities as { filesystem: unknown }).filesystem = 'not-an-array';
    expect(decide({ ...input(), manifest: junk })).toEqual({ decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] });
  });

  it('a declared path with a traversal segment never reaches the allowlist check', () => {
    // The manifest schema rejects `..` outright, so the engine stops at the binding gate rather than
    // reaching DECLARED_PATH_NOT_ALLOWED. Either way the verdict is BLOCK — the traversal cannot pass.
    const pol = structuredClone(policy); pol.rules.filesystem.allowedPaths = ['/home/tool/.cache'];
    const f = structuredClone(manifest); f.capabilities.filesystem = ['/home/tool/.cache/../.aws/credentials'];
    expect(decide({ ...input(), manifest: f, policy: pol })).toEqual({ decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] });
  });

  it('a canary reached through a traversal target is still a credential access', () => {
    // Without path normalization this string does not equal the canary and the run would ALLOW.
    const r = decide(input({ observations: [obs({ target: '/home/tool/.cache/../.aws/credentials' })] }));
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCodes).toEqual(['CREDENTIAL_ACCESS_OBSERVED', 'UNDECLARED_FILE_ACCESS']);
  });

  it('normalizes redundant segments on both sides of the allowlist comparison', () => {
    const pol = structuredClone(policy); pol.rules.filesystem.allowedPaths = ['/home/tool/./.cache'];
    const f = structuredClone(manifest); f.capabilities.filesystem = ['/home/tool/.cache//prices/./feed'];
    expect(decide({ ...input(), manifest: f, policy: pol }).decision).toBe('ALLOW');
    const g = structuredClone(manifest); g.capabilities.filesystem = ['/home/tool/.cacheX'];
    expect(decide({ ...input(), manifest: g, policy: pol }).reasonCodes).toContain('DECLARED_PATH_NOT_ALLOWED');
  });

  it('a declared wallet blocks whenever signing is disallowed, even if transactions are allowed', () => {
    const pol = structuredClone(policy); pol.rules.wallet = { allowSigning: false, allowTransactions: true };
    const w = structuredClone(manifest); w.capabilities.wallet = ['sign'];
    const r = decide({ ...input(), manifest: w, policy: pol });
    expect(r.decision).toBe('BLOCK'); expect(r.reasonCodes).toContain('DECLARED_WALLET_NOT_ALLOWED');
  });

  it('coverage that belongs to another profile or another artifact is a binding failure', () => {
    expect(decide(input({}, { profileId: 'some-other-profile' }))).toEqual({ decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] });
    expect(decide(input({}, { fixtureVersion: 'sha256:someoneelse' }))).toEqual({ decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] });
  });

  it('a silent trace is a collector failure, not a clean run', () => {
    const r = decide(input({ observations: [] }, { baselineOpens: 0 }));
    expect(r).toEqual({ decision: 'REVIEW', reasonCodes: ['COLLECTOR_FAILURE'] });
    // baselineOpens > 0 with no observations is a genuine quiet run and still allows
    expect(decide(input({ observations: [] }, { baselineOpens: 12 })).decision).toBe('ALLOW');
  });

  it('a declared host of * covers any completed connect', () => {
    const m = structuredClone(manifest); m.capabilities.network = [{ host: '*', port: 80, methods: ['GET'] }];
    const pol = structuredClone(policy); pol.rules.network.allowedHosts = ['*'];
    const r = decide({ ...input({ observations: [obs({ capability: 'NETWORK', operation: 'CONNECT', target: 'evil.example.test:80' })] }), manifest: m, policy: pol });
    expect(r.decision).toBe('ALLOW');
  });

  it('collapses repeated violations into one code and accumulates every mismatch', () => {
    const dup = decide(input({ observations: [
      obs({ capability: 'PROCESS', operation: 'SPAWN', target: '/bin/sh', sequence: 1 }),
      obs({ capability: 'PROCESS', operation: 'SPAWN', target: '/bin/sh', sequence: 2 }) ] }));
    expect(dup.reasonCodes).toEqual(['PROCESS_SPAWN_FORBIDDEN']);
    const m = structuredClone(manifest);
    m.capabilities.network.push({ host: 'a.example.test', port: 443, methods: ['GET'] }, { host: 'b.example.test', port: 443, methods: ['GET'] });
    m.capabilities.wallet = ['sign']; m.capabilities.process = ['spawn']; m.capabilities.filesystem = ['/etc/passwd', '/etc/shadow'];
    const r = decide({ ...input(), manifest: m });
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCodes).toEqual(['DECLARED_HOST_NOT_ALLOWED', 'DECLARED_PATH_NOT_ALLOWED', 'DECLARED_PROCESS_NOT_ALLOWED', 'DECLARED_WALLET_NOT_ALLOWED']);
  });

  it('returns reason codes in a stable sorted order regardless of observation order', () => {
    const canary = obs({ target: '/home/tool/.aws/credentials' });
    const spawn = obs({ capability: 'PROCESS', operation: 'SPAWN', target: '/bin/sh' });
    const forward = decide(input({ observations: [canary, spawn] })).reasonCodes;
    const reverse = decide(input({ observations: [spawn, canary] })).reasonCodes;
    expect(forward).toEqual(reverse);
    expect(forward).toEqual(['CREDENTIAL_ACCESS_OBSERVED', 'PROCESS_SPAWN_FORBIDDEN', 'UNDECLARED_FILE_ACCESS']);
    expect([...forward]).toEqual([...forward].sort());
  });

  it('is pure: it does not mutate its inputs and repeats its verdict', () => {
    const i = input({ observations: [obs({ capability: 'NETWORK', operation: 'CONNECT', target: 'evil.example.test:80' })] });
    const before = JSON.stringify(i);
    const a = decide(i);
    const b = decide(i);
    expect(a).toEqual(b);
    expect(JSON.stringify(i)).toBe(before);
  });

  it('an unresolved filesystem target is missing coverage, not a clean run', () => {
    // The collector could not place the open, so the engine cannot say what was read. Unattributable
    // is REVIEW: it is never treated as "nothing happened", and never as a named undeclared access.
    const r = decide(input({ observations: [obs({ target: 'unresolved:credentials' })] }));
    expect(r.decision).toBe('REVIEW');
    expect(r.reasonCodes).toContain('UNRESOLVED_FILE_TARGET');
    expect(r.reasonCodes).not.toContain('UNDECLARED_FILE_ACCESS');
    expect(r.reasonCodes).not.toContain('ALL_CHECKS_SATISFIED');
  });

  it('blockUndeclaredCapabilities blocks a completed read outside the declared filesystem paths', () => {
    const r = decide(input({ observations: [obs({ target: '/home/tool/.ssh/id_rsa' })] }));
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCodes).toContain('UNDECLARED_FILE_ACCESS');
    const w = decide(input({ observations: [obs({ operation: 'WRITE', target: '/home/tool/.ssh/authorized_keys' })] }));
    expect(w.decision).toBe('BLOCK');
    expect(w.reasonCodes).toContain('UNDECLARED_FILE_ACCESS');
  });

  it('with blockUndeclaredCapabilities false the undeclared-file rule contributes no code', () => {
    const pol = structuredClone(policy); pol.rules.blockUndeclaredCapabilities = false;
    const r = decide({ ...input({ observations: [obs({ target: '/home/tool/.ssh/id_rsa' })] }), policy: pol });
    expect(r.decision).toBe('ALLOW');
    expect(r.reasonCodes).not.toContain('UNDECLARED_FILE_ACCESS');
  });

  it('a declared path covers a completed read under it', () => {
    const m = structuredClone(manifest); m.capabilities.filesystem = ['/home/tool/.cache'];
    const pol = structuredClone(policy); pol.rules.filesystem.allowedPaths = ['/home/tool/.cache'];
    const r = decide({ ...input({ observations: [obs({ target: '/home/tool/.cache/prices.json' })] }), manifest: m, policy: pol });
    expect(r.decision).toBe('ALLOW');
  });

  it('an attempted-but-denied undeclared read is not exfiltration and does not block', () => {
    const r = decide(input({ observations: [obs({ target: '/home/tool/.ssh/id_rsa', permitted: false, completed: false })] }));
    expect(r.decision).toBe('ALLOW');
  });
});
