# CLI JSON Contract

This document defines the current agent-facing JSON contract for:

```bash
jup-sh pay --agent claude --token SOL --settle 20 USDC --json
```

The contract is intentionally small. It describes a local payment intent and
does not include private keys, signatures, swap transactions, or custody.

## Output Mode

`--json` prints only one JSON object to stdout.

Human-readable logs, warnings, and errors must not be mixed into stdout in this
mode. Command errors are printed to stderr.

## Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | The intent is inside policy and ready for local authorization. |
| `2` | The intent is valid, but policy requires Risk Review. |
| `1` | The intent is rejected or the command failed. |

Agents should treat exit code `2` as a controlled policy outcome, not a system
failure.

## Payment Intent Object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `intentId` | string | yes | Local intent identifier. Current format starts with `intent_`. |
| `agent` | string | yes | Agent name supplied by `--agent`. |
| `payToken` | string | yes | Normalized payer token symbol. |
| `recipient` | string or null | yes | Recipient address or label, if supplied. |
| `reference` | string or null | yes | External reference or memo, if supplied. |
| `settlement` | object | yes | Requested settlement amount and token. |
| `quote` | object or null | yes | Settlement quote when policy allows quoting. Rejected intents may have `null`. |
| `status` | string | yes | Intent lifecycle status. |
| `decision` | string | yes | Policy decision. |
| `nextAction` | string | yes | Next local action for an agent or user. |
| `riskLevel` | string | yes | Coarse risk level derived from policy. |
| `reasons` | string[] | yes | Human-readable reasons for review or rejection. |
| `policyChecks` | object[] | yes | Deterministic policy checks. |
| `reviewUrl` | string | yes | Hosted Risk Review URL for this intent. |
| `createdAt` | string | yes | RFC 3339 timestamp. |

### settlement

| Field | Type | Description |
| --- | --- | --- |
| `amount` | number | Requested settlement amount. |
| `token` | string | Settlement token. Phase 1 supports `USDC`. |

### quote

| Field | Type | Description |
| --- | --- | --- |
| `source` | string | Quote provider source. |
| `inputToken` | string | Token the payer would spend. |
| `inputAmount` | number | Estimated input amount. |
| `settleAmount` | number | Settlement amount. |
| `settleToken` | string | Settlement token. |
| `priceImpactBps` | number | Price impact in basis points. |

### policyChecks[]

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Stable check name. |
| `status` | string | `pass`, `review`, or `reject`. |
| `message` | string | Human-readable explanation. |

Current check names include:

- `verified_token`
- `settlement_token`
- `max_allowed_amount`
- `recipient_trust`
- `auto_pay_limit`
- `quote_available`
- `quote_settlement_token`
- `quote_price_impact`

## Enums

### status

| Value | Meaning |
| --- | --- |
| `ready_for_authorization` | Policy passed. A future phase may proceed to local authorization. |
| `review_required` | The intent is valid, but needs Risk Review before signing. |
| `rejected` | The intent should not continue. |

### decision

| Value | Meaning |
| --- | --- |
| `auto_pay` | The intent is inside policy. |
| `review_required` | The intent requires human review. |
| `rejected` | The intent is outside allowed policy. |

### nextAction

| Value | Meaning |
| --- | --- |
| `ready_for_authorization` | The next step is local authorization in a future phase. |
| `open_review` | Open the Risk Review URL. |
| `rejected` | Stop the payment flow. |

### riskLevel

| Value | Meaning |
| --- | --- |
| `low` | Policy passed. |
| `medium` | Review is required. |
| `high` | Intent is rejected. |

## Example

A review-required example is stored in:

```txt
tests/fixtures/pay-review-required.json
```

The exact `intentId`, `reviewUrl`, and `createdAt` values are runtime-specific.
