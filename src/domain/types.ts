import type { ReasonCode } from './reasonCodes.js';

export type Decision = 'ALLOW' | 'REVIEW' | 'BLOCK';
export type Capability = 'FILESYSTEM' | 'NETWORK' | 'PROCESS' | 'WALLET';
export type Operation = 'READ' | 'WRITE' | 'CONNECT' | 'DNS' | 'SPAWN' | 'SIGN';
export type ConfidentialExecutionMode = 'LOCAL' | 'SIMULATED' | 'LIVE';

export interface NetworkDeclaration { host: string; port: number; methods: string[] }
export interface CapabilityManifest {
  schemaVersion: '1.0';
  tool: { name: string; version: string; functionId: string };
  runtime: { type: 'node'; entrypoint: string };
  capabilities: { network: NetworkDeclaration[]; filesystem: string[]; process: string[]; wallet: string[] };
}

export interface Artifact {
  artifactHash: string;
  executableDigest: string;
  entrypoint: string;
  manifest: CapabilityManifest;
  fileCount: number;
  byteSize: number;
  sourceDir: string;
}

export interface Observation {
  schemaVersion: '1.0';
  auditId: string;
  sequence: number;
  testId: string;
  sourceType: 'RUNTIME';
  capability: Capability;
  operation: Operation;
  target: string;
  attempted: boolean;
  permitted: boolean;
  completed: boolean;
  collectorVersion: string;
  evidenceReference: string;
  timestamp: number;
}

export interface Finding {
  findingId: string;
  ruleId: string;
  sourceType: 'STATIC';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  file: string;
  location: { line: number };
  description: string;
  evidenceReference: string;
  confidence: number;
  analyzerVersion: string;
}

export interface Coverage {
  profileId: string;
  testsRequested: string[];
  testsCompleted: string[];
  testsSkipped: { testId: string; reason: string }[];
  unsupported: string[];
  collectorErrors: string[];
  timedOut: boolean;
  baselineOpens: number;
  staticIncomplete: boolean;
  fixtureVersion: string;
}

export interface EvidenceBundle {
  schemaVersion: '1.0';
  auditId: string;
  artifactHash: string;
  executionProfileHash: string;
  evidenceMode: 'REAL_ARTIFACT_TEST';
  observations: Observation[];
  findings: Finding[];
  coverage: Coverage;
  collectorVersion: string;
  analyzerVersion: string;
}

export interface Policy {
  schemaVersion: '1.0';
  name: string;
  rules: {
    requireCompleteCoverage: boolean;
    blockUndeclaredCapabilities: boolean;
    wallet: { allowSigning: boolean; allowTransactions: boolean };
    process: { allowSpawn: boolean };
    filesystem: { allowedPaths: string[] };
    network: { allowedHosts: string[] };
  };
  authorization: { ttlSeconds: number };
}

export interface ProfileTest { testId: string; required: boolean; input?: Record<string, unknown>; skippedReason?: string }
export interface ExecutionProfile {
  profileId: string;
  image: string;
  network: 'none';
  memoryBytes: number;
  pidsLimit: number;
  deadlineMs: number;
  toolUser: string;
  canaries: { path: string; kind: 'credential' }[];
  env: Record<string, string>;
  tests: ProfileTest[];
}

export interface DecisionCapsule {
  schemaVersion: '1.0';
  auditId: string;
  artifactHash: string;
  executionProfileHash: string;
  evidenceHash: string;
  policyCommitment: string;
  subjectId: string;
  decision: Decision;
  reasonCodes: ReasonCode[];
  issuedAt: number;
  expiresAt: number | null;
  authorizationSequence: number;
  confidentialExecutionMode: ConfidentialExecutionMode;
}

export interface DeclaredVsObservedRow { capability: Capability; declared: string[]; observed: string[]; undeclared: string[] }

export interface Report {
  schemaVersion: '1.0';
  reportId: string;
  capsule: DecisionCapsule;
  capsuleHash: string;
  explanation: string;
  declaredVsObserved: DeclaredVsObservedRow[];
  findings: Finding[];
  coverage: Coverage;
  evidenceReference: string;
}

export interface SignedReportEnvelope {
  report: Report;
  reportHash: string;
  issuer: string;
  signature: string;
  publication: Record<string, string>;
}

export type JobStatus =
  | 'AWAITING_PAYMENT' | 'PAYMENT_RECONCILING' | 'QUEUED' | 'PREPARING' | 'SCANNING'
  | 'TESTING' | 'EVALUATING' | 'PUBLISHING' | 'COMPLETED'
  | 'PAYMENT_FAILED' | 'FAILED' | 'INCONCLUSIVE' | 'CANCELLED';
