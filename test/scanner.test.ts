import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveArtifact } from '../src/artifacts/resolve.js';
import { scanArtifact } from '../src/scanner/scan.js';
const ROOT = join(import.meta.dirname, '..');
describe('scanArtifact', () => {
  it('flags fs and env in the blocked fixture but not the clean one', () => {
    const blocked = scanArtifact(resolveArtifact(join(ROOT, 'fixtures/credential-attempt')));
    const clean = scanArtifact(resolveArtifact(join(ROOT, 'fixtures/clean-price-tool')));
    expect(blocked.findings.map((f) => f.ruleId)).toEqual(expect.arrayContaining(['FS_ACCESS', 'ENV_READ', 'NETWORK_TARGET']));
    expect(clean.findings.map((f) => f.ruleId)).not.toContain('FS_ACCESS');
    expect(clean.findings.map((f) => f.ruleId)).toContain('NETWORK_TARGET');
    for (const f of blocked.findings) { expect(f.sourceType).toBe('STATIC'); expect(f.location.line).toBeGreaterThan(0); expect(f.analyzerVersion).toBe('regex-v1'); }
    expect(blocked.staticIncomplete).toBe(false);
  });
});
