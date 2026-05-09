export type PolicyCheckStatus = "pass" | "review" | "reject";
export type Decision = "auto_pay" | "review_required" | "rejected";
export type IntentStatus = "ready_for_authorization" | "review_required" | "rejected";
export type NextAction = "ready_for_authorization" | "open_review" | "rejected";
export type RiskLevel = "low" | "medium" | "high";

export type Policy = {
  maxAutoSettleUSDC: number;
  maxAllowedSettleUSDC: number;
  maxPriceImpactBps: number;
  reviewHighPriceImpact: boolean;
  verifiedTokens: string[];
  trustedRecipients: string[];
  reviewUnknownRecipients: boolean;
};

export type CreatePaymentIntentInput = {
  agent: string;
  token: string;
  amount: number;
  settle: string;
  recipient?: string;
  reference?: string;
};

export type NormalizedPaymentIntentInput = {
  agent: string;
  payToken: string;
  settleAmount: number;
  settleToken: string;
  recipient: string | null;
  reference: string | null;
};

export type Settlement = {
  amount: number;
  token: string;
};

export type SettlementQuote = {
  source: string;
  inputToken: string;
  inputAmount: number;
  settleAmount: number;
  settleToken: string;
  priceImpactBps: number;
};

export type PolicyCheck = {
  name: string;
  status: PolicyCheckStatus;
  message: string;
};

export type PolicyResult = {
  decision: Decision;
  nextAction: NextAction;
  riskLevel: RiskLevel;
  reasons: string[];
  checks: PolicyCheck[];
};

export type PaymentIntent = {
  intentId: string;
  agent: string;
  payToken: string;
  recipient: string | null;
  reference: string | null;
  settlement: Settlement;
  quote: SettlementQuote | null;
  status: IntentStatus;
  decision: Decision;
  nextAction: NextAction;
  riskLevel: RiskLevel;
  reasons: string[];
  policyChecks: PolicyCheck[];
  reviewUrl: string;
  createdAt: string;
};

export type SettlementQuoter = {
  quoteSettlement(input: NormalizedPaymentIntentInput): Promise<SettlementQuote> | SettlementQuote;
};

export type CreatePaymentIntentOptions = {
  policy?: Partial<Policy>;
  quoteProvider?: SettlementQuoter;
  reviewBaseUrl?: string;
  now?: () => Date;
  idFactory?: () => string;
};

export const DEFAULT_POLICY: Policy = {
  maxAutoSettleUSDC: 5,
  maxAllowedSettleUSDC: 100,
  maxPriceImpactBps: 100,
  reviewHighPriceImpact: true,
  verifiedTokens: ["USDC", "SOL", "JUP", "BONK"],
  trustedRecipients: [],
  reviewUnknownRecipients: true,
};

const MOCK_PRICES_USDC: Record<string, number> = {
  USDC: 1,
  SOL: 150,
  JUP: 1.2,
  BONK: 0.00002,
};

export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
  options: CreatePaymentIntentOptions = {}
): Promise<PaymentIntent> {
  const policy = normalizePolicy(options.policy);
  const normalized = normalizeInput(input);
  const prePolicy = evaluatePolicy(normalized, policy);
  const quoteProvider = options.quoteProvider ?? mockSettlementQuoter;

  const [quote, policyResult] =
    prePolicy.decision === "rejected"
      ? [null, prePolicy]
      : await quoteAndEvaluate(normalized, policy, prePolicy, quoteProvider);

  const intentId = options.idFactory?.() ?? createIntentId();
  const reviewBaseUrl = (options.reviewBaseUrl ?? "https://jup.sh").replace(/\/+$/, "");
  const createdAt = (options.now?.() ?? new Date()).toISOString();

  return {
    intentId,
    agent: normalized.agent,
    payToken: normalized.payToken,
    recipient: normalized.recipient,
    reference: normalized.reference,
    settlement: {
      amount: normalized.settleAmount,
      token: normalized.settleToken,
    },
    quote,
    status: intentStatusForDecision(policyResult.decision),
    decision: policyResult.decision,
    nextAction: policyResult.nextAction,
    riskLevel: policyResult.riskLevel,
    reasons: policyResult.reasons,
    policyChecks: policyResult.checks,
    reviewUrl: `${reviewBaseUrl}/pay/${intentId}`,
    createdAt,
  };
}

