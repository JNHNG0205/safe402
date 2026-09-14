import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveArtifact } from '../src/artifacts/resolve.js';
import { hashCanonical } from '../src/canonical/hash.js';
import { ANALYZER_VERSION, scanArtifact } from '../src/scanner/scan.js';
import { buildEvidence } from '../src/evidence/bundle.js';
import { authorizationKey, buildCapsule } from '../src/reports/capsule.js';
import { buildReport } from '../src/reports/report.js';
import { issuerFromSeed, signReport } from '../src/reports/sign.js';
import { verifyEnvelope } from '../src/reports/verify.js';
import type { CapabilityManifest } from '../src/domain/types.js';
import type { RunResult } from '../runner/harness/run.js';

const ROOT = join(import.meta.dirname, '..');

const manifest: CapabilityManifest = {
  schemaVersion: '1.0',
  tool: { name: 't', version: '1', functionId: 'f' },
  runtime: { type: 'node', entrypoint: 's.js' },
  capabilities: { network: [{ host: 'prices.example.test', port: 80, methods: ['GET'] }], filesystem: [], process: [], wallet: [] },
};

const run: RunResult = {
  observations: [{
    schemaVersion: '1.0', auditId: 'a', sequence: 1, testId: 't', sourceType: 'RUNTIME', capability: 'FILESYSTEM',
    operation: 'READ', target: '/home/tool/.aws/credentials', attempted: true, permitted: true, completed: true,
    collectorVersion: 'strace-v1', evidenceReference: 'local:x', timestamp: 1,
  }],
  coverage: {
    profileId: 'p', testsRequested: ['t'], testsCompleted: ['t'], testsSkipped: [], unsupported: [], collectorErrors: [],
    timedOut: false, baselineOpens: 0, staticIncomplete: false, fixtureVersion: 'sha256:art',
  },
  exitCode: 0, timedOut: false, collectorError: null, stderr: '', testResults: {},
};

const seed = 'ab'.repeat(32);

const capsuleArgs = {
  auditId: 'a', artifactHash: 'sha256:art', executionProfileHash: 'sha256:prof', policyCommitment: 'sha256:pol',
  subjectId: 's', issuedAt: 1000, ttlSeconds: 3600,
};

function build() {
  const { bundle, evidenceHash } = buildEvidence({
    auditId: 'a', artifactHash: 'sha256:art', executionProfileHash: 'sha256:prof', run, findings: [],
    staticIncomplete: false, analyzerVersion: 'regex-v1',
  });
  const blocked = buildCapsule({
    ...capsuleArgs, evidenceHash, decision: 'BLOCK', reasonCodes: ['CREDENTIAL_ACCESS_OBSERVED'], authorizationSequence: 1,
  });
  const allowed = buildCapsule({
    ...capsuleArgs, evidenceHash, decision: 'ALLOW', reasonCodes: ['ALL_CHECKS_SATISFIED'], authorizationSequence: 2,
  });
  const report = buildReport({
    reportId: 'report_1', capsule: blocked.capsule, capsuleHash: blocked.capsuleHash, manifest, evidence: bundle,
    evidenceReference: 'local:x',
  });
  const issuer = issuerFromSeed(seed);
  const env = signReport(report.report, report.reportHash, 'issuer-1', issuer.privateKey);
  return { bundle, evidenceHash, blocked, allowed, report, issuer, env, trusted: { 'issuer-1': issuer.publicKeyHex } };
}

