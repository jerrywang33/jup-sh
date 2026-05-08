# jup.sh X Running Notes

This file is the temporary note pool for future X posts.

Use it for discussion points that may become public posts. After a post is
published, move the used notes into `docs/x-content.md` or delete them from this
file so the next discussion starts clean.

## Workflow

1. During product or technical discussions, capture reusable public-facing
   points here.
2. Before posting on X, turn the relevant notes into a short post or thread.
3. After posting, remove the used notes from this file.
4. Keep this file focused on future post material, not general product TODOs.

## Open Notes

### Jupiter settlement + risk management

Current high-level product grasp:

```txt
jup.sh = Jupiter-powered settlement + policy-driven risk management.
```

Simple explanation:

```txt
Jupiter helps answer: how should the payment settle?
Risk management helps answer: should this agent payment execute automatically?
```

Possible X wording:

```txt
The more I think about jup.sh, the clearer the two core pieces become:

Jupiter-powered settlement.
Policy-driven risk management.

Jupiter helps agents pay with any verified token and settle recipients in USDC.
The risk layer decides whether the payment should auto-execute, require review,
or be rejected.
```

Useful contrast:

```txt
pay.sh makes agents able to pay.
jup.sh should make agent payments safer and token-flexible.
```

Potential product flow:

```txt
agent intent
-> jup.sh policy/risk check
-> Jupiter quote/route
-> auto pay or Risk Review
-> USDC settlement
```

This point can become a product-thinking post after another round of pay.sh
learning or when the first policy classifier is implemented.

