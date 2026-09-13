# Safe402 — Phased Implementation Specification

**Deadline:** 180 minutes  
**Delivery target:** Reproducible working demo  
**Interfaces:** CLI, MCP, and a minimal Next.js dashboard  
**Integrations:** Hedera, Chainlink CRE, and The Graph

---

## Implementation Rules

Before implementing **every checklist item**:

1. Search the current codebase for an existing implementation.
2. Trace the implementation and its callers.
3. Verify its actual behavior.
4. If complete and working, mark it complete and move on.
5. If partial, implement only the missing behavior.
6. If missing, inspect related modules and follow existing patterns.
7. If externally blocked, document the blocker and continue independent work.

**Do not rebuild working functionality.**

A filename, README statement, UI badge, or mocked response does not prove that a feature works.

### Checklist format

```markdown
- [x] Verified existing — evidence: command, test, or transaction
- [x] Implemented and verified — evidence: command, test, or transaction
- [ ] Partial — remaining behavior
- [ ] Blocked — dependency and required resolution
- [ ] Deferred — outside this sprint
```

### Mandatory safeguards

- Use **Safe402** for new product branding.
- Preserve existing licenses, attribution, and user changes.
- Do not edit read-only synced reference files.
- Never fabricate payments, observations, reports, or transaction references.
- Never generate approval from canned fallback data.
- Never describe LLM analysis as observed runtime behavior.
- Never describe a content hash as enclave attestation.
- Keep signing keys and service credentials outside submitted-tool environments.
- Refuse execution when required verification is incomplete.
- Distinguish local evaluation, CRE simulation, and live confidential execution.
- Keep the frontend optional for operating the product.

---

## Product Objective

Safe402 helps AI agents verify third-party tools before execution.

The system must:

1. Identify an exact tool artifact.
2. Accept an audit request and bounded payment.
3. Collect static findings and actual behavioral evidence.
4. Compare declared capabilities with observed behavior.
5. Evaluate the evidence against an execution policy.
6. Produce an authenticated report.
7. Record public provenance.
8. Check current authorization.
9. Allow restricted execution or refuse to launch the tool.

### Core decisions

| Decision | Meaning | Execution |
|---|---|---|
| `ALLOW` | Required checks satisfy the selected policy | Permitted after final authorization checks |
| `REVIEW` | Evidence is incomplete or ambiguous | Refused |
| `BLOCK` | Forbidden behavior or invalid binding | Refused |

Approval applies only to the verified artifact, policy, requester scope, execution profile, and validity period.

---

## Sprint Scope

### Required

- Two curated executable test tools.
- One file-configured execution policy.
- Real behavioral observation.
- Persistent audit results.
- Fixed-price Hedera x402 integration.
- CRE policy evaluation.
- Current authorization with expiry and revocation.
- Live history through The Graph.
- CLI and MCP access.
- Two Next.js dashboard screens.
- Repeatable demonstration.

### Deferred

- Arbitrary public uploads.
- Broad runtime support.
- Auditor marketplace.
- World ID.
- Arc settlement.
- Escrow, NFTs, bonds, and royalties.
- Browser policy editor.
- Dedicated demo webpage.
- Automatic alternative ranking.
- Substreams implementation.
- New design system.
- Production infrastructure redesign.

Do not delete working legacy functionality merely because it is outside this sprint. Keep it outside the Safe402 demonstration flow.

---

## Phase Schedule

| Phase | Time window | Deliverable |
|---|---|---|
| 1. Inspect | 0–15 minutes | Verified implementation inventory |
| 2. Check dependencies | 15–30 minutes | Integration readiness and blockers |
| 3. Complete security core | 30–70 minutes | Real clean/blocked audit results |
| 4. Connect integrations | 70–115 minutes | Payment, policy, provenance, and enforcement |
| 5. Finish interfaces | 115–140 minutes | CLI/MCP and two dashboard screens |
| 6. Verify | 140–165 minutes | Reproducible end-to-end demonstration |
| 7. Handoff | 165–180 minutes | Commands, evidence, checklist, limitations |

