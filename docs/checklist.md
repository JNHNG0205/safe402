# Safe402 Sprint Checklist

Live checklist for the phased sprint in `spec.md`. Every checked item cites evidence. Format:

```markdown
- [x] Verified existing — evidence: command, test, or transaction
- [x] Implemented and verified — evidence: command, test, or transaction
- [ ] Partial — remaining behavior
- [ ] Blocked — dependency and required resolution
- [ ] Deferred — outside this sprint
```

## Starting point

| Item | Value |
|---|---|
| Repository | `https://github.com/JNHNG0205/safe402.git` |
| Branch | `main` |
| Starting commit (Phase 1) | `66de4315405290055fbd2f06139e919a8151a2b0` |
| Working tree | clean (`git status --porcelain` empty) |
| Prior codebase | **None.** Greenfield. The MARS codebase referenced in `safe402prd.md` §4 does not exist on this machine or in this repository (owner confirmed 2026-09-13). |

Consequences of greenfield:

- PRD §4 (MARS reuse, continuity document) and the Continuity prize targets in §40 are out of scope.
- Non-continuity partner categories remain targets: Hedera AI & Agentic Payments, Chainlink Best Confidential Workflow, The Graph AI Tooling.
- Phase 1 "reuse existing" checks all resolve to *missing*. Phase 3 onward builds every module new.

---

# Phase 1 — Inspect (0–15 min)

## Tasks

- [x] Identify the repository, branch, and starting commit — evidence: `git rev-parse --abbrev-ref HEAD` → `main`; `git rev-parse HEAD` → `66de431…`.
- [x] Read applicable repository instructions — evidence: `CLAUDE.md`, `safe402prd.md`, `spec.md` read in full.
- [x] Inspect and preserve uncommitted changes — evidence: `git status --porcelain` empty; nothing to preserve.
- [x] Identify package manager and lockfile — evidence: `find . -type f` returns only `CLAUDE.md`, `safe402prd.md`, `spec.md`. No `package.json`, no lockfile. **Decision pending Phase 3 scaffold: pnpm 10.26.2 is available and preferred.**
- [x] Identify runtime requirements — evidence: no `.nvmrc`, `.node-version`, or `.tool-versions`. Node 24.10.0 is installed locally.
- [x] Identify frontend routing and API structure — evidence: no `pages/`, `app/`, or `next.config.*`. Missing.
- [x] Identify persistent storage — evidence: no schema, migrations, or database config. Missing. PostgreSQL 15.15 and SQLite 3.51 are installed locally.
- [x] Identify worker or job-processing code — evidence: no `worker/`, no queue code. Missing.
- [x] Run the smallest existing health check — evidence: no scripts, tests, or build exist. **Nothing to run.**
- [x] Create the sprint checklist — evidence: this file.

## Keyword search

`grep -rilE 'audit|scanner|sandbox|runner|capability|policy|attestation|report|x402|hedera|chainlink|CRE|subgraph|MCP|execute|revocation'` matches only the three markdown documents. No source code matches.

## Inventory

| Capability | Implementation location | Verified behavior | Remaining gap |
|---|---|---|---|
| Audit submission | none | none | Entire API, quote, job creation |
| Runtime observation | none | none | Runner, collectors, fixtures, harness |
| Payment | none | none | x402 challenge, Blocky402 settlement, reconciliation |
| CRE evaluation | none | none | Workflow, confidential handler, consumer delivery |
| Graph query | none | none | Contract events, subgraph, hosted deployment, client queries |
| Gateway enforcement | none | none | Verification chain and restricted launch |
| Dashboard | none | none | Next.js Pages Router, two screens |
| Static scanner | none | none | Detectors and finding schema |
| Policy engine | none | none | Schema, validation, commitment, decision precedence |
| Persistence | none | none | Schema for the 14 entities in PRD §27 |
| CLI | none | none | All commands |
| MCP server | none | none | All tools |
| Authorization contract | none | none | `Safe402AuthorizationRegistry` |

## Local toolchain (input to Phase 2)

| Tool | Status | Version | Note |
|---|---|---|---|
| node | OK | 24.10.0 | |
| pnpm | OK | 10.26.2 | preferred package manager |
| npm / yarn / bun | OK | 11.6.1 / 1.22.22 / 1.3.5 | available, not planned |
| tsx | missing | — | install as dev dependency if needed |
| docker | installed, daemon **not running** | 28.5.1 | required for the isolated runner; start Docker Desktop before Phase 2 runner check |
| forge / anvil / cast | OK | Foundry 1.5.1-stable | `forge` on PATH resolves to Herd's PHP tool first; use `~/.foundry/bin/forge` explicitly or reorder PATH |
| hardhat | missing | — | not needed; Foundry covers contracts |
| cre (Chainlink CRE CLI) | missing | — | install per CRE docs in Phase 2 |
| graph (Graph CLI) | missing | — | install `@graphprotocol/graph-cli` as dev dependency in Phase 2 |
| psql | OK | 15.15 | PostgreSQL server status not checked |
| sqlite3 | OK | 3.51.0 | fallback storage per spec Phase 3.5 |
| gh | OK | 2.88.1 | |

