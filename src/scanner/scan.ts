import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import type { Artifact, Finding } from '../domain/types.js';
import { DETECTORS } from './detectors.js';
export const ANALYZER_VERSION = 'regex-v1';

function jsFiles(root: string): string[] {
  const out: string[] = []; const stack = [root];
  while (stack.length) { const d = stack.pop()!; for (const n of readdirSync(d)) { const f = join(d, n); const st = statSync(f);
    if (st.isDirectory()) { if (n !== 'node_modules') stack.push(f); } else if (/\.(c|m)?js$/.test(n)) out.push(f); } }
  return out.sort();
}

export function scanArtifact(artifact: Artifact): { findings: Finding[]; staticIncomplete: boolean } {
  const findings: Finding[] = []; let staticIncomplete = false;
  for (const file of jsFiles(artifact.sourceDir)) {
    let text: string;
    try { text = readFileSync(file, 'utf8'); } catch { staticIncomplete = true; continue; }
    const rel = relative(artifact.sourceDir, file);
    text.split('\n').forEach((line, i) => {
      for (const d of DETECTORS) if (d.pattern.test(line)) {
        const id = createHash('sha256').update(`${artifact.artifactHash}|${rel}|${i + 1}|${d.ruleId}`).digest('hex').slice(0, 16);
        findings.push({ findingId: `finding_${id}`, ruleId: d.ruleId, sourceType: 'STATIC', severity: d.severity, file: rel, location: { line: i + 1 },
          description: d.description, evidenceReference: `artifact:${rel}#L${i + 1}`, confidence: 0.6, analyzerVersion: ANALYZER_VERSION });
      }
    });
  }
  return { findings, staticIncomplete };
}