Reclaim time from features that already work.

Do not mark a phase complete unless its exit criteria pass. If a timebox expires, record the remaining gaps and continue work that can proceed independently.

---

# Phase 1 — Inspect the Existing Codebase

**Timebox: 15 minutes**

## Goal

Find the shortest path to a working demonstration without duplicating existing work.

## Tasks

- [ ] Identify the repository, branch, and starting commit.
- [ ] Read applicable repository instructions.
- [ ] Inspect and preserve uncommitted changes.
- [ ] Identify package manager and lockfile.
- [ ] Identify runtime requirements.
- [ ] Identify frontend routing and API structure.
- [ ] Identify persistent storage.
- [ ] Identify worker or job-processing code.
- [ ] Run the smallest existing health check.
- [ ] Create the sprint checklist.

Search for:

```text
audit
scanner
sandbox
runner
capability
policy
attestation
report
x402
hedera
chainlink
CRE
subgraph
MCP
execute
revocation
```

For each relevant feature:

- [ ] Find its entrypoint.
- [ ] Trace its actual execution path.
- [ ] Identify real dependencies and test fixtures.
- [ ] Inspect failure and fallback behavior.
- [ ] Run a focused verification.

## Inventory

Record:

| Capability | Implementation location | Verified behavior | Remaining gap |
|---|---|---|---|
| Audit submission | Discovered location | Evidence | Gap |
| Runtime observation | Discovered location | Evidence | Gap |
| Payment | Discovered location | Evidence | Gap |
| CRE evaluation | Discovered location | Evidence | Gap |
| Graph query | Discovered location | Evidence | Gap |
| Gateway enforcement | Discovered location | Evidence | Gap |
| Dashboard | Discovered location | Evidence | Gap |

## Exit criteria

- [ ] Existing capabilities are distinguished from missing capabilities.
- [ ] No feature is assumed complete from documentation alone.
- [ ] The remaining work is prioritized by demo impact.

---

# Phase 2 — Check External Dependencies

**Timebox: 15 minutes**

## Goal

Discover configuration and access blockers early.

## Hedera and Blocky402

- [ ] Verify testnet configuration.
- [ ] Verify payer and recipient configuration without printing secrets.
- [ ] Verify compatible payment SDK versions.
- [ ] Confirm the accepted asset and network.
- [ ] Perform a bounded paid request when configured.
- [ ] Save the settlement reference.
- [ ] Confirm settlement occurs on Hedera.

## Chainlink CRE

- [ ] Locate the workflow and configuration.
- [ ] Confirm use of a confidential handler.
- [ ] Run the smallest available workflow.
- [ ] Confirm a private parameter affects its result.
- [ ] Identify whether execution is simulated or live.
- [ ] Inspect the consumer-contract delivery path.
- [ ] Distinguish authenticated CRE delivery from a manual test transaction.

### Execution-mode policy

CRE simulation is allowed for the deadline demonstration when live confidential access is unavailable.

However:

- Simulation must be labeled.
- Simulation does not count as live TEE protection.
- Local policy evaluation does not count as CRE execution.
- A manual test transaction does not count as authenticated CRE delivery.

## The Graph

- [ ] Locate schema and mappings.
- [ ] Locate the hosted endpoint and deployment identifier.
- [ ] Run a real hosted query.
- [ ] Verify that results correspond to actual indexed events.
- [ ] Record indexing progress.
- [ ] Identify how the application consumes the result.

## Runner

- [ ] Verify an isolated execution environment is available.
- [ ] Execute one controlled fixture.
- [ ] Confirm observations come from a collector rather than fixture claims.
- [ ] Confirm host credentials are unavailable to the fixture.

## Blocker handling

For each unavailable dependency:

1. Record the exact missing configuration or access.
2. Request the missing setup once.
3. Continue independent work.
4. Keep the feature marked blocked.
5. Never substitute fabricated successful output.