Integration environment variables: none of `HEDERA_*`, `BLOCKY*`, `X402*`, `CRE_*`, `CHAINLINK*`, `GRAPH*`, `SEPOLIA*`, `ETH_RPC*`, `OPENAI*`, `ANTHROPIC*`, `DATABASE*` are set in the shell. Phase 2 must collect testnet payer, HCS operator, EVM RPC, and Graph deploy credentials. Values are never printed or committed.

## Exit criteria

- [x] Existing capabilities are distinguished from missing capabilities — evidence: inventory above; every row is missing.
- [x] No feature is assumed complete from documentation alone — evidence: no code exists to assume anything about.
- [x] The remaining work is prioritized by demo impact — evidence: build order below.

## Build order for Phase 3 onward (by demo impact)

1. Scaffold: pnpm workspace, TypeScript, vitest, shared `src/domain` and `src/schemas`.
2. Fixtures: clean price tool and credential-attempt tool with manifests and canonical artifact hashing.
3. Runner and collectors with real credential-file observation, timeout, and teardown (Docker required).
4. Policy schema, validation, commitment, deterministic decision precedence.
5. Persistence (SQLite first, single worker), audit job state machine, worker loop.
6. Gateway: verification chain and restricted launch, proven by absence of process start on BLOCK/REVIEW.
7. Hedera x402 payment via Blocky402 and HCS receipts.
8. CRE workflow (simulated mode labeled) and `Safe402AuthorizationRegistry` on Sepolia via Foundry.
9. Subgraph and client history queries.
10. CLI, MCP stdio server, two dashboard screens, demo script.

---

# Phase 2 — Check External Dependencies (15–30 min)

Started 2026-09-13. Local prep: `X402_NETWORK` corrected to CAIP-2 `hedera:testnet` (facilitator `/supported` uses that form); local secrets generated for `SAFE402_SERVICE_TOKEN`, `SAFE402_ISSUER_PRIVATE_KEY`, `CRE_EVIDENCE_TOKEN`, `CRE_POLICY_SECRET`; Docker Desktop started.

## Runner

- [x] Verify an isolated execution environment is available — evidence: `docker info` → server 28.5.1, Docker Desktop, aarch64, cgroup v2, seccomp builtin.
- [x] Execute one controlled fixture — evidence: `node:22-alpine` container run with `--network none --read-only --tmpfs /tmp --memory 1g --pids-limit 64 --cap-drop ALL --security-opt no-new-privileges --user 65534`, probe script mounted read-only with a synthetic `/fixtures/credentials.json`.
- [ ] Partial — Confirm observations come from a collector rather than fixture claims. The probe self-reports; no external collector exists yet. Phase 3.3 must add host-side observation (e.g. a read-only bind of the credential fixture with access logged via a proxying layer, or fanotify/strace inside a sidecar). Not counted as evidence.
- [x] Confirm host credentials are unavailable to the fixture — evidence: host canary env var `CANARY_SECRET` and every `HEDERA_*`, `SAFE402_*`, `X402_*`, `CRE_*`, `GRAPH*`, `DATABASE*` key absent inside the container (`hostEnvLeak: []`); `/var/run/docker.sock` absent; root filesystem write → `EROFS`; outbound TCP to 1.1.1.1:443 → `ENETUNREACH`; process spawn works but as uid 65534.
- [x] Timeout enforcement — evidence: BusyBox `timeout` inside Alpine did **not** kill the process (container stayed up); host-side `docker kill` after 5 s terminated it and `--rm` removed it. Design consequence: the worker enforces the deadline from the host, never from inside the container.

Notes: an unrelated `postgres:16` container (`agentrail-db`) from another project is running on this host; do not reuse it.

## Hedera and Blocky402

