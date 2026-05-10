import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const outDir = mkdtempSync(join(tmpdir(), "jup-sh-sdk-smoke-"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }

  return result.stdout;
}

try {
  run("npx", ["tsc", "--outDir", outDir, "--noEmit", "false", "--declaration", "false"]);
  const stdout = run("node", [join(outDir, "examples/node-agent-pay.js")]);
  const intent = JSON.parse(stdout);

  if (intent.agent !== "deepseek") throw new Error(`unexpected agent: ${intent.agent}`);
  if (intent.payToken !== "SOL") throw new Error(`unexpected payToken: ${intent.payToken}`);
  if (intent.settlement?.amount !== 20) throw new Error("unexpected settlement amount");
  if (intent.settlement?.token !== "USDC") throw new Error("unexpected settlement token");
  if (intent.decision !== "review_required") {
    throw new Error(`unexpected decision: ${intent.decision}`);
  }
  if (intent.nextAction !== "open_review") {
    throw new Error(`unexpected nextAction: ${intent.nextAction}`);
  }

  const reviewStdout = run("node", [join(outDir, "examples/node-agent-review.js")]);
  const review = JSON.parse(reviewStdout);
  if (review.intentId !== "intent_sdk_review_example") {
    throw new Error(`unexpected review intentId: ${review.intentId}`);
  }
  if (review.parsedIntentId !== review.intentId) {
    throw new Error("Risk Review payload did not round-trip to the same intent");
  }
  if (!review.reviewUrl.startsWith("https://www.jup.sh/pay/intent_sdk_review_example#intent=")) {
    throw new Error(`unexpected review URL: ${review.reviewUrl}`);
  }

  const jupiterCheck = run("node", [
    "--input-type=module",
    "--eval",
    `
      import { createJupiterQuoteProvider, createPaymentIntent } from "${join(outDir, "sdk/index.js")}";

      let capturedUrl;
      let capturedHeaders;
      const quoteProvider = createJupiterQuoteProvider({
        apiKey: "test-api-key",
        fetch: async (url, init) => {
          capturedUrl = new URL(String(url));
          capturedHeaders = init?.headers ?? {};
          return {
            ok: true,
            status: 200,
            statusText: "OK",
            async json() {
              return {
                inAmount: "133333333",
                outAmount: "20000000",
                inputMint: "So11111111111111111111111111111111111111112",
                outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                priceImpactPct: "0.0012"
              };
            }
          };
        }
      });

      const quoted = await createPaymentIntent(
        { agent: "deepseek", token: "SOL", amount: 20, settle: "USDC" },
        { quoteProvider, idFactory: () => "intent_sdk_jupiter_test" }
      );

      if (capturedUrl.searchParams.get("swapMode") !== "ExactOut") throw new Error("missing ExactOut");
      if (capturedUrl.searchParams.get("amount") !== "20000000") throw new Error("wrong raw amount");
      if (capturedHeaders["x-api-key"] !== "test-api-key") throw new Error("missing API key header");
      if (quoted.quote?.source !== "jupiter_swap_exact_out") throw new Error("wrong quote source");
      if (quoted.quote?.inputAmount !== 0.133333333) throw new Error("wrong input amount");
      if (quoted.quote?.priceImpactBps !== 12) throw new Error("wrong price impact");

      console.log("sdk jupiter smoke: ok");
    `,
  ]);
  process.stdout.write(jupiterCheck);

  console.log("sdk smoke: ok");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