describe('evidence bundle', () => {
  it('is a real-artifact-test bundle bound to the run and hashed under the evidence domain', () => {
    const { bundle, evidenceHash } = build();
    expect(bundle.evidenceMode).toBe('REAL_ARTIFACT_TEST');
    expect(bundle.schemaVersion).toBe('1.0');
    expect(bundle.collectorVersion).toBe('strace-v1');
    expect(bundle.analyzerVersion).toBe('regex-v1');
    expect(bundle.observations).toEqual(run.observations);
    expect(bundle.coverage.staticIncomplete).toBe(false);
    expect(bundle.coverage.profileId).toBe('p');
    expect(evidenceHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(evidenceHash).toBe(hashCanonical('safe402/evidence/v1', bundle));
  });

  it('canonicalizes when real static findings are included', () => {
    const artifact = resolveArtifact(join(ROOT, 'fixtures/credential-attempt'));
    const { findings, staticIncomplete } = scanArtifact(artifact);
    expect(findings.length).toBeGreaterThan(0);
    const { bundle, evidenceHash } = buildEvidence({
      auditId: 'a', artifactHash: artifact.artifactHash, executionProfileHash: 'sha256:prof', run, findings,
      staticIncomplete, analyzerVersion: ANALYZER_VERSION,
    });
    expect(bundle.findings).toHaveLength(findings.length);
    for (const f of bundle.findings) expect(Number.isInteger(f.confidence)).toBe(true);
    expect(evidenceHash).toBe(hashCanonical('safe402/evidence/v1', bundle));
  });

  it('refuses observations belonging to another audit', () => {
    const foreign: RunResult = { ...run, observations: [{ ...run.observations[0]!, auditId: 'other' }] };
    expect(() => buildEvidence({
      auditId: 'a', artifactHash: 'sha256:art', executionProfileHash: 'sha256:prof', run: foreign, findings: [],
      staticIncomplete: false, analyzerVersion: 'regex-v1',
    })).toThrow(/observation auditId other does not match bundle auditId a/);
  });

  it('carries the caller-supplied staticIncomplete flag into coverage', () => {
    const { bundle } = buildEvidence({
      auditId: 'a', artifactHash: 'sha256:art', executionProfileHash: 'sha256:prof', run, findings: [],
      staticIncomplete: true, analyzerVersion: 'regex-v1',
    });
    expect(bundle.coverage.staticIncomplete).toBe(true);
  });
});

describe('decision capsule', () => {
  it('never expires unless the decision is ALLOW and always runs LOCAL', () => {
    const { blocked, allowed, evidenceHash } = build();
    expect(blocked.capsule.expiresAt).toBeNull();
    expect(blocked.capsule.confidentialExecutionMode).toBe('LOCAL');
    expect(blocked.capsule.evidenceHash).toBe(evidenceHash);
    expect(allowed.capsule.expiresAt).toBe(4600);
    expect(allowed.capsule.confidentialExecutionMode).toBe('LOCAL');
    const review = buildCapsule({
      ...capsuleArgs, evidenceHash, decision: 'REVIEW', reasonCodes: ['COLLECTOR_FAILURE'], authorizationSequence: 3,
    });
    expect(review.capsule.expiresAt).toBeNull();
  });

  it('sorts reason codes and hashes under the capsule domain', () => {
    const { evidenceHash } = build();
    const { capsule, capsuleHash } = buildCapsule({
      ...capsuleArgs, evidenceHash, decision: 'BLOCK',
      reasonCodes: ['UNDECLARED_FILE_ACCESS', 'CREDENTIAL_ACCESS_OBSERVED'], authorizationSequence: 1,
    });
    expect(capsule.reasonCodes).toEqual(['CREDENTIAL_ACCESS_OBSERVED', 'UNDECLARED_FILE_ACCESS']);
    expect(capsuleHash).toBe(hashCanonical('safe402/capsule/v1', capsule));
  });

  it('authorization key is deterministic and separates subjects', () => {
    expect(authorizationKey('s', 'a', 'p', 'e')).toBe(authorizationKey('s', 'a', 'p', 'e'));
    expect(authorizationKey('s', 'a', 'p', 'e')).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(authorizationKey('s', 'a', 'p', 'e')).not.toBe(authorizationKey('s2', 'a', 'p', 'e'));
    expect(authorizationKey('s', 'a', 'p', 'e')).not.toBe(authorizationKey('s', 'a2', 'p', 'e'));
    expect(authorizationKey('s', 'a', 'p', 'e')).not.toBe(authorizationKey('s', 'a', 'p2', 'e'));
    expect(authorizationKey('s', 'a', 'p', 'e')).not.toBe(authorizationKey('s', 'a', 'p', 'e2'));
  });

  it('authorization key resists separator injection', () => {
    // Under a newline-joined encoding these two tuples produce the identical pre-image
    // "<tag>\ns\na\np\ne\nx", so an attacker controlling subjectId could forge another
    // subject's authorization lineage. Canonical-JSON hashing keeps them distinct.
    expect(authorizationKey('s\na', 'p', 'e', 'x')).not.toBe(authorizationKey('s', 'a', 'p', 'e\nx'));
    expect(authorizationKey('s\na', 'p', 'e', 'x')).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('report', () => {
  it('explains a credential-access block and tabulates declared vs observed', () => {
    const { report } = build();
    expect(report.report.explanation).toContain('undeclared credential access');
    const fs = report.report.declaredVsObserved.find((r) => r.capability === 'FILESYSTEM');
    expect(fs!.undeclared).toEqual(['/home/tool/.aws/credentials']);
    expect(fs!.observed).toEqual(['/home/tool/.aws/credentials']);
    const net = report.report.declaredVsObserved.find((r) => r.capability === 'NETWORK');
    expect(net!.declared).toEqual(['prices.example.test:80']);
    expect(net!.observed).toEqual([]);
    expect(net!.undeclared).toEqual([]);
    expect(report.report.declaredVsObserved.map((r) => r.capability)).toEqual(['NETWORK', 'FILESYSTEM', 'PROCESS', 'WALLET']);
    expect(report.reportHash).toBe(hashCanonical('safe402/report/v1', report.report));
  });

  it('uses the decision-keyed wording for ALLOW and REVIEW', () => {
    const { bundle, allowed, evidenceHash } = build();
    const allowReport = buildReport({
      reportId: 'r_allow', capsule: allowed.capsule, capsuleHash: allowed.capsuleHash, manifest, evidence: bundle,
      evidenceReference: 'local:x',
    });
    expect(allowReport.report.explanation).toBe('Allowed under this policy.');
    const review = buildCapsule({
      ...capsuleArgs, evidenceHash, decision: 'REVIEW', reasonCodes: ['COLLECTOR_FAILURE'], authorizationSequence: 3,
    });
    const reviewReport = buildReport({
      reportId: 'r_review', capsule: review.capsule, capsuleHash: review.capsuleHash, manifest, evidence: bundle,
      evidenceReference: 'local:x',
    });
    expect(reviewReport.report.explanation).toBe('Audit incomplete. Execution remains unavailable.');
  });

  it('keeps evidence, capsule, and report hashes distinct under distinct domain tags', () => {
    const { evidenceHash, blocked, report } = build();
    expect(new Set([evidenceHash, blocked.capsuleHash, report.reportHash]).size).toBe(3);
    expect(hashCanonical('safe402/report/v1', blocked.capsule)).not.toBe(blocked.capsuleHash);
    expect(hashCanonical('safe402/evidence/v1', blocked.capsule)).not.toBe(blocked.capsuleHash);
  });
});

describe('signing and verification', () => {
  it('round-trips a signed envelope', () => {
    const { env, trusted, report } = build();
    expect(env.reportHash).toBe(report.reportHash);
    expect(env.issuer).toBe('issuer-1');
    expect(env.signature).toMatch(/^[0-9a-f]{128}$/);
    expect(env.publication).toEqual({});
    expect(Object.keys(env.report)).not.toContain('publication');
    expect(verifyEnvelope(env, trusted, 2000)).toEqual({
      ok: true, failedCheck: null, checks: ['schema', 'reportHash', 'issuer', 'signature', 'capsuleHash', 'expiry'],
    });
  });

  it('derives a stable 32-byte public key from a seed and rejects malformed seeds', () => {
    const a = issuerFromSeed(seed);
    const b = issuerFromSeed('0x' + seed);
    expect(a.publicKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(b.publicKeyHex).toBe(a.publicKeyHex);
    expect(() => issuerFromSeed('ab')).toThrow(/32 bytes/);
    // Buffer.from(_, 'hex') would truncate at the 'z' and silently yield a different key.
    expect(() => issuerFromSeed('ab'.repeat(32) + 'zz')).toThrow(/32 bytes of hex/);
    expect(() => issuerFromSeed('zz'.repeat(32))).toThrow(/32 bytes of hex/);
  });

  it('refuses to sign a hash that does not belong to the body', () => {
    const { report, issuer } = build();
    expect(() => signReport(report.report, 'sha256:' + '0'.repeat(64), 'issuer-1', issuer.privateKey))
      .toThrow(/reportHash mismatch/);
  });

  it('rejects an unknown issuer', () => {
    const { env } = build();
    expect(verifyEnvelope(env, {}, 2000)).toMatchObject({ ok: false, failedCheck: 'issuer', checks: ['schema', 'reportHash'] });
  });

  it('rejects an issuer that only resolves through the prototype chain', () => {
    const { env, issuer } = build();
    const inherited = Object.create({ 'issuer-1': issuer.publicKeyHex }) as Record<string, string>;
    expect(inherited['issuer-1']).toBe(issuer.publicKeyHex);
    expect(verifyEnvelope(env, inherited, 2000)).toMatchObject({ ok: false, failedCheck: 'issuer' });
    expect(verifyEnvelope({ ...env, issuer: 'toString' }, {}, 2000)).toMatchObject({ ok: false, failedCheck: 'issuer' });
  });

  it('rejects a signature that is not lowercase 64-byte hex', () => {
    const { env, trusted } = build();
    expect(verifyEnvelope({ ...env, signature: env.signature.toUpperCase() }, trusted, 2000))
      .toMatchObject({ ok: false, failedCheck: 'signature' });
    expect(verifyEnvelope({ ...env, signature: env.signature + '00' }, trusted, 2000))
      .toMatchObject({ ok: false, failedCheck: 'signature' });
    expect(verifyEnvelope({ ...env, signature: env.signature.slice(0, -2) }, trusted, 2000))
      .toMatchObject({ ok: false, failedCheck: 'signature' });
  });

  it('rejects an unknown report schemaVersion or decision at schema', () => {
    const { env, trusted } = build();
    const wrongVersion = structuredClone(env);
    (wrongVersion.report as { schemaVersion: string }).schemaVersion = '2.0';
    expect(verifyEnvelope(wrongVersion, trusted, 2000)).toMatchObject({ ok: false, failedCheck: 'schema', checks: [] });
    const wrongDecision = structuredClone(env);
    (wrongDecision.report.capsule as { decision: string }).decision = 'MAYBE';
    expect(verifyEnvelope(wrongDecision, trusted, 2000)).toMatchObject({ ok: false, failedCheck: 'schema', checks: [] });
  });

  it('refuses to judge expiry without a usable clock', () => {
    const { env, trusted } = build();
    expect(verifyEnvelope(env, trusted, Number.NaN)).toMatchObject({
      ok: false, failedCheck: 'expiry', checks: ['schema', 'reportHash', 'issuer', 'signature', 'capsuleHash'],
    });
    expect(verifyEnvelope(env, trusted, undefined as unknown as number)).toMatchObject({ ok: false, failedCheck: 'expiry' });
    expect(verifyEnvelope(env, trusted, 2000.5)).toMatchObject({ ok: false, failedCheck: 'expiry' });
    expect(verifyEnvelope(env, trusted, Number.POSITIVE_INFINITY)).toMatchObject({ ok: false, failedCheck: 'expiry' });
  });

  it('rejects a tampered report body at reportHash', () => {
    const { env, trusted } = build();
    const tampered = structuredClone(env);
    tampered.report.capsule.decision = 'ALLOW';
    expect(verifyEnvelope(tampered, trusted, 2000)).toMatchObject({ ok: false, failedCheck: 'reportHash', checks: ['schema'] });
  });

  it('rejects a tampered body whose reportHash was recomputed but not re-signed', () => {
    const { env, trusted } = build();
    const tampered = structuredClone(env);
    tampered.report.capsule.decision = 'ALLOW';
    tampered.reportHash = hashCanonical('safe402/report/v1', tampered.report);
    expect(verifyEnvelope(tampered, trusted, 2000)).toMatchObject({
      ok: false, failedCheck: 'signature', checks: ['schema', 'reportHash', 'issuer'],
    });
  });

  it('rejects a flipped signature', () => {
    const { env, trusted } = build();
    const badSig = structuredClone(env);
    badSig.signature = (env.signature.slice(0, 2) === 'ff' ? '00' : 'ff') + env.signature.slice(2);
    expect(verifyEnvelope(badSig, trusted, 2000)).toMatchObject({ ok: false, failedCheck: 'signature' });
  });

  it('rejects a re-signed report whose capsuleHash does not bind its capsule', () => {
    const { env, issuer, trusted } = build();
    const body = structuredClone(env.report);
    body.capsuleHash = 'sha256:' + '0'.repeat(64);
    const reportHash = hashCanonical('safe402/report/v1', body);
    const resigned = signReport(body, reportHash, 'issuer-1', issuer.privateKey);
    expect(verifyEnvelope(resigned, trusted, 2000)).toMatchObject({
      ok: false, failedCheck: 'capsuleHash', checks: ['schema', 'reportHash', 'issuer', 'signature'],
    });
  });

  it('rejects an expired ALLOW capsule and accepts it before expiry', () => {
    const { bundle, allowed, issuer, trusted } = build();
    const { report, reportHash } = buildReport({
      reportId: 'r2', capsule: allowed.capsule, capsuleHash: allowed.capsuleHash, manifest, evidence: bundle,
      evidenceReference: 'local:x',
    });
    const allowEnv = signReport(report, reportHash, 'issuer-1', issuer.privateKey);
    expect(verifyEnvelope(allowEnv, trusted, 2000).ok).toBe(true);
    expect(verifyEnvelope(allowEnv, trusted, 4600)).toMatchObject({ ok: false, failedCheck: 'expiry' });
    expect(verifyEnvelope(allowEnv, trusted, 5000)).toMatchObject({
      ok: false, failedCheck: 'expiry', checks: ['schema', 'reportHash', 'issuer', 'signature', 'capsuleHash'],
    });
  });

  it('rejects an ALLOW that never expires', () => {
    // buildCapsule gives every ALLOW an expiry; an envelope whose ALLOW has none is claiming a
    // permanent grant, so it must fail the expiry check rather than verify forever.
    const { bundle, allowed, issuer, trusted } = build();
    const capsule = { ...allowed.capsule, expiresAt: null };
    const { report, reportHash } = buildReport({
      reportId: 'r3', capsule, capsuleHash: hashCanonical('safe402/capsule/v1', capsule), manifest, evidence: bundle,
      evidenceReference: 'local:x',
    });
    const env = signReport(report, reportHash, 'issuer-1', issuer.privateKey);
    expect(verifyEnvelope(env, trusted, 2000)).toMatchObject({
      ok: false, failedCheck: 'expiry', checks: ['schema', 'reportHash', 'issuer', 'signature', 'capsuleHash'],
    });
  });

  it('ignores publication references, which live outside the signed body', () => {
    const { env, trusted } = build();
    const published = structuredClone(env);
    published.publication = { hcsTopicId: '0.0.1234', transactionId: '0.0.5@1.2' };
    expect(hashCanonical('safe402/report/v1', published.report)).toBe(env.reportHash);
    expect(published.reportHash).toBe(env.reportHash);
    expect(published.signature).toBe(env.signature);
    expect(verifyEnvelope(published, trusted, 2000).ok).toBe(true);
  });

  it('never throws on malformed input', () => {
    const { env, trusted } = build();
    for (const bad of [{}, null, undefined, 'envelope', 42, [], { report: null, reportHash: 'x', issuer: 'i', signature: 'ff' }, { ...env, report: 'nope' }]) {
      expect(() => verifyEnvelope(bad, trusted, 1)).not.toThrow();
      expect(verifyEnvelope(bad, trusted, 1)).toMatchObject({ ok: false, failedCheck: 'schema' });
    }
    expect(verifyEnvelope({ ...env, signature: 'not hex at all' }, trusted, 2000)).toMatchObject({ ok: false, failedCheck: 'signature' });
    expect(verifyEnvelope(env, { 'issuer-1': 'not-a-key' }, 2000)).toMatchObject({ ok: false, failedCheck: 'issuer' });
  });
});