- [x] Verify testnet configuration — evidence: `HEDERA_NETWORK=testnet`; facilitator `/supported` advertises `hedera:testnet`, x402 v2, scheme `exact`, fee payer `0.0.7162784`; `/health` ok v1.0.0.
- [x] Verify payer and recipient configuration without printing secrets — evidence: mirror node shows operator `0.0.10522836`, payer `0.0.10523315`, recipient `0.0.10523257`, all ECDSA secp256k1, each 1000 HBAR. Payer ≠ operator; recipient = trusted recipient.
- [x] Verify compatible payment SDK versions — evidence: spike installed and ran `@x402/core@2.25.0`, `@x402/express@2.25.0`, `@x402/fetch@2.25.0`, `@x402/hedera@2.25.0`, `@hiero-ledger/sdk@2.85.0` (pin exact: `@x402/hedera` hard-pins 2.85.0; a newer top-level copy creates a second module realm and breaks the signer), `express@4.22.2`. Use `@hiero-ledger/sdk`, not `@hashgraph/sdk`. Reference PoC `hedera-dev/x402-inference-pay-per-request-poc` uses the same four `@x402/*` packages at `^2.18.0`.
- [x] Confirm the accepted asset and network — evidence: native HBAR as asset id `0.0.0`, amounts as integer tinybar strings, minimum `"1"` accepted. HTS tokens need association on both accounts, so HBAR is the chosen asset. `.env` updated: `X402_ASSET=0.0.0`, `X402_AUDIT_PRICE=100000` (0.001 HBAR), `SAFE402_MAX_PAYMENT=100000000` (1 HBAR ceiling).
- [x] Perform a bounded paid request — evidence: local Express server with `paymentMiddleware` returned 402 with `PAYMENT-REQUIRED`; client signed a `TransferTransaction`; server called facilitator `POST /verify` → `{"isValid":true}` then handler then `POST /settle` → `{"success":true,"transaction":"0.0.7162784@…"}`; client received 200 plus `PAYMENT-RESPONSE`. Amount 1 tinybar per run, two runs.
- [x] Save the settlement reference — evidence: run 1 `0.0.7162784-1789310764-859459760` (consensus 1789310771.868350104), run 2 `0.0.7162784-1789310805-418056060` (consensus 1789310814.488111518). HashScan: `https://hashscan.io/testnet/transaction/<id>`.
- [x] Confirm settlement occurs on Hedera — evidence: `GET https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.7162784-1789310805-418056060` → `SUCCESS`, `CRYPTOTRANSFER`; transfers: payer −1, recipient +1, facilitator −266,022 tinybar network fee. The facilitator is the fee payer; the payer funds only the payment amount. Mirror node lag ≈7–9 s after settle; receipt readers need a short retry.

Integration notes for Phase 4: server-side `ExactHederaScheme({})` needs **no Hedera key**, so `HEDERA_OPERATOR_KEY` stays scoped to HCS writes. Client-side `@x402/core` default spend controls reject HBAR; configure `setSpendControls({ allowedAssets: [{ network, asset: '0.0.0', maxAmountPerPayment: SAFE402_MAX_PAYMENT }] })`, never `spendControls: false`. Use the explicit `{ asset: '0.0.0', amount }` price form, not a `'$x'` money string (that selects USDC). Facilitator `/verify` and `/settle` are POST-only at the root; there is no OpenAPI spec.

## Chainlink CRE

