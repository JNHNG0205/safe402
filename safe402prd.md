# **Safe402 — Detailed Implementation Plan and Product Specification**

**Version:** 2.0  
**Product:** Safe402  
**Event:** ETHOnline 2026  
**Target partners:** Hedera, Chainlink, The Graph  
**Primary interfaces:** CLI and MCP  
**Secondary interface:** Two-screen Next.js dashboard

---

## **0\. Instructions to the Coding Agent**

This document supersedes the previous plan that proposed a larger frontend.

Build Safe402 as a working security service that agents can use without opening a browser.

The product must work through:

1. A CLI for developers, testing, and demonstrations.  
2. An MCP interface for agent access.  
3. A shared backend that performs verification and authorization.  
4. A minimal Next.js dashboard that displays the same results.

The frontend is an observation interface. It must not contain essential security logic or become a prerequisite for using Safe402.

### **Non-negotiable implementation rules**

* Use **Safe402** for all new product branding.  
* Preserve MARS attribution and disclose reused code.  
* Preserve the existing Next.js Pages Router unless a concrete incompatibility requires changing it.  
* Do not modify synced read-only reference files.  
* Keep submitted-tool execution outside the API and frontend processes.  
* Never pass real service credentials into a submitted tool.  
* Never return approval from canned fallback outputs.  
* Never describe LLM predictions as runtime observations.  
* Never describe a hash comparison as verified enclave attestation.  
* Keep confidential simulation visibly distinct from live confidential execution.  
* Bind authorization to the exact artifact, policy, requester scope, and execution profile.  
* Refuse execution when required verification is missing or unavailable.  
* Use live partner services for qualifying integration evidence.  
* Do not add an auditor marketplace, NFTs, escrow, World ID, or token mechanics.  
* Complete a working vertical flow before implementing optional features.

All command names, schemas, and internal interfaces below are proposed Safe402 interfaces. They are not claims about existing SDK APIs. Adapt external integrations to the current official documentation.

---

## **1\. Product Definition**

### **1.1 One-line description**

> Safe402 lets AI agents pay for verifiable tool-security checks and enforce execution policies before they act.

### **1.2 What Safe402 does**

Safe402 evaluates a specific third-party tool artifact before allowing an agent to execute it.

It:

1. Resolves an immutable artifact.  
2. Collects static findings.  
3. Runs controlled behavioral tests.  
4. Compares declared capabilities with observed behavior.  
5. Evaluates private policy parameters.  
6. Produces an authenticated security report.  
7. Records payment and audit provenance.  
8. Maintains current execution authorization.  
9. Prevents unauthorized tool execution.  
10. Helps agents discover alternatives using live security history.

### **1.3 What Safe402 does not claim**

Safe402 does not prove that a tool is harmless under every possible condition.

An approval means:

> The required checks completed for this artifact and execution profile, the available evidence satisfied this policy, and the current authorization permits restricted execution.

It does not mean:

> This package is universally safe forever.

---

## **2\. Problem and Motivation**

AI agents extend their abilities through MCP servers, tools, packages, and skills.

Those extensions can:

* Read files.  
* Make network requests.  
* Access environment variables.  
* Spawn processes.  
* Invoke wallet operations.  
* Return instructions that influence the agent.

A tool may claim to provide a simple capability while attempting additional behavior.

For example:

Declared purpose:

Retrieve a price.

&nbsp;

Declared permissions:

One approved network endpoint.

No filesystem access.

No wallet access.

&nbsp;

Observed during testing:

Attempts to read a credential file.

Attempts to send its contents elsewhere.

Tool names, descriptions, and ratings do not establish the behavior of an exact executable artifact.

### **Problems Safe402 addresses**

| Problem | Safe402 response |
| ----- | ----- |
| Descriptions do not match behavior | Compare declarations with collected observations |
| Different agents need different restrictions | Evaluate owner-specific policies |
| Reports lack authenticated provenance | Sign reports and bind them to evidence |
| Approval can become stale | Check expiry, revocation, and issuer status |
| A package changes after auditing | Verify the executable artifact again |
| Agents cannot easily purchase audits | Offer an x402-gated service |
| Warnings may be ignored | Enforce decisions at the execution gateway |
| Security history is difficult to query | Index public lifecycle events through The Graph |

---

## **3\. Product Scope**

### **3.1 Primary user**

A developer operating an agent that needs third-party tools.

### **3.2 Core user story**

> I want my agent to verify a tool, pay for the audit within a configured budget, and execute it only when the resulting authorization satisfies my policy.

### **3.3 MVP deliverables**

* Safe402 CLI.  
* Safe402 MCP server.  
* Shared API.  
* Persistent audit jobs.  
* Static scanner.  
* Isolated behavioral runner.  
* Capability comparison engine.  
* CRE private-policy workflow.  
* Hedera x402 payment integration.  
* Hedera audit receipts.  
* Minimal authorization contract.  
* Hosted subgraph.  
* Execution gateway.  
* Two Next.js screens.  
* Reproducible fixtures and demonstration.

### **3.4 Excluded from this release**

* World ID or AgentKit from World.  
* Open auditor participation.  
* Human-personhood claims.  
* Reputation voting.  
* Marketplace negotiation.  
* Auditor staking or slashing.  
* Arc settlement.  
* Escrow.  
* NFTs and licenses.  
* Royalties.  
* Governance.  
* General-purpose agent chat UI.  
* Policy editor in the browser.  
* Separate service-status page.  
* Separate guided-demo webpage.

The reference agent may use **Hedera Agent Kit**. This is distinct from World AgentKit.

---

## **4\. Relationship to MARS**

### **4.1 Reuse**

Inspect and reuse suitable parts of MARS:

* Next.js application shell.  
* TypeScript utilities.  
* Hedera topic operations.  
* Existing audit-progress components.  
* Source-loading helpers.  
* Existing LLM analysis as supplementary analysis.  
* Payment abstractions after removing Arc-specific assumptions.

### **4.2 Replace or isolate**

* LLM-only “sandbox” stages must not represent dynamic execution.  
* Canned results must exist only in explicitly labeled fixtures.  
* Unknown inputs must not default to approval.  
* Legacy NFT and marketplace screens must not appear in Safe402 navigation.  
* Old signing or attester integrations must not inherit new trust claims without verification.

### **4.3 Document the upgrade**

Create a Continuity document containing:

* Starting commit.  
* Reused modules.  
* New modules.  
* Behavior before Safe402.  
* Behavior after Safe402.  
* Evidence of new work completed during the event.

---

## **5\. End-to-End Architecture**

flowchart TD

    CLI\[Safe402 CLI\] \--\> SDK\[Shared client SDK\]

    MCP\[Safe402 MCP server\] \--\> SDK

    SDK \--\> API\[Safe402 API\]

&nbsp;

    Agent\[Reference agent\] \--\> MCP

    Agent \--\> Signer\[Restricted payment signer\]

&nbsp;

    API \--\> Payments\[Blocky402 adapter\]

    Payments \--\> Hedera\[Hedera Testnet\]

&nbsp;

    API \--\> DB\[(PostgreSQL)\]

    DB \--\> Worker\[Audit worker\]

&nbsp;

    Worker \--\> Scanner\[Static scanner\]

    Worker \--\> Runner\[Isolated behavioral runner\]

&nbsp;

    Scanner \--\> Evidence\[Normalized evidence bundle\]

    Runner \--\> Evidence

&nbsp;

    Evidence \--\> CRE\[CRE private-policy evaluator\]

    Policies\[Private policy parameters\] \--\> CRE

&nbsp;

    CRE \--\> Capsule\[Decision capsule\]

    Capsule \--\> Reports\[Report and publication service\]

    Capsule \--\> Registry\[Authorization consumer contract\]

&nbsp;

    Reports \--\> HCS\[Hedera audit receipts\]

    Reports \--\> Storage\[Report and evidence storage\]

