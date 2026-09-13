import { hashCanonical } from '../canonical/hash.js';
import type {
  CapabilityManifest, DecisionCapsule, DeclaredVsObservedRow, EvidenceBundle, Report,
} from '../domain/types.js';

const WORDING: Record<DecisionCapsule['decision'], string> = {
  ALLOW: 'Allowed under this policy.',
  BLOCK: 'Execution blocked: forbidden behavior was observed or the declaration violates the policy.',
  REVIEW: 'Audit incomplete. Execution remains unavailable.',
};

export function explain(capsule: DecisionCapsule): string {
  if (capsule.decision === 'BLOCK' && capsule.reasonCodes.some((c) => c.startsWith('CREDENTIAL_ACCESS'))) {
    return 'Execution blocked: undeclared credential access was observed.';
  }
  return WORDING[capsule.decision];
}

export function declaredVsObserved(manifest: CapabilityManifest, evidence: EvidenceBundle): DeclaredVsObservedRow[] {
  const obs = (cap: DeclaredVsObservedRow['capability']): string[] =>
    [...new Set(evidence.observations.filter((o) => o.capability === cap && o.attempted).map((o) => o.target))];
  const rows: DeclaredVsObservedRow[] = [
    { capability: 'NETWORK', declared: manifest.capabilities.network.map((n) => `${n.host}:${n.port}`), observed: obs('NETWORK'), undeclared: [] },
    { capability: 'FILESYSTEM', declared: manifest.capabilities.filesystem, observed: obs('FILESYSTEM'), undeclared: [] },
    { capability: 'PROCESS', declared: manifest.capabilities.process, observed: obs('PROCESS'), undeclared: [] },
    { capability: 'WALLET', declared: manifest.capabilities.wallet, observed: obs('WALLET'), undeclared: [] },
  ];
  for (const r of rows) {
    // "unresolved" targets are sandbox-denied attempts the collector could not name; they are
    // reported as observed but never counted as undeclared, since no target can be attributed.
    r.undeclared = r.observed.filter((t) => t !== 'unresolved'
      && !r.declared.some((d) => t === d || t.startsWith(d.split(':')[0]! + ':') || t.startsWith(d + '/')));
  }
  return rows;
}

/**
 * The report body is the signed payload. Publication references (payment, HCS, chain, graph)
 * deliberately live only in the envelope, never here.
 */
export function buildReport(a: {
  reportId: string;
  capsule: DecisionCapsule;
  capsuleHash: string;
  manifest: CapabilityManifest;
  evidence: EvidenceBundle;
  evidenceReference: string;
}): { report: Report; reportHash: string } {
  const report: Report = {
    schemaVersion: '1.0',
    reportId: a.reportId,
    capsule: a.capsule,
    capsuleHash: a.capsuleHash,
    explanation: explain(a.capsule),
    declaredVsObserved: declaredVsObserved(a.manifest, a.evidence),
    findings: a.evidence.findings,
    coverage: a.evidence.coverage,
    evidenceReference: a.evidenceReference,
  };
  return { report, reportHash: hashCanonical('safe402/report/v1', report) };
}
