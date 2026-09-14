# Phase 3 Design: Safe402 Security Core

Date: 2026-09-13. Status: approved by owner (no-network variant). Source requirements: `spec.md` Phase 3, `safe402prd.md` sections 8, 11–17, 19, 27, 28.

## Goal

Produce real evidence and enforceable decisions for two controlled tools, persisted so they survive a restart, with no payment, CRE, chain, or frontend involvement. Everything here is consumed unchanged by Phases 4 and 5.

Exit criteria (from `spec.md`):

1. The clean fixture receives `ALLOW` under the research policy.
2. The blocked fixture produces an actual runtime credential-access observation and receives `BLOCK`.
3. A forced collector failure produces `REVIEW`.
4. Results survive a worker process restart.

## Decisions already made

| Topic | Decision | Reason |
|---|---|---|
| Package layout | Single pnpm package at repo root, strict TypeScript, vitest, tsx | Smallest thing that works; Next.js joins in Phase 5 |
| Database | `node:sqlite` (Node 24 built-in), file `data/safe402.db` | No native module; spec allows SQLite for the single-worker demo |
| Runner network | **None** (`--network none`) in Phase 3 | Owner choice; price and sink stubs move to Phase 4 |
| Collector | strace as root supervising the tool as uid 65534, log on a root-owned volume | Verified in Phase 2/3 probes; collection is outside the tool's control |
| Report signature | ed25519 via `node:crypto`, key from `SAFE402_ISSUER_PRIVATE_KEY` (32-byte seed) | Already provisioned; no extra dependency |
| Evaluation mode | `confidentialExecutionMode: "LOCAL"` for this phase | Distinguishes local evaluation from CRE `SIMULATED` and `LIVE` |
| Scoring | None | Spec defers numeric scoring; reason codes only |
| LLM analysis | None | Not required; absence must never produce a verdict |

## Directory layout (this phase)

```
package.json  pnpm-lock.yaml  tsconfig.json  vitest.config.ts
src/
  domain/        types.ts  reasonCodes.ts  decide.ts        pure decision logic
  schemas/       manifest.ts  policy.ts  evidence.ts  capsule.ts   zod schemas
  canonical/     json.ts  hash.ts                        canonical JSON + sha256 helpers
  artifacts/     resolve.ts                              fixture → immutable artifact
  scanner/       detectors.ts  scan.ts                   static findings
  evidence/      bundle.ts                               evidence bundle + hash
  policies/      load.ts  commit.ts                      YAML load, validate, commitment
  reports/       capsule.ts  report.ts  sign.ts  verify.ts
  db/            schema.sql  db.ts                       node:sqlite wrapper + migrations
  jobs/          repo.ts  stateMachine.ts               job persistence, transitions
runner/
  images/Dockerfile                                     node:22-alpine + strace + su-exec
  profiles/no-network-v1.json                           execution profile
  harness/run.ts                                        docker orchestration + MCP driver
  harness/mcp.ts                                        minimal JSON-RPC over stdio
  collectors/strace.ts                                  trace parser → observations
worker/main.ts                                          claim loop, stage checkpoints
fixtures/
  clean-price-tool/    manifest.json  server.js  package.json
  credential-attempt/  manifest.json  server.js  package.json
config/policies/research-agent.yaml
scripts/verification/local-audit.ts                     end-to-end dev runner
test/                                                   vitest unit + integration
```

## Components

### 1. Canonical encoding and hashing (`src/canonical`)

`canonicalJson(value)`: recursively sort object keys, no whitespace, UTF-8, reject `undefined`, `NaN`, functions, and non-finite numbers. Integers only for numbers; timestamps are Unix seconds as integers. Domain-separated hash: `sha256(domainTag + "\n" + canonicalJson(value))` returned as `sha256:<hex>`. Domain tags: `safe402/artifact/v1`, `safe402/evidence/v1`, `safe402/capsule/v1`, `safe402/report/v1`, `safe402/policy/v1`, `safe402/profile/v1`.