&nbsp;

    Registry \--\> Graph\[Hosted Safe402 subgraph\]

    Graph \--\> API

&nbsp;

    SDK \--\> Gateway\[Execution gateway\]

    Gateway \--\> Registry

    Gateway \--\> Storage

    Gateway \--\> Restricted\[Restricted tool process\]

&nbsp;

    Web\[Next.js audit dashboard\] \--\> API

### **5.1 Deployment boundaries**

Use a small number of deployable components:

1. **Web/API application**  
   * Next.js pages.  
   * API endpoints.  
   * Authentication.  
   * Read access to audit state.  
2. **Audit worker**  
   * Claims persistent jobs.  
   * Runs analysis.  
   * Coordinates CRE evaluation.  
   * Publishes results.  
3. **Isolated execution host**  
   * Runs submitted tools.  
   * Collects observations.  
   * Runs approved tools through restricted execution.  
4. **External services**  
   * Hedera.  
   * Blocky402.  
   * Chainlink CRE.  
   * EVM RPC.  
   * The Graph provider.

The worker may coordinate a runner on the same dedicated VM, but the submitted process must not share the worker’s secrets.

### **5.2 Network choice**

Use:

* Hedera Testnet for payment and HCS records.  
* A jointly supported EVM testnet for CRE report delivery and Graph indexing.

Start feasibility checks with Ethereum Sepolia.

Do not commit the architecture to an unverified network combination. Record the selected chain ID, consumer address, forwarder configuration, and Graph deployment.

Do not assume a standard subgraph can directly index HCS messages.

### **5.3 Sources of truth**

| Information | Authority |
| ----- | ----- |
| Payment settlement | Verified facilitator result and chain receipt |
| Job progress | Safe402 database |
| Raw observations | Authenticated evidence collector |
| Signed report contents | Verified report payload |
| Ordered audit receipt | Hedera |
| Current execution authorization | Consumer contract |
| Search and history | The Graph, subject to indexing delay |
| Actual process launch | Execution gateway |

---

## **6\. Repository Organization**

Keep the existing application where possible.

The following is a suggested organization, not a requirement to move every existing file:

pages/

  index.tsx

  audits/

    \[id\].tsx

  api/

    v1/

      ...

&nbsp;

components/

  audit-list/

  audit-detail/

  evidence/

  provenance/

  ui/

&nbsp;

src/

  domain/

  schemas/

  client/

  auth/

  artifacts/

  payments/

  jobs/

  scanner/

  evidence/

  policies/

  reports/

  publication/

  graph/

  gateway/

&nbsp;

cli/

  commands/

  index.ts

&nbsp;

mcp/

  server.ts

  tools/

&nbsp;

worker/

  main.ts

&nbsp;

runner/

  profiles/

  collectors/

  harness/

  images/

&nbsp;

cre/

  safe402-policy/

&nbsp;

contracts/

  Safe402AuthorizationRegistry.sol

  test/

&nbsp;

subgraph/

  schema.graphql

  subgraph.yaml

  src/

&nbsp;

fixtures/

  clean-price-tool/

  credential-attempt/

  exfiltration-attempt/

  declared-signing/

  changed-version/

&nbsp;

config/

  policies/

  execution-profiles/

&nbsp;

scripts/

  bootstrap/

  demo/

  verification/

&nbsp;

docs/

  architecture.md

  trust-model.md

  continuity.md

  integration-versions.md

  demo.md

  evaluation.md

  operations.md

Keep a shared domain layer. CLI, MCP, and dashboard must not implement independent decision logic.

---

## **7\. Feasibility Phase — Do This First**

Do not begin with frontend styling.

### **7.1 Hedera payment spike**

Build one minimal paid endpoint.

Prove:

* It returns an x402 challenge.  
* The reference client authorizes payment.  
* Blocky402 settles on Hedera Testnet.  
* The server verifies settlement.  
* The client receives the requested response.

Save:

* Compatible SDK versions.  
* Network identifier.  
* Supported asset.  
* Decimal handling.  
* Facilitator configuration.  
* Successful transaction reference.

Do not assume the newest generic x402 SDK automatically supports the exact Hedera integration used by the example.

### **7.2 CRE spike**

Start from Hello Confidential Workflows.

Prove:

* The workflow compiles.  
* A confidential handler loads a private parameter.  
* It evaluates a small evidence payload.  
* It returns a deterministic decision.  
* The execution mode is identifiable.

Then prove the supported onchain report-delivery path.

### **7.3 Graph spike**

Deploy the smallest possible consumer contract and hosted subgraph.

Prove:

* One contract event is emitted.  
* The hosted index receives it.  
* A real query returns it.  
* The response identifies indexing progress.

### **7.4 Runner spike**

Execute one clean fixture and one synthetic credential-access fixture.

Prove:

* The fixture cannot access host secrets.  
* The collector records an actual attempted action.  
* Output is normalized.  
* The process is terminated on timeout.

### **7.5 Exit criteria**

Proceed only when all four paths have evidence or a documented limitation with an honest demo mode.

If a service is unavailable, continue independent implementation. Do not fabricate successful integration output.

---

## **8\. Core Domain Concepts**

Keep the following concepts separate.

### **8.1 Artifact**

The exact executable package being evaluated.

### **8.2 Evidence bundle**

The test results and observations collected for that artifact under a particular execution profile.

### **8.3 Policy**

The owner’s restrictions and decision parameters.

### **8.4 Decision capsule**

A compact, canonical evaluation result binding:

* Evidence.  
* Artifact.  
* Policy.  
* Requester.  
* Execution profile.  
* Decision.  
* Expiry.

### **8.5 Report**

A human-readable and machine-readable explanation of the audit.

### **8.6 Authorization**

The current onchain permission derived from the decision.

### **8.7 Publication receipts**

References proving where report commitments and authorization updates were recorded.

Do not create circular hashes by putting a final report’s own hash or future publication transactions inside its signed payload.

---

## **9\. CLI Specification**

### **9.1 CLI responsibilities**

The CLI is the primary developer interface.

It must support:

* Configuration.  
* Service discovery.  
* Policy registration.  
* Artifact inspection.  
* Quote retrieval.  
* Paid verification.  
* Job progress.  
* Report inspection.  
* Report verification.  
* History.  
* Alternatives.  
* Restricted execution.  
* Authorized revocation.  
* Integration diagnostics.

### **9.2 Proposed commands**

safe402 init

safe402 doctor

&nbsp;

safe402 service inspect

&nbsp;

safe402 policy validate \<file\>

safe402 policy register \<file\>

&nbsp;

safe402 artifact inspect \<reference\>

&nbsp;

safe402 quote \<artifact\> \--policy \<policy-id\>

&nbsp;

safe402 verify \<artifact\> \--policy \<policy-id\> \--max-payment \<limit\>

safe402 audit get \<audit-id\>

safe402 audit watch \<audit-id\>

&nbsp;

safe402 report get \<report-id\>

safe402 report verify \<report-file\>

&nbsp;

safe402 history \<artifact-hash\>

safe402 alternatives \--function \<function-id\> \--policy \<policy-id\>

&nbsp;

safe402 run \<artifact\> \--authorization \<authorization-id\> \--input \<file\>

&nbsp;

safe402 revoke \<authorization-id\> \--reason \<reason\>

&nbsp;

safe402 demo

### **9.3 Configuration**

`safe402 init` creates a local configuration file containing non-secret defaults:

* API URL.  
* Network.  
* Default policy reference.  
* Trusted issuer IDs.  
* Payment asset.  
* Spending limit.  
* Output preference.  
* Gateway URL.

Signing credentials are referenced through environment or a protected credential mechanism. Do not write private keys into the general configuration file.

### **9.4 Output modes**

Every applicable command supports:

* Human-readable output.  
* `--json` for automation.

For JSON mode:

* Write only structured output to stdout.  
* Send diagnostic logs to stderr.  
* Do not mix progress decorations with JSON.  
* Return documented error codes.

### **9.5 Exit codes**

| Code | Meaning |
| ----- | ----- |
| 0 | Operation succeeded; for `verify`, usable authorization is ready |
| 2 | Security decision blocked execution |
| 3 | Review or incomplete evaluation |
| 4 | Payment or spending-policy failure |
| 5 | Operational dependency failure |
| 6 | Invalid input or configuration |

If verification returns immediately without waiting, document that exit code 0 means job submission succeeded, not that execution is approved.

### **9.6 Payment behavior**

Interactive mode may ask the developer to authorize the configured payment.

Noninteractive agent mode requires an existing spending policy. It must not hang waiting for terminal input.

Reject payment when:

* The asset is unexpected.  
* The amount exceeds the budget.  
* The recipient is not trusted.  
* The network differs.  
* The quote expired.  
* The request hash changed.

### **9.7 Execution behavior**

`safe402 run` must call the protected gateway.

It must not run arbitrary local shell commands after merely printing an approval message.

For the MVP, tool execution occurs on the configured isolated host. Local execution outside that host is not protected by Safe402.

---

## **10\. MCP Specification**

### **10.1 Purpose**

Expose Safe402 capabilities to MCP-compatible agents.

The MCP layer translates structured calls into the same client SDK used by the CLI.

### **10.2 Required tools**

safe402\_get\_service

safe402\_quote\_audit

safe402\_verify\_tool

safe402\_get\_audit

safe402\_get\_report

safe402\_check\_status

safe402\_find\_alternative

safe402\_execute\_tool

### **10.3 Trust boundary**

The trusted MCP adapter or payment broker handles signing.

The LLM receives:

* Quote information.  
* Payment status.  
* Audit progress.  
* Decision.  
* Public explanation.

It must not receive payment private keys or unrestricted signing tools.

### **10.4 Transport**

Start with a local stdio MCP server that communicates with the hosted API.

This minimizes remote-session complexity.

Add remote MCP transport only if required for the demonstration.

### **10.5 Tool descriptions**

Descriptions must state:

* Which operations spend funds.  
* Which operations execute code.  
* Which inputs require immutable references.  
* That a report lookup does not itself authorize execution.

No tool may accept a caller-supplied `approved: true` value as authority.

### **10.6 Example result**

{

  "auditId": "audit\_example",

  "evaluationStatus": "COMPLETE",

  "decision": "BLOCK",

  "executionAllowed": false,

  "reasonCodes": \[

    "UNDECLARED\_FILE\_ACCESS"

  \],

  "artifactHash": "sha256:...",

  "reportId": "report\_example",

  "confidentialExecutionMode": "SIMULATED"

}

Example values must not be used as live integration evidence.

---

## **11\. Artifact Preparation**

### **11.1 Supported artifacts**

MVP support:

* Node.js MCP tools.  
* Pinned source or bundled JavaScript.  
* Explicit entrypoint.  
* Lockfile where dependencies exist.  
* No native extensions initially.  
* Bounded test inputs.  
* Declared capability manifest.

Reject unsupported packages before payment when possible.

### **11.2 Immutable identity**

Resolve:

* Repository reference → exact commit.  
* Package reference → exact version and integrity digest.  
* Catalog entry → immutable artifact ID.

Never audit a mutable branch and later execute whatever that branch points to.

### **11.3 Hash construction**

Create a canonical manifest with:

* Normalized relative file paths.  
* Per-file digests.  
* Relevant executable permissions.  
* Entrypoint.  
* Capability declaration.  
* Lockfile.  
* Build settings.

Sort deterministically.

Record the digest of the prepared executable bundle or image as well.

If a build changes the source into a different executable artifact, bind both source and executable digests.

### **11.4 Security checks**

Reject:

* Path traversal.  
* Escaping symlinks.  
* Excessive archive expansion.  
* Unsupported install scripts.  
* Unbounded file counts.  
* Invalid manifests.  
* References to internal-network download destinations.

Do not install dependencies on the API host.

### **11.5 Initial limits**

Start with configurable limits such as:

* 20 MB uploaded source archive.  
* 100 MB expanded source.  
* 2,000 source files.  
* 2 MB per source file.  
* 120-second behavioral job deadline.  
* 1 GiB tool-process memory.  
* 64 process limit.

These are proposed product limits. Measure them against supported fixtures and document changes.

---

## **12\. Capability Manifest**

### **12.1 Example**

{

  "schemaVersion": "1.0",

  "tool": {

    "name": "price-lookup",

    "version": "1.0.0",

    "functionId": "price\_lookup"

  },

  "runtime": {

    "type": "node",

    "entrypoint": "dist/server.js"

  },

  "capabilities": {

    "network": \[

      {

        "host": "prices.example.test",

        "port": 443,

        "methods": \["GET"\]

      }

    \],

    "filesystem": \[\],

    "process": \[\],

    "wallet": \[\]

  }

}

### **12.2 Declaration rules**

* Missing declarations are unknown, not automatically empty.  
* Wildcards must be explicit.  
* Hostnames must be normalized.  
* Filesystem paths must use a documented normalization scheme.  
* Network permissions and application methods must not be conflated.  
* Necessary runtime file access belongs to a versioned baseline profile.

A declared dangerous capability may still violate policy.

---

## **13\. Static Analysis Plan**

### **13.1 Required detectors**

* Filesystem access.  
* Environment-variable references.  
* Outbound network targets.  
* Child-process creation.  
* Dynamic code execution.  
* Wallet APIs.  
* RPC writes.  
* Suspicious tool descriptions.  
* Embedded instruction attacks.  
* Suspicious dependency behavior.

### **13.2 Implementation approach**

Prefer deterministic analysis for supported syntax.

Use LLM analysis for explanations and uncertain semantic findings.

Do not require an LLM to recognize every basic filesystem or process call.

### **13.3 Finding schema**

Each finding includes:

findingId

ruleId

sourceType

severity

file

location

description

evidenceReference

confidence

analyzerVersion

### **13.4 Failure handling**

If source is truncated, parsing fails, or required files are missing:

* Record incomplete coverage.  
* Continue independent checks when useful.  
* Do not produce approval unless the required profile is satisfied.

A missing LLM key must not activate canned “safe” output.

---

## **14\. Behavioral Runner Plan**

### **14.1 Isolation**

Use a dedicated Linux execution environment.

The submitted tool must not access:

* Worker environment variables.  
* Payment signing keys.  
* Hedera operator credentials.  
* CRE credentials.  
* Database credentials.  
* Host filesystem.  
* Container-engine socket.  
* Cloud metadata services.

Use an appropriate sandbox boundary and document what it protects.

Do not represent ordinary Docker configuration alone as proof of safe arbitrary-code execution.

### **14.2 Execution phases**

1. Prepare immutable executable artifact.  
2. Start collectors.  
3. Create disposable filesystem.  
4. Start controlled test services.  
5. Launch the MCP process.  
6. Perform protocol initialization.  
7. Discover supported tools.  
8. Invoke bounded test inputs.  
9. Collect attempts and effects.  
10. Stop the process.  
11. Finalize evidence.  
12. Destroy the environment.

### **14.3 Synthetic resources**

Provide:

* Fake credential files.  
* Fake API keys.  
* Fake environment values.  
* Controlled price endpoint.  
* Controlled outbound sink.  
* Fake wallet broker.  
* Controlled RPC responses.

No real wallet operation is required.

### **14.4 Observation collection**

Record:

* Filesystem access attempts.  
* Successful reads and writes where observable.  
* Network connection attempts.  
* Allowed and blocked requests.  
* Process creation.  
* Wallet-broker calls.  
* Relevant MCP responses.  
* Timeouts and crashes.

Collectors should run outside the submitted process’s control.

