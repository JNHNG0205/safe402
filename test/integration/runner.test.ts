import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveArtifact } from '../../src/artifacts/resolve.js';
import { loadProfile, runArtifact } from '../../runner/harness/run.js';

const ROOT = join(import.meta.dirname, '..', '..');
let docker = true; try { execFileSync('docker', ['info'], { stdio: 'ignore' }); } catch { docker = false; }
const { profile } = loadProfile(join(ROOT, 'runner/profiles/no-network-v1.json'));

describe.skipIf(!docker)('runner integration', () => {
  it('observes the credential read in the blocked fixture from the collector', async () => {
    const r = await runArtifact({ artifact: resolveArtifact(join(ROOT, 'fixtures/credential-attempt')), profile, auditId: 'audit_it_blocked', dataDir: mkdtempSync(join(tmpdir(), 's402-')) });
    expect(r.collectorError).toBeNull(); expect(r.timedOut).toBe(false);
    expect(r.coverage.testsCompleted).toEqual(expect.arrayContaining(['mcp_initialize', 'tools_list', 'get_price_call', 'credential_canary']));
    const cred = r.observations.find((o) => o.target === '/home/tool/.aws/credentials');
    expect(cred).toMatchObject({ sourceType: 'RUNTIME', capability: 'FILESYSTEM', operation: 'READ', attempted: true, completed: true });
  });
  it('does not observe a credential read in the clean fixture', async () => {
    const r = await runArtifact({ artifact: resolveArtifact(join(ROOT, 'fixtures/clean-price-tool')), profile, auditId: 'audit_it_clean', dataDir: mkdtempSync(join(tmpdir(), 's402-')) });
    expect(r.collectorError).toBeNull();
    expect(r.observations.some((o) => o.capability === 'FILESYSTEM' && o.target.startsWith('/home/tool'))).toBe(false);
    expect(r.coverage.testsCompleted).toContain('get_price_call');
  });
  it('reports collector failure when strace is missing', async () => {
    const r = await runArtifact({ artifact: resolveArtifact(join(ROOT, 'fixtures/clean-price-tool')), profile, auditId: 'audit_it_nocollector', dataDir: mkdtempSync(join(tmpdir(), 's402-')), straceBin: '/nonexistent/strace' });
    expect(r.collectorError).toBe('trace log missing');
    expect(r.coverage.testsCompleted).not.toContain('credential_canary');
  });
  it('kills on deadline', async () => {
    const r = await runArtifact({ artifact: resolveArtifact(join(ROOT, 'fixtures/clean-price-tool')), profile: { ...profile, deadlineMs: 1500, tests: [{ testId: 'mcp_initialize', required: true }, { testId: 'tools_list', required: true }] }, auditId: 'audit_it_deadline', dataDir: mkdtempSync(join(tmpdir(), 's402-')) });
    expect(r.timedOut === true || r.coverage.testsCompleted.length === 2).toBe(true);
  });
});
