import { posix as posixPath } from 'node:path';
import { manifestSchema } from '../schemas/manifest.js';
import type { CapabilityManifest, Decision, EvidenceBundle, ExecutionProfile, Policy } from './types.js';
import type { ReasonCode } from './reasonCodes.js';

export interface DecideInput {
  evidence: EvidenceBundle; policy: Policy; manifest: CapabilityManifest; profile: ExecutionProfile;
  bindings: { artifactHash: string; executionProfileHash: string };
}
export interface DecideResult { decision: Decision; reasonCodes: ReasonCode[] }

// Every path comparison below goes through this: a raw `/home/tool/.cache/../.aws/credentials`
// must not slip past a canary or an allowlist by looking textually different from its real target.
function normalizePath(p: string): string {
  return p === '*' ? '*' : posixPath.normalize(p);
}
function isCanary(profile: ExecutionProfile, target: string): boolean {
  const t = normalizePath(target);
  return profile.canaries.some((c) => normalizePath(c.path) === t);
}
function pathAllowed(allowed: string[], p: string): boolean {
  const n = normalizePath(p);
  return allowed.some((raw) => {
    const a = normalizePath(raw);
    return a === '*' || n === a || n.startsWith(a.endsWith('/') ? a : a + '/');
  });
}
/** The collector's fail-closed marker for an open it could not place; see runner/collectors/strace.ts. */
function isUnattributable(target: string): boolean {
  return target.startsWith('unresolved:');
}
function hostAllowed(allowed: string[], host: string): boolean {
  return allowed.includes('*') || allowed.includes(host);
}
// Bare IPs are treated as unattributable rather than undeclared: without DNS-to-connect correlation,
// blocking them would falsely block a tool connecting to its own declared host's address. A *completed*
// connect to a bare IP therefore raises nothing today — a known limitation, unreachable while
// ExecutionProfile.network is 'none', ledgered as a Phase 4 follow-up (collector DNS correlation).
function hostOf(target: string): string | null {
  if (target === 'unresolved') return null;
  const idx = target.lastIndexOf(':');
  const host = idx > 0 ? target.slice(0, idx) : target;
  return /^[0-9.]+$/.test(host) || host.includes('::') ? null : host;
}
// Spec 11.1 treats an invalid manifest as a binding failure. The manifest is schema-checked upstream
// when an artifact is resolved; re-checking here is the fail-closed backstop, so a malformed or
// traversal-bearing declaration can never reach the engine and read as "declares nothing".
function manifestUsable(manifest: CapabilityManifest): boolean {
  return manifestSchema.safeParse(manifest).success;
}