- [x] Locate the workflow and configuration — evidence: none in repo (greenfield). Templates `smartcontractkit/cre-templates` at commit `d0223f31182c76bc36b1cc9d47b13b18efcf2bf6`: `starter-templates/hello-confidential-workflows/hello-confidential-workflows-ts` and `starter-templates/confidential-workflows/ai-audit-firewall/ai-audit-firewall-ts` studied. CRE CLI v1.33.0 (GitHub release binary, scratch dir only), `@chainlink/cre-sdk@1.18.0` (1.21.0 current), Bun 1.3.5.
- [x] Confirm use of a confidential handler — evidence: `cre.handlerInTee(trigger, fn, tees)` with `runtime.getSecret({id})` inside; `cre workflow build --target staging-settings` compiled the modified handler to WASM with no credentials (binary hash `dbf9129b…7ffe`).
- [x] Run the smallest available workflow in the CRE simulator — evidence (after `cre login`, 2026-09-13): `cre workflow simulate my-workflow --target staging-settings --non-interactive --trigger-index 0 --env <file>` → `[SIMULATION] Running trigger trigger=cron-trigger@1.0.0`, TEE banner "Trigger requested TEE Execution … AWS Nitro in us-west-2 … The simulator is not a real TEE", binary hash `dbf9129b…7ffe`, config hash `e93aacf9…5fd3`. Secrets resolve only from the `--env` file, the project `.env`, or exported variables; a shell-prefix assignment is ignored.
- [x] Confirm a private parameter affects its result — evidence (CRE simulator): secret `POLICY_MAX_RISK` mapped via `secrets.yaml` to `SECRET_POLICY_MAX_RISK`; identical evidence scores 60; env file with `60` → `Workflow Simulation Result: "ALLOW (score: 60)"`; env file with `30` → `"BLOCK (score: 60)"`. Threshold never appears in the result. Earlier host-side `bun test` (4 pass) agrees.
- [x] Identify whether execution is simulated or live — evidence: no in-SDK flag. Mode is determined by CLI command (`simulate` vs `deploy`+`activate`) and marked by CLI output (`[SIMULATION]`, "The simulator is not a real TEE"). Live secrets come from the Vault DON into an attested AWS Nitro enclave (`us-west-2`, currently the only TEE). Safe402 sets `confidentialExecutionMode` from the invocation path, never from workflow output.
- [x] Inspect the consumer-contract delivery path — evidence: consumer implements `IReceiver.onReport(bytes metadata, bytes report)` plus ERC-165; forwarder checks `supportsInterface`. Workflow crosses back with `runtime.usingTheDons()`, `donRuntime.report({encodedPayload, encoderName:'evm', signingAlgo:'ecdsa', hashingAlgo:'keccak256'})`, then `EVMClient.writeReport(donRuntime, {receiver, report, gasConfig})`. Sepolia chain name `ethereum-testnet-sepolia`. Mock forwarder for simulation `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`; production KeystoneForwarder `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`. Production metadata is 64 bytes (62 + 2-byte reportId); do not `require(length == 62)`.
- [x] Distinguish authenticated CRE delivery from a manual test transaction — decision: `reportDeliveryMode=LOCAL` for simulator writes via the mock forwarder, `TESTNET` only for a deployed workflow through the production forwarder. Any Foundry-scripted call to `onReport` is a test adapter, labeled as such, never presented as CRE delivery.

Blockers for live delivery: `cre whoami` shows Deploy Access: Not enabled (request via `cre account access`); deploying a `handlerInTee` workflow needs the **Confidential Workflows private beta** (invite-only form at `docs.chain.link/cre/account/confidential-workflows-access`); `deploy`/`activate` need a funded Sepolia key; the enclave protects secret **parameters**, not the policy **logic** (the WASM is visible), which matches PRD §18.5 and must be stated that way in `docs/trust-model.md`.

## The Graph

- [x] Locate schema and mappings — evidence: none exist yet (greenfield); a throwaway `sepolia` subgraph was scaffolded in the scratch dir to prove the toolchain.
- [x] Verify local toolchain — evidence: `@graphprotocol/graph-cli@0.98.1`, `@graphprotocol/graph-ts@0.38.2` on Node 24.10.0; `graph codegen` and `graph build` succeeded (`build/Contract/Contract.wasm`, 35,831 bytes). Network slug `sepolia` (CAIP-2 `eip155:11155111`) confirmed in the CLI's networks registry. Contract addresses in `subgraph.yaml` must be lowercase; a mixed-case placeholder failed validation.
- [x] Verify deploy key — evidence: `graph auth` accepted the Studio key from `.env` (exit 0, "Deploy key set for https://api.studio.thegraph.com/deploy/"). Side effect: the CLI wrote `~/.graph-cli.json`; there is no config-path override.
- [ ] Blocked — Locate the hosted endpoint and deployment identifier. No subgraph exists until `Safe402AuthorizationRegistry` is deployed (Phase 4). Studio dev endpoint shape: `https://api.studio.thegraph.com/query/<id>/<slug>/<version>` (no API key, 3,000 queries/day). Gateway endpoint `https://gateway.thegraph.com/api/<api-key>/subgraphs/id/<id>` needs a separate query API key (`GRAPH_API_KEY`).
- [ ] Blocked — Run a real hosted query / verify results / record indexing progress. Same dependency.
- [x] Identify how the application consumes the result — decision: direct GraphQL over HTTP from `src/graph/` using the Studio dev endpoint; `_meta { block { number } hasIndexingErrors }` supplies index freshness. Official Subgraph MCP (`https://subgraphs.mcp.thegraph.com/sse`, Bearer gateway API key via `mcp-remote`) is optional and requires `GRAPH_API_KEY`.
- Reference: `graphprotocol/subgraphs-skills` at commit `7b3499af5018d19c55daabf8272aaa265df928b3`.

**Incident:** the probe agent sourced `.env` with a parser that kept the trailing `# [SECRET]` comment on the deploy-key line. The malformed value made `graph auth` fall into an interactive prompt that echoed part of the key into that agent's tool output (not into the main session or any committed file). Fix applied: `[SECRET]` markers now sit on their own line above each value in `.env` and `.env.example`. **Action for owner: rotate the Subgraph Studio deploy key and update `GRAPH_DEPLOY_KEY`; delete `~/.graph-cli.json` afterwards.**