### **14.5 Important distinction**

Store separate fields for:

attempted

permitted

completed

A blocked connection attempt is not successful exfiltration.

### **14.6 Environment-variable reads**

Do not claim system-call tracing observes every read from environment variables already loaded into process memory.

For supported Node.js behavior, use instrumentation and synthetic canaries, and disclose limitations.

### **14.7 Prompt-injection checks**

Test descriptions and outputs with a restricted harness.

Record:

* Suspicious text.  
* Whether the harness attempted a forbidden action.  
* Harness model/version if applicable.  
* Test inputs.  
* Uncertainty.

The model must not have real secrets or unrestricted tool access during these tests.

---

## **15\. Evidence and Coverage**

### **15.1 Evidence event**

{

  "schemaVersion": "1.0",

  "auditId": "audit\_example",

  "sequence": 12,

  "testId": "credential\_access",

  "sourceType": "RUNTIME",

  "capability": "FILESYSTEM",

  "operation": "READ",

  "target": "/fixtures/credentials.json",

  "attempted": true,

  "permitted": false,

  "completed": false,

  "collectorVersion": "collector-v1",

  "evidenceReference": "private:evidence-object"

}

### **15.2 Coverage report**

Include:

* Tests requested.  
* Tests completed.  
* Tests skipped.  
* Unsupported behaviors.  
* Collector errors.  
* Runtime limits reached.  
* Input and fixture versions.

### **15.3 Evidence reuse**

Evidence may be reused only when these match:

* Executable artifact.  
* Dependency set.  
* Runtime image.  
* Test suite.  
* Relevant execution environment.  
* Evidence freshness requirements.

Changing policy may require only reevaluation if suitable evidence exists.

Changing the executable artifact requires new evaluation of that artifact.

Reusing evidence is not the same as reusing authorization.

---

## **16\. Policy Configuration**

Policies are configured through files and CLI commands.

Do not build a browser policy editor for this release.

### **16.1 Example policy**

schemaVersion: "1.0"

name: research-agent

rules:

  requireCompleteCoverage: true

  blockUndeclaredCapabilities: true

  wallet:

    allowSigning: false

    allowTransactions: false

  process:

    allowSpawn: false

  filesystem:

    allowedPaths: \[\]

  network:

    allowedHosts:

      \- prices.example.test

authorization:

  ttlSeconds: 3600

This is proposed Safe402 syntax.

### **16.2 Validation**

Reject:

* Unknown fields.  
* Contradictory rules.  
* Invalid targets.  
* Excessively permissive wildcards where unsupported.  
* Invalid expiry values.

### **16.3 Policy registration**

1. Validate locally.  
2. Authenticate the owner.  
3. Upload through an authenticated channel.  
4. Store encrypted policy parameters.  
5. Create a policy version.  
6. Create a salted policy commitment.  
7. Return an opaque policy reference.

### **16.4 Privacy scope**

The MVP may trust the Safe402 backend to store policy values.

Do not claim policies are hidden from the Safe402 operator unless that is actually implemented.

The confidentiality objective is to avoid exposing private parameters in public workflow inputs, logs, chain records, and reports.

---

## **17\. Decision Rules**

### **17.1 Decision categories**

| Decision | Meaning | Execution |
| ----- | ----- | ----- |
| `ALLOW` | Required evidence satisfies the policy | Eligible after publication and current-state checks |
| `REVIEW` | Incomplete or ambiguous evidence | Denied |
| `BLOCK` | Confirmed forbidden behavior or binding failure | Denied |

### **17.2 Precedence**

1. Binding failure → deny.  
2. Explicit critical violation → block.  
3. Required coverage missing → review.  
4. Policy mismatch → block.  
5. All required checks satisfied → allow.

Do not average away critical violations with a low aggregate score.

### **17.3 Scores**

A numeric score is optional.

If implemented:

* Use documented weights.  
* Version the scoring rules.  
* Explain contributing findings.  
* Use `null` for unavailable scores.  
* Do not label the score a probability of compromise.

Prioritize reason codes and evidence over decorative scoring.

---

## **18\. Chainlink CRE Implementation**

### **18.1 Intended role**

CRE evaluates authenticated audit evidence against private parameters and produces a decision used by the authorization registry.

It is not the arbitrary-code sandbox.

### **18.2 Template usage**

Use Hello Confidential Workflows to learn the execution boundary.

Use AI Audit Firewall as the main architectural reference for pre-execution evaluation.

Use Automated Liquidation Protection only as a reference for private parameters and enforcing constraints before actions. Do not add lending or liquidation functionality.

### **18.3 Workflow steps**

1. Receive an opaque audit request reference.  
2. Authenticate the request.  
3. Retrieve evidence from an allowlisted service.  
4. Verify evidence digest and accepted collector identity.  
5. Retrieve private policy parameters.  
6. Verify policy commitment.  
7. Evaluate deterministic rules.  
8. Produce a decision capsule.  
9. Deliver the result through supported CRE mechanisms.

### **18.4 Do not trust arbitrary inputs**

The workflow must not fetch arbitrary URLs supplied by the audited tool.

It must not accept caller-provided observations without an authenticated evidence source.

### **18.5 Confidentiality**

Private parameters must enter through a supported confidential path.

Do not put them in:

* Public triggers.  
* Workflow source code.  
* Public logs.  
* Contract calldata.  
* Unredacted reports.

Workflow logic and private workflow data are different. The templates explain that confidentiality of processed values does not make the workflow binary secret. [Hello Confidential Workflows source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/hello-confidential-workflows)

### **18.6 Provenance fields**

Use separate fields:

evidenceMode: SYNTHETIC\_TEST | REAL\_ARTIFACT\_TEST

confidentialExecutionMode: SIMULATED | LIVE

reportDeliveryMode: LOCAL | TESTNET | MAINNET

Do not combine these into one vague “live” badge.

### **18.7 Simulation**

Confidential simulation is not real enclave execution. Live confidential access may require enrollment.

