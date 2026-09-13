
# Safe402 — Spec 

## 1. Objective and Working Rules

**Deliver a reproducible working demo.**

Safe402 must demonstrate an agent requesting tool verification, paying for it, receiving evidence and a policy decision, and being prevented from executing a blocked tool.

Prioritize:

1. Working security and execution flow.
2. Hedera, Chainlink, and The Graph integrations.
3. CLI and MCP access.
4. Two Next.js dashboard screens.
5. Verification and handoff.

The deadline is for a demonstrable MVP, not a production-ready arbitrary-code security service. Do not claim completion of features that remain blocked.

### Instructions to the coding agent

> Before implementing any checklist item, inspect whether it already exists. Trace its actual execution path and run a focused verification. If it works and meets the requirement, mark it complete and move on. If it is partial or missing, search the relevant code and call sites, then implement only the missing behavior. Do not rebuild working features.

For each item, follow:

```text
Locate implementation
        ↓
Inspect callers, dependencies, and configuration
        ↓
Verify actual behavior
        ↓
Works → mark complete and move on
Partial → fix the smallest missing part
Missing → implement using existing patterns
Externally blocked → document and continue independent work
```

**A filename, TODO, README claim, UI badge, or mocked response is not proof of implementation.**

### Checklist conventions

Create a sprint checklist in the implementation repository.

Use:

```markdown
- [x] Verified existing — evidence: test or command
- [x] Implemented and verified — evidence: test or command
- [ ] Partial — remaining behavior
- [ ] Blocked — external dependency and required resolution
- [ ] Deferred — outside the three-hour demo
```

Never check an item merely because code was written.

### Repository assumption

The project mirror inspected for this handoff contains reference material, not the active application checkout. Perform this sprint in the actual Safe402 repository.

