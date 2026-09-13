import { describe, expect, it } from 'vitest';
import { canonicalJson, CanonicalError } from '../src/canonical/json.js';
import { hashCanonical } from '../src/canonical/hash.js';

describe('canonicalJson', () => {
  it('sorts keys recursively and strips whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: 'x' } })).toBe('{"a":{"c":"x","d":[3,{"y":2,"z":1}]},"b":1}');
  });
  it('rejects undefined, NaN, floats, functions', () => {
    expect(() => canonicalJson({ a: undefined })).toThrow(CanonicalError);
    expect(() => canonicalJson({ a: Number.NaN })).toThrow(CanonicalError);
    expect(() => canonicalJson({ a: 1.5 })).toThrow(CanonicalError);
    expect(() => canonicalJson({ a: () => 1 })).toThrow(CanonicalError);
  });
  it('accepts null, booleans, integers, strings', () => {
    expect(canonicalJson({ n: null, t: true, i: -3, s: 'é' })).toBe('{"i":-3,"n":null,"s":"é","t":true}');
  });
});

describe('hashCanonical', () => {
  it('is stable across key order and changes with domain', () => {
    const a = hashCanonical('safe402/artifact/v1', { x: 1, y: 2 });
    const b = hashCanonical('safe402/artifact/v1', { y: 2, x: 1 });
    const c = hashCanonical('safe402/evidence/v1', { x: 1, y: 2 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
