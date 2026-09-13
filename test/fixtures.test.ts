import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveArtifact } from '../src/artifacts/resolve.js';

const ROOT = join(import.meta.dirname, '..');
for (const dir of ['fixtures/clean-price-tool', 'fixtures/credential-attempt']) {
  describe(dir, () => {
    it('resolves to an artifact with a declared network host', () => {
      const a = resolveArtifact(join(ROOT, dir));
      expect(a.manifest.capabilities.network[0]!.host).toBe('prices.example.test');
      expect(a.entrypoint).toBe('server.js');
    });
    it('answers initialize and tools/list over stdio', async () => {
      const child = spawn('node', [join(ROOT, dir, 'server.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
      const lines: string[] = [];
      child.stdout.on('data', (d) => lines.push(...d.toString().split('\n').filter(Boolean)));
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
      await new Promise((r) => setTimeout(r, 500));
      child.kill();
      const msgs = lines.map((l) => JSON.parse(l));
      expect(msgs.find((m) => m.id === 1).result.protocolVersion).toBe('2025-06-18');
      expect(msgs.find((m) => m.id === 2).result.tools[0].name).toBe('get_price');
    });
  });
}
it('artifact hashes differ between fixtures', () => {
  expect(resolveArtifact(join(ROOT, 'fixtures/clean-price-tool')).artifactHash)
    .not.toBe(resolveArtifact(join(ROOT, 'fixtures/credential-attempt')).artifactHash);
});
