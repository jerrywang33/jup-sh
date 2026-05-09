---
title: Architecture
description: Technical architecture and design diagrams for jup.sh.
---

# Architecture

`jup.sh` is a risk and settlement layer for Solana agent payments.

The design goal is narrow: an agent can create a payment intent, but policy
decides whether that intent can continue automatically, must be reviewed by a
human, or should be rejected. Jupiter is used for token-to-USDC settlement. The
current alpha stops before signing or moving funds.

## Product Boundary

The most important boundary is between **intent creation** and **funds
authorization**.

Agents can request a payment. They do not directly control private keys, sign
transactions, or bypass policy. The user or local wallet remains the signing
boundary.

```mermaid
flowchart LR
  Agent["AI agent<br/>creates payment intent"]
  Policy["jup.sh policy layer<br/>risk + limits + route checks"]
  Decision{"decision"}
  Auto["auto-pay candidate<br/>inside policy"]
  Review["Risk Review<br/>human approval required"]
  Reject["rejected<br/>hard policy failure"]
  Wallet["local wallet / signer<br/>authorization boundary"]

  Agent --> Policy --> Decision
  Decision -->|"low risk"| Auto --> Wallet
  Decision -->|"needs context"| Review --> Wallet
  Decision -->|"unsafe / unsupported"| Reject
```

This boundary keeps the product from becoming "an agent wallet." `jup.sh`
should be a payment control layer: it receives structured intent, adds policy
and settlement context, then returns a deterministic next action.

## Layered Architecture

The system is split into five layers. The alpha currently implements the CLI,
core policy engine, quote abstraction, local intent store, and static Risk
Review rendering. The Solana transaction layer is intentionally future work.

```mermaid
flowchart TB
  subgraph Interface["Interface layer"]
    CLI["CLI<br/>source-run today"]
    SDK["SDK<br/>planned"]
    ReviewUI["Risk Review UI<br/>hosted static page"]
  end

  subgraph Core["Core payment layer"]
    Intent["intent model"]
    Policy["policy engine"]
    Quote["quote provider abstraction"]
    Result["JSON contract + exit code"]
  end

  subgraph Settlement["Settlement layer"]
    Jupiter["Jupiter API<br/>quote-only today"]
    TxRequest["Solana Pay transaction request<br/>planned"]
  end

  subgraph State["State layer"]
    LocalStore["local intent store<br/>.jup-sh/intents"]
    RemoteStore["remote persistence<br/>planned"]
  end

  subgraph Authorization["Authorization layer"]
    Wallet["local wallet / signer<br/>planned"]
    Solana["Solana network<br/>planned execution"]
  end

  CLI --> Intent
  SDK -. planned .-> Intent
  Intent --> Policy --> Quote --> Result
  Quote --> Jupiter
  Result --> LocalStore
  Result --> ReviewUI
  Result -. planned .-> TxRequest
  TxRequest -. planned .-> Wallet -. planned .-> Solana
  RemoteStore -. planned .-> ReviewUI
```

This structure lets the CLI and SDK share the same core behavior. The interface
may change, but the policy result, JSON contract, and settlement assumptions
should remain stable.

## Current Alpha Runtime Flow

The alpha flow is source-run and local. It is useful because it validates the
contract an agent would actually consume: command input, structured output,
exit codes, policy checks, and a review URL when needed.

```mermaid
sequenceDiagram
  autonumber
  participant Agent as AI agent / script
  participant CLI as jup.sh CLI
  participant Core as jup_sh_core
  participant Policy as policy engine
  participant Quote as quote provider
  participant Store as local intent store
  participant Review as Risk Review page

  Agent->>CLI: pay --agent deepseek --token SOL --amount 20 --settle USDC --json
  CLI->>Core: build PaymentIntent
  Core->>Policy: validate token, amount, settlement, recipient
  Core->>Quote: get mock or Jupiter quote
  Quote-->>Core: route estimate + price impact
  Core->>Policy: run quote-aware checks
  Policy-->>Core: auto_pay / review_required / rejected
  Core->>Store: persist intent JSON
  Core-->>CLI: structured result
  CLI-->>Agent: JSON + exit code
  CLI-->>Review: review URL when policy requires it
```

The alpha intentionally does **not** submit a swap, generate a real transaction
request, or ask a wallet to sign. That keeps the first milestone focused on the
agent contract and risk boundary.

## Policy Decision Model

Policy is not a single boolean. It should produce one of three decisions:

- `auto_pay`: intent is inside policy and can proceed to local authorization.
- `review_required`: intent is valid, but risk context requires a human.
- `rejected`: intent violates a hard rule and should not continue.