Do not spend more than ten minutes repeatedly diagnosing the same inaccessible service.

## Exit criteria

- [ ] Each dependency has a verified path or a specific blocker.
- [ ] Execution modes are documented.
- [ ] Available dependencies can be used by later phases.

---

# Phase 3 — Complete the Security Core

**Timebox: 40 minutes**

## Goal

Produce real evidence and enforceable decisions for two controlled tools.

## 3.1 Prepare the fixtures

### Clean tool

- Performs a price lookup.
- Uses a controlled endpoint.
- Declares its network requirement.
- Does not request credential or wallet access.

### Blocked tool

- Offers the same useful function.
- Attempts to read a synthetic credential file.
- Does not declare that access.
- Uses no real secrets.

Checklist:

- [ ] Both initialize through the supported MCP harness.
- [ ] Both have manifests.
- [ ] Both have immutable executable identities.
- [ ] Both accept bounded inputs.
- [ ] Expected test outcomes are separate from collected evidence.

**Never determine the verdict from the fixture name.**

## 3.2 Bind the artifact

- [ ] Hash normalized paths and file contents.
- [ ] Include the capability manifest and entrypoint.
- [ ] Include the lockfile where relevant.
- [ ] Record the prepared executable digest.
- [ ] Keep the executable content immutable between audit and launch.

Use curated bundled JavaScript for this sprint. Do not build general package ingestion.

## 3.3 Collect observations

- [ ] Reuse a verified collector.
- [ ] Otherwise implement reliable credential-file access observation.
- [ ] Keep collection outside the submitted process.
- [ ] Record attempted, permitted, and completed actions separately.
- [ ] Include test ID and collector identity.
- [ ] Enforce a timeout.
- [ ] Enforce resource limits.
- [ ] Destroy temporary test state after execution.

If arbitrary-code isolation is incomplete, allow only repository-controlled fixtures. Do not expose public uploads.

## 3.4 Implement policy evaluation

Use one versioned research policy:

```text
Credential access: forbidden
Wallet signing: forbidden
Process spawning: forbidden
Network: approved fixture endpoint only
Required evidence: complete
```

- [ ] Validate the policy.
- [ ] Bind its version or commitment to the result.
- [ ] Keep private values out of public reports.
- [ ] Implement deterministic decision precedence.

```text
Confirmed forbidden behavior → BLOCK
Required evidence missing → REVIEW
All required checks satisfied → ALLOW
```

- [ ] Collector failure cannot produce approval.
- [ ] Missing configuration cannot produce approval.
- [ ] LLM failure cannot activate canned results.
- [ ] Critical violations override aggregate scores.

Defer numeric scoring if it is not already useful and verified.

## 3.5 Persist results

Reuse current storage.

If no persistent storage exists, use SQLite for this single-worker demo.

- [ ] Persist jobs before execution.
- [ ] Persist observations and coverage.
- [ ] Persist decisions and reports.
- [ ] Persist payment associations.
- [ ] Recover interrupted jobs as pending or failed.

## Minimum result fields

```text
auditId
artifactHash
policyCommitment
subjectId
executionProfileHash
jobStatus
decision
reasonCodes
observations
coverage
evidenceHash
issuedAt
expiresAt
issuer
reportSignature
confidentialExecutionMode
publicationStatus
```

Keep publication references in a separate envelope:

```text
paymentReference
hederaReceipt
consumerTransaction
graphDeployment
indexedBlock
```

## Exit criteria

- [ ] The clean fixture passes the compatible policy.
- [ ] The blocked fixture produces an actual credential-access observation.
- [ ] The blocked fixture receives `BLOCK`.
- [ ] Missing required evidence produces `REVIEW`.
- [ ] Results survive process restart.

---

# Phase 4 — Connect Payments, Policy, Provenance, and Enforcement

**Timebox: 45 minutes**

## Goal

Connect the core audit to the three services and actual execution control.

## 4.1 Hedera payment