- [ ] Identify the current repository and branch.
- [ ] Read applicable repository instructions.
- [ ] Inspect uncommitted changes and preserve them.
- [ ] Record the starting commit.
- [ ] Use the current checkout as the implementation source of truth.
- [ ] Use [MARS](https://github.com/derek2403/ethnyc) only as the baseline or reuse reference where needed.
- [ ] Do not edit synced files under `sources/`.

---

## 2. Scope Locked for This Sprint

### Required demonstration

```text
CLI or reference agent
        ↓
Select exact tool artifact
        ↓
Request verification
        ↓
Authorize bounded x402 payment
        ↓
Confirm Hedera settlement
        ↓
Collect static and actual runtime evidence
        ↓
Evaluate private policy through CRE
        ↓
Persist report and public provenance
        ↓
Update execution authorization
        ↓
Read live security history through The Graph
        ↓
Gateway blocks forbidden execution
        ↓
Gateway permits a compatible clean fixture
```

### Minimal product surface

| Component | Sprint requirement |
|---|---|
| Artifact catalog | Two curated executable fixtures |
| Policy | One file-configured research policy |
| Analysis | Focused static checks and actual behavioral observation |
| Payments | One fixed-price Hedera x402 operation |
| CRE | One meaningful private-policy workflow |
| Authorization | Minimal current decision, expiry, and revocation |
| Graph | Hosted history query that affects the flow |
| CLI | Verify, inspect, execute, and demo |
| MCP | Thin wrappers around those operations |
| Frontend | Audit list and audit detail |
| Storage | Existing persistent storage; avoid migration |
| Worker | One worker, one concurrent audit |
| Demo | Repeatable happy path and blocked path |

### Explicitly deferred

- [ ] Arbitrary public package uploads.
- [ ] Broad language and runtime support.
- [ ] Open auditor marketplace.
- [ ] World ID.
- [ ] Arc settlement.
- [ ] Escrow, NFTs, bonds, royalties.
- [ ] Browser policy editor.
- [ ] Dedicated demo webpage.
- [ ] Multi-agent orchestration.
- [ ] Substreams pipeline.
- [ ] Automatic alternative ranking.
- [ ] New design system.
- [ ] Production infrastructure redesign.

Do not delete working legacy features merely to achieve these exclusions. Remove them from the Safe402 demo flow and navigation where necessary.

---

## 3. Time Budget

Start a wall-clock timer and record the deadline.

| Elapsed time | Work | Required checkpoint |
|---|---|---|
| 0–15 minutes | Inspect and verify existing implementation | Evidence-backed gap list |
| 15–30 minutes | Dependency and partner smoke checks | Working paths or explicit blockers |
| 30–70 minutes | Complete security core and CLI flow | Clean and blocked fixtures produce real results |
| 70–115 minutes | Connect partner integrations and authorization | Payment, evaluation, history, and enforcement connected |
| 115–140 minutes | Finish MCP and two dashboard screens | Same audit visible through all interfaces |
| 140–165 minutes | End-to-end checks and repairs | Reproducible demo |
| 165–180 minutes | Freeze features and prepare handoff | Commands, evidence, limitations, recording steps |

### Deadline rules

- Reclaim time from already verified features.
- Do not spend more than ten minutes repeatedly diagnosing an inaccessible external service.
- Report a credential/access blocker immediately, then continue independent work.
- At minute 115, stop adding optional capabilities.
- At minute 140, prioritize integration failures over styling.
- At minute 165, freeze features. Only fix demo-breaking issues.
- At minute 180, report the actual delivered state and outstanding work.

A blocked integration remains unchecked. Do not replace it with fabricated success.

---

## 4. First 15 Minutes: Implementation Inventory

### Environment and application

- [ ] Inspect package manager, lockfile, runtime requirements, and available scripts.
- [ ] Identify frontend router and API framework.
- [ ] Identify storage and job-processing implementation.
- [ ] Identify current run and build commands.
- [ ] Run the smallest existing health check.
- [ ] Check required configuration names without printing secrets.

### Existing feature search

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

For each relevant result:

- [ ] Identify the entrypoint.
- [ ] Trace the actual function being called.
- [ ] Check whether it reaches a real dependency or fixture.
- [ ] Check fallback behavior.
- [ ] Locate existing tests or create a focused verification when necessary.

### Inventory output

Produce a short table:

| Capability | Existing location | Verified behavior | Gap |
|---|---|---|---|
| CLI verification | Discovered path | Actual result | Missing behavior |
| Runtime collector | Discovered path | Actual event | Missing behavior |
| Payment | Discovered path | Settlement result | Missing behavior |
| CRE | Discovered path | Execution result | Missing behavior |
| Graph | Discovered path | Hosted query | Missing behavior |
| Gateway | Discovered path | Launch prevented | Missing behavior |

Do not turn this into a lengthy code review. Its purpose is to prevent duplicate work and identify the shortest completion path.

---

## 5. Minutes 15–30: Dependency Checks

### Hedera and Blocky402

- [ ] Verify testnet configuration.
- [ ] Verify payer and recipient configuration.
- [ ] Verify compatible client/server/facilitator versions.
- [ ] Perform the smallest bounded paid request if configured.
- [ ] Save its settlement reference.
- [ ] Confirm the existing payment path uses Hedera, not only legacy Arc configuration.

### Chainlink

- [ ] Locate the existing CRE workflow.
- [ ] Confirm whether it uses a confidential handler.
- [ ] Run an existing simulation or the smallest supported example.
- [ ] Confirm it evaluates a meaningful private parameter.
- [ ] Inspect its consumer-contract delivery path.
- [ ] Distinguish authenticated CRE delivery from application-signed test writes.

### The Graph

- [ ] Locate the schema, event mappings, deployment ID, and endpoint.
- [ ] Query the hosted endpoint.
- [ ] Confirm returned data corresponds to actual contract events.
- [ ] Record index freshness.
- [ ] Confirm the application uses the result.

### Runner

- [ ] Confirm the supported isolated execution environment is available.
- [ ] Execute one curated fixture.
- [ ] Confirm an observation is collected outside the fixture’s self-reported output.

### Blocker handling

If configuration is missing:

1. Identify the exact missing variable or access requirement.
2. Ask for that missing setup once.
3. Continue work that does not depend on it.
4. Keep the integration clearly unavailable.
5. Never print or request secrets in logs or public output.

---

## 6. Security Core: Smallest Complete Implementation

### 6.1 Curated fixtures

Use exactly two primary fixtures.

#### Clean fixture

- Provides a simple price lookup.
- Uses a controlled endpoint.
- Declares its network requirement.
- Does not request credential or wallet access.

#### Blocked fixture

- Presents the same useful function.
- Attempts to read a synthetic credential file.
- Does not declare that access.
- Uses no real secrets.

A network-exfiltration fixture is optional if already implemented.

Checklist:

- [ ] Both fixtures initialize through the supported MCP harness.
- [ ] Both have immutable executable identities.
- [ ] Both have capability declarations.
- [ ] Both have bounded inputs.
- [ ] Expected outcomes are documented separately from observed results.

Do not derive the verdict from the fixture’s name or expected-outcome configuration.

### 6.2 Artifact binding

- [ ] Resolve a pinned artifact.
- [ ] Hash normalized file paths and contents.
- [ ] Include the manifest, entrypoint, and dependency lockfile when applicable.
- [ ] Record the prepared executable digest.
- [ ] Launch the same immutable content that was checked.

For this deadline, curated bundled JavaScript is sufficient. Do not build a general package-ingestion platform.

### 6.3 Behavioral observation

- [ ] Reuse the existing collector if verified.
- [ ] Otherwise implement one observable behavior reliably: filesystem credential-access attempts.
- [ ] Keep the collector outside the submitted process.
- [ ] Distinguish attempted, denied, and completed actions.
- [ ] Record test ID and collector source.
- [ ] Enforce timeout and resource bounds.

If strong arbitrary-code isolation does not exist, restrict the demo to repository-controlled synthetic fixtures in an isolated environment. Do not enable public uploads or claim arbitrary-code safety.

### 6.4 Decision rules

Implement:

```text
Confirmed forbidden behavior → BLOCK
Required evidence missing → REVIEW
Required checks complete and policy permits → ALLOW
```

- [ ] Missing configuration cannot return `ALLOW`.
- [ ] Collector failure cannot return `ALLOW`.
- [ ] LLM failure cannot activate canned approval.
- [ ] An explicit policy violation overrides any numeric score.

Defer numeric scoring if it is not already useful and tested.

### 6.5 Private policy

Use one file-configured policy:

```text
No credential access
No wallet signing
No process spawning
Only the fixture’s approved network destination
Complete required behavioral coverage
```

- [ ] Register or load an immutable policy version.
- [ ] Bind its commitment to the result.
- [ ] Keep private parameter values out of public records.
- [ ] Use the same decision rules locally and in CRE, with local results labeled as local.

Local evaluation is a development aid, not a substitute for the claimed CRE integration.

---

## 7. Shared Results and Persistence

Keep current interfaces if they already satisfy these semantics. Do not rename working APIs merely to match this plan.

### Minimum audit result

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

### Separate publication references

```text
paymentReference
hederaReceipt
consumerTransaction
graphDeployment
indexedBlock
```

Do not put a report’s own digest or future publication receipts inside its signed payload.

### Storage

- [ ] Reuse current persistent storage.
- [ ] If no persistence exists, use SQLite for the single-worker demo.
- [ ] Do not migrate a working database to PostgreSQL for this sprint.
- [ ] Persist job state before starting work.
- [ ] Persist payment association.
- [ ] Persist results and publication attempts.
- [ ] Recover interrupted jobs as pending or failed, never approved.

### Payment retries

- [ ] Same paid request returns the same job.
- [ ] Settlement references cannot purchase unrelated audits.
- [ ] Ambiguous settlement enters reconciliation.
- [ ] Do not ask the payer to pay again until settlement state is resolved.

---

## 8. Partner Integration Completion

### 8.1 Hedera

**Useful product role:** paid verification and linked public receipts.

- [ ] Accept a fixed-price audit payment through Blocky402 on Hedera.
- [ ] Enforce a client-side spending limit.
- [ ] Keep signing keys outside the model and tool sandbox.
- [ ] Link payment to audit ID and artifact hash.
- [ ] Write the public result commitment to HCS.
- [ ] Include a real receipt reference in CLI and dashboard.
- [ ] Reuse service-discovery records if already implemented.

Do not build an elaborate HCS hierarchy.

**Acceptance:** one real paid request produces one audit and a matching HCS receipt.

References:

- [Paid-request example](https://github.com/hedera-dev/x402-inference-pay-per-request-poc)
- [Blocky402](https://blocky402.com/)
- [Hedera documentation](https://docs.hedera.com/)
- [x402 repository](https://github.com/x402-foundation/x402)

### 8.2 Chainlink

**Useful product role:** private policy evaluation affecting execution authorization.

- [ ] Use a meaningful confidential handler.
- [ ] Load at least one private parameter.
- [ ] Validate artifact and evidence references.
- [ ] Produce a policy-bound decision.
- [ ] Keep private values out of public logs.
- [ ] Preserve simulation/live provenance.
- [ ] Deliver to the existing compatible consumer contract.

Use the existing working network. If no integration exists, use Sepolia as the initial candidate and confirm support.

**Acceptance:** changing the private policy parameter changes the expected decision; execution evidence is saved.

A simulated workflow must say “simulated.” A manual test write must not be labeled authenticated CRE report delivery.

References:

- [Hello Confidential Workflows](https://docs.chain.link/cre-templates/hello-confidential-workflows)
- [AI Audit Firewall](https://docs.chain.link/cre-templates/ai-audit-firewall)
- [CRE documentation](https://docs.chain.link/cre)

### 8.3 The Graph

**Useful product role:** live security history consulted by the client.

- [ ] Reuse an existing hosted subgraph where suitable.
- [ ] Otherwise index the minimal authorization lifecycle events.
- [ ] Query by artifact identity.
- [ ] Return decision history and revocation records.
- [ ] Return index freshness.
- [ ] Have the client use this result to identify an existing report or reject an indexed revoked candidate.
- [ ] Perform authoritative checks before execution.

Automatic alternatives are optional. A meaningful live history check is the required sprint behavior.

**Acceptance:** emit a real lifecycle event, retrieve it through the hosted provider, and demonstrate its effect on the client’s flow.

References:

- [Subgraph MCP](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/)
- [Subgraphs Skills](https://github.com/graphprotocol/subgraphs-skills)
- [Substreams Skills — deferred reference](https://github.com/streamingfast/substreams-skills)

Installing a skill or returning local JSON is not a completed Graph integration.

---

## 9. Authorization and Actual Enforcement

### Contract requirements

Reuse a working consumer. If missing, implement only:

- [ ] Authenticated decision receipt.
- [ ] Artifact, subject, policy, and profile binding.
- [ ] Expiry.
- [ ] Revocation.
- [ ] Duplicate/stale update protection.
- [ ] Readable current authorization.
- [ ] Indexable events.

Do not add token issuance.

### Gateway requirements

Before every invocation:

1. Authenticate the requester.
2. Verify the exact executable artifact.
3. Verify the report signature and accepted issuer.
4. Confirm subject and policy binding.
5. Check expiry and current revocation.
6. Confirm required publication.
7. Start the process under its restrictions.

Checklist:

- [ ] `BLOCK` prevents process launch.
- [ ] `REVIEW` prevents process launch.
- [ ] Changed artifact prevents process launch.
- [ ] Revoked authorization prevents the next invocation.
- [ ] Unavailable authoritative state prevents process launch.
- [ ] Clean authorized fixture executes successfully.

**A printed warning is not enforcement.**

Prove denied launch through the absence of a process-start event, not only a red UI badge.

---

## 10. CLI and MCP

### Minimum CLI

Provide these capabilities through existing commands or thin new commands:

```text
safe402 doctor
safe402 verify <artifact> --policy <reference> --max-payment <limit>
safe402 audit get <id>
safe402 run <artifact> --authorization <id>
safe402 demo
```

- [ ] Human-readable output.
- [ ] JSON output for automation.
- [ ] Errors on stderr.
- [ ] Non-zero exit on denied execution.
- [ ] Job ID returned for pending work.
- [ ] No automatic execution after an incomplete audit.

Do not spend time building a large command framework.

### Minimum MCP

Expose:

```text
safe402_verify_tool
safe402_get_audit
safe402_check_status
safe402_execute_tool
```

- [ ] Reuse the same service methods as the CLI.
- [ ] Use stdio transport for the sprint.
- [ ] Keep signing in a restricted adapter.
- [ ] Reject caller-supplied approval flags.
- [ ] Return structured decisions.

### Reference agent

- [ ] Reuse the existing agent integration if functional.
- [ ] Allow only Safe402 operations and bounded payment.
- [ ] Do not expose an unrestricted shell.
- [ ] Show an actual agent call when claiming agent integration.

A deterministic demo script remains useful, but label it accurately if no model-driven agent is connected.

---

## 11. Two-Screen Next.js Frontend

Preserve existing Next.js Pages Router, styling, and compatible components.

### Audit list

- [ ] Tool name and version.
- [ ] Job status.
- [ ] Decision.
- [ ] Timestamp.
- [ ] Link to detail.
- [ ] Compact network and integration indicators.

### Audit detail

- [ ] Artifact identity.
- [ ] Decision and explanation.
- [ ] Declared-versus-observed table.
- [ ] Real progress events.
- [ ] Findings and evidence references.
- [ ] Payment receipt.
- [ ] HCS reference.
- [ ] CRE execution mode.
- [ ] Authorization and expiry.
- [ ] Graph freshness.
- [ ] Gateway execution outcome.

### Frontend implementation defaults

- Poll every two seconds while an audit is active.
- Stop polling terminal jobs.
- Reuse SSE only if already working.
- Render untrusted descriptions as inert text.
- Abbreviate hashes with copy controls.
- Use existing colors and typography.
- Display unknown or unavailable values honestly.

Do not create a new submission form, policy editor, wallet flow, or separate demo screen.

**Acceptance:** an audit started from the terminal appears in the list and updates on its detail page.

---

## 12. End-to-End Demonstration

Implement one repeatable demo command.

### Prerequisites

- [ ] Testnet payer funded.
- [ ] Fixed maximum spend configured.
- [ ] Policy registered.
- [ ] Two fixture artifacts prepared.
- [ ] Integration configuration checked.
- [ ] Browser can open the audit list.

### Demo sequence

1. Print active network and confidential execution mode.
2. Select the blocked fixture.
3. Resolve its artifact hash.
4. Query existing history.
5. Request a new audit when needed.
6. Obtain and validate the quote.
7. Pay through the restricted adapter.
8. Print settlement reference.
9. Run the actual tests.
10. Show the credential-access observation.
11. Evaluate policy through CRE.
12. Persist and publish the result.
13. Display the report URL.
14. Attempt gateway execution.
15. Show that launch was refused.
16. Select the clean fixture.
17. Obtain or reuse a valid subject-bound authorization.
18. Execute through the gateway.
19. Print its output.
20. Query the resulting history through The Graph.

If the clean fixture was audited before the demonstration, state that explicitly.

### Optional final step

If revocation is ready:

1. Revoke the clean fixture’s authorization.
2. Attempt another invocation.
3. Show refusal.

Do not add this to the recording until the basic demo is reliable.

---

## 13. Minutes 140–165: Verification

Run focused tests appropriate to the changed code.

| Test | Expected outcome |
|---|---|
| Clean fixture | Compatible approval and restricted execution |
| Credential-access fixture | Actual observation and block |
| Incomplete collector | No approval |
| Missing LLM configuration | No canned approval |
| Changed artifact | Launch denied |
| Invalid report signature | Launch denied |
| Expired authorization | Launch denied |
| Revoked authorization | Next invocation denied |
| Repeated paid request | Existing job; no second charge |
| Graph response | Real hosted data and freshness |
| CRE output | Policy affects decision; mode disclosed |
| Dashboard | Same audit and evidence as CLI |

Checklist:

- [ ] Run type checking or the project’s equivalent.
- [ ] Run the existing build.
- [ ] Run focused security and payment tests.
- [ ] Run the full demo once.
- [ ] Repair failures.
- [ ] Rerun only affected checks.
- [ ] Capture transaction, workflow, and query evidence.

Do not spend the remaining time on unrelated lint cleanup or broad refactoring.

---

## 14. Minutes 165–180: Handoff

### Required deliverables

- [ ] Working source changes.
- [ ] Updated checklist with evidence.
- [ ] Exact install and run commands.
- [ ] Environment-variable example without secrets.
- [ ] Demo command.
- [ ] Dashboard URL or local command.
- [ ] Test results.
- [ ] Integration references.
- [ ] Known limitations.
- [ ] Continuity disclosure.

### Final coding-agent response format

```markdown
## Delivered
- Implemented or verified capabilities.

## Run
- Exact commands.

## Verified
- Tests and end-to-end results.

## Partner evidence
- Hedera payment and HCS references.
- CRE execution mode and reference.
- Graph deployment and successful query.

## Remaining
- Unchecked requirements.
- External blockers.
- Deferred features.

## Deadline status
- Elapsed time.
- Whether the demo is reproducible.
```

Do not say “finished” if the main flow cannot run.

### Completion standard

The three-hour sprint succeeds when the coding agent delivers a reproducible CLI/MCP security flow, real observed behavior, actual execution enforcement, inspectable results, and accurately reported partner integration status.

Full three-partner readiness requires all three integrations to work as specified. External blockers may prevent that within three hours; they must be reported rather than hidden.

