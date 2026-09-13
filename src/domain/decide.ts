import type { CapabilityManifest, Decision, EvidenceBundle, ExecutionProfile, Observation, Policy } from './types.js';
import type { ReasonCode } from './reasonCodes.js';

export interface DecideInput {
  evidence: EvidenceBundle; policy: Policy; manifest: CapabilityManifest; profile: ExecutionProfile;
  bindings: { artifactHash: string; executionProfileHash: string };
}
export interface DecideResult { decision: Decision; reasonCodes: ReasonCode[] }

function isCanary(profile: ExecutionProfile, target: string): boolean {
  return profile.canaries.some((c) => c.path === target);
}
function pathAllowed(allowed: string[], p: string): boolean {
  return allowed.some((a) => a === '*' || p === a || p.startsWith(a.endsWith('/') ? a : a + '/'));
}
function hostAllowed(allowed: string[], host: string): boolean {
  return allowed.includes('*') || allowed.includes(host);
}
function hostOf(target: string): string | null {
  if (target === 'unresolved') return null;
  const idx = target.lastIndexOf(':');
  const host = idx > 0 ? target.slice(0, idx) : target;
  return /^[0-9.]+$/.test(host) || host.includes('::') ? null : host; // bare IPs are unresolved hosts
}
// Spec 11.1 treats an invalid manifest as a binding failure. The manifest is schema-checked
// upstream (src/schemas/manifest.ts); this is the fail-closed guard for anything that reaches
// the engine unvalidated, so a malformed declaration can never read as "declares nothing".
function manifestUsable(m: CapabilityManifest): boolean {
  const c = m?.capabilities as CapabilityManifest['capabilities'] | undefined;
  if (!c) return false;
  return Array.isArray(c.network) && Array.isArray(c.filesystem) && Array.isArray(c.process) && Array.isArray(c.wallet)
    && c.network.every((n) => typeof n?.host === 'string')
    && c.filesystem.every((p) => typeof p === 'string');
}

export function decide({ evidence, policy, manifest, profile, bindings }: DecideInput): DecideResult {
  const codes = new Set<ReasonCode>();
  const add = (c: ReasonCode) => codes.add(c);

  // 1. Binding failure
  if (evidence.artifactHash !== bindings.artifactHash || evidence.executionProfileHash !== bindings.executionProfileHash || !manifestUsable(manifest)) {
    return { decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] };
  }

  // 2. Critical violations
  let critical = false;
  const declaredHosts = manifest.capabilities.network.map((n) => n.host);
  for (const o of evidence.observations as Observation[]) {
    if (o.sourceType !== 'RUNTIME') continue;
    if (o.capability === 'FILESYSTEM' && isCanary(profile, o.target) && o.attempted) {
      critical = true;
      add(o.completed ? 'CREDENTIAL_ACCESS_OBSERVED' : 'CREDENTIAL_ACCESS_ATTEMPTED');
      if (!pathAllowed(manifest.capabilities.filesystem, o.target)) add('UNDECLARED_FILE_ACCESS');
    }
    if (o.capability === 'PROCESS' && o.operation === 'SPAWN' && o.attempted && !policy.rules.process.allowSpawn) { critical = true; add('PROCESS_SPAWN_FORBIDDEN'); }
    if (o.capability === 'WALLET') { critical = true; add('WALLET_ACCESS_OBSERVED'); }
    if (o.capability === 'NETWORK' && o.operation === 'CONNECT' && o.completed) {
      const host = hostOf(o.target);
      if (host && !declaredHosts.includes(host)) { critical = true; add('UNDECLARED_NETWORK_ACCESS'); }
    }
  }
  if (critical) return { decision: 'BLOCK', reasonCodes: [...codes] };

  // 3. Coverage
  const cov = evidence.coverage;
  let incomplete = false;
  if (cov.collectorErrors.length > 0) { incomplete = true; add('COLLECTOR_FAILURE'); }
  if (cov.timedOut) { incomplete = true; add('RUNTIME_TIMEOUT'); }
  const required = profile.tests.filter((t) => t.required).map((t) => t.testId);
  if (required.some((t) => !cov.testsCompleted.includes(t))) { incomplete = true; add('REQUIRED_TEST_INCOMPLETE'); }
  if (cov.staticIncomplete && policy.rules.requireCompleteCoverage) { incomplete = true; add('STATIC_COVERAGE_INCOMPLETE'); }
  if (incomplete) return { decision: 'REVIEW', reasonCodes: [...codes] };

  // 4. Policy mismatch on declarations
  let mismatch = false;
  for (const h of declaredHosts) if (!hostAllowed(policy.rules.network.allowedHosts, h)) { mismatch = true; add('DECLARED_HOST_NOT_ALLOWED'); }
  if (manifest.capabilities.wallet.length > 0 && !(policy.rules.wallet.allowSigning || policy.rules.wallet.allowTransactions)) { mismatch = true; add('DECLARED_WALLET_NOT_ALLOWED'); }
  if (manifest.capabilities.process.length > 0 && !policy.rules.process.allowSpawn) { mismatch = true; add('DECLARED_PROCESS_NOT_ALLOWED'); }
  for (const p of manifest.capabilities.filesystem) if (!pathAllowed(policy.rules.filesystem.allowedPaths, p)) { mismatch = true; add('DECLARED_PATH_NOT_ALLOWED'); }
  if (mismatch) return { decision: 'BLOCK', reasonCodes: [...codes] };

  return { decision: 'ALLOW', reasonCodes: ['ALL_CHECKS_SATISFIED'] };
}