- [ ] Accept a fixed-price audit through Blocky402.
- [ ] Validate network, asset, recipient, amount, and quote expiry.
- [ ] Enforce the payer’s spending limit.
- [ ] Keep signing outside the model and tool environment.
- [ ] Associate settlement with one audit request.
- [ ] Return the same job for repeated paid requests.
- [ ] Reconcile ambiguous settlement before requesting another payment.
- [ ] Prevent settlement reuse for unrelated requests.

## 4.2 Hedera receipts

- [ ] Publish an audit receipt.
- [ ] Link payment, audit ID, and artifact hash.
- [ ] Publish the report commitment.
- [ ] Save a real HCS receipt reference.
- [ ] Exclude private evidence and policy values.

Use a small number of existing topics. Do not build an elaborate registry hierarchy.

## 4.3 CRE policy workflow

- [ ] Load the evidence through an authenticated path.
- [ ] Validate artifact and evidence binding.
- [ ] Retrieve a meaningful private parameter.
- [ ] Evaluate the policy.
- [ ] Produce a policy-bound decision.
- [ ] Record execution mode.
- [ ] Deliver the result through the supported consumer path.

The workflow must not trust observations supplied directly by the audited tool.

## 4.4 Authorization state

Reuse a working consumer or implement the minimum:

- [ ] Authenticated decision receipt.
- [ ] Artifact binding.
- [ ] Policy binding.
- [ ] Subject binding.
- [ ] Execution-profile binding.
- [ ] Expiry.
- [ ] Revocation.
- [ ] Replay and stale-update protection.
- [ ] Indexable events.

Do not introduce tokens.

## 4.5 Graph history

- [ ] Index the minimal authorization lifecycle.
- [ ] Query by artifact identity.
- [ ] Return decision history.
- [ ] Return revocation information.
- [ ] Return index freshness.
- [ ] Use the query result in the client’s flow.

A sufficient sprint behavior is:

> The client retrieves a previous authorization through The Graph, then verifies its current authoritative state before attempting reuse.

Do not count a static response or local fixture as a live Graph integration.

## 4.6 Execution gateway

Before launching:

1. Authenticate the requester.
2. Resolve immutable executable content.
3. Verify report signature and accepted issuer.
4. Verify artifact, policy, subject, and profile.
5. Check expiry and revocation.
6. Check required publication.
7. Start the process under restrictions.

Checklist:

- [ ] `BLOCK` prevents process launch.
- [ ] `REVIEW` prevents process launch.
- [ ] Changed content prevents process launch.
- [ ] Invalid signature prevents process launch.
- [ ] Expired authorization prevents process launch.
- [ ] Revocation prevents the next invocation.
- [ ] Unavailable authoritative state prevents process launch.
- [ ] Valid clean authorization permits restricted execution.

Prove refusal through the absence of a process-start event.

## 4.7 Publication reliability

Track separately:

```text
Report stored
Hedera receipt confirmed
Authorization transaction confirmed
Graph indexed
```

- [ ] Retry incomplete publication durably.
- [ ] Do not mark authorization ready while required publication is missing.
- [ ] Do not treat Graph indexing delay as a new security verdict.
- [ ] Do not claim the application implements a trustless cross-chain bridge.

## Exit criteria

- [ ] A paid request reaches an audit.
- [ ] Policy evaluation is connected to the decision.
- [ ] Public receipts match report commitments.
- [ ] Live Graph history is consumed.
- [ ] The gateway blocks and permits actual execution correctly.
- [ ] Any external integration gaps remain explicitly unchecked.

---

# Phase 5 — Finish CLI, MCP, and Next.js Interfaces

**Timebox: 25 minutes**

## Goal

Expose the same working system through developer, agent, and visual interfaces.

## 5.1 CLI

Support these capabilities using existing commands or thin wrappers:

```text
safe402 doctor
safe402 verify <artifact> --policy <reference> --max-payment <limit>
safe402 audit get <id>
safe402 run <artifact> --authorization <id>
safe402 demo
```

