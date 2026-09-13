import { z } from 'zod';
import type { Policy } from '../domain/types.js';

export class PolicyError extends Error {}

const host = z.string().refine((h) => h === '*' || /^[a-z0-9.-]+$/.test(h), 'hostname must be lowercase');
const path = z.string().refine((p) => p === '*' || p.startsWith('/'), 'path must be absolute or *');

export const policySchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    name: z.string().regex(/^[a-z0-9-]+$/),
    rules: z
      .object({
        requireCompleteCoverage: z.boolean(),
        blockUndeclaredCapabilities: z.boolean(),
        wallet: z.object({ allowSigning: z.boolean(), allowTransactions: z.boolean() }).strict(),
        process: z.object({ allowSpawn: z.boolean() }).strict(),
        filesystem: z.object({ allowedPaths: z.array(path) }).strict(),
        network: z.object({ allowedHosts: z.array(host) }).strict(),
      })
      .strict(),
    authorization: z.object({ ttlSeconds: z.number().int().min(60).max(86400) }).strict(),
  })
  .strict();

export function parsePolicy(raw: unknown): Policy {
  const r = policySchema.safeParse(raw);
  if (!r.success) throw new PolicyError(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
}