## Blocker summary and owner actions

| Dependency | State | Owner action |
|---|---|---|
| Hedera payment + settlement | verified live | none |
| Runner isolation | verified locally | none (collector is Phase 3 work) |
| Graph toolchain + deploy key | verified | rotate Studio deploy key (see incident), delete `~/.graph-cli.json` |
| CRE simulation | verified (simulated TEE) | none; deploy access "Not enabled" → run `cre account access` |
| CRE live confidential deploy | blocked on beta invite | submit the Confidential Workflows access form now |
| Sepolia deployer | blocked | fund a Sepolia key and set `EVM_DEPLOYER_PRIVATE_KEY` |
| Graph hosted query | blocked on contract | resolves in Phase 4 after registry deploy |

## Execution modes (recorded)

- `evidenceMode`: `REAL_ARTIFACT_TEST` for fixture runs in the Docker runner.
- `confidentialExecutionMode`: `SIMULATED` for this sprint. `LIVE` requires the beta invite.
- `reportDeliveryMode`: `LOCAL` (mock forwarder) until a deployed workflow writes through the production forwarder (`TESTNET`).

## Exit criteria

- [x] Each dependency has a verified path or a specific blocker — evidence: table above.
- [x] Execution modes are documented — evidence: section above.
- [x] Available dependencies can be used by later phases — evidence: Hedera packages and config verified; Docker isolation flags verified; Graph CLI verified; CRE build verified.

---

# Phase 3 — Security Core (30–70 min)

Verified with `pnpm test` (13 files, 104 tests, all passing, including the Docker-dependent integration suite) and `pnpm audit:local` against both fixtures. Every checked item below cites a test name (`test/*.test.ts` or `test/integration/*.test.ts`) or an exact command and its output line.

**Runner flag note (extends Phase 2 § Runner):** the flags recorded there (`--network none --read-only --tmpfs /tmp --memory 1g --pids-limit 64 --cap-drop ALL --security-opt no-new-privileges --user 65534`) were probe-only. The working strace collector built in this phase extends them: `--cap-add SETUID --cap-add SETGID` alongside `--cap-add SYS_PTRACE` (so `strace -u nobody` can drop privileges for the traced child); `--tmpfs /tmp` is `noexec,nosuid,nodev,size=64m`; `--memory-swap` equals `--memory`; the deadline is enforced from the host with `docker kill`, not a container-internal timeout.

The trace path itself was revised after review (`runner/harness/run.ts`, `runner/harness/docker.ts`, `runner/images/Dockerfile`, commit `f122aeb`): `/obs` is now a named Docker volume `safe402-obs-<auditId>` seeded from the image's own `/obs` directory, created `mode 0700` root:root at image build time (`RUN mkdir -m 0700 /obs` in the Dockerfile) — the unprivileged tool process can neither read, write, nor unlink it. The tool container has **no writable host mount at all** for observation data (the earlier `/out` bind inside the tool container is gone). After the tool container exits or is force-killed (`dockerKill` runs unconditionally in the `finally` block, before extraction, on every path including a throw), a separate **trusted helper container** — the same runner image, not the tool's own process — mounts the volume read-only and a host directory read-write, and copies the trace out (`dockerExtractTrace` in `runner/harness/docker.ts`); the volume is then removed (`dockerVolumeRm`). Host-side, the copied file must be a genuine regular file (`lstatSync(...).isFile()`, so a symlink swap reads as missing) and no larger than 64 MiB, or the run fails closed with `collectorError: 'trace log too large'` — never a silent truncation.



## 3.1 Prepare the fixtures

- [x] Both initialize through the supported MCP harness — evidence: `test/fixtures.test.ts` → `fixtures/clean-price-tool > answers initialize and tools/list over stdio`, `fixtures/credential-attempt > answers initialize and tools/list over stdio` (both pass in `pnpm test`).
- [x] Both have manifests — evidence: `fixtures/clean-price-tool/manifest.json`, `fixtures/credential-attempt/manifest.json` exist and parse; `test/fixtures.test.ts` → `resolves to an artifact with a declared network host` for each.
- [x] Both have immutable executable identities — evidence: `resolveArtifact` hashes normalized paths and content into `artifactHash`; `test/artifacts.test.ts` → `hashes deterministically and changes with one byte`; `test/fixtures.test.ts` → `artifact hashes differ between fixtures`.
- [x] Both accept bounded inputs — evidence: each fixture declares a single-field `inputSchema` (`{ symbol: string }`, required) in `manifest.json`/`TOOL`; the harness's `McpDriver` bounds every request to a 10 s timeout and a capped output buffer regardless of what the fixture returns — `test/mcp-driver.test.ts` → `caps the output buffer and keeps working after a flood`.
- [x] Expected test outcomes are separate from collected evidence — evidence: `decide()` (`src/domain/decide.ts`) takes only `evidence`, `policy`, `manifest`, `profile`, `bindings` — no fixture name or path is ever passed in; `test/decide.test.ts` operates entirely on synthetic evidence with no fixture reference, confirming the decision engine cannot see which fixture produced the evidence it is deciding on.