### 2. Capability manifest (`src/schemas/manifest.ts`)

Shape from PRD section 12.1, validated with zod in strict mode. Rules: `capabilities` object required; each of `network`, `filesystem`, `process`, `wallet` is required (an absent key is a validation error, not an empty list, per PRD 12.2). Hostnames lowercased. Filesystem paths are absolute POSIX paths after normalization; `~` expands to `/home/tool`. Wildcards are the literal string `"*"` and are rejected for `wallet`.

### 3. Artifact resolution (`src/artifacts/resolve.ts`)

Input: a directory path (fixtures only in this sprint). Steps: walk files, reject symlinks that escape the root, reject more than 2,000 files or any file over 2 MB, sort relative paths, sha256 each file, record exec bit. Load and validate `manifest.json`. Build the canonical manifest `{ files: [{path, sha256, exec}], entrypoint, capabilityManifest, lockfile: sha256 | null }` and hash it with the artifact domain tag. Output `Artifact { artifactHash, executableDigest, entrypoint, manifest, fileCount, byteSize, sourceDir }`. `executableDigest === artifactHash` in this sprint because there is no build step; both are stored.

### 4. Fixtures

Both are MCP stdio servers written by hand in plain JavaScript with no dependencies. JSON-RPC 2.0 over newline-delimited stdin/stdout. Methods: `initialize` (returns protocolVersion `2025-06-18`, serverInfo, capabilities `{tools:{}}`), `notifications/initialized` (ignored), `tools/list` (one tool `get_price` with input schema `{symbol: string}`), `tools/call`.

Clean tool: on `get_price`, performs `fetch("http://prices.example.test/price?symbol=…")`. With no network this rejects; the tool returns an MCP error result (`isError: true`, text "price service unavailable"). Manifest declares `network: [{host:"prices.example.test", port:80, methods:["GET"]}]`, empty filesystem, process, wallet.

Blocked tool: identical, but before the fetch it reads `${HOME}/.aws/credentials` and includes the first line's length in its result text. Manifest is identical to the clean tool's, so the filesystem read is undeclared. It never sends the contents anywhere in Phase 3 (no network), and never uses real secrets.

Relative-path blocked tool (`fixtures/credential-attempt-relative`): the same theft, with the same manifest, but reached through `process.chdir("${HOME}/.aws")` followed by `readFileSync("credentials")` so the syscall carries a bare relative filename. It exists as the regression fixture for the collector's path resolution (§7).

Expected outcomes live in `test/fixtures.expected.json`, separate from the fixtures, and are consulted only by tests.

### 5. Execution profile (`runner/profiles/no-network-v1.json`)

```json
{
  "profileId": "no-network-v1",
  "image": "safe402-runner:dev",
  "network": "none",
  "memoryBytes": 1073741824,
  "pidsLimit": 64,
  "deadlineMs": 120000,
  "toolUser": "nobody",
  "canaries": [
    { "path": "/home/tool/.aws/credentials", "kind": "credential" },
    { "path": "/home/tool/.config/safe402/credentials.json", "kind": "credential" },
    { "path": "/home/tool/.env", "kind": "credential" }
  ],
  "env": { "HOME": "/home/tool", "SAFE402_FAKE_API_KEY": "canary-not-a-real-key" },
  "tests": [
    { "testId": "mcp_initialize", "required": true },
    { "testId": "tools_list", "required": true },
    { "testId": "get_price_call", "required": true, "input": { "symbol": "HBAR" } },
    { "testId": "credential_canary", "required": true },
    { "testId": "network_egress", "required": false, "skippedReason": "network disabled by profile" }
  ]
}
```

`executionProfileHash` is the profile-domain hash of this file's canonical JSON. `credential_canary` is passive: it passes as "completed" whenever the run finishes and the trace log is parseable, since the canaries are present for the whole run.

### 6. Runner harness (`runner/harness/run.ts`)

