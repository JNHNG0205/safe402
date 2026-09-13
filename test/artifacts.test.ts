import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseManifest, ManifestError } from '../src/schemas/manifest.js';
import { resolveArtifact, ArtifactError } from '../src/artifacts/resolve.js';

const SAMPLE = join(import.meta.dirname, 'samples', 'mini-tool');
function copySample(): string { const d = mkdtempSync(join(tmpdir(), 's402-')); cpSync(SAMPLE, d, { recursive: true }); return d; }

describe('parseManifest', () => {
  const base = JSON.parse(readFileSync(join(SAMPLE, 'manifest.json'), 'utf8'));
  it('accepts the sample', () => { expect(parseManifest(base).tool.name).toBe('mini'); });
  it('rejects unknown fields', () => { expect(() => parseManifest({ ...base, extra: 1 })).toThrow(ManifestError); });
  it('rejects a missing capability key', () => {
    const m = structuredClone(base); delete m.capabilities.wallet;
    expect(() => parseManifest(m)).toThrow(ManifestError);
  });
  it('lowercases hostnames and rejects wallet wildcard', () => {
    const m = structuredClone(base); m.capabilities.network = [{ host: 'Prices.Example.TEST', port: 80, methods: ['GET'] }];
    expect(parseManifest(m).capabilities.network[0]!.host).toBe('prices.example.test');
    const w = structuredClone(base); w.capabilities.wallet = ['*'];
    expect(() => parseManifest(w)).toThrow(ManifestError);
  });
  it('expands ~ in filesystem paths', () => {
    const m = structuredClone(base); m.capabilities.filesystem = ['~/.cache/x'];
    expect(parseManifest(m).capabilities.filesystem[0]).toBe('/home/tool/.cache/x');
  });
  it('rejects filesystem paths containing a traversal segment, before and after ~ expansion', () => {
    for (const p of ['/home/tool/.cache/../.aws/credentials', '~/.cache/../.aws/credentials', '/home/tool/..']) {
      const m = structuredClone(base); m.capabilities.filesystem = [p];
      expect(() => parseManifest(m)).toThrow(ManifestError);
      expect(() => parseManifest(m)).toThrow(/path traversal not allowed/);
    }
    const ok = structuredClone(base); ok.capabilities.filesystem = ['/home/tool/..cache/x'];
    expect(parseManifest(ok).capabilities.filesystem[0]).toBe('/home/tool/..cache/x');
  });
});

describe('resolveArtifact', () => {
  it('hashes deterministically and changes with one byte', () => {
    const a = resolveArtifact(copySample());
    const b = resolveArtifact(copySample());
    expect(a.artifactHash).toBe(b.artifactHash);
    expect(a.executableDigest).toBe(a.artifactHash);
    expect(a.fileCount).toBe(2);
    const dir = copySample(); writeFileSync(join(dir, 'server.js'), "process.stdout.write('ok!\\n');");
    expect(resolveArtifact(dir).artifactHash).not.toBe(a.artifactHash);
  });
  it('rejects missing manifest and missing entrypoint', () => {
    const dir = copySample();
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ ...manifest, runtime: { type: 'node', entrypoint: 'nope.js' } }));
    expect(() => resolveArtifact(dir)).toThrow(ArtifactError);
    expect(() => resolveArtifact(mkdtempSync(join(tmpdir(), 's402-empty-')))).toThrow(ArtifactError);
  });
});