- [ ] Human-readable output.
- [ ] JSON output.
- [ ] Diagnostic logs on stderr.
- [ ] Non-zero exit for denied execution.
- [ ] Job IDs for pending audits.
- [ ] No automatic execution after incomplete verification.
- [ ] Clear simulation/live indicators.

Do not create a large CLI framework.

## 5.2 MCP

Expose:

```text
safe402_verify_tool
safe402_get_audit
safe402_check_status
safe402_execute_tool
```

- [ ] Use stdio transport.
- [ ] Reuse CLI service methods.
- [ ] Keep signing in a restricted adapter.
- [ ] Reject caller-supplied approval flags.
- [ ] Return structured results.

## 5.3 Reference agent

- [ ] Reuse an existing agent integration if functional.
- [ ] Limit it to Safe402 tools and bounded payment.
- [ ] Do not give it an unrestricted shell.
- [ ] Show an actual agent call when claiming agent integration.

If the demonstration uses deterministic orchestration only, label it as a demo script.

## 5.4 Next.js audit list

Preserve the existing Pages Router and styling.

Show:

- [ ] Tool and version.
- [ ] Job status.
- [ ] Decision.
- [ ] Timestamp.
- [ ] Detail link.
- [ ] Network and integration indicators.

## 5.5 Next.js audit detail

Show:

- [ ] Artifact identity.
- [ ] Decision and explanation.
- [ ] Declared-versus-observed comparison.
- [ ] Real progress events.
- [ ] Findings.
- [ ] Evidence references.
- [ ] Payment receipt.
- [ ] HCS reference.
- [ ] CRE execution mode.
- [ ] Authorization and expiry.
- [ ] Graph freshness.
- [ ] Gateway outcome.

### Frontend defaults

- Poll active jobs every two seconds.
- Stop polling terminal jobs.
- Reuse SSE only if already functional.
- Render untrusted descriptions as inert text.
- Abbreviate hashes with copy controls.
- Show unavailable values honestly.
- Do not add a new design system.

## Exit criteria

- [ ] CLI can operate the core flow without a browser.
- [ ] MCP accesses the same service.
- [ ] A terminal-started audit appears in the dashboard.
- [ ] Dashboard results match the CLI.
- [ ] No frontend badge substitutes for backend enforcement.

---

# Phase 6 — Run the Demo and Verify

**Timebox: 25 minutes**

## Goal

Make the demonstration reproducible and repair critical failures.

## 6.1 Demo prerequisites

- [ ] Testnet payer funded.
- [ ] Maximum spend configured.
- [ ] Policy available.
- [ ] Both fixtures prepared.
- [ ] Integration configuration checked.
- [ ] Dashboard reachable.

## 6.2 Demo sequence

1. Print network and confidential execution mode.
2. Select the blocked fixture.
3. Resolve its exact artifact.
4. Query existing history.
5. Request verification.
6. Validate the quote.
7. Complete payment.
8. Print settlement reference.
9. Run tests.
10. Show actual credential-access evidence.
11. Evaluate the policy.
12. Publish the report and provenance.
13. Print the report URL.
14. Attempt gateway execution.
15. Demonstrate refusal.
16. Select the clean fixture.
17. Obtain or reuse a valid subject-bound authorization.
18. Execute through the gateway.
19. Print its result.
20. Query live history.

Clearly label previously completed audits.

### Optional extension

If already reliable:

1. Revoke the clean authorization.
2. Attempt another invocation.
3. Show refusal.

## 6.3 Required checks

| Test | Expected result |
|---|---|
| Clean fixture | Restricted execution succeeds |
| Credential-access fixture | Actual observation and block |
| Collector failure | No approval |
| Missing LLM configuration | No canned approval |
| Changed artifact | Launch denied |
| Invalid signature | Launch denied |
| Expired authorization | Launch denied |
| Revoked authorization | Next invocation denied |
| Repeated payment request | Same job without another charge |
| Graph query | Actual hosted data |
| CRE evaluation | Policy affects decision |
| Dashboard | Same audit as CLI |