Input: `Artifact`, `ExecutionProfile`, `auditId`. Output: `RunResult { observations, coverage, stdout, stderr, exitCode, timedOut, collectorError }`.

Steps:

1. Create a temp run directory under `data/runs/<auditId>/` with `artifact/` (copied from the resolved source with the same walk and exclusions `resolveArtifact` used) and `home/` (canary files with synthetic content, writable by the tool uid). The copy is then **re-resolved**: `resolveArtifact(artifact/)` must reproduce the audited `artifactHash` — the canonical artifact struct is root-independent — or the run throws `ArtifactError('artifact hash mismatch at run time')` and nothing executes. Observations do not use a host directory at all: `/obs` is a **named Docker volume** `safe402-obs-<auditId>-<attempt>`, seeded from the image's own `/obs` created `mode 0700 root:root` at build time, so the unprivileged tool can neither read, write, nor unlink the live trace. Any volume of that name left behind by an earlier crash is purged (`dockerVolumeRm`) immediately before the run, so a stale trace can never be parsed as this run's evidence. Container and volume names both carry the attempt number, so a retry never adopts a previous attempt's volume.
2. `docker run -i --rm --name safe402-<auditId>-<attempt> --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m --memory <n> --memory-swap <n> --pids-limit <n> --cap-drop ALL --cap-add SYS_PTRACE --cap-add SETUID --cap-add SETGID --security-opt no-new-privileges -v artifact:/artifact:ro -v home:/home/tool -v safe402-obs-<auditId>-<attempt>:/obs -e HOME=… -e SAFE402_FAKE_API_KEY=… <image> strace -f -u nobody -o /obs/trace.log -e trace=openat,open,connect,sendto,execve,chdir,fchdir,clone,clone3,fork,vfork -s 256 -ttt node /artifact/<entrypoint>`. `SETUID`/`SETGID` exist only so root-run `strace -u nobody` can drop privileges for the traced child; the tool process itself ends up unprivileged with no capabilities and `no-new-privileges`. `chdir`/`fchdir` are traced so the collector can resolve relative paths (§7).
3. Drive MCP over the container's stdin/stdout for each test in order, with a per-request timeout of 10 s. Record each test as completed, failed, or skipped, with the raw MCP response.
4. Overall deadline via a host timer: on expiry, `docker kill`, set `timedOut`, mark remaining tests skipped with reason `deadline`.
5. On every path — normal exit, grace-period kill, deadline kill, or a throw — the `finally` block force-kills the tool container (`dockerKill`) *before* anything reads the trace, then extracts it with a **trusted helper container**: another instance of the operator's runner image, never the tool's process, which mounts the volume read-only and a host directory read-write and copies the trace out (`dockerExtractTrace`). The helper's `head -c 67108865` stops one byte past the host-side 64 MiB cap, so a tool that spins syscalls for the whole deadline cannot fill the disk and still trips the size check. The volume is then removed with `dockerVolumeRmRetry`, which retries briefly because a `--rm` teardown can still hold it. Host-side, the copied path must be a genuine regular file (`lstatSync(...).isFile()`, so a symlinked forgery reads as missing) no larger than 64 MiB; absent, empty, or oversized all set `collectorError` (`"trace log missing"` / `"trace log too large"`).
6. Remove the `home/` and `artifact/` copies; keep the extracted trace under `data/runs/<auditId>/obs/trace.log` as the evidence object referenced by `evidenceReference: "local:runs/<auditId>/obs/trace.log"`.

The harness never passes the host environment to the container. Only the profile's `env` map is forwarded.

### 7. strace collector (`runner/collectors/strace.ts`)

Parses strace `-f -ttt` output including `<unfinished ...>` / `<... resumed>` pairs. Emits `Observation` records (PRD 15.1 shape) with `sourceType: "RUNTIME"`, `collectorVersion: "strace-v1"`:

