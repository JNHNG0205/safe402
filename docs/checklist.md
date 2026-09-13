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
- [ ] Blocked — Run the smallest available workflow in the CRE simulator. `cre workflow simulate` fails at `Initializing...` with `authentication required: no credentials found: you are not logged in, run cre login and try again` on CLI v1.33.0, v1.30.0, v1.26.0, v1.22.0, with and without `--wasm`. **Resolution: owner runs `cre login` once, or sets `CRE_API_KEY`.** Free platform account; no beta invite needed for simulation.
- [x] Confirm a private parameter affects its result — evidence (host-side, not the CRE runtime): secret `POLICY_MAX_RISK` via `secrets.yaml` → env; same evidence payload scores 60; `SECRET_POLICY_MAX_RISK=60` → `ALLOW (score: 60)`, `SECRET_POLICY_MAX_RISK=30` → `BLOCK (score: 60)`; `bun test` with `@chainlink/cre-sdk/test` harness: 4 pass, 0 fail, threshold never appears in logs or output. Counts as local evaluation only until the simulator runs.
- [x] Identify whether execution is simulated or live — evidence: no in-SDK flag. Mode is determined by CLI command (`simulate` vs `deploy`+`activate`) and marked by CLI output (`[SIMULATION]`, "The simulator is not a real TEE"). Live secrets come from the Vault DON into an attested AWS Nitro enclave (`us-west-2`, currently the only TEE). Safe402 sets `confidentialExecutionMode` from the invocation path, never from workflow output.
- [x] Inspect the consumer-contract delivery path — evidence: consumer implements `IReceiver.onReport(bytes metadata, bytes report)` plus ERC-165; forwarder checks `supportsInterface`. Workflow crosses back with `runtime.usingTheDons()`, `donRuntime.report({encodedPayload, encoderName:'evm', signingAlgo:'ecdsa', hashingAlgo:'keccak256'})`, then `EVMClient.writeReport(donRuntime, {receiver, report, gasConfig})`. Sepolia chain name `ethereum-testnet-sepolia`. Mock forwarder for simulation `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`; production KeystoneForwarder `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`. Production metadata is 64 bytes (62 + 2-byte reportId); do not `require(length == 62)`.
- [x] Distinguish authenticated CRE delivery from a manual test transaction — decision: `reportDeliveryMode=LOCAL` for simulator writes via the mock forwarder, `TESTNET` only for a deployed workflow through the production forwarder. Any Foundry-scripted call to `onReport` is a test adapter, labeled as such, never presented as CRE delivery.

Blockers beyond login: deploying a `handlerInTee` workflow needs the **Confidential Workflows private beta** (invite-only form at `docs.chain.link/cre/account/confidential-workflows-access`); `deploy`/`activate` need a funded Sepolia key; the enclave protects secret **parameters**, not the policy **logic** (the WASM is visible), which matches PRD §18.5 and must be stated that way in `docs/trust-model.md`.

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
| CRE simulation | blocked on auth | run `cre login` once (or set `CRE_API_KEY`) |
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

Not started.

# Phase 4 — Integrations (70–115 min)

Not started.

# Phase 5 — Interfaces (115–140 min)

Not started.

# Phase 6 — Verify (140–165 min)

Not started.

# Phase 7 — Handoff (165–180 min)

Not started.
