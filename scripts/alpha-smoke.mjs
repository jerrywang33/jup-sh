import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "jup-sh-alpha-smoke-"));
const store = join(root, "intents");
const configPath = join(root, "jup.config.json");
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

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertNullableString(value, label) {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
}

function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} must be one of ${allowed.join(", ")}; got ${value}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertPolicyChecks(checks) {
  assertArray(checks, "policyChecks");
  if (checks.length === 0) {
    throw new Error("policyChecks must not be empty");
  }

  for (const [index, check] of checks.entries()) {
    assertObject(check, `policyChecks[${index}]`);
    assertString(check.name, `policyChecks[${index}].name`);
    assertEnum(check.status, ["pass", "review", "reject"], `policyChecks[${index}].status`);
    assertString(check.message, `policyChecks[${index}].message`);
  }
}

function assertQuote(quote, label) {
  if (quote === null) {
    return;
  }

  assertObject(quote, label);
  assertString(quote.source, `${label}.source`);
  assertString(quote.inputToken, `${label}.inputToken`);
  assertNumber(quote.inputAmount, `${label}.inputAmount`);
  assertNumber(quote.settleAmount, `${label}.settleAmount`);
  assertString(quote.settleToken, `${label}.settleToken`);
  assertNumber(quote.priceImpactBps, `${label}.priceImpactBps`);
}

function assertPayIntentContract(intent, expected) {
  assertObject(intent, "pay intent");
  assertString(intent.intentId, "intentId");
  if (!intent.intentId.startsWith("intent_")) {
    throw new Error(`intentId must start with intent_; got ${intent.intentId}`);
  }

  assertString(intent.agent, "agent");
  assertString(intent.payToken, "payToken");
  assertNullableString(intent.recipient, "recipient");
  assertNullableString(intent.reference, "reference");

  assertObject(intent.settlement, "settlement");
  assertNumber(intent.settlement.amount, "settlement.amount");
  assertString(intent.settlement.token, "settlement.token");

  assertQuote(intent.quote, "quote");
  assertEnum(
    intent.status,
    ["ready_for_authorization", "review_required", "rejected"],
    "status"
  );
  assertEnum(intent.decision, ["auto_pay", "review_required", "rejected"], "decision");
  assertEnum(
    intent.nextAction,
    ["ready_for_authorization", "open_review", "rejected"],
    "nextAction"
  );
  assertEnum(intent.riskLevel, ["low", "medium", "high"], "riskLevel");
  assertArray(intent.reasons, "reasons");
  for (const [index, reason] of intent.reasons.entries()) {
    assertString(reason, `reasons[${index}]`);
  }
  assertPolicyChecks(intent.policyChecks);
  assertString(intent.reviewUrl, "reviewUrl");
  assertString(intent.createdAt, "createdAt");

  for (const [field, value] of Object.entries(expected)) {
    if (intent[field] !== value) {
      throw new Error(`${field} expected ${value}; got ${intent[field]}`);
    }
  }
}

function assertPolicyCheckNames(intent, names) {
  const present = new Set(intent.policyChecks.map((check) => check.name));
  const missing = names.filter((name) => !present.has(name));
  if (missing.length > 0) {
    throw new Error(`missing policy checks: ${missing.join(", ")}`);
  }
}

try {
  console.log("alpha smoke: init");
  const init = JSON.parse(
    run(["init", "--config", configPath, "--policy", policyPath, "--json"])
  );
  if (init.configPath !== configPath || init.policyPath !== policyPath) {
    throw new Error("init did not return expected config and policy paths");
  }

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
      "deepseek",
      "--token",
      "SOL",
      "--amount",
      "2",
      "--settle",
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
  assertPayIntentContract(approved, {
    agent: "deepseek",
    payToken: "SOL",
    status: "ready_for_authorization",
    decision: "auto_pay",
    nextAction: "ready_for_authorization",
    riskLevel: "low",
  });

  console.log("alpha smoke: pay json review");
  const pay = run(
    [
      "pay",
      "--agent",
      "deepseek",
      "--token",
      "SOL",
      "--amount",
      "20",
      "--settle",
      "USDC",
      "--store",
      store,
      "--json",
    ],
    2
  );
  const intent = JSON.parse(pay);
  assertPayIntentContract(intent, {
    agent: "deepseek",
    payToken: "SOL",
    status: "review_required",
    decision: "review_required",
    nextAction: "open_review",
    riskLevel: "medium",
  });
  assertPolicyCheckNames(intent, [
    "verified_token",
    "settlement_token",
    "max_allowed_amount",
    "recipient_trust",
    "auto_pay_limit",
    "quote_available",
    "quote_settlement_token",
    "quote_price_impact",
  ]);
  const intentId = intent.intentId;

  console.log("alpha smoke: pay json reject");
  const rejected = JSON.parse(
    run(
      [
        "pay",
        "--agent",
        "deepseek",
        "--token",
        "FAKE",
        "--amount",
        "20",
        "--settle",
        "USDC",
        "--store",
        store,
        "--json",
      ],
      1
    )
  );
  assertPayIntentContract(rejected, {
    agent: "deepseek",
    payToken: "FAKE",
    status: "rejected",
    decision: "rejected",
    nextAction: "rejected",
    riskLevel: "high",
  });

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
