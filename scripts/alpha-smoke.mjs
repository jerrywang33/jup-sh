import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "jup-sh-alpha-smoke-"));
const store = join(root, "intents");
const policyPath = join(root, "jup.policy.json");

function run(args, expectedStatus = 0) {
  const result = spawnSync("node", ["npm/bin/jup-sh", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== expectedStatus) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(
      `unexpected exit ${result.status}; expected ${expectedStatus}: jup-sh ${args.join(" ")}`
    );
  }

  return result.stdout;
}

try {
  console.log("alpha smoke: policy show");
  const policy = run(["policy", "show"]);
  if (!policy.includes("jup.sh policy")) {
    throw new Error("policy show did not print policy output");
  }

  writeFileSync(
    policyPath,
    JSON.stringify(
      {
        maxAutoSettleUSDC: 5,
        maxAllowedSettleUSDC: 100,
        maxPriceImpactBps: 100,
        reviewHighPriceImpact: true,
        verifiedTokens: ["USDC", "SOL", "JUP", "BONK"],
        trustedRecipients: ["jup-sh-demo"],
        reviewUnknownRecipients: true,
      },
      null,
      2
    )
  );

  console.log("alpha smoke: pay json auto");
  const approved = JSON.parse(
    run([
      "pay",
      "--agent",
      "claude",
      "--token",
      "SOL",
      "--settle",
      "2",
      "USDC",
      "--recipient",
      "jup-sh-demo",
      "--policy",
      policyPath,
      "--store",
      store,
      "--json",
    ])
  );
  if (approved.decision !== "auto_pay" || approved.nextAction !== "ready_for_authorization") {
    throw new Error("auto pay json did not return the authorization contract");
  }

  console.log("alpha smoke: pay json review");
  const pay = run(
    [
      "pay",
      "--agent",
      "claude",
      "--token",
      "SOL",
      "--settle",
      "20",
      "USDC",
      "--store",
      store,
      "--json",
    ],
    2
  );
  const intent = JSON.parse(pay);
  if (!intent.intentId?.startsWith("intent_")) {
    throw new Error("pay json did not include an intent id");
  }
  if (intent.decision !== "review_required") {
    throw new Error(`pay json returned unexpected decision: ${intent.decision}`);
  }
  if (intent.nextAction !== "open_review") {
    throw new Error(`pay json returned unexpected nextAction: ${intent.nextAction}`);
  }
  const intentId = intent.intentId;

  console.log("alpha smoke: pay json reject");
  const rejected = JSON.parse(
    run(
      [
        "pay",
        "--agent",
        "claude",
        "--token",
        "FAKE",
        "--settle",
        "20",
        "USDC",
        "--store",
        store,
        "--json",
      ],
      1
    )
  );
  if (rejected.decision !== "rejected" || rejected.nextAction !== "rejected") {
    throw new Error("rejected pay json did not return the rejected contract");
  }

  console.log("alpha smoke: intent list");
  const list = JSON.parse(run(["intent", "list", "--store", store, "--json"]));
  if (!list.some((item) => item.intentId === intentId)) {
    throw new Error("intent list did not include the created intent");
  }

  console.log("alpha smoke: intent export");
  const payload = run(["intent", "export", intentId, "--store", store, "--payload-only"]).trim();
  if (payload.length < 100) {
    throw new Error("intent export payload is unexpectedly short");
  }

  console.log(`alpha smoke: ok (${intentId})`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