```mermaid
stateDiagram-v2
  [*] --> IntentCreated
  IntentCreated --> Rejected: unverified token<br/>unsupported settlement<br/>over max amount
  IntentCreated --> QuoteRequested: structurally valid intent
  QuoteRequested --> Rejected: quote unavailable<br/>wrong settlement token
  QuoteRequested --> ReviewRequired: untrusted recipient<br/>over auto-pay limit<br/>high price impact
  QuoteRequested --> ReadyForAuthorization: trusted recipient<br/>inside limits<br/>acceptable route
  ReadyForAuthorization --> [*]: exit 0
  ReviewRequired --> [*]: exit 2
  Rejected --> [*]: exit 1
```

This is the core product hook. `jup.sh` becomes more valuable as the policy
layer gets richer: recipient trust, route quality, token verification,
behavioral limits, and eventually business-specific rules.

## Data Model

The current data model is intentionally small. It should remain explicit,
because agents and scripts need predictable fields.

```mermaid
erDiagram
  PAYMENT_INTENT ||--|| SETTLEMENT : requests
  PAYMENT_INTENT ||--o| QUOTE : receives
  PAYMENT_INTENT ||--o{ POLICY_CHECK : evaluates
  PAYMENT_INTENT ||--o| REVIEW : exports

  PAYMENT_INTENT {
    string intentId
    string agent
    string payToken
    string recipient
    string status
    string decision
    string nextAction
    string riskLevel
    datetime createdAt
  }

  SETTLEMENT {
    float amount
    string token
  }

  QUOTE {
    string source
    string inputToken
    float inputAmount
    float settleAmount
    string settleToken
    int priceImpactBps
  }

  POLICY_CHECK {
    string name
    string status
    string message
  }

  REVIEW {
    string reviewUrl
    string exportedPayload
  }
```

The important design choice is that policy evidence is returned with the
decision. A caller should not receive only `review_required`; it should receive
the reasons and checks that made review necessary.

## Settlement Direction

Jupiter is the settlement primitive. The payer should be able to use any
verified token; the recipient should receive USDC.

Today this is quote-only. The CLI can ask Jupiter for route estimates and use
those estimates in policy checks. Future versions can use the same route
context to build a transaction request.

```mermaid
flowchart LR
  PayToken["payer token<br/>SOL / JUP / BONK / other verified token"]
  Quote["Jupiter quote<br/>route + price impact"]
  Policy["policy checks<br/>route quality + limits"]
  Tx["transaction request<br/>future"]
  Sign["local wallet approval<br/>future"]
  USDC["recipient settlement<br/>USDC"]

  PayToken --> Quote --> Policy
  Policy -->|"approved or auto-pay"| Tx --> Sign --> USDC
  Policy -->|"review / reject"| Stop["stop before signing"]
```

The settlement layer should never hide risk. Route quality, settlement token,
and price impact are policy inputs, not just execution details.

## Current Alpha Boundary

This table is deliberately strict. It keeps the project honest about what is
usable today and what is still design work.

| Area | Current alpha | Target direction |
| --- | --- | --- |
| CLI | Source-run Rust CLI | Published npm wrapper and stable CLI |
| Agent contract | JSON output and exit codes | SDK + CLI contract shared by agents |
| Policy | Deterministic local checks | Configurable policy profiles |
| Jupiter | Quote-only estimates | Transaction route construction |
| Risk Review | Static hosted page | Review workflow with durable state |
| Signing | Not implemented | Local wallet/user approval boundary |
| Settlement | Not executed | USDC settlement through Solana transaction |
| Storage | Local `.jup-sh/intents` | Optional remote persistence |

## Future End-to-End Flow

The target flow should still feel simple from the agent side. Complexity belongs
inside `jup.sh`: policy, risk evidence, route checks, review fallback, and
transaction request construction.

```mermaid
flowchart LR
  A["1. agent calls<br/>pay --agent deepseek ..."]
  B["2. jup.sh builds<br/>payment intent"]
  C["3. policy evaluates<br/>risk + route"]
  D{"4. decision"}
  E["5a. auto-pay candidate"]
  F["5b. Risk Review"]
  G["6. Jupiter route<br/>token -> USDC"]
  H["7. Solana Pay<br/>transaction request"]
  I["8. local wallet<br/>signs"]
  J["9. recipient<br/>gets USDC"]

  A --> B --> C --> D
  D -->|"inside policy"| E --> G
  D -->|"review required"| F --> G
  D -->|"rejected"| R["stop"]
  G --> H --> I --> J
```

The product should stay command-first. UI exists to review risk and explain
policy decisions, not to become another manual payment dashboard.

## Engineering Principles

- Keep the agent interface boring: stable commands, stable JSON, stable exit
  codes.
- Keep signing local: agents create intents; users or local policy authorize
  funds.
- Treat policy output as product surface: every review decision needs evidence.
- Treat Jupiter route data as risk context, not only settlement plumbing.
- Ship in phases: quote-only contract first, then transaction request, then
  carefully scoped execution.
