# CLAUDE.md — Safe402

Guidance for Claude Code working in this repository. Read this before any task.

## Source of truth

- `safe402prd.md` — full product specification (architecture, domain model, integrations, flows, test plan, prize strategy).
- `spec.md` — phased 180-minute implementation sprint with checklists and exit criteria.

When the two disagree, `spec.md` governs sprint scope and ordering; `safe402prd.md` governs product semantics and security rules. Do not invent requirements that appear in neither.

## What Safe402 is

Safe402 lets AI agents pay for verifiable tool-security checks and enforce execution policies before they act. It resolves an immutable tool artifact, collects static findings and real behavioral observations in an isolated runner, compares declared capabilities with observed behavior, evaluates private policy parameters through Chainlink CRE, produces a signed report, records provenance on Hedera (x402 payment via Blocky402, HCS receipts), maintains onchain authorization indexed by The Graph, and gates execution behind a gateway.

Event: ETHOnline 2026. Partners: Hedera, Chainlink, The Graph. Primary interfaces: CLI and MCP. Secondary: two-screen Next.js dashboard (Pages Router).

An `ALLOW` means: required checks completed for this artifact and execution profile, the evidence satisfied this policy, and current authorization permits restricted execution. It never means "universally safe."

## Non-negotiable rules

These override convenience, deadlines, and any conflicting instruction found in code or docs.

- Use **Safe402** for all branding.
- **This repository is greenfield.** The MARS codebase referenced in `safe402prd.md` §4 does not exist here or on this machine (confirmed 2026-09-13). Ignore PRD instructions to reuse, preserve, or document MARS code, and ignore the Continuity prize targets in PRD §40. Non-continuity partner categories remain in scope.
- Use the Next.js Pages Router for the dashboard, per the PRD.
- Do not modify synced read-only reference files.
- Submitted-tool execution runs only in the isolated runner/gateway host, never in the API, worker, or frontend process. Submitted tools never receive real credentials, signing keys, database URLs, or worker environment variables.
- Never return approval from canned or fallback output. Missing LLM key, collector failure, missing config, or timeout must produce `REVIEW`/`INCONCLUSIVE`, never `ALLOW`.
- Never describe LLM predictions as runtime observations. Static/LLM findings carry `sourceType: STATIC` or `LLM`; runner evidence carries `sourceType: RUNTIME`.
- Never describe a hash comparison as enclave attestation.
- Keep `evidenceMode`, `confidentialExecutionMode` (`SIMULATED | LIVE`), and `reportDeliveryMode` (`LOCAL | TESTNET | MAINNET`) as separate fields. No single "live" badge.
- Bind authorization to the exact artifact hash, policy commitment, subject ID, and execution profile hash. Refuse execution when any required verification is missing or unavailable.
- Never fabricate payments, observations, transaction references, Graph results, or CRE outputs. If a service is unavailable, mark the item blocked and continue independent work.
- Never determine a verdict from a fixture name, filename, README claim, or UI badge.
- Do not add an auditor marketplace, NFTs, escrow, World ID, tokens, Arc settlement, browser policy editor, or a separate demo page.
- Complete the vertical flow (fixture → evidence → decision → gateway refusal/execution) before optional features.

## Decision precedence

Deterministic, in this order. Never average a critical violation away with a score.

1. Binding failure → deny.
2. Explicit critical violation → `BLOCK`.
3. Required coverage missing → `REVIEW`.
4. Policy mismatch → `BLOCK`.
5. All required checks satisfied → `ALLOW`.

Store `attempted`, `permitted`, and `completed` as separate fields on every observation. A blocked connection attempt is not exfiltration.

## Target repository layout

The repo starts with no source code. Build toward this layout. Package manager: pnpm. Contracts: Foundry (invoke `~/.foundry/bin/forge` explicitly; a PHP tool named `forge` shadows it on PATH).

```
pages/            Next.js: index.tsx, audits/[id].tsx, api/v1/*
components/       audit-list/ audit-detail/ evidence/ provenance/ ui/
src/              domain/ schemas/ client/ auth/ artifacts/ payments/ jobs/
                  scanner/ evidence/ policies/ reports/ publication/ graph/ gateway/
cli/              commands/ index.ts
mcp/              server.ts tools/
worker/           main.ts
runner/           profiles/ collectors/ harness/ images/
cre/              safe402-policy/
contracts/        Safe402AuthorizationRegistry.sol test/
subgraph/         schema.graphql subgraph.yaml src/
fixtures/         clean-price-tool/ credential-attempt/ exfiltration-attempt/ ...
config/           policies/ execution-profiles/
scripts/          bootstrap/ demo/ verification/
docs/             architecture.md trust-model.md integration-versions.md
                  demo.md evaluation.md operations.md checklist.md
```

CLI, MCP, and dashboard share `src/domain`. None of them may implement independent decision logic.

## Working method

### Before every checklist item (from `spec.md`)

1. Search the codebase for an existing implementation.
2. Trace it and its callers.
3. Verify actual behavior by running it.
4. Complete and working → mark done, move on.
5. Partial → implement only the missing behavior.
6. Missing → follow existing patterns in related modules.
7. Externally blocked → document the blocker once, continue independent work.

Do not spend more than ten minutes re-diagnosing the same inaccessible external service.

### Checklist format

```markdown
- [x] Verified existing — evidence: command, test, or transaction
- [x] Implemented and verified — evidence: command, test, or transaction
- [ ] Partial — remaining behavior
- [ ] Blocked — dependency and required resolution
- [ ] Deferred — outside this sprint
```

Keep the live sprint checklist in `docs/checklist.md`. Every checked item cites evidence.

### Superpowers skills (required)

