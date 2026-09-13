export class CanonicalError extends Error {}

function normalize(value: unknown, path: string): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(value) || !Number.isInteger(value)) throw new CanonicalError(`non-integer number at ${path}`);
      return value;
    case 'object': {
      if (Array.isArray(value)) return value.map((v, i) => normalize(v, `${path}[${i}]`));
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        const v = (value as Record<string, unknown>)[key];
        if (v === undefined) throw new CanonicalError(`undefined at ${path}.${key}`);
        out[key] = normalize(v, `${path}.${key}`);
      }
      return out;
    }
    default:
      throw new CanonicalError(`unsupported ${typeof value} at ${path}`);
  }
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value, '$'));
}