export function evaluatePolicy(input: NormalizedPaymentIntentInput, policy: Policy): PolicyResult {
  const verifiedTokens = new Set(policy.verifiedTokens.map(normalizeToken));
  const trustedRecipients = new Set(policy.trustedRecipients);
  const checks: PolicyCheck[] = [];

  checks.push(
    verifiedTokens.has(input.payToken)
      ? policyCheck("verified_token", "pass", `${input.payToken} is verified`)
      : policyCheck("verified_token", "reject", `${input.payToken} is not a verified token`)
  );

  checks.push(
    input.settleToken === "USDC"
      ? policyCheck("settlement_token", "pass", "USDC settlement is supported")
      : policyCheck("settlement_token", "reject", "only USDC settlement is supported in Phase 1")
  );

  checks.push(
    input.settleAmount <= policy.maxAllowedSettleUSDC
      ? policyCheck(
          "max_allowed_amount",
          "pass",
          `${trimNumber(input.settleAmount)} USDC is within the max allowed limit`
        )
      : policyCheck(
          "max_allowed_amount",
          "reject",
          `settlement amount exceeds ${trimNumber(policy.maxAllowedSettleUSDC)} USDC`
        )
  );

  checks.push(
    !policy.reviewUnknownRecipients
      ? policyCheck("recipient_trust", "pass", "unknown recipients do not require review")
      : input.recipient && trustedRecipients.has(input.recipient)
        ? policyCheck("recipient_trust", "pass", "recipient is trusted")
        : policyCheck("recipient_trust", "review", "recipient is not trusted")
  );

  checks.push(
    input.settleAmount <= policy.maxAutoSettleUSDC
      ? policyCheck(
          "auto_pay_limit",
          "pass",
          `${trimNumber(input.settleAmount)} USDC is within the auto-pay limit`
        )
      : policyCheck(
          "auto_pay_limit",
          "review",
          `settlement amount exceeds auto-pay limit of ${trimNumber(policy.maxAutoSettleUSDC)} USDC`
        )
  );

  return policyResultFromChecks(checks);
}

export const mockSettlementQuoter: SettlementQuoter = {
  quoteSettlement: createMockSettlementQuote,
};

export function createMockSettlementQuote(input: NormalizedPaymentIntentInput): SettlementQuote {
  const price = MOCK_PRICES_USDC[input.payToken];

  if (!price || price <= 0) {
    throw new Error(`no mock quote price for token ${input.payToken}`);
  }

  return {
    source: "mock_jupiter",
    inputToken: input.payToken,
    inputAmount: round(input.settleAmount / price, 9),
    settleAmount: input.settleAmount,
    settleToken: input.settleToken,
    priceImpactBps: 12,
  };
}

export function evaluateQuotePolicy(quote: SettlementQuote, policy: Policy): PolicyCheck[] {
  return [
    policyCheck("quote_available", "pass", `${quote.source} quote is available`),
    quote.settleToken === "USDC"
      ? policyCheck("quote_settlement_token", "pass", "quote settles to USDC")
      : policyCheck("quote_settlement_token", "reject", "quote does not settle to USDC"),
    quote.priceImpactBps <= policy.maxPriceImpactBps
      ? policyCheck(
          "quote_price_impact",
          "pass",
          `quote price impact is ${quote.priceImpactBps} bps, within the ${policy.maxPriceImpactBps} bps policy limit`
        )
      : policyCheck(
          "quote_price_impact",
          policy.reviewHighPriceImpact ? "review" : "pass",
          `quote price impact is ${quote.priceImpactBps} bps, above the ${policy.maxPriceImpactBps} bps policy limit`
        ),
  ];
}

async function quoteAndEvaluate(
  input: NormalizedPaymentIntentInput,
  policy: Policy,
  prePolicy: PolicyResult,
  quoteProvider: SettlementQuoter
): Promise<[SettlementQuote, PolicyResult]> {
  const quote = await quoteProvider.quoteSettlement(input);
  const checks = [...prePolicy.checks, ...evaluateQuotePolicy(quote, policy)];
  return [quote, policyResultFromChecks(checks)];
}

function normalizeInput(input: CreatePaymentIntentInput): NormalizedPaymentIntentInput {
  const agent = requiredString(input.agent, "agent");
  const payToken = normalizeToken(input.token);
  const settleToken = normalizeToken(input.settle);
  const settleAmount = positiveAmount(input.amount, "amount");

  return {
    agent,
    payToken,
    settleAmount,
    settleToken,
    recipient: input.recipient ?? null,
    reference: input.reference ?? null,
  };
}

function normalizePolicy(policy?: Partial<Policy>): Policy {
  return {
    ...DEFAULT_POLICY,
    ...policy,
    verifiedTokens: policy?.verifiedTokens ?? DEFAULT_POLICY.verifiedTokens,
    trustedRecipients: policy?.trustedRecipients ?? DEFAULT_POLICY.trustedRecipients,
  };
}

function policyResultFromChecks(checks: PolicyCheck[]): PolicyResult {
  const reasons = checks
    .filter((check) => check.status === "review" || check.status === "reject")
    .map((check) => check.message);

  if (checks.some((check) => check.status === "reject")) {
    return {
      decision: "rejected",
      nextAction: "rejected",
      riskLevel: "high",
      reasons,
      checks,
    };
  }

  if (checks.some((check) => check.status === "review")) {
    return {
      decision: "review_required",
      nextAction: "open_review",
      riskLevel: "medium",
      reasons,
      checks,
    };
  }

  return {
    decision: "auto_pay",
    nextAction: "ready_for_authorization",
    riskLevel: "low",
    reasons,
    checks,
  };
}

function intentStatusForDecision(decision: Decision): IntentStatus {
  if (decision === "auto_pay") return "ready_for_authorization";
  if (decision === "review_required") return "review_required";
  return "rejected";
}

function policyCheck(name: string, status: PolicyCheckStatus, message: string): PolicyCheck {
  return { name, status, message };
}

function normalizeToken(token: string): string {
  return requiredString(token, "token").toUpperCase();
}

function requiredString(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  return trimmed;
}

function positiveAmount(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }

  return value;
}

function createIntentId(): string {
  return `intent_${crypto.randomUUID().replaceAll("-", "")}`;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