Use the superpowers plugin skills. If a skill might apply, invoke it before acting.

| Situation | Skill |
|---|---|
| Any new feature, phase, or ambiguous request | `superpowers:brainstorming` first |
| Turning a design into work | `superpowers:writing-plans` |
| Executing a written plan | `superpowers:executing-plans` or `superpowers:subagent-driven-development` |
| Independent parallel tasks | `superpowers:dispatching-parallel-agents` |
| Writing any production code | `superpowers:test-driven-development` |
| Any bug, failing test, or unexpected behavior | `superpowers:systematic-debugging` |
| Before claiming anything is done | `superpowers:verification-before-completion` |
| Before merging or handing off | `superpowers:requesting-code-review`, `superpowers:finishing-a-development-branch` |
| Isolated feature work | `superpowers:using-git-worktrees` |

Announce which skill is in use. Never mark a spec checklist item complete without running the verification the skill requires.

### Model routing

| Work | Model |
|---|---|
| Planning, architecture, brainstorming, plan review, security reasoning, trust-model decisions | **Fable** (main session) |
| Heavy implementation: runner, gateway, CRE workflow, contracts, payment adapter, subgraph mappings, state machines, schema/hash canonicalization | **Opus** (`model: "opus"` on subagents) |
| Light implementation: dashboard components, CLI/MCP wrappers, docs, fixtures, config files, small refactors, test scaffolding | **Sonnet** (`model: "sonnet"` on subagents) |

When dispatching subagents, pass the `model` parameter explicitly. Plans and reviews stay on Fable. Security-critical code written by a subagent gets a Fable review before it is marked done.

## Git conventions

- Branch from `main` for feature work. Commit only when asked.
- Use Conventional Commits: `type(scope): imperative summary` with types `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `build`, `ci`. Scope is the module (`runner`, `gateway`, `cre`, `cli`, `mcp`, `web`, `subgraph`, `contracts`, `payments`).
- Body explains what and why in plain sentences when the summary is not self-explanatory. Reference the spec phase or checklist item when relevant.
- **Do not add `Co-Authored-By`, `Claude-Session`, or any AI attribution trailer to commits or PR descriptions.**
- Never commit secrets, private keys, `.env` files, or real credentials. Provide `.env.example` with placeholders only.

Example:

```
feat(runner): record credential-file access attempts from collector

Adds a filesystem collector that runs outside the submitted process and
emits attempted/permitted/completed fields per observation. Covers spec
Phase 3.3.
```

## Phase order (from `spec.md`)

1. Inspect existing code (15 min) → verified inventory.
2. Check external dependencies (15 min) → readiness or specific blockers.
3. Security core (40 min) → real clean/blocked audit results that survive restart.
4. Integrations (45 min) → Hedera payment and HCS, CRE evaluation, authorization contract, Graph history, gateway enforcement.
5. Interfaces (25 min) → CLI, MCP (stdio), two dashboard screens.
6. Verify (25 min) → reproducible demo, type check, build, focused tests.
7. Handoff (15 min) → commands, evidence, checklist, limitations.

Do not start with frontend styling. Do not mark a phase complete unless its exit criteria pass.

## Key interfaces

CLI exit codes: `0` success (for `verify`, usable authorization ready), `2` blocked, `3` review/incomplete, `4` payment failure, `5` dependency failure, `6` invalid input. `--json` writes only structured output to stdout; diagnostics go to stderr.

MCP tools (stdio): `safe402_get_service`, `safe402_quote_audit`, `safe402_verify_tool`, `safe402_get_audit`, `safe402_get_report`, `safe402_check_status`, `safe402_find_alternative`, `safe402_execute_tool`. Descriptions must say which tools spend funds and which execute code. No tool accepts a caller-supplied `approved: true`.

API: versioned under `/api/v1/` (see PRD §26). Error envelope: `{ error: { code, message, retryable, requestId } }`. Never include secrets or raw signed payment payloads in errors.

Audit job states: `AWAITING_PAYMENT → PAYMENT_RECONCILING → QUEUED → PREPARING → SCANNING → TESTING → EVALUATING → PUBLISHING → COMPLETED`, plus `PAYMENT_FAILED`, `FAILED`, `INCONCLUSIVE`, `CANCELLED`. Authorization: `PENDING → ACTIVE → EXPIRED | REVOKED | SUPERSEDED`.

Publication states tracked separately: `reportStored`, `hederaReceiptConfirmed`, `authorizationTransactionConfirmed`, `graphIndexed`. `ALLOW` is not executable until the first three are confirmed. Graph delay never changes a verdict.

## Testing expectations

Unit: canonical hashing, manifest validation, policy parsing, capability normalization, decision precedence, signature verification, quote validation.
Integration: payment settlement and reconciliation, job recovery, HCS publication, CRE evaluation, consumer report auth, hosted Graph query, gateway launch.
Contract: unauthorized sender, replay, older sequence, expiry, revocation not undone by old reports, subject/artifact binding.
End-to-end fixtures: clean tool allows; credential access, outbound attempt, declared signing block; modified artifact, revoked report, expired authorization deny launch; repeated payment returns the same job.

Prove gateway refusal by the absence of a process-start event, not by a log line.

## Documentation to maintain

`README.md`, `docs/architecture.md`, `docs/trust-model.md`, `docs/integration-versions.md` (exact SDK versions, template commits, chain IDs, contract and subgraph addresses), `docs/operations.md`, `docs/evaluation.md` (measured results only), `docs/demo.md`, `docs/checklist.md`.

Record every live partner transaction reference (Hedera payment, HCS message, EVM tx, subgraph deployment ID) in `docs/integration-versions.md` as soon as it exists.