- [ ] Run type checking.
- [ ] Run the project build.
- [ ] Run focused tests.
- [ ] Run the complete demo.
- [ ] Repair failures.
- [ ] Rerun affected checks.
- [ ] Capture integration evidence.

Do not spend this phase on unrelated cleanup.

## Exit criteria

- [ ] The main demo completes reproducibly.
- [ ] Failures are either repaired or documented.
- [ ] No unverified feature is presented as complete.

---

# Phase 7 — Freeze and Handoff

**Timebox: 15 minutes**

## Goal

Deliver an understandable, reproducible project.

## Tasks

- [ ] Freeze feature additions.
- [ ] Fix only demo-breaking issues.
- [ ] Update the checklist with evidence.
- [ ] Write exact install commands.
- [ ] Write exact run commands.
- [ ] Provide an environment example without secrets.
- [ ] Provide the demo command.
- [ ] Provide dashboard access instructions.
- [ ] Record test results.
- [ ] Record partner references.
- [ ] Document reused versus newly implemented functionality.
- [ ] Document limitations and deferred work.

## Final report format

```markdown
## Delivered
- Verified existing capabilities.
- Newly implemented capabilities.

## Run
- Exact setup and execution commands.

## Verified
- Tests and end-to-end outcomes.

## Partner evidence
- Hedera payment and HCS references.
- CRE execution mode and reference.
- Graph deployment and query evidence.

## Remaining
- Partial requirements.
- External blockers.
- Deferred features.

## Deadline status
- Elapsed time.
- Whether the demo is reproducible.
```

---

## Reference Library

### Hedera and payments

- [Hedera x402 overview](https://hedera.com/blog/hedera-and-the-x402-payment-standard/)
- [Hedera code snippets](https://github.com/hedera-dev/hedera-code-snippets)
- [Blocky402](https://blocky402.com/)
- [Paid-request example](https://github.com/hedera-dev/x402-inference-pay-per-request-poc)
- [Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js)
- [Hedera documentation](https://docs.hedera.com/)
- [scaffold-hbar](https://github.com/hedera-dev/scaffold-hbar)
- [x402 protocol](https://github.com/x402-foundation/x402)

### Chainlink

- [CRE documentation](https://docs.chain.link/cre)
- [Hello Confidential Workflows](https://docs.chain.link/cre-templates/hello-confidential-workflows)
- [Hello workflow source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/hello-confidential-workflows)
- [AI Audit Firewall](https://docs.chain.link/cre-templates/ai-audit-firewall)
- [Audit Firewall source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/confidential-workflows/ai-audit-firewall)
- [Automated Liquidation Protection](https://docs.chain.link/cre-templates/automated-liquidation-protection)
- [Liquidation template source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/confidential-workflows/automated-liquidation-protection)
- [Confidential templates](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/confidential-workflows)
- [Confidential bootcamp](https://smartcontractkit.github.io/CRE-Confidential-bootcamp/)

Use liquidation references only for private-policy and constraint-enforcement patterns. Do not add liquidation functionality.

### The Graph

- [Subgraph MCP introduction](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/)
- [Subgraphs Skills](https://github.com/graphprotocol/subgraphs-skills)
- [Substreams Skills](https://github.com/streamingfast/substreams-skills)

Substreams is a deferred reference, not a required implementation.

---

## Definition of Done

The sprint is complete when:

- [ ] Safe402 works through CLI and MCP.
- [ ] A controlled tool actually runs during auditing.
- [ ] Its behavior produces real evidence.
- [ ] Evidence and policy determine the decision.
- [ ] The gateway genuinely prevents forbidden execution.
- [ ] A clean authorized tool executes successfully.
- [ ] The dashboard displays the same results.
- [ ] Available partner integrations are verified with real evidence.
- [ ] Missing integrations are explicitly reported.
- [ ] The demonstration is reproducible.

**Full three-partner readiness requires all three integrations to pass their acceptance checks. The deadline does not justify fabricated success or weakened security claims.**