**Never determine the verdict from the fixture name** — upheld: `scripts/verification/local-audit.ts` passes `basename(fixture)` only to a log line (`log(...)`), never into `decide()`, `resolveArtifact()`, or any persisted record.

## 3.2 Bind the artifact

- [x] Hash normalized paths and file contents — evidence: `src/artifacts/resolve.ts` `walk()` sorts entries by POSIX-normalized relative path and hashes each file's bytes with SHA-256 before the whole set is canonically hashed under `safe402/artifact/v1`; `test/artifacts.test.ts` → `hashes deterministically and changes with one byte`.
- [x] Include the capability manifest and entrypoint — evidence: `resolveArtifact`'s canonical hash input is `{ files, entrypoint, capabilityManifest, lockfile }` (`src/artifacts/resolve.ts`).
- [x] Include the lockfile where relevant — evidence: the same canonical object sets `lockfile: lock ? lock.sha256 : null`, matching `package-lock.json` or `pnpm-lock.yaml` when present (`src/artifacts/resolve.ts`). Neither current fixture ships a lockfile, so both audits above resolve this to `null`; the present-lockfile branch is implemented and code-reviewed but has no dedicated fixture exercising a non-null value yet.
- [x] Record the prepared executable digest — evidence: `Artifact.executableDigest = artifactHash` (`src/artifacts/resolve.ts`); asserted directly in `test/artifacts.test.ts` → `hashes deterministically and changes with one byte` (`expect(a.executableDigest).toBe(a.artifactHash)`).
- [x] Keep the executable content immutable between audit and launch — evidence: `runner/harness/run.ts`'s `copyHashedFiles` performs the identical walk/exclusion set `resolveArtifact` hashed, and the copy is bind-mounted `:ro` into the container (`-v ${artDir}:/artifact:ro`); `test/integration/runner.test.ts` → `delivers the genuine trace from a killed container that tried to forge one` confirms the container sees exactly `['manifest.json', 'server.js']`, nothing added or excluded differently.

## 3.3 Collect observations

