# Integration Versions and Live References

Exact SDK versions, template commits, network identifiers, and every live partner reference. Updated as soon as a reference exists. Placeholders are marked `pending`.

Local toolchain: Node 24.10.0, pnpm 10.26.2, Docker 28.5.1 (Docker Desktop, aarch64, cgroup v2), Foundry 1.5.1-stable at `~/.foundry/bin`.

## Hedera and x402 (verified 2026-09-13)

| Item | Value |
|---|---|
| Network | Hedera Testnet, CAIP-2 `hedera:testnet` |
| Facilitator | Blocky402 `https://api.testnet.blocky402.com` (v1.0.0), fee payer `0.0.7162784` |
| x402 protocol | version 2, scheme `exact` |
| Asset | native HBAR, asset id `0.0.0`, integer tinybar amounts (1 HBAR = 100,000,000) |
| Mirror node | `https://testnet.mirrornode.hedera.com` |
| Operator account (HCS) | `0.0.10522836` (ECDSA secp256k1) |
| Payer account (x402 client) | `0.0.10523315` (ECDSA secp256k1) |
| Recipient account (`payTo`) | `0.0.10523257` |
| HCS service topic | pending (Phase 4) |
| HCS receipt topic | pending (Phase 4) |

Packages (pin exactly):

```
@x402/core@2.25.0
@x402/express@2.25.0
@x402/fetch@2.25.0
@x402/hedera@2.25.0
@hiero-ledger/sdk@2.85.0
express@4.22.2
```

Reference implementation: `hedera-dev/x402-inference-pay-per-request-poc` (uses `@x402/*@^2.18.0`, `@hiero-ledger/sdk@^2.85.0`).

Spike settlements (1 tinybar each, throwaway server and client, not the product):

| Run | Transaction ID | Consensus timestamp | HashScan |
|---|---|---|---|
| 1 | `0.0.7162784-1789310764-859459760` | `1789310771.868350104` | https://hashscan.io/testnet/transaction/0.0.7162784-1789310764-859459760 |
| 2 | `0.0.7162784-1789310805-418056060` | `1789310814.488111518` | https://hashscan.io/testnet/transaction/0.0.7162784-1789310805-418056060 |

Facilitator endpoints: `GET /supported`, `GET /health`, `POST /verify`, `POST /settle` at the root. No API key. No OpenAPI spec.

## Chainlink CRE (probed 2026-09-13, simulator blocked on login)

| Item | Value |
|---|---|
| CRE CLI | v1.33.0 (`github.com/smartcontractkit/cre-cli/releases/download/v1.33.0/cre_darwin_arm64.zip`) |
| SDK | `@chainlink/cre-sdk@1.18.0` (templates pin), 1.21.0 current; Bun 1.3.5; viem 2.34.0; zod 3.25.76 |
| Templates | `smartcontractkit/cre-templates` commit `d0223f31182c76bc36b1cc9d47b13b18efcf2bf6` |
| Primary references | `hello-confidential-workflows-ts`, `confidential-workflows/ai-audit-firewall-ts` |
| Chain name in CRE config | `ethereum-testnet-sepolia` |
| Mock forwarder (simulation) | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` |
| Production KeystoneForwarder | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| TEE | AWS Nitro, `us-west-2` (only registered TEE) |
| Confidential Workflows access | private beta, invite-only; simulation needs only a CRE account |
| Local build evidence | `cre workflow build` → WASM, binary hash `dbf9129b9ae24cc95bed3618162b256d298bdc9fe66653c2bbdc4ea5f7dc7ffe` |
| Simulator run | pending `cre login` |

## EVM testnet (authorization registry and CRE delivery)

| Item | Value |
|---|---|
| Chain | Ethereum Sepolia, chain id `11155111` |
| RPC | `https://ethereum-sepolia-rpc.publicnode.com` (verified `eth_chainId` and block height) |
| Deployer | pending (needs a funded Sepolia key) |
| `Safe402AuthorizationRegistry` | pending (Phase 4) |
| CRE forwarder / receiver | pending |

## The Graph (verified 2026-09-13)

| Item | Value |
|---|---|
| Network slug | `sepolia` (`eip155:11155111`) |
| CLI | `@graphprotocol/graph-cli@0.98.1`, `@graphprotocol/graph-ts@0.38.2` |
| Deploy target | Subgraph Studio `https://api.studio.thegraph.com/deploy/` |
| Dev query endpoint shape | `https://api.studio.thegraph.com/query/<id>/<slug>/<version>` (no key, 3,000 queries/day) |
| Gateway endpoint shape | `https://gateway.thegraph.com/api/<api-key>/subgraphs/id/<id>` (needs query API key) |
| Subgraph MCP | `https://subgraphs.mcp.thegraph.com/sse` via `mcp-remote`, Bearer gateway API key |
| Subgraph deployment | pending (Phase 4, after registry deployment) |
| `graphprotocol/subgraphs-skills` | commit `7b3499af5018d19c55daabf8272aaa265df928b3` |

Note: `subgraph.yaml` contract addresses must be lowercase; mixed-case checksummed addresses fail manifest validation in graph-cli 0.98.1.

## Runner (verified 2026-09-13)

Base image `node:22-alpine`. Isolation flags proven: `--network none --read-only --tmpfs /tmp --memory 1g --pids-limit 64 --cap-drop ALL --security-opt no-new-privileges --user 65534:65534`. Host env vars, Docker socket, root filesystem writes, and outbound TCP were all unavailable inside the container. Deadline enforcement must come from the host (`docker kill`); BusyBox `timeout` inside Alpine did not terminate the process.
