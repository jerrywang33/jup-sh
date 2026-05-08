# jup.sh X Content Notes

## Current Public Narrative

Use a personal, lightweight tone. The story should sound like a builder sharing
an early side project, not a company launch.

Recommended intro post:

```txt
A bit about me:

I’m a software engineer, currently serving as Chief Technology Officer for the
euro stablecoin project at a well-known internet company, working on EU
compliance under EMI / EMT licensing.

My master’s research was in distributed computing, and I’ve spent most of my
career building related systems at internet companies.

So my comfort zone is probably somewhere around stablecoin payments,
compliance/risk, and blockchain infra.

I’m also a heavy Solana DeFi user, especially Jupiter and Meteora.

Yesterday I saw Solana’s pay.sh, got inspired, registered jup.sh, and started
building a small side project in my spare time.

First version is live:
https://www.jup.sh

It’s still rough and not fully ready, but I think Solana DeFi + AI + payments is
a pretty interesting direction.

The current idea:

A Jupiter-powered risk and settlement layer for Solana agent payments.

Agents pay with any verified token.
Recipients settle in USDC.
Policy decides when humans step in.

To avoid confusion, I’ll make it clear on the site that jup.sh is an independent
community-built tool and not affiliated with Jupiter.

Still early, but I’ll keep exploring and share thoughts and progress here on X.
```

## Positioning Rules

- Keep `jup.sh` clearly independent from Jupiter.
- Say `Jupiter-powered` only in the sense of using Jupiter API/routing.
- Avoid implying partnership, endorsement, acquisition, or official status.
- Present the product as early and exploratory.
- Keep the core thesis consistent:

```txt
Risk and settlement for Solana agent payments.
Agents pay with any verified token. Recipients settle in USDC. Policy decides
when humans step in.
```

## Content Pillars

1. Builder log

Share concrete progress: homepage changes, Risk Review, policy logic, CLI/API
experiments, GitHub release, Jupiter API integration, Solana Pay transaction
request work.

2. Product thinking

Explain why agent payments need policy, risk limits, known recipients, route
quality checks, and optional human review.

3. Solana DeFi learning

Discuss Jupiter, Meteora, Solana Pay, pay.sh, liquidity, verified tokens, and
USDC settlement from a builder/user perspective.

4. Stablecoin and compliance perspective

Connect stablecoin payments, compliance/risk controls, and blockchain
infrastructure without sounding like legal advice.

## Posting Rhythm

- 2-3 lightweight posts per week while building.
- 1 deeper thread when a real milestone ships.
- Use screenshots or short demo clips when possible.
- Keep each post tied to one idea.
- Prefer honest notes over polished announcements.

## Running Notes Workflow

Use `docs/x-running-notes.md` as the temporary pool for future post material.

When a point from discussion may become a post, add it there. After the post is
published, remove the used note or move it into this file as archived context.

## Suggested Near-Term Posts

1. Launch note: personal background, why jup.sh exists, first version live.
2. Product note: why `Connect wallet` was removed from Risk Review.
3. Design note: default Auto Pay, Risk Review only when policy flags.
4. Technical note: first policy schema for agent payments.
5. Research note: what pay.sh taught us about agent-native payments.
6. Integration note: how Jupiter API can turn any verified token into USDC
   settlement.
7. Roadmap note: CLI/API first, public GitHub when there is something useful to
   run.

## Voice

- Builder, not marketer.
- Curious, not definitive.
- Specific, not grand.
- Clear disclaimers, but not defensive.
