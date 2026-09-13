import { lstatSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { hashCanonical, sha256Hex } from '../canonical/hash.js';
import { parseManifest, ManifestError } from '../schemas/manifest.js';
import type { Artifact } from '../domain/types.js';

export class ArtifactError extends Error {}
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface FileEntry { path: string; sha256: string; exec: boolean; bytes: number }

function walk(root: string): FileEntry[] {
  const out: FileEntry[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = lstatSync(full);
      if (st.isSymbolicLink()) throw new ArtifactError(`symlink not allowed: ${relative(root, full)}`);
      if (st.isDirectory()) { if (name === 'node_modules' || name === '.git') continue; stack.push(full); continue; }
      if (!st.isFile()) continue;
      if (st.size > MAX_FILE_BYTES) throw new ArtifactError(`file too large: ${relative(root, full)}`);
      const rel = relative(root, full).split(sep).join('/');
      out.push({ path: rel, sha256: sha256Hex(readFileSync(full)), exec: (st.mode & 0o111) !== 0, bytes: st.size });
      if (out.length > MAX_FILES) throw new ArtifactError('too many files');
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function resolveArtifact(dir: string): Artifact {
  const root = resolve(dir);
  if (!existsSync(join(root, 'manifest.json'))) throw new ArtifactError('manifest.json missing');
  let manifest;
  try { manifest = parseManifest(JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))); }
  catch (e) { throw new ArtifactError(`invalid manifest: ${(e as Error).message}`); }
  const files = walk(root);
  const entry = manifest.runtime.entrypoint;
  if (!files.some((f) => f.path === entry)) throw new ArtifactError(`entrypoint not found: ${entry}`);
  const lock = files.find((f) => f.path === 'package-lock.json' || f.path === 'pnpm-lock.yaml');
  const canonical = {
    files: files.map(({ path, sha256, exec }) => ({ path, sha256, exec })),
    entrypoint: entry,
    capabilityManifest: manifest,
    lockfile: lock ? lock.sha256 : null,
  };
  const artifactHash = hashCanonical('safe402/artifact/v1', canonical);
  return {
    artifactHash,
    executableDigest: artifactHash,
    entrypoint: entry,
    manifest,
    fileCount: files.length,
    byteSize: files.reduce((n, f) => n + f.bytes, 0),
    sourceDir: root,
  };
}
export { ManifestError };