- [x] Reuse a verified collector / otherwise implement reliable credential-file access observation — evidence: Phase 2 found no verified collector (probe self-reported only); Phase 3 implements one in `runner/collectors/strace.ts` (`parseStrace`), verified by `test/strace.test.ts` → `extracts canary read, denied write, dns, connect, and spawn from the blocked trace` and `test/integration/runner.test.ts` → `observes the credential read in the blocked fixture from the collector`.
- [x] Keep collection outside the submitted process — evidence: `strace` runs as the container's root user while the traced tool runs as `nobody` (`--cap-add SETUID --cap-add SETGID` let `strace -u nobody` drop privileges for the child); the traced process cannot read, write, or unlink its own trace on the root-only named volume, and has no writable host mount to plant a forged trace in either — `test/integration/runner.test.ts` → `delivers the genuine trace from a killed container that tried to forge one` (`obsTruncate`/`obsRead`/`obsUnlink` all return `EACCES`; `outWrite`/`outList` — the old `/out` bind, now removed from the tool container — return `ENOENT`; the extracted host trace contains none of the tool's tamper attempts). Extraction itself runs in a separate trusted helper container (the runner image, not the tool's process) after the tool container is unconditionally killed.
- [x] Record attempted, permitted, and completed actions separately — evidence: `Observation` has independent `attempted`/`permitted`/`completed` booleans (`src/domain/types.ts`); `test/decide.test.ts` → `attempted but denied canary read still blocks` exercises the attempted/completed distinction directly.
- [x] Include test ID and collector identity — evidence: every observation carries `testId` (attributed from the request/response time window via `testFor`) and `collectorVersion: 'strace-v1'` (`runner/collectors/strace.ts`); `test/strace.test.ts` → `attributes an unfinished/resumed call to the window where it was attempted, not where it resumed`.
- [x] Enforce a timeout — evidence: `profile.deadlineMs` triggers a host-side `docker kill`, never a container-internal timer; `test/integration/runner.test.ts` → `kills on deadline` (`r.timedOut === true`, container removed).
- [x] Enforce resource limits — evidence: `runner/harness/run.ts` passes `--memory`, `--memory-swap` (equal to `--memory`), `--pids-limit`, and `--tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m` on every run, sourced from `runner/profiles/no-network-v1.json` (`memoryBytes: 1073741824`, `pidsLimit: 64`); exercised on every passing `test/integration/runner.test.ts` and `test/integration/pipeline.test.ts` run (a limit violation would surface as a non-zero/OOM exit rather than a clean pass).
- [x] Destroy temporary test state after execution — evidence: `runner/harness/run.ts`'s `finally` block force-kills the tool container, extracts the trace, then unconditionally runs `dockerVolumeRm(volume)` plus `rmSync(homeDir, ...)`/`rmSync(artDir, ...)`; the tool container itself runs with `--rm`. Only the extracted, host-side trace under `dataDir/runs/<auditId>/obs` is kept, by design, for the evidence reference.

If arbitrary-code isolation is incomplete, allow only repository-controlled fixtures — upheld: `resolveArtifact` takes a local directory path only; there is no upload endpoint, API, or public submission path anywhere in this phase.

## 3.4 Implement policy evaluation

Policy in force: `config/policies/research-agent.yaml` — credential access forbidden (via canary detection), wallet signing forbidden, process spawning forbidden, network restricted to `prices.example.test`, `requireCompleteCoverage: true`.

- [x] Validate the policy — evidence: `src/schemas/policy.ts` (`parsePolicy`, zod, `.strict()`); `test/policy.test.ts` → `rejects unknown fields, bad ttl, bad host`, `rejects duplicate YAML keys`.
- [x] Bind its version or commitment to the result — evidence: `policyCommitment(policy, salt)` (`src/policies/commit.ts`) is hashed under `safe402/policy/v1` and stored as `capsule.policyCommitment`; `test/policy.test.ts` → `commitment depends on salt and policy`.
- [x] Keep private values out of public reports — evidence: `DecisionCapsule` and `Report` (`src/domain/types.ts`, `src/reports/capsule.ts`, `src/reports/report.ts`) carry only `policyCommitment` (a hash); neither the policy body nor its salt is a field on either type, so `buildCapsule`/`buildReport` have no path to embed them.
- [x] Implement deterministic decision precedence — evidence: `decide()` (`src/domain/decide.ts`) checks binding → critical violations → coverage → declared/policy mismatch → `ALLOW`, in that fixed order, returning on the first match; `test/decide.test.ts` → `binding failure wins over everything`, `critical violation beats missing coverage`, `returns reason codes in a stable sorted order regardless of observation order`, `is pure: it does not mutate its inputs and repeats its verdict`.
- [x] Collector failure cannot produce approval — evidence: `test/integration/pipeline.test.ts` → `collector failure → REVIEW, never ALLOW`.
- [x] Missing configuration cannot produce approval — evidence: `pnpm audit:local fixtures/clean-price-tool --policy config/policies/does-not-exist.yaml` → `[local-audit] policy file not found: config/policies/does-not-exist.yaml`, exit code `6`, no decision emitted. `worker/pipeline.ts`'s `processJob` likewise throws (`artifact missing`, `policy missing`, `profile hash mismatch`) before `decide()` ever runs, ending the job in `FAILED` with no capsule saved.
- [ ] LLM failure cannot activate canned results — not applicable in this phase: no LLM integration exists yet. `Finding.sourceType` is only ever `'STATIC'` (regex scanner, `src/scanner/scan.ts`) or, on observations, `'RUNTIME'` (`src/domain/types.ts`); there is no code path that calls an LLM or could fall back to a canned verdict. Deferred to whichever later phase adds LLM-derived findings; the constraint in `CLAUDE.md` still applies then.
- [x] Critical violations override aggregate scores — evidence: `decide()`'s critical-violation check runs and returns `BLOCK` before any coverage or policy-mismatch check is reached (`src/domain/decide.ts`); `test/decide.test.ts` → `critical violation beats missing coverage`. There is no numeric aggregate score to average against — see below.
- [ ] Numeric scoring — deferred per spec 3.4 ("Defer numeric scoring if it is not already useful and verified"). Decision precedence is purely categorical (`BLOCK`/`REVIEW`/`ALLOW`); no score field exists on `Coverage`, `DecisionCapsule`, or `Report`. The only numeric confidence value in this phase is the static scanner's fixed `STATIC_CONFIDENCE = 60` per regex hit (`src/scanner/scan.ts`), which is informational metadata on a `Finding`, not an input to `decide()`.

## 3.5 Persist results

Storage: SQLite (no prior persistence existed — spec's fallback path), `src/db/db.ts` / `src/jobs/repo.ts`.

- [x] Persist jobs before execution — evidence: `repo.createJob(...)` (status `QUEUED`) runs before `repo.claimNext(...)`/`processJob(...)` in `scripts/verification/local-audit.ts` and `worker/pipeline.ts`'s `runWorkerOnce`; `test/jobs.test.ts` → `claims atomically, heartbeats, transitions, persists, and reopens`.
- [x] Persist observations and coverage — evidence: `worker/pipeline.ts` calls `repo.saveEvidence(evidenceHash, id, bundle)`, where `bundle.observations` and `bundle.coverage` are the full runtime evidence; `test/integration/pipeline.test.ts` → `clean → ALLOW, blocked → BLOCK with RUNTIME evidence, both signed and verifiable` reads the persisted report's `declaredVsObserved` and `findings` back out of the repo after the run completes.
- [x] Persist decisions and reports — evidence: `worker/pipeline.ts` calls `repo.saveCapsule(...)` and `repo.saveReport(...)`; `test/integration/pipeline.test.ts` fetches `repo.getCapsuleByAudit('a_clean')` / `repo.getReportByAudit('a_blocked')` after the worker loop drains, proving both are durably stored, not just returned in-process.
- [ ] Persist payment associations — deferred: no payment integration exists in this phase (Phase 4). Neither `JobRow` (`src/jobs/repo.ts`) nor `DecisionCapsule`/`Report` has a payment-reference field; `grep -rn payment src/jobs/repo.ts src/domain/types.ts` returns nothing.
- [x] Recover interrupted jobs as pending or failed — evidence: `test/integration/pipeline.test.ts` → `a job interrupted mid-stage is recovered after restart with the same auditId` (a job claimed then abandoned mid-`SCANNING` is swept back to `QUEUED` by a fresh `JobRepo` instance, then completes to `ALLOW` on `attempts: 2`); `test/jobs.test.ts` → `sweeps expired leases back to QUEUED until attempts exhausted` (and to `FAILED` once attempts are exhausted).

## Minimum result fields

All fields from spec 3.4 are present except `publicationStatus`: `auditId`, `artifactHash`, `policyCommitment`, `subjectId`, `executionProfileHash` are on `DecisionCapsule`; `jobStatus` is `JobRow.status`; `decision`/`reasonCodes` are on `DecisionCapsule`; `observations`/`coverage` are on `EvidenceBundle`/`Report`; `evidenceHash`/`issuedAt`/`expiresAt`/`confidentialExecutionMode` are on `DecisionCapsule`; `issuer`/`reportSignature` correspond to `SignedReportEnvelope.issuer`/`.signature` (`src/domain/types.ts`). `publicationStatus` and the separate publication envelope (`paymentReference`, `hederaReceipt`, `consumerTransaction`, `graphDeployment`, `indexedBlock`) are deferred to Phase 4 — `SignedReportEnvelope.publication` exists as an empty `{}` placeholder today (`src/reports/sign.ts`) with no fields populated yet.

## Exit criteria

- [x] The clean fixture passes the compatible policy — evidence: `pnpm audit:local fixtures/clean-price-tool` → `status=COMPLETED decision=ALLOW reasons=ALL_CHECKS_SATISFIED`, exit code `0`.
- [x] The blocked fixture produces an actual credential-access observation — evidence: `test/integration/runner.test.ts` → `observes the credential read in the blocked fixture from the collector` (`{ sourceType: 'RUNTIME', capability: 'FILESYSTEM', operation: 'READ', attempted: true, completed: true }` for `/home/tool/.aws/credentials`).
- [x] The blocked fixture receives `BLOCK` — evidence: `pnpm audit:local fixtures/credential-attempt` → `status=COMPLETED decision=BLOCK reasons=CREDENTIAL_ACCESS_OBSERVED,UNDECLARED_FILE_ACCESS`, exit code `2`.
- [x] Missing required evidence produces `REVIEW` — evidence: `test/integration/pipeline.test.ts` → `collector failure → REVIEW, never ALLOW` (`cap.decision === 'REVIEW'`, `cap.reasonCodes` contains `COLLECTOR_FAILURE`, `cap.expiresAt === null`).
- [x] Results survive process restart — evidence: `test/integration/pipeline.test.ts` → `a job interrupted mid-stage is recovered after restart with the same auditId`; `test/jobs.test.ts` → `claims atomically, heartbeats, transitions, persists, and reopens` (a second `JobRepo` instance against the same DB file sees the persisted state).

# Phase 4 — Integrations (70–115 min)

Not started.

# Phase 5 — Interfaces (115–140 min)

Not started.

# Phase 6 — Verify (140–165 min)

Not started.

# Phase 7 — Handoff (165–180 min)

Not started.