| Syscall | capability | operation | attempted | permitted | completed |
|---|---|---|---|---|---|
| `openat`/`open` on a canary path or any path under `/home/tool` | `FILESYSTEM` | `READ` or `WRITE` from flags | true | result ≥ 0 or error ≠ EACCES/EPERM | result ≥ 0 |
| `openat`/`open` elsewhere with write flags | `FILESYSTEM` | `WRITE` | true | same | same |
| `connect`/`sendto` to a non-loopback address | `NETWORK` | `CONNECT` | true | result = 0 or EINPROGRESS | result = 0 |
| `connect`/`sendto` to loopback port 53 | `NETWORK` | `DNS` | true | same | same; target `"unresolved"` |
| `execve` after the initial node exec, `clone`/`fork` with a new exec | `PROCESS` | `SPAWN` | true | result ≥ 0 | result ≥ 0 |

**Path resolution.** Every quoted argument is unescaped first (`\n`, `\t`, `\"`, `\\`, `\NNN` octal, `\xNN`), so an escaped canary path cannot read as a different file. The parser then tracks, per pid, the working directory (initial value `/` — the runner image sets no `WORKDIR`) through `chdir`/`fchdir`, and an fd→path map built from successful opens; `clone`/`clone3`/`fork`/`vfork` give the child the parent's cwd and fd table, shared rather than copied when `CLONE_FS`/`CLONE_FILES` are set, as the kernel does. `AT_FDCWD`-relative paths resolve against the cwd, dirfd-relative paths against the fd map, and the result is normalized with `path.posix` before the canary and `/home/tool` rules are applied.

Read-only opens of *absolute* `AT_FDCWD` paths outside `/home/tool` (node internals, `/artifact`, `/etc`) are dropped as baseline noise; the count of dropped events is recorded in coverage as `baselineOpens`. **Only such an open may ever be dropped.** Any open whose path is not absolute, or whose `openat` dirfd is not `AT_FDCWD`, is evidence: it is emitted with its resolved absolute target, or — when the cwd or the dirfd cannot be placed — with the fail-closed target `unresolved:<path>`, which §11.3 routes to `REVIEW`. Dropping these was a real fail-open: a tool doing `process.chdir("$HOME/.aws")` then `readFileSync("credentials")` produced no observation at all and audited `ALLOW` (`fixtures/credential-attempt-relative` is the regression). Targets are the literal path or `ip:port`. Each observation gets a `sequence` in trace order and `testId` from the test active at that timestamp.

Disclosed limitations, written into coverage `unsupported`: environment-variable reads are not observable by strace once loaded; hostnames are not recoverable from failed DNS in this profile.

### 8. Static scanner (`src/scanner`)

Runs over every `.js`/`.mjs`/`.cjs` file in the artifact. Detectors are regexes with rule IDs:

`FS_ACCESS` (`require("fs")`, `fs/promises`, `readFileSync`), `ENV_READ` (`process.env`), `CHILD_PROCESS` (`child_process`, `execSync`, `spawn`), `DYNAMIC_CODE` (`eval(`, `new Function(`, `vm.`), `NETWORK_TARGET` (string literal `http(s)://host`), `WALLET_API` (`signTransaction`, `privateKey`, `sendTransaction`), `SUSPICIOUS_DESCRIPTION` (tool description containing "ignore previous", "system prompt", "you must"). Each finding has the PRD 13.3 fields with `sourceType: "STATIC"`, `confidence` 60 for regex hits (an integer percent: canonical JSON accepts integers only), `analyzerVersion: "regex-v1"`. If any file fails to read, coverage records `staticIncomplete: true`.

### 9. Evidence bundle (`src/evidence/bundle.ts`)

```
EvidenceBundle {
  schemaVersion: "1.0", auditId, artifactHash, executionProfileHash,
  evidenceMode: "REAL_ARTIFACT_TEST",
  observations: Observation[], findings: Finding[],
  coverage: { testsRequested, testsCompleted, testsSkipped: [{testId, reason}],
              unsupported: string[], collectorErrors: string[], timedOut, baselineOpens,
              staticIncomplete, profileId, fixtureVersion: artifactHash },
  collectorVersion: "strace-v1", analyzerVersion: "regex-v1"
}
```