export function decide({ evidence, policy, manifest, profile, bindings }: DecideInput): DecideResult {
  const codes = new Set<ReasonCode>();
  const add = (c: ReasonCode) => codes.add(c);
  const done = (decision: Decision): DecideResult => ({ decision, reasonCodes: [...codes].sort() });

  // 1. Binding failure — the evidence must be about this artifact, this profile, and a valid manifest.
  const cov = evidence.coverage;
  if (
    evidence.artifactHash !== bindings.artifactHash ||
    evidence.executionProfileHash !== bindings.executionProfileHash ||
    cov.profileId !== profile.profileId ||
    cov.fixtureVersion !== evidence.artifactHash ||
    !manifestUsable(manifest)
  ) {
    return { decision: 'BLOCK', reasonCodes: ['BINDING_FAILURE'] };
  }

  // 2. Critical violations
  let critical = false;
  const declaredHosts = manifest.capabilities.network.map((n) => n.host);
  for (const o of evidence.observations) {
    if (o.sourceType !== 'RUNTIME') continue;
    if (o.capability === 'FILESYSTEM' && o.attempted && isCanary(profile, o.target)) {
      critical = true;
      if (o.operation === 'READ' && o.completed) {
        add('CREDENTIAL_ACCESS_OBSERVED');
        if (!pathAllowed(manifest.capabilities.filesystem, o.target)) add('UNDECLARED_FILE_ACCESS');
      } else {
        add('CREDENTIAL_ACCESS_ATTEMPTED');
      }
    }
    // The policy's own undeclared-capability rule, independent of the canary set: a file the tool
    // actually read or wrote, that its manifest never declared, is an undeclared access. Targets the
    // collector could not place (`unresolved:`) are deliberately excluded — they name no file, so
    // they cannot be judged against the allowlist and are handled as missing coverage in step 3.
    if (policy.rules.blockUndeclaredCapabilities && o.capability === 'FILESYSTEM' && o.completed
      && (o.operation === 'READ' || o.operation === 'WRITE') && !isUnattributable(o.target)
      && !pathAllowed(manifest.capabilities.filesystem, o.target)) { critical = true; add('UNDECLARED_FILE_ACCESS'); }
    if (o.capability === 'PROCESS' && o.operation === 'SPAWN' && o.attempted && !policy.rules.process.allowSpawn) { critical = true; add('PROCESS_SPAWN_FORBIDDEN'); }
    if (o.capability === 'WALLET') { critical = true; add('WALLET_ACCESS_OBSERVED'); }
    if (o.capability === 'NETWORK' && o.operation === 'CONNECT' && o.completed) {
      const host = hostOf(o.target);
      if (host && !hostAllowed(declaredHosts, host)) { critical = true; add('UNDECLARED_NETWORK_ACCESS'); }
    }
  }
  if (critical) return done('BLOCK');

  // 3. Coverage
  let incomplete = false;
  if (cov.collectorErrors.length > 0) { incomplete = true; add('COLLECTOR_FAILURE'); }
  // A live node process always opens files; an empty trace means the collector saw nothing, not that
  // the tool did nothing. Silence is missing evidence, never a clean run.
  if (cov.baselineOpens === 0 && evidence.observations.length === 0) { incomplete = true; add('COLLECTOR_FAILURE'); }
  if (cov.timedOut) { incomplete = true; add('RUNTIME_TIMEOUT'); }
  // A relative or dirfd-relative open the collector could not resolve means some file access is
  // unaccounted for. Unknown is never clean: it is coverage the collector failed to produce.
  if (evidence.observations.some((o) => o.sourceType === 'RUNTIME' && o.capability === 'FILESYSTEM' && isUnattributable(o.target))) { incomplete = true; add('UNRESOLVED_FILE_TARGET'); }
  const required = profile.tests.filter((t) => t.required).map((t) => t.testId);
  if (required.some((t) => !cov.testsCompleted.includes(t))) { incomplete = true; add('REQUIRED_TEST_INCOMPLETE'); }
  if (cov.staticIncomplete && policy.rules.requireCompleteCoverage) { incomplete = true; add('STATIC_COVERAGE_INCOMPLETE'); }
  if (incomplete) return done('REVIEW');

  // 4. Policy mismatch on declarations
  let mismatch = false;
  for (const h of declaredHosts) if (!hostAllowed(policy.rules.network.allowedHosts, h)) { mismatch = true; add('DECLARED_HOST_NOT_ALLOWED'); }
  if (manifest.capabilities.wallet.length > 0 && !policy.rules.wallet.allowSigning) { mismatch = true; add('DECLARED_WALLET_NOT_ALLOWED'); }
  if (manifest.capabilities.process.length > 0 && !policy.rules.process.allowSpawn) { mismatch = true; add('DECLARED_PROCESS_NOT_ALLOWED'); }
  for (const p of manifest.capabilities.filesystem) if (!pathAllowed(policy.rules.filesystem.allowedPaths, p)) { mismatch = true; add('DECLARED_PATH_NOT_ALLOWED'); }
  if (mismatch) return done('BLOCK');

  return { decision: 'ALLOW', reasonCodes: ['ALL_CHECKS_SATISFIED'] };
}
