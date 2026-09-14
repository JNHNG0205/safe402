# Safe402

Safe402 lets AI agents pay for verifiable tool-security checks and enforce execution profiles before they act: it resolves an immutable tool artifact, runs it inside an isolated, strace-observed container against a synthetic-credential canary, compares declared capabilities against what the collector actually saw, evaluates the result against a versioned policy with deterministic decision precedence, and issues an ed25519-signed decision report. An `ALLOW` means the required checks completed for this artifact and execution profile and the evidence satisfied the policy — it never means "universally safe."

This phase of the project (Phase 3, "Security Core") implements the audit pipeline end to end in `LOCAL` mode: artifact hashing, the Docker-isolated runner and strace collector, policy evaluation, SQLite persistence with crash recovery, and a signed report. There is no payment, Hedera/HCS, Chainlink CRE, onchain authorization, subgraph, gateway, CLI beyond the local dev script, MCP server, or dashboard yet — those are later phases.

## Prerequisites

- Node 24 (`node --version`)
- pnpm (`pnpm --version`)
- Docker Desktop, running (`docker info` must succeed)

## Setup

```bash
cp .env.example .env
pnpm install
pnpm runner:build
```

`pnpm runner:build` builds the `safe402-runner:dev` image used by the isolated runner (`runner/images/Dockerfile`). `.env` only needs a real value for `SAFE402_ISSUER_PRIVATE_KEY` (a 32-byte hex seed) for anything in this phase to run; every other variable in `.env.example` belongs to a later phase.

## Run the tests

```bash
pnpm test
```

This runs all unit and integration tests, including the Docker-based runner and pipeline integration tests (Docker must be running). As of this phase: 13 test files, 99 tests, all passing.

Unit tests only, skipping the Docker-dependent integration suite:

```bash
pnpm test:unit
```

## Run a local audit

`pnpm audit:local <fixture-dir>` resolves the fixture as an artifact, runs it through the isolated runner, evaluates the result against `config/policies/research-agent.yaml`, and prints the decision. Exit code follows the CLI convention: `0` ALLOW, `2` BLOCK, `3` REVIEW/incomplete, `5` dependency or job failure, `6` bad input.

```bash
pnpm audit:local fixtures/clean-price-tool
# decision=ALLOW reasons=ALL_CHECKS_SATISFIED
# exit code 0

pnpm audit:local fixtures/credential-attempt
# decision=BLOCK reasons=CREDENTIAL_ACCESS_OBSERVED,UNDECLARED_FILE_ACCESS
# exit code 2
```

`fixtures/clean-price-tool` does a price lookup against a declared endpoint and touches no credential files. `fixtures/credential-attempt` offers the same function but also reads `/home/tool/.aws/credentials`, a synthetic canary file, without declaring that access — the runner's strace collector observes the read from outside the tool process, and the policy blocks it.

## Evaluation mode

Every audit in this phase runs with `confidentialExecutionMode: LOCAL` — there is no Chainlink CRE evaluation, no TEE, and no attestation involved. See `docs/trust-model.md` for exactly what is and isn't verified. No payment, HCS receipt, EVM authorization, or Graph indexing happens yet; those arrive in Phase 4.

## Documentation

- `docs/trust-model.md` — what is trusted, what is verified, what is not claimed.
- `docs/checklist.md` — the live sprint checklist with evidence for every completed item.
- `spec.md` — the phased implementation specification this sprint follows.
- `safe402prd.md` — the full product specification.
