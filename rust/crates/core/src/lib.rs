use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum JupShError {
    #[error("{0} is required")]
    MissingField(&'static str),
    #[error("{0} must be a positive number")]
    InvalidAmount(&'static str),
    #[error("phase 1 only supports USDC settlement")]
    UnsupportedSettlementToken,
    #[error("no mock quote price for token {0}")]
    MissingMockPrice(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Policy {
    #[serde(rename = "maxAutoSettleUSDC")]
    pub max_auto_settle_usdc: f64,
    #[serde(rename = "maxAllowedSettleUSDC")]
    pub max_allowed_settle_usdc: f64,
    pub verified_tokens: Vec<String>,
    pub trusted_recipients: Vec<String>,
    pub review_unknown_recipients: bool,
}

impl Default for Policy {
    fn default() -> Self {
        Self {
            max_auto_settle_usdc: 5.0,
            max_allowed_settle_usdc: 100.0,
            verified_tokens: vec![
                "USDC".to_string(),
                "SOL".to_string(),
                "JUP".to_string(),
                "BONK".to_string(),
            ],
            trusted_recipients: Vec::new(),
            review_unknown_recipients: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Decision {
    AutoPay,
    ReviewRequired,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NextAction {
    ReadyForAuthorization,
    OpenReview,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IntentStatus {
    ReadyForAuthorization,
    ReviewRequired,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PolicyCheckStatus {
    Pass,
    Review,
    Reject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyCheck {
    pub name: String,
    pub status: PolicyCheckStatus,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePaymentIntentInput {
    pub agent: String,
    pub pay_token: String,
    pub settle_amount: f64,
    pub settle_token: String,
    pub recipient: Option<String>,
    pub reference: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settlement {
    pub amount: f64,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettlementQuote {
    pub source: String,
    pub input_token: String,
    pub input_amount: f64,
    pub settle_amount: f64,
    pub settle_token: String,
    pub price_impact_bps: u16,
}

pub trait SettlementQuoter {
    fn quote_settlement(
        &self,
        input: &CreatePaymentIntentInput,
    ) -> Result<SettlementQuote, JupShError>;
}

#[derive(Debug, Clone, Default)]
pub struct MockSettlementQuoter;

impl SettlementQuoter for MockSettlementQuoter {
    fn quote_settlement(
        &self,
        input: &CreatePaymentIntentInput,
    ) -> Result<SettlementQuote, JupShError> {
        quote_mock_settlement(input)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyResult {
    pub decision: Decision,
    pub next_action: NextAction,
    pub risk_level: RiskLevel,
    pub reasons: Vec<String>,
    pub checks: Vec<PolicyCheck>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentIntent {
    pub intent_id: String,
    pub agent: String,
    pub pay_token: String,
    pub recipient: Option<String>,
    pub reference: Option<String>,
    pub settlement: Settlement,
    pub quote: Option<SettlementQuote>,
    pub status: IntentStatus,
    pub decision: Decision,
    pub next_action: NextAction,
    pub risk_level: RiskLevel,
    pub reasons: Vec<String>,
    pub policy_checks: Vec<PolicyCheck>,
    pub review_url: String,
    pub created_at: DateTime<Utc>,
}

pub fn create_payment_intent(
    input: CreatePaymentIntentInput,
    policy: &Policy,
    review_base_url: &str,
) -> Result<PaymentIntent, JupShError> {
    create_payment_intent_with_quoter(input, policy, review_base_url, &MockSettlementQuoter)
}

pub fn create_payment_intent_with_quoter(
    input: CreatePaymentIntentInput,
    policy: &Policy,
    review_base_url: &str,
    quoter: &impl SettlementQuoter,
) -> Result<PaymentIntent, JupShError> {
    let agent = required_string(input.agent, "agent")?;
    let pay_token = normalize_token(&input.pay_token)?;
    let settle_token = normalize_token(&input.settle_token)?;
    let settle_amount = positive_amount(input.settle_amount, "settle_amount")?;

    let normalized = CreatePaymentIntentInput {
        agent,
        pay_token,
        settle_amount,
        settle_token,
        recipient: input.recipient,
        reference: input.reference,
    };

    let policy_result = evaluate_policy(&normalized, policy)?;
    let status = intent_status_for_decision(&policy_result.decision);
    let quote = match &policy_result.decision {
        Decision::Rejected => None,
        _ => Some(quoter.quote_settlement(&normalized)?),
    };
    let intent_id = format!("intent_{}", Uuid::new_v4().simple());
    let review_base_url = review_base_url.trim_end_matches('/');

    Ok(PaymentIntent {
        intent_id: intent_id.clone(),
        agent: normalized.agent,
        pay_token: normalized.pay_token,
        recipient: normalized.recipient,
        reference: normalized.reference,
        settlement: Settlement {
            amount: normalized.settle_amount,
            token: normalized.settle_token,
        },
        quote,
        status,
        decision: policy_result.decision,
        next_action: policy_result.next_action,
        risk_level: policy_result.risk_level,
        reasons: policy_result.reasons,
        policy_checks: policy_result.checks,
        review_url: format!("{review_base_url}/pay/{intent_id}"),
        created_at: Utc::now(),
    })
}

pub fn evaluate_policy(
    input: &CreatePaymentIntentInput,
    policy: &Policy,
) -> Result<PolicyResult, JupShError> {
    let pay_token = normalize_token(&input.pay_token)?;
    let settle_token = normalize_token(&input.settle_token)?;
    let settle_amount = positive_amount(input.settle_amount, "settle_amount")?;
    let verified_tokens = policy
        .verified_tokens
        .iter()
        .map(|token| token.trim().to_uppercase())
        .collect::<HashSet<_>>();
    let mut checks = Vec::new();

    checks.push(if verified_tokens.contains(&pay_token) {
        policy_check(
            "verified_token",
            PolicyCheckStatus::Pass,
            format!("{pay_token} is verified"),
        )
    } else {
        policy_check(
            "verified_token",
            PolicyCheckStatus::Reject,
            format!("{pay_token} is not a verified token"),
        )
    });

    checks.push(if settle_token == "USDC" {
        policy_check(
            "settlement_token",
            PolicyCheckStatus::Pass,
            "USDC settlement is supported",
        )
    } else {
        policy_check(
            "settlement_token",
            PolicyCheckStatus::Reject,
            "only USDC settlement is supported in Phase 1",
        )
    });

    checks.push(if settle_amount <= policy.max_allowed_settle_usdc {
        policy_check(
            "max_allowed_amount",
            PolicyCheckStatus::Pass,
            format!(
                "{} USDC is within the max allowed limit",
                trim_number(settle_amount)
            ),
        )
    } else {
        policy_check(
            "max_allowed_amount",
            PolicyCheckStatus::Reject,
            format!(
                "settlement amount exceeds {} USDC",
                trim_number(policy.max_allowed_settle_usdc)
            ),
        )
    });

    let trusted_recipients = policy
        .trusted_recipients
        .iter()
        .map(String::as_str)
        .collect::<HashSet<_>>();
    let recipient = input.recipient.as_deref().unwrap_or_default();

    checks.push(if !policy.review_unknown_recipients {
        policy_check(
            "recipient_trust",
            PolicyCheckStatus::Pass,
            "unknown recipients do not require review",
        )
    } else if !recipient.is_empty() && trusted_recipients.contains(recipient) {
        policy_check(
            "recipient_trust",
            PolicyCheckStatus::Pass,
            "recipient is trusted",
        )
    } else {
        policy_check(
            "recipient_trust",
            PolicyCheckStatus::Review,
            "recipient is not trusted",
        )
    });

    checks.push(if settle_amount <= policy.max_auto_settle_usdc {
        policy_check(
            "auto_pay_limit",
            PolicyCheckStatus::Pass,
            format!(
                "{} USDC is within the auto-pay limit",
                trim_number(settle_amount)
            ),
        )
    } else {
        policy_check(
            "auto_pay_limit",
            PolicyCheckStatus::Review,
            format!(
                "settlement amount exceeds auto-pay limit of {} USDC",
                trim_number(policy.max_auto_settle_usdc)
            ),
        )
    });

    let reasons = checks
        .iter()
        .filter(|check| check.status != PolicyCheckStatus::Pass)
        .map(|check| check.message.clone())
        .collect::<Vec<_>>();
    let has_reject = checks
        .iter()
        .any(|check| check.status == PolicyCheckStatus::Reject);
    let has_review = checks
        .iter()
        .any(|check| check.status == PolicyCheckStatus::Review);
    let decision = if has_reject {
        Decision::Rejected
    } else if has_review {
        Decision::ReviewRequired
    } else {
        Decision::AutoPay
    };

    Ok(PolicyResult {
        next_action: next_action_for_decision(&decision),
        risk_level: risk_level_for_decision(&decision),
        decision,
        reasons,
        checks,
    })
}

pub fn quote_settlement(input: &CreatePaymentIntentInput) -> Result<SettlementQuote, JupShError> {
    MockSettlementQuoter.quote_settlement(input)
}

fn quote_mock_settlement(input: &CreatePaymentIntentInput) -> Result<SettlementQuote, JupShError> {
    let pay_token = normalize_token(&input.pay_token)?;
    let settle_token = normalize_token(&input.settle_token)?;
    let settle_amount = positive_amount(input.settle_amount, "settle_amount")?;

    if settle_token != "USDC" {
        return Err(JupShError::UnsupportedSettlementToken);
    }

    let price = mock_price_usdc(&pay_token)
        .ok_or_else(|| JupShError::MissingMockPrice(pay_token.clone()))?;

    Ok(SettlementQuote {
        source: "mock_jupiter".to_string(),
        input_token: pay_token.clone(),
        input_amount: round_to_8(settle_amount / price),
        settle_amount,
        settle_token,
        price_impact_bps: if pay_token == "USDC" { 0 } else { 12 },
    })
}

fn mock_price_usdc(token: &str) -> Option<f64> {
    match token {
        "USDC" => Some(1.0),
        "SOL" => Some(150.0),
        "JUP" => Some(0.9),
        "BONK" => Some(0.00002),
        _ => None,
    }
}

fn required_string(value: String, field: &'static str) -> Result<String, JupShError> {
    let value = value.trim().to_string();
    if value.is_empty() {
        return Err(JupShError::MissingField(field));
    }
    Ok(value)
}

fn normalize_token(token: &str) -> Result<String, JupShError> {
    let token = token.trim().to_uppercase();
    if token.is_empty() {
        return Err(JupShError::MissingField("token"));
    }
    Ok(token)
}

fn positive_amount(value: f64, field: &'static str) -> Result<f64, JupShError> {
    if !value.is_finite() || value <= 0.0 {
        return Err(JupShError::InvalidAmount(field));
    }
    Ok(value)
}

fn round_to_8(value: f64) -> f64 {
    (value * 100_000_000.0).round() / 100_000_000.0
}

fn trim_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        value.to_string()
    }
}

fn policy_check(
    name: impl Into<String>,
    status: PolicyCheckStatus,
    message: impl Into<String>,
) -> PolicyCheck {
    PolicyCheck {
        name: name.into(),
        status,
        message: message.into(),
    }
}

fn next_action_for_decision(decision: &Decision) -> NextAction {
    match decision {
        Decision::AutoPay => NextAction::ReadyForAuthorization,
        Decision::ReviewRequired => NextAction::OpenReview,
        Decision::Rejected => NextAction::Rejected,
    }
}

fn intent_status_for_decision(decision: &Decision) -> IntentStatus {
    match decision {
        Decision::AutoPay => IntentStatus::ReadyForAuthorization,
        Decision::ReviewRequired => IntentStatus::ReviewRequired,
        Decision::Rejected => IntentStatus::Rejected,
    }
}

fn risk_level_for_decision(decision: &Decision) -> RiskLevel {
    match decision {
        Decision::AutoPay => RiskLevel::Low,
        Decision::ReviewRequired => RiskLevel::Medium,
        Decision::Rejected => RiskLevel::High,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug)]
    struct FixedQuoter;

    impl SettlementQuoter for FixedQuoter {
        fn quote_settlement(
            &self,
            input: &CreatePaymentIntentInput,
        ) -> Result<SettlementQuote, JupShError> {
            Ok(SettlementQuote {
                source: "fixed_test".to_string(),
                input_token: input.pay_token.clone(),
                input_amount: 1.23,
                settle_amount: input.settle_amount,
                settle_token: input.settle_token.clone(),
                price_impact_bps: 7,
            })
        }
    }

    fn input(settle_amount: f64) -> CreatePaymentIntentInput {
        CreatePaymentIntentInput {
            agent: "claude".to_string(),
            pay_token: "SOL".to_string(),
            settle_amount,
            settle_token: "USDC".to_string(),
            recipient: Some("trusted-demo".to_string()),
            reference: None,
        }
    }

    #[test]
    fn policy_allows_small_trusted_payment() {
        let policy = Policy {
            trusted_recipients: vec!["trusted-demo".to_string()],
            ..Policy::default()
        };

        let result = evaluate_policy(&input(2.0), &policy).unwrap();

        assert!(matches!(result.decision, Decision::AutoPay));
        assert!(matches!(
            result.next_action,
            NextAction::ReadyForAuthorization
        ));
        assert!(matches!(result.risk_level, RiskLevel::Low));
        assert!(result.reasons.is_empty());
        assert_eq!(result.checks.len(), 5);
    }

    #[test]
    fn policy_requires_review_for_large_payment() {
        let policy = Policy {
            trusted_recipients: vec!["trusted-demo".to_string()],
            ..Policy::default()
        };

        let result = evaluate_policy(&input(20.0), &policy).unwrap();

        assert!(matches!(result.decision, Decision::ReviewRequired));
        assert!(matches!(result.next_action, NextAction::OpenReview));
        assert!(matches!(result.risk_level, RiskLevel::Medium));
        assert_eq!(result.reasons.len(), 1);
    }

    #[test]
    fn policy_rejects_unverified_token() {
        let policy = Policy::default();
        let mut request = input(2.0);
        request.pay_token = "FAKE".to_string();

        let result = evaluate_policy(&request, &policy).unwrap();

        assert!(matches!(result.decision, Decision::Rejected));
        assert!(matches!(result.next_action, NextAction::Rejected));
        assert!(matches!(result.risk_level, RiskLevel::High));
        assert!(
            result
                .reasons
                .contains(&"FAKE is not a verified token".to_string())
        );
        assert!(
            result
                .checks
                .iter()
                .any(|check| check.status == PolicyCheckStatus::Reject)
        );
    }

    #[test]
    fn intent_uses_injected_quoter() {
        let policy = Policy {
            trusted_recipients: vec!["trusted-demo".to_string()],
            ..Policy::default()
        };

        let intent =
            create_payment_intent_with_quoter(input(2.0), &policy, "https://jup.sh", &FixedQuoter)
                .unwrap();

        let quote = intent.quote.unwrap();
        assert_eq!(quote.source, "fixed_test");
        assert_eq!(quote.input_amount, 1.23);
        assert_eq!(quote.price_impact_bps, 7);
    }

    #[test]
    fn intent_status_tracks_policy_decision() {
        let policy = Policy {
            trusted_recipients: vec!["trusted-demo".to_string()],
            ..Policy::default()
        };

        let ready =
            create_payment_intent_with_quoter(input(2.0), &policy, "https://jup.sh", &FixedQuoter)
                .unwrap();
        assert_eq!(ready.status, IntentStatus::ReadyForAuthorization);

        let review =
            create_payment_intent_with_quoter(input(20.0), &policy, "https://jup.sh", &FixedQuoter)
                .unwrap();
        assert_eq!(review.status, IntentStatus::ReviewRequired);

        let mut rejected_input = input(2.0);
        rejected_input.pay_token = "FAKE".to_string();
        let rejected = create_payment_intent_with_quoter(
            rejected_input,
            &policy,
            "https://jup.sh",
            &FixedQuoter,
        )
        .unwrap();
        assert_eq!(rejected.status, IntentStatus::Rejected);
        assert!(rejected.quote.is_none());
    }
}