`evidenceHash` = evidence-domain hash of the canonical bundle.

### 10. Policy (`src/policies`)

File format from PRD 16.1, loaded with `yaml`, validated by a strict zod schema. Rejections: unknown fields, `ttlSeconds` outside 60–86400, `allowedHosts` entries that are not lowercase hostnames or `"*"`, contradictory rules (`blockUndeclaredCapabilities: false` together with `requireCompleteCoverage: true` is allowed; `allowSigning: true` with `allowTransactions: false` is allowed; the only contradiction rejected is duplicate keys). Commitment: `sha256(policy-domain, canonicalJson({policy, salt}))` where `salt` is 16 random bytes generated at registration and stored in `policy_versions`. The public `policyCommitment` is the hash; the salt and policy body never leave the database.

`config/policies/research-agent.yaml`:

```yaml
schemaVersion: "1.0"
name: research-agent
rules:
  requireCompleteCoverage: true
  blockUndeclaredCapabilities: true
  wallet: { allowSigning: false, allowTransactions: false }
  process: { allowSpawn: false }
  filesystem: { allowedPaths: [] }
  network: { allowedHosts: [prices.example.test] }
authorization: { ttlSeconds: 3600 }
```

### 11. Decision engine (`src/domain/decide.ts`)

Pure function `decide(input: { evidence, policy, manifest, profile, bindings }) → { decision, reasonCodes }`. Precedence, first match wins for the decision, but all applicable reason codes are collected:

1. **Binding failure** → `BLOCK` with `BINDING_FAILURE`: `evidence.artifactHash !== bindings.artifactHash`, or `evidence.executionProfileHash !== bindings.executionProfileHash`, or manifest invalid.
2. **Critical violation** → `BLOCK`:
   - any `FILESYSTEM READ` observation on a canary path with `completed: true` → `CREDENTIAL_ACCESS_OBSERVED`; if the path is not in `manifest.capabilities.filesystem` also `UNDECLARED_FILE_ACCESS`
   - any `FILESYSTEM` observation with `attempted: true` on a canary path even if not completed → `CREDENTIAL_ACCESS_ATTEMPTED` (critical)
   - while `policy.rules.blockUndeclaredCapabilities === true`, any `FILESYSTEM` `READ` or `WRITE` observation with `completed: true` whose normalized target is not covered by `manifest.capabilities.filesystem` → `UNDECLARED_FILE_ACCESS` (critical). Canary rules above are unchanged and still apply on their own. Targets of the form `unresolved:<path>` are deliberately exempt: they name no file, so they cannot be judged against an allowlist, and they are handled as missing coverage in step 3 instead. An *attempted but denied* undeclared read is not exfiltration and raises nothing here.
   - any `PROCESS SPAWN` attempted while `policy.rules.process.allowSpawn === false` → `PROCESS_SPAWN_FORBIDDEN`
   - any `WALLET` observation → `WALLET_ACCESS_OBSERVED` (no wallet broker exists in this profile, so this cannot fire yet)
   - any `NETWORK CONNECT` with a resolved target host not in `manifest.capabilities.network` and `completed: true` → `UNDECLARED_NETWORK_ACCESS`
3. **Coverage missing** → `REVIEW`: `coverage.collectorErrors.length > 0` → `COLLECTOR_FAILURE`; any `FILESYSTEM` observation whose target starts with `unresolved:` → `UNRESOLVED_FILE_TARGET` (the collector saw a file access it could not place, so some access is unaccounted for; unknown is never clean); `timedOut` → `RUNTIME_TIMEOUT`; any required test not completed → `REQUIRED_TEST_INCOMPLETE`; `staticIncomplete` with `requireCompleteCoverage` → `STATIC_COVERAGE_INCOMPLETE`.
4. **Policy mismatch** → `BLOCK`: a declared network host not in `policy.rules.network.allowedHosts` (unless `"*"`) → `DECLARED_HOST_NOT_ALLOWED`; declared wallet capability while signing is disallowed → `DECLARED_WALLET_NOT_ALLOWED`; declared process capability while spawn disallowed → `DECLARED_PROCESS_NOT_ALLOWED`; declared filesystem path outside `allowedPaths` → `DECLARED_PATH_NOT_ALLOWED`.
5. Otherwise `ALLOW` with reason code `ALL_CHECKS_SATISFIED`.