Use simulation transparently when necessary. [Confidential workflow documentation](https://docs.chain.link/cre-templates/hello-confidential-workflows)

### **18.8 Onchain delivery requirement**

A manually submitted application transaction is not automatically evidence of authenticated CRE report delivery.

Prove the supported write path separately.

If only a test adapter is available:

* Isolate it.  
* Mark it as test-only.  
* Do not claim the live report trust model is complete.  
* Do not assume prize qualification.

---

## **19\. Decision Capsule and Report Format**

### **19.1 Capsule contents**

schemaVersion

auditId

artifactHash

executionProfileHash

evidenceHash

policyCommitment

subjectId

decision

reasonCodes

issuedAt

expiresAt

authorizationSequence

confidentialExecutionMode

### **19.2 Canonical encoding**

Specify:

* Field ordering or canonical serialization.  
* Timestamp units.  
* Hash algorithm.  
* String normalization.  
* Domain separation.  
* Chain and application binding.

### **19.3 Hash boundaries**

Use distinct digests:

* `artifactHash`: artifact identity.  
* `evidenceHash`: collected evidence.  
* `capsuleHash`: decision payload.  
* `reportHash`: explanatory report payload.

Publication references live in a separate envelope.

### **19.4 Report authentication**

Sign the report using the configured Safe402 issuer key.

Verify that the report references the same capsule recorded by the consumer.

Keep issuer signatures distinct from CRE provenance.

### **19.5 Report verification**

The verifier checks:

1. Schema.  
2. Canonical digest.  
3. Signature.  
4. Accepted issuer.  
5. Capsule binding.  
6. Artifact binding.  
7. Policy and subject binding.  
8. Execution profile.  
9. Expiry.  
10. Current revocation state.

A readable JSON document alone is not sufficient authorization.

---

## **20\. Authorization Contract**

### **20.1 Contract name**

`Safe402AuthorizationRegistry`

### **20.2 Responsibilities**

* Receive authenticated decisions.  
* Store current authorization.  
* Prevent replay and stale updates.  
* Track issuer or workflow acceptance.  
* Support revocation.  
* Expose a compact current-state view.  
* Emit complete indexing events.

### **20.3 Authorization key**

Conceptually:

hash(

  applicationDomain,

  subjectId,

  artifactHash,

  policyCommitment,

  executionProfileHash

)

`subjectId` is an authenticated application identity. It does not claim unique personhood.

### **20.4 Required checks**

* Accepted sender/forwarder.  
* Accepted workflow metadata where supported.  
* Valid timestamps.  
* Monotonic sequence.  
* Unused capsule or update identifier.  
* Supported decision.  
* Correct domain.

### **20.5 Revocation**

Revocation must not be undone by replaying an older allow decision.

Support:

* Authorization revocation.  
* Issuer disablement.  
* Expiry.

A new approval after revocation requires an explicitly newer valid evaluation.

### **20.6 Events**

Suggested events:

ToolRegistered

AuthorizationRecorded

AuthorizationRevoked

IssuerStatusChanged

`ToolRegistered` is managed by a restricted catalog publisher.

It should include enough public metadata for function-based discovery without requiring arbitrary offchain fetches.

### **20.7 Privacy**

Do not emit private policy parameters.

Public subject identifiers and commitments may still reveal linkage. Document that limitation.

---

## **21\. Hedera Integration**

### **21.1 Required uses**

* x402 payment.  
* Safe402 service descriptor.  
* Linked audit receipt.  
* Revocation or lifecycle receipt where relevant.

### **21.2 Service descriptor**

Publish:

serviceId

serviceVersion

API endpoint

MCP connection instructions

supportedArtifactProfiles

pricingReference

issuerIdentity

descriptorHash

Keep a signed HTTP descriptor available to clients.

Do not automatically trust a service endpoint merely because it was found in a public topic.

### **21.3 Payment receipt**

Link:

auditId

requestHash

artifactHash

paymentReference

amount

asset

payerReference

status

### **21.4 Completion receipt**

Link:

auditId

artifactHash

evidenceCommitment

capsuleHash

reportHash

decision

consumerTransaction

Only publish approved public fields.

### **21.5 HCS implementation**

Use a small number of submit-key-controlled topics.

Do not create a complex topic hierarchy unless existing code makes it useful.

Store large private evidence outside HCS.

HCS is an ordered public record, not a query database or proof that the audit conclusion is correct.

---

## **22\. Payment Reliability**

### **22.1 Quote**

A quote contains:

* Quote ID.  
* Request digest.  
* Artifact identity.  
* Policy reference.  
* Audit profile.  
* Price.  
* Asset.  
* Network.  
* Recipient.  
* Expiry.

### **22.2 Payment sequence**

1. Validate request.  
2. Persist quote.  
3. Return x402 requirements.  
4. Client validates requirements.  
5. Client signs through its restricted payment adapter.  
6. Server verifies and settles through Blocky402.  
7. Persist settlement.  
8. Create or recover the audit job.  
9. Return job ID.

The exact wire protocol must follow the compatible SDK versions established in the feasibility phase.

### **22.3 Idempotency**

Use:

* Unique quote/request association.  
* Unique settlement reference.  
* Unique payer-scoped idempotency key.  
* Atomic database transitions.

### **22.4 Ambiguous settlement**

If settlement times out:

* Do not assume failure.  
* Do not immediately request another payment.  
* Reconcile using the facilitator and transaction identity.  
* Return `PAYMENT_RECONCILING`.

### **22.5 Crash recovery**

A crash after payment but before the HTTP response must recover the existing job.

Payment and job creation are separate external/database actions. Do not pretend they form a distributed atomic transaction.

### **22.6 Failure after payment**

* Retry transient service failures.  
* Do not charge again for the same job.  
* Record terminal failure.  
* Provide an operator refund command and documented process.  
* Do not refund merely because the tool was blocked.

The customer purchases an audit, not approval.

---

## **23\. The Graph Integration**

### **23.1 Required product behavior**

The Graph must influence agent behavior.

Implement:

* Audit history.  
* Revocation discovery.  
* Alternative-tool candidates.  
* Visible index freshness.

### **23.2 Hosted subgraph**

Index consumer-contract events through a Graph provider.

Suggested entities:

Tool

Artifact

Authorization

AuthorizationEvent

Revocation

Issuer

### **23.3 Event IDs**

Use stable IDs derived from:

chainId \+ transactionHash \+ logIndex

Keep immutable event entities separate from mutable current-state entities.

### **23.4 Current status**

Expiry must be computed against current time.

Do not assume an index updates an entity automatically when time passes without an event.

### **23.5 Queries**

Required functions:

getArtifactHistory

getIndexedAuthorization

getRevocations

findToolsByFunction

getIndexStatus

### **23.6 Alternatives**

Filter by:

* Function ID.  
* Supported execution profile.  
* Published capabilities.  
* Relevant evidence availability.  
* Indexed issuer and revocation status.

Return candidates, not automatic approval.

A candidate audited under another owner’s policy still needs appropriate evaluation for the current requester.

### **23.7 Official Subgraph MCP**

The official Subgraph MCP exposes schema discovery and queries to MCP clients; it does not itself contain an LLM. [Introduction](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/)

Use it as an optional agent-facing path for exploring Safe402 history when it can access the selected deployment.

The production gateway should use bounded, deterministic queries and direct authorization checks.

If the official MCP cannot reach the chosen hosted deployment, retain direct GraphQL integration and document the limitation.

### **23.8 Development skills**

Use the supplied Subgraphs Skills repository as development guidance for schemas, mappings, testing, and deployment.

Substreams Skills are optional. The MVP does not require a second indexing pipeline.

Using a development skill is not a substitute for consuming live Graph data in the application.

---

## **24\. Publication and Consistency**

### **24.1 Persistent publication states**

Track separately:

reportStored

hederaReceiptConfirmed

authorizationTransactionConfirmed

graphIndexed

### **24.2 Readiness**

An `ALLOW` decision is not executable until:

* The report is available.  
* Required authentication succeeds.  
* Hedera receipt is confirmed.  
* Authorization state is confirmed.

Graph indexing may still be pending.

Index delay should not change the underlying authorization. It may temporarily prevent discovery.

### **24.3 Durable outbox**

Write publication tasks to a durable outbox.

Each task has:

* Target.  
* Audit ID.  
* Payload digest.  
* Attempt count.  
* Last error.  
* External reference.  
* Next retry time.

### **24.4 Duplicate publication**

Reconcile by audit ID and payload digest.

Ignore duplicate HCS logical events when presenting history. Do not assume retried external calls can never produce duplicates.

### **24.5 Cross-chain trust**

The application links Hedera and EVM records.

It does not implement a trustless bridge.

The gateway verifies the configured records and their matching commitments within this stated trust model.

---

## **25\. Execution Gateway**

### **25.1 Main responsibility**

The gateway is the actual security boundary for tool launch.

### **25.2 Request**

The client supplies:

* Artifact reference.  
* Authorization ID.  
* Policy reference.  
* Bounded tool input.  
* Authenticated subject.

### **25.3 Checks**

Before starting the process:

1. Resolve immutable executable content.  
2. Verify the content digest.  
3. Authenticate the subject.  
4. Verify report and capsule.  
5. Read current contract state.  
6. Confirm issuer acceptance.  
7. Confirm unexpired authorization.  
8. Confirm no revocation.  
9. Confirm policy and execution-profile match.  
10. Confirm required publication.  
11. Create the restricted environment.  
12. Launch the verified content.

### **25.4 Avoid check/use mismatch**

Do not check one path and later launch mutable files from another path.

Use immutable prepared content or a read-only content-addressed bundle.

### **25.5 Runtime restrictions**

Keep approved execution within:

* Network allowlist.  
* Filesystem profile.  
* Process restrictions.  
* Time and resource limits.  
* Approved brokered capabilities.

The tested tool must not inherit the payment signer or agent operator credentials.

### **25.6 Revocation behavior**

For MVP:

* Check before every new invocation.  
* Limit session duration.  
* Deny subsequent invocations after revocation.

Do not claim immediate cancellation of every in-flight operation unless implemented.

### **25.7 Failure behavior**

If authoritative authorization cannot be checked, refuse execution.

A stale Graph result must not override a current revocation.

---

## **26\. API Contract**

Use a versioned namespace.

| Method | Endpoint | Function |
| ----- | ----- | ----- |
| GET | `/api/v1/service` | Descriptor |
| POST | `/api/v1/policies` | Authenticated policy registration |
| POST | `/api/v1/artifacts/resolve` | Resolve immutable artifact |
| POST | `/api/v1/quotes` | Quote |
| POST | `/api/v1/audits` | Paid submission |
| GET | `/api/v1/audits/:id` | Status |
| GET | `/api/v1/audits/:id/events` | Progress |
| GET | `/api/v1/reports/:id` | Report |
| GET | `/api/v1/artifacts/:hash/history` | History |
| POST | `/api/v1/alternatives` | Candidate query |
| POST | `/api/v1/executions` | Restricted invocation |
| POST | `/api/v1/revocations` | Authorized revocation |

### **26.1 Authentication**

For the MVP, scoped service tokens may authenticate private API operations.

Keep these separate from payment authorization.

Public redacted reports can be readable without login. Private evidence and owner policies cannot.

### **26.2 Progress events**

Use persistent sequence numbers.

Support:

* Polling by cursor.  
* Server-Sent Events when hosting supports it.  
* Reconnection without losing events.

### **26.3 Error envelope**

{

  "error": {

    "code": "AUTHORIZATION\_REVOKED",

    "message": "This authorization has been revoked.",

    "retryable": false,

    "requestId": "request\_example"

  }

}

Never include secrets or raw signed payment payloads in errors.

---

## **27\. Persistent Data Model**

| Entity | Important constraints |
| ----- | ----- |
| Artifact | Immutable executable digest |
| PolicyVersion | Owner-scoped, immutable version |
| Quote | Request digest and expiry |
| Payment | Unique settlement reference |
| AuditJob | Persistent state and lease |
| JobEvent | Ordered per audit |
| Observation | Audit and evidence reference |
| EvidenceBundle | Immutable digest |
| DecisionCapsule | Immutable canonical result |
| Report | Digest and signature |
| PublicationTask | Idempotent logical target |
| AuthorizationReference | Chain and contract identity |
| Revocation | Authorization and effective state |
| Execution | Authorization checked and outcome |

### **27.1 Worker behavior**

Use a database-backed queue first.

Implement:

* Atomic job claiming.  
* Worker lease.  
* Heartbeat.  
* Attempt limits.  
* Expired-lease recovery.  
* Stage checkpoints.

Do not hold a database transaction open for the duration of an audit.

---

## **28\. State Machines**

### **Audit processing**

AWAITING\_PAYMENT

  → PAYMENT\_RECONCILING

  → QUEUED

  → PREPARING

  → SCANNING

  → TESTING

  → EVALUATING

  → PUBLISHING

  → COMPLETED

Payment reconciliation is entered only when needed.

Exceptional states:

PAYMENT\_FAILED

FAILED

INCONCLUSIVE

CANCELLED

### **Security result**

UNDECIDED → ALLOW

UNDECIDED → REVIEW

UNDECIDED → BLOCK

### **Authorization lifecycle**

PENDING → ACTIVE

ACTIVE → EXPIRED

ACTIVE → REVOKED

ACTIVE → SUPERSEDED

A completed blocked audit is a successful service outcome with no executable authorization.

---

## **29\. Minimal Next.js Dashboard**

### **29.1 Purpose**

Help developers and judges inspect what the CLI and agent did.

The dashboard is not required to run Safe402.

### **29.2 Stack**

* Existing Next.js Pages Router.  
* TypeScript.  
* Tailwind CSS.  
* Existing compatible UI components.  
* Shared API types.  
* Polling or SSE for progress.

Avoid introducing libraries that duplicate working dependencies.

### **29.3 Screen one: audit list**

Route:

/

Show:

* Safe402 name.  
* Short product explanation.  
* Audit table.  
* Filters.  
* Network indicator.  
* Compact integration status.

Table columns:

* Tool.  
* Version.  
* Audit state.  
* Decision.  
* Created time.  
* View report.

No fake metrics.

### **29.4 Screen two: audit detail**

Route:

/audits/\[id\]

Show:

1. Tool and exact artifact.  
2. Decision banner.  
3. Declared-versus-observed table.  
4. Progress timeline.  
5. Findings.  
6. Payment receipt.  
7. Provenance.  
8. Publication status.  
9. Revocation and expiry.  
10. CLI command to inspect or run the artifact.

Tabs within this screen are acceptable. Do not create more top-level pages.

### **29.5 Visual direction**

Use a clean, restrained security-workspace style.

Keep design tokens centralized. Branding and palette changes must not delay the functional build.

Use:

* Clear text hierarchy.  
* Readable tables.  
* Monospace hashes.  
* Status labels with icons.  
* Responsive stacking.  
* Accessible contrast.

### **29.6 Result wording**

Allowed:

> Allowed under this policy.

Blocked:

> Execution blocked: undeclared credential access was observed.

Incomplete:

> Audit incomplete. Execution remains unavailable.

Simulation:

> Confidential evaluation simulated.

### **29.7 Frontend limits**

Do not add:

* Wallet onboarding wizard.  
* Browser checkout.  
* Policy editor.  
* Agent chat interface.  
* Marketing statistics.  
* Separate demo page.

---

## **30\. Reference Agent**

### **30.1 Purpose**

Demonstrate actual agent use of Safe402.

A CLI orchestration script is useful for tests, but do not describe it as an autonomous LLM agent unless it actually uses a model for agent decisions.

### **30.2 Agent permissions**

Give the reference agent only:

* Safe402 MCP tools.  
* Bounded Graph discovery access.  
* Restricted payment capability.  
* Safe402 gateway execution.

Do not give it an unrestricted shell.

### **30.3 Task**

Example:

> Retrieve a price using a third-party tool. Verify the tool first, spend no more than the configured audit budget, and use an alternative if the selected tool is blocked.

### **30.4 Deterministic controls**

Even if the agent asks to bypass verification:

* Payment limits remain enforced.  
* Gateway checks remain enforced.  
* Revocations remain enforced.

LLM cooperation must not be the only security mechanism.

### **30.5 Hedera Agent Kit**

Use a minimal selected tool set if it reduces integration effort.

Inspect its hooks and policies as an optional place to attach Safe402 checks. Do not expose all wallet operations by default. The repository documents hooks and policy controls. [Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js)

---

## **31\. Detailed Flow A — First Paid Audit**

### **Step 1: owner setup**

The developer:

* Configures the API.  
* Configures a testnet payer.  
* Defines spending limits.  
* Registers a policy.  
* Configures trusted issuer and contract identities.

Expected result: `safe402 doctor` reports readiness or specific missing dependencies.

### **Step 2: artifact selection**

The agent selects a catalog entry or pinned source.

Safe402 resolves the executable artifact.

Expected result: immutable artifact identity.

### **Step 3: history lookup**

Safe402 checks existing evidence and authorization.

Expected result:

* Reusable current authorization, or  
* Evidence available but policy reevaluation needed, or  
* New audit required.

Do not trust a prior approval for another subject.

### **Step 4: quote**

Safe402 creates a request-bound quote.

Expected result: price, asset, recipient, expiry, and request digest.

### **Step 5: payment**

The trusted payment adapter validates the quote and signs within policy.

Expected result: settlement confirmation or reconciliation state.

### **Step 6: job creation**

Safe402 associates the payment with one persistent audit job.

Expected result: job ID returned even if the audit is still queued.

### **Step 7: analysis**

The worker performs static analysis and bounded execution.

Expected result: real normalized findings and coverage.

### **Step 8: private evaluation**

CRE validates references and evaluates private policy parameters.

Expected result: decision capsule.

### **Step 9: publication**

Safe402 stores the report, records the receipt, and delivers authorization state.

Expected result: separate confirmation statuses.

### **Step 10: response**

The client receives the result.

For `BLOCK`, the workflow ends without execution.

For `ALLOW`, the client may request gateway execution.

---

## **32\. Detailed Flow B — Approved Execution**

1. Agent requests execution using an authorization ID.  
2. Gateway authenticates the agent.  
3. Gateway retrieves the exact artifact.  
4. Gateway verifies report and capsule.  
5. Gateway checks current contract state.  
6. Gateway checks required publication.  
7. Gateway builds the restricted environment.  
8. Gateway invokes the named MCP tool with bounded input.  
9. Gateway captures output and execution status.  
10. Agent receives output.

The gateway must not grant extra capabilities because the tool asks for them at runtime.

---

## **33\. Detailed Flow C — Blocked Tool and Alternative**

1. Selected artifact receives `BLOCK`.  
2. Agent asks for another tool with the same function.  
3. Safe402 queries live Graph data.  
4. Candidates are filtered using public metadata.  
5. Agent selects a candidate.  
6. Safe402 checks whether the current subject has valid authorization.  
7. If needed, Safe402 reuses evidence and evaluates the current policy.  
8. Any new paid operation receives a separate explicit quote.  
9. Gateway verifies the candidate.  
10. Candidate executes under restrictions.

Keep the initial catalog small. Three to five tools are sufficient.

---

## **34\. Detailed Flow D — Changed Version**

1. Version 1 has a valid authorization.  
2. Version 2 is published with different bytes.  
3. Agent attempts to run version 2 using version 1’s authorization.  
4. Gateway detects the artifact mismatch.  
5. Execution is refused.  
6. Safe402 requests a new audit.

Do not automatically label version 2 malicious. It is unverified until evaluated.

---

## **35\. Detailed Flow E — Revocation**

1. Authorized operator revokes an authorization.  
2. Consumer state changes.  
3. Graph eventually indexes the event.  
4. HCS records the lifecycle receipt.  
5. Agent tries another invocation.  
6. Gateway reads current contract state.  
7. Execution is refused even if indexed history is behind.

Measure the observed delay. Do not claim instantaneous propagation everywhere.

---

## **36\. Failure Scenarios**

| Failure | Required behavior |
| ----- | ----- |
| Unsupported artifact | Reject before charging |
| Invalid quote | Refuse payment |
| Settlement timeout | Reconcile before retrying payment |
| Worker crash | Recover job from persistent state |
| Runner timeout | Record incomplete coverage |
| Collector failure | No approval |
| LLM unavailable | No canned verdict |
| CRE unavailable | Pending or failed evaluation |
| HCS unavailable | Retry publication; execution not ready |
| Consumer write fails | Retry; no executable authorization |
| Graph delayed | Show indexing status |
| Graph unavailable | No fabricated alternatives |
| Report signature invalid | Deny |
| Contract read unavailable | Deny |
| Policy changed | Require appropriate new evaluation |
| Issuer disabled | Deny |
| Artifact changed | Deny |

---

## **37\. Demo Plan**

### **37.1 Presentation layout**

Use:

* Terminal for CLI and reference-agent actions.  
* Browser for the audit-detail page.

No special demo webpage is necessary.

### **37.2 Main demo**

**Opening**

Explain that the agent wants to use a price tool and must verify it first.

**Payment**

Show the agent receiving a quote and completing a Hedera payment.

**Audit**

Show actual behavioral evidence:

* Declared permissions.  
* Credential-access attempt.  
* Outbound attempt if included.

**Policy**

Show the CRE result and disclose execution mode.

**Enforcement**

Attempt execution.

Show the gateway refusing to start the tool.

**Alternative**

Query The Graph.

Select a previously audited alternative, clearly labeled as such.

Verify current authorization and execute it.

### **37.3 Optional extension**

Revoke the alternative and demonstrate that its next invocation is refused.

### **37.4 Recording length**

Aim for approximately three to four minutes.

If an audit takes longer:

* Show an honest time cut.  
* Preserve timestamps.  
* Do not claim prerecorded output is live.

---

## **38\. Test Plan**

### **38.1 Unit tests**

* Canonical hashing.  
* Manifest validation.  
* Policy parsing.  
* Capability normalization.  
* Decision precedence.  
* Signature verification.  
* Quote validation.

### **38.2 Integration tests**

* Payment settlement adapter.  
* Payment reconciliation.  
* Job recovery.  
* HCS publication.  
* CRE evaluation.  
* Consumer report authentication.  
* Hosted Graph query.  
* Gateway launch.

### **38.3 Contract tests**

* Unauthorized sender rejected.  
* Wrong workflow rejected where supported.  
* Replay rejected.  
* Older sequence rejected.  
* Expired authorization rejected.  
* Revocation cannot be undone by old reports.  
* Subject and artifact binding preserved.

### **38.4 End-to-end fixtures**

| Fixture | Expected result |
| ----- | ----- |
| Clean price tool | Allow under compatible policy |
| Undeclared credential access | Block |
| Forbidden outbound attempt | Block |
| Declared signing under research policy | Block |
| Unsupported native extension | Reject or review |
| Timed-out test | Inconclusive |
| Modified artifact | Execution denied |
| Revoked report | Execution denied |
| Repeated paid request | Same job, no second charge |
| Stale Graph result | Current revocation still enforced |

### **38.5 Evaluation report**

Publish actual:

* Fixture count.  
* Detection outcomes.  
* False positives.  
* False negatives within the evaluated set.  
* Unsupported cases.  
* Audit latency.  
* Publication latency.  
* Index delay.  
* Estimated per-audit operating cost.

Do not turn a small fixture pass rate into a universal security claim.

---

## **39\. Implementation Milestones**

### **Milestone 0 — Compatibility and proof**

Deliver:

* Integration-version document.  
* One paid request.  
* One confidential evaluation.  
* One authenticated consumer update.  
* One hosted Graph query.  
* One runtime observation.

### **Milestone 1 — Local core**

Deliver:

* Artifact schema.  
* Policy schema.  
* Fixtures.  
* Scanner.  
* Runner.  
* Evidence bundle.  
* Deterministic decisions.

### **Milestone 2 — Persistent service**

Deliver:

* API.  
* Database.  
* Job queue.  
* Payment binding.  
* Recovery behavior.  
* CLI submission and watch commands.

### **Milestone 3 — Provenance and enforcement**

Deliver:

* CRE workflow.  
* Capsule.  
* Signed report.  
* Consumer contract.  
* Publication outbox.  
* Gateway.  
* Revocation.

### **Milestone 4 — Agent and Graph**

Deliver:

* MCP server.  
* Reference agent.  
* Live history.  
* Candidate discovery.  
* Final authorization checks.

### **Milestone 5 — Two-screen dashboard**

Deliver:

* Audit list.  
* Audit detail.  
* Evidence comparison.  
* Payment and provenance links.  
* Accurate status indicators.

### **Milestone 6 — Submission**

Deliver:

* Passing acceptance tests.  
* Public README.  
* Continuity disclosure.  
* Architecture.  
* Demo.  
* Deployment references.  
* Evaluation results.

### **Scope reduction order**

If time is constrained, remove:

1. Extra visual polish.  
2. Official Subgraph MCP convenience integration.  
3. Automatic alternative selection.  
4. Optional LLM explanation features.

Preserve:

* Actual behavioral testing.  
* Paid agent flow.  
* CRE policy evaluation.  
* Live Graph use in a meaningful decision.  
* Provenance.  
* Gateway enforcement.

---

## **40\. Prize Strategy**

Prize information checked September 12, 2026\. Recheck before submitting.

### **Hedera**

Targets:

* Continuity: **$1,000**.  
* AI & Agentic Payments: **$6,000 pool**, up to three awards of $2,000, subject to entry eligibility.

The payment category requires a live Hedera service settled through Blocky402 and an agent completing a paid request. Service discovery and HCS payment trails are relevant enhancements.

Show substantive new work beyond MARS. Confirm which category the Continuity submission may enter. [Hedera prizes](https://ethglobal.com/events/ethonline2026/prizes/hedera)

### **Chainlink**

Targets:

* Best Chainlink-Powered Upgrade: **$500**, Continuity.  
* Best Confidential Workflow: **$2,000 pool**, up to two awards of $1,000, subject to eligibility.

The upgrade requires an onchain state change. Confidential-workflow submissions require meaningful confidential processing and successful execution evidence; simulation is accepted for that category.

Do not assume a manually written test transaction satisfies authenticated CRE integration. [Chainlink prizes](https://ethglobal.com/events/ethonline2026/prizes/chainlink)

### **The Graph**

Target:

* Best AI Tooling or AI Use Case — Continuity: **$5,000 pool**.  
* Awards: **$2,500 / $1,500 / $1,000**.

Use live Graph-provider data for agent decisions and submit public code with a two-to-four-minute demo.

A local index or development skill alone does not qualify. [The Graph prizes](https://ethglobal.com/events/ethonline2026/prizes/the-graph)

These are target categories, not guaranteed combined winnings.

---

## **41\. Reference Guide — The Graph**

### **41.1 Subgraph MCP**

[Subgraph MCP introduction](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/)

Use for:

* Understanding agent access to subgraphs.  
* Schema inspection.  
* Optional natural-language history exploration through an MCP client.

### **41.2 Subgraphs Skills**

[graphprotocol/subgraphs-skills](https://github.com/graphprotocol/subgraphs-skills)

Use as development guidance for:

* Schema design.  
* Event mappings.  
* Testing.  
* Optimization.  
* Deployment.

Record the referenced commit.

### **41.3 Substreams Skills**

[streamingfast/substreams-skills](https://github.com/streamingfast/substreams-skills)

Optional reference for a future streaming pipeline.

Do not implement Substreams unless it solves a demonstrated ingestion need.

---

## **42\. Reference Guide — Chainlink**

### **42.1 AI Audit Firewall**

* [Documentation](https://docs.chain.link/cre-templates/ai-audit-firewall)  
* [Source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/confidential-workflows/ai-audit-firewall)

Primary architectural reference for evaluation before execution.

Adapt the pattern to Safe402 evidence and policies rather than copying smart-contract-specific risk categories.

### **42.2 Automated Liquidation Protection**

* [Documentation](https://docs.chain.link/cre-templates/automated-liquidation-protection)  
* [Source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/confidential-workflows/automated-liquidation-protection)

Reference for private parameters and constraint enforcement.

Do not add liquidation functionality.

### **42.3 Hello Confidential Workflows**

* [Documentation](https://docs.chain.link/cre-templates/hello-confidential-workflows)  
* [Source](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/hello-confidential-workflows)

Starting point for the feasibility spike.

### **42.4 CRE core**

* [CRE documentation](https://docs.chain.link/cre)  
* [Confidential workflow templates](https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/confidential-workflows)  
* [Confidential bootcamp](https://smartcontractkit.github.io/CRE-Confidential-bootcamp/)

Use the core documentation for supported networks, report delivery, secrets, and consumer verification.

The bootcamp link was supplied as a reference but could not be retrieved during preparation of this plan. Treat it as supplementary and verify its current contents before relying on it.

---

## **43\. Reference Guide — Hedera and x402**

### **43.1 Payment overview**

[Hedera and the x402 payment standard](https://hedera.com/blog/hedera-and-the-x402-payment-standard/)

Background for the Hedera payment flow and facilitator role.

### **43.2 Code examples**

[Hedera code snippets](https://github.com/hedera-dev/hedera-code-snippets)

Reference for focused SDK operations.

### **43.3 Facilitator**

[Blocky402](https://blocky402.com/)

Use its current supported payment interfaces. Validate network and asset support in the feasibility phase.

### **43.4 Paid-service example**

[Hedera x402 inference proof of concept](https://github.com/hedera-dev/x402-inference-pay-per-request-poc)

Primary payment integration reference.

Adapt the paid resource from inference to a persistent audit job.

### **43.5 Agent integration**

[Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js)

Optional reference-agent framework and hooks/policies integration.

### **43.6 Core documentation**

[Hedera documentation](https://docs.hedera.com/)

Authority for account, topic, transaction, and network behavior.

### **43.7 Scaffold**

[scaffold-hbar](https://github.com/hedera-dev/scaffold-hbar)

Reference for setup patterns. Do not replace the existing MARS frontend merely to use this scaffold.

### **43.8 Payment protocol**

[x402 protocol repository](https://github.com/x402-foundation/x402)

Reference for protocol semantics and compatible SDKs.

Do not mix incompatible protocol versions between client, server, and facilitator.

---

## **44\. Required Documentation Files**

Before handoff, provide:

| Document | Contents |
| ----- | ----- |
| README | Product, quickstart, commands, deployment |
| Architecture | Components and data flow |
| Trust model | What is trusted and what is verified |
| Integration versions | Exact SDK versions and template commits |
| Continuity | Reused versus new work |
| API reference | Endpoints and schemas |
| CLI reference | Commands and exit codes |
| Operations | Worker recovery, refunds, revocations |
| Evaluation | Actual measured test results |
| Demo | Reproducible demonstration steps |

Include a configuration example with placeholders only.

---

## **45\. Final Acceptance Checklist**

### **Product**

* Safe402 works without the frontend.  
* CLI and MCP use the same backend logic.  
* Reference agent can request and purchase verification.  
* The gateway performs actual enforcement.

### **Security**

* Executed content matches audited content.  
* Runtime evidence is actually collected.  
* Missing coverage cannot become approval.  
* Policy changes cannot reuse incompatible authorization.  
* Reports are authenticated.  
* Expiry and revocation are enforced.  
* Submitted tools never receive service secrets.

### **Integrations**

* Real Hedera payment completes.  
* Payment is linked to one persistent audit.  
* CRE processes private parameters.  
* CRE delivery mode is accurately disclosed.  
* Consumer state changes through the verified implementation path.  
* HCS receipt matches report commitments.  
* Hosted Graph queries return live data.  
* Graph data affects an agent decision.

### **Frontend**

* Audit list exists.  
* Audit detail exists.  
* Declared-versus-observed comparison is clear.  
* Payment, provenance, and publication statuses are separate.  
* No fabricated metrics or live-status claims.

### **Submission**

* Public repository.  
* Original work disclosed.  
* Deployment references.  
* Test results.  
* Three-to-four-minute demonstration.  
* Prize requirements rechecked.

---

## **46\. Definition of Done**

Safe402 is complete for this MVP when a developer can run one documented workflow that:

1. Starts an agent task.  
2. Resolves an immutable tool.  
3. Obtains a quote.  
4. Pays on Hedera through x402.  
5. Performs actual security tests.  
6. Evaluates private policy parameters through CRE.  
7. Produces an authenticated report.  
8. Records matching provenance.  
9. Queries live history through The Graph.  
10. Refuses a forbidden tool.  
11. Executes a permitted tool under restrictions.  
12. Refuses the next invocation after its authorization is revoked.

The two-screen Next.js dashboard must make those same events easy to inspect.

**Build the executable security flow first. The CLI, MCP server, and dashboard are interfaces to that single system.**

&nbsp;