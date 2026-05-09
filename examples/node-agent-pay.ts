import { createPaymentIntent } from "../sdk/index.js";

async function main() {
  const intent = await createPaymentIntent({
    agent: "deepseek",
    token: "SOL",
    amount: 20,
    settle: "USDC",
  });

  console.log(JSON.stringify(intent, null, 2));
}

void main();
