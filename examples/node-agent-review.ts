import {
  createPaymentIntent,
  createRiskReviewUrl,
  parseRiskReviewPayload,
} from "../sdk/index.js";

async function main() {
  const intent = await createPaymentIntent(
    {
      agent: "deepseek",
      token: "SOL",
      amount: 20,
      settle: "USDC",
    },
    {
      idFactory: () => "intent_sdk_review_example",
      reviewBaseUrl: "https://www.jup.sh",
    }
  );

  const reviewUrl = createRiskReviewUrl(intent, {
    reviewBaseUrl: "https://www.jup.sh",
  });
  const payload = new URL(reviewUrl).hash.replace(/^#intent=/, "");
  const parsedIntent = parseRiskReviewPayload(payload);

  console.log(
    JSON.stringify(
      {
        intentId: intent.intentId,
        decision: intent.decision,
        nextAction: intent.nextAction,
        reviewUrl,
        parsedIntentId: parsedIntent.intentId,
      },
      null,
      2
    )
  );
}

void main();
