import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { parsePolicy, PolicyError } from '../schemas/policy.js';
import type { Policy } from '../domain/types.js';

export function parsePolicyYaml(text: string): Policy {
  let raw: unknown;
  try {
    raw = parse(text, { uniqueKeys: true });
  } catch (e) {
    throw new PolicyError(`yaml: ${(e as Error).message}`);
  }
  return parsePolicy(raw);
}

export function loadPolicyFile(path: string): Policy {
  return parsePolicyYaml(readFileSync(path, 'utf8'));
}