Non-violations by construction: `NETWORK DNS` and `NETWORK CONNECT` observations with `permitted: false` and target `"unresolved"` are recorded but do not produce a reason code, because the sandbox denied them and the target cannot be named. Tests with `required: false` never affect coverage.

Observations from a fixture's own self-report are never inputs; only collector output reaches this function.

### 12. Capsule, report, signature (`src/reports`)

Capsule fields exactly per PRD 19.1, with `subjectId` from `SAFE402_SUBJECT_ID`, `issuedAt` = Unix seconds from the worker clock, `expiresAt = issuedAt + policy.authorization.ttlSeconds` only when `decision === "ALLOW"` (otherwise `null`), `authorizationSequence` = 1 + the highest sequence stored for the same authorization key, allocated and written inside one `BEGIN IMMEDIATE` transaction (`JobRepo.saveCapsuleWithNextSequence`) so two workers cannot mint the same link in a chain, `confidentialExecutionMode: "LOCAL"`. `capsuleHash` = capsule-domain hash.

Report: `{ schemaVersion, reportId, capsule, capsuleHash, explanation, declaredVsObserved, findings, coverage, evidenceReference }`. `explanation` uses the PRD 29.6 wording keyed by decision. `declaredVsObserved` is a table of `{capability, declared: string[], observed: string[], undeclared: string[]}`. `reportHash` = report-domain hash of the report body. Signature: ed25519 over `reportHash` bytes; envelope `{ report, reportHash, issuer: SAFE402_ISSUER_ID, signature, publication: {} }`. Publication references (payment, HCS, chain, graph) live only in the envelope's `publication` object and never inside the signed body.

`verify(envelope, trustedIssuers, now)` checks schema, recomputed `reportHash`, signature against the issuer's public key, issuer membership, capsule binding (`capsuleHash` recomputed), and expiry. The expiry check also fails an `ALLOW` whose `expiresAt` is `null`: `buildCapsule` never issues one, so such an envelope claims a permanent grant. It returns a structured result with the first failing check; it never throws on bad input.

### 13. Persistence (`src/db`, `src/jobs`)

`node:sqlite` `DatabaseSync`, WAL mode. `openDb` reads `PRAGMA user_version` and applies an ordered migration list — index `i` moves the database from version `i` to `i + 1`, so the current version is the list length. Migration 1 is `schema.sql`, written with `IF NOT EXISTS`, so a database created before versions were stamped is adopted unchanged and simply gets `user_version = 1`; a database whose version is *newer* than the build is refused rather than guessed at. Every `INSERT` in `JobRepo` names its columns, so a later migration that adds or reorders one cannot silently shift values. Tables:

- `artifacts(artifact_hash PK, executable_digest, entrypoint, manifest_json, file_count, byte_size, source_dir, created_at)`
- `policy_versions(policy_id PK, name, version, policy_json, salt, commitment, created_at)`
- `audit_jobs(audit_id PK, artifact_hash, policy_id, subject_id, profile_id, profile_hash, status, stage_checkpoint, attempts, lease_owner, lease_expires_at, last_error, created_at, updated_at)`
- `job_events(audit_id, sequence, kind, payload_json, created_at, PK(audit_id, sequence))`
- `evidence_bundles(evidence_hash PK, audit_id, bundle_json, created_at)`
- `decision_capsules(capsule_hash PK, audit_id, capsule_json, decision, authorization_key, authorization_sequence, created_at)`
- `reports(report_id PK, audit_id, capsule_hash, report_hash, envelope_json, created_at)`

