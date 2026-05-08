# Jupiter Quote-Only Design

This phase moves jup.sh from mock settlement quotes to optional real Jupiter
quotes without signing or executing payments.

## Goal

The product command stays settlement-first:

```bash
jup-sh pay --agent claude --token SOL --settle 20 USDC
```

With Jupiter enabled:

```bash
jup-sh pay \
  --agent claude \
  --token SOL \
  --settle 20 USDC \
  --quote-provider jupiter
```

The CLI asks Jupiter for the estimated input amount needed to settle the target
USDC amount. It still only creates a local payment intent.

## Current Boundary

The core crate already owns the quote boundary:

```rust
pub trait SettlementQuoter {
    fn quote_settlement(
        &self,
        input: &CreatePaymentIntentInput,
    ) -> Result<SettlementQuote, JupShError>;
}
```

Implemented providers:

| Provider | Source | Purpose |
| --- | --- | --- |
| `mock` | `MockSettlementQuoter` | Stable local development and tests. |
| `jupiter` | `JupiterSettlementQuoter` | Quote-only real settlement estimate. |

## Jupiter Request

Phase 1 uses Jupiter's quote API with `swapMode=ExactOut` because jup.sh's
product promise is recipient settlement in USDC.

Request shape:

```txt
GET https://api.jup.ag/swap/v1/quote
  ?inputMint=<payer token mint>
  &outputMint=<USDC mint>
  &amount=<USDC raw amount>
  &slippageBps=50
  &swapMode=ExactOut
```

`JUPITER_API_KEY` is sent as `x-api-key` when configured. The CLI also accepts:

```bash
--jupiter-api-key <key>
--jupiter-quote-url <url>
--slippage-bps 50
```

## Token Map

The first quote-only implementation intentionally uses a small token map:

| Symbol | Mint | Decimals |
| --- | --- | --- |
| SOL | `So11111111111111111111111111111111111111112` | 9 |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` | 6 |
| BONK | `DezXAZ8z7PnrnRJjz3my2u6r5KiL3HR8APpPB2634B2` | 5 |

Later phases should replace this with a verified token registry.

## Returned Intent Quote

The returned `PaymentIntent.quote` keeps the existing product shape:

```json
{
  "source": "jupiter_swap_exact_out",
  "inputToken": "SOL",
  "inputAmount": 0.225525465,
  "settleAmount": 20,
  "settleToken": "USDC",
  "priceImpactBps": 0
}
```

## Non-Goals

This phase does not:

- sign transactions
- execute swaps
- create Solana Pay transaction requests
- custody funds
- support arbitrary token discovery
- replace the default mock provider

## Next Steps

1. Add route quality and liquidity policy checks.
2. Store quote metadata needed by Risk Review.
3. Add verified token registry support.
4. Generate Solana Pay transaction requests after quote behavior is stable.

References:

- Jupiter Swap quote API: https://developers.jup.ag/docs/api-reference/swap/quote
- Jupiter Swap guide: https://developers.jup.ag/docs/swap/get-quote
