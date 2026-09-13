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

Not started.

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
