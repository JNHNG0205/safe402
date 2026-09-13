import { z } from 'zod';
import type { CapabilityManifest } from '../domain/types.js';

export class ManifestError extends Error {}

const hostname = z.string().min(1).transform((h) => h.toLowerCase()).refine((h) => h === '*' || /^[a-z0-9.-]+$/.test(h), 'invalid hostname');
const fsPath = z.string().min(1).transform((p) => (p.startsWith('~') ? '/home/tool' + p.slice(1) : p))
  .refine((p) => p === '*' || p.startsWith('/'), 'path must be absolute or *')
  .refine((p) => !p.split('/').includes('..'), 'path traversal not allowed');

export const manifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  tool: z.object({ name: z.string().min(1), version: z.string().min(1), functionId: z.string().min(1) }).strict(),
  runtime: z.object({ type: z.literal('node'), entrypoint: z.string().min(1) }).strict(),
  capabilities: z.object({
    network: z.array(z.object({ host: hostname, port: z.number().int().min(1).max(65535), methods: z.array(z.string().min(1)) }).strict()),
    filesystem: z.array(fsPath),
    process: z.array(z.string().min(1)),
    wallet: z.array(z.string().min(1).refine((w) => w !== '*', 'wallet wildcard not allowed')),
  }).strict(),
}).strict();

export function parseManifest(raw: unknown): CapabilityManifest {
  const r = manifestSchema.safeParse(raw);
  if (!r.success) throw new ManifestError(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data as CapabilityManifest;
}