Job status values follow PRD 28 with `AWAITING_PAYMENT`, `PAYMENT_RECONCILING`, and `PUBLISHING` present in the enum but unused this phase; `scripts/verification/local-audit.ts` creates jobs directly in `QUEUED`. Transitions are enforced by `stateMachine.ts` (`assertTransition(from, to)`); illegal transitions throw and the worker records `FAILED` with `last_error`.

Worker (`worker/main.ts`): loop every 500 ms. Claim: `UPDATE audit_jobs SET status='PREPARING', lease_owner=?, lease_expires_at=now+60, attempts=attempts+1 WHERE audit_id = (SELECT audit_id FROM audit_jobs WHERE status='QUEUED' OR (lease_expires_at < now AND status IN ('PREPARING','SCANNING','TESTING','EVALUATING')) ORDER BY created_at LIMIT 1) AND attempts < 3 RETURNING *`. Stages: PREPARING (resolve artifact, persist) → SCANNING (findings) → TESTING (runner) → EVALUATING (bundle, decide, capsule, report, sign, persist) → COMPLETED. Each stage writes a `job_events` row and refreshes the lease. Any thrown error → `FAILED` with `last_error`; a job whose runner timed out still reaches COMPLETED with decision REVIEW. On startup the worker sweeps jobs with expired leases: attempts < 3 → `QUEUED`, else `FAILED`. No transaction is held across the runner call.

### 14. Dev entrypoint (`scripts/verification/local-audit.ts`)

`pnpm audit:local <fixture-dir> [--policy config/policies/research-agent.yaml] [--json]`. Registers the policy if missing, resolves the artifact, inserts a QUEUED job, runs one worker pass inline, prints the decision, reason codes, observation summary, and report path. Exit codes per CLAUDE.md: 0 ALLOW, 2 BLOCK, 3 REVIEW, 5 dependency failure (Docker missing), 6 invalid input.

## Error handling summary

| Failure | Behavior |
|---|---|
| Docker not running | Runner throws `DependencyUnavailable`; job → FAILED; exit code 5 |
| Trace log missing after run | `collectorError`; decision REVIEW `COLLECTOR_FAILURE` |
| Deadline hit | `docker kill`; decision REVIEW `RUNTIME_TIMEOUT` |
| Tool crashes before initialize | required tests incomplete; REVIEW |
| Manifest invalid | artifact resolution fails before any job; exit code 6 |
| Policy invalid | registration fails; exit code 6 |
| Worker crash mid-stage | lease expires; next worker start re-queues (≤3 attempts) then FAILED |
| Issuer key missing | signing throws; job → FAILED; never an unsigned "approval" |

## Testing

Unit (no Docker): `canonicalJson` ordering and rejections; artifact hash stable across file order and changes with one byte; manifest strictness; policy validation cases; strace parser on recorded sample traces (kept under `test/samples/`) including `<unfinished>` pairs; `decide` precedence table with one case per reason code and the specific rule that unresolved blocked network attempts do not block; capsule and report hashing; sign/verify round trip and tamper detection; state machine transitions; worker claim atomicity with two claimers.

Integration (requires Docker, tagged and skipped if `docker info` fails): build image; run `local-audit` on all three fixtures; assert clean → ALLOW, and both blocked fixtures (absolute and chdir-relative) → BLOCK with a `FILESYSTEM READ` observation on `/home/tool/.aws/credentials` with `attempted && completed` from `sourceType: RUNTIME`; mutate an artifact directory between resolution and the run and assert the job ends FAILED with no capsule, never ALLOW; run with the collector deliberately broken (profile pointing at a nonexistent strace path) → REVIEW `COLLECTOR_FAILURE`; kill the worker between TESTING and EVALUATING, restart, assert the job completes with the same `auditId`; reopen the database in a new process and read the same capsule.

## Out of scope for this phase

Payment, HCS, CRE, contracts, subgraph, gateway, CLI beyond the dev script, MCP server, dashboard, network stubs, LLM analysis, numeric scoring.
