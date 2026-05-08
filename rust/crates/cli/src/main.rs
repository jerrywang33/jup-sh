use clap::{Parser, Subcommand};
use jup_sh_core::{
    CreatePaymentIntentInput, Decision, IntentStatus, MockSettlementQuoter, NextAction,
    PaymentIntent, Policy, PolicyCheckStatus, RiskLevel, create_payment_intent_with_quoter,
};
use std::{fs, path::PathBuf};

#[derive(Debug, Parser)]
#[command(name = "jup-sh")]
#[command(about = "Risk and settlement for Solana agent payments")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Create a local agent payment intent.
    Pay(PayCommand),
    /// Read local payment intents.
    Intent(IntentCommand),
}

#[derive(Debug, Parser)]
struct PayCommand {
    /// Agent name, such as claude, codex, or deepseek.
    #[arg(long)]
    agent: String,

    /// Payer token symbol.
    #[arg(long)]
    token: String,

    /// Settlement amount and token, for example: --settle 20 USDC.
    #[arg(long, num_args = 2, value_names = ["AMOUNT", "TOKEN"])]
    settle: Vec<String>,

    /// Recipient address or local label.
    #[arg(long)]
    recipient: Option<String>,

    /// External reference or memo.
    #[arg(long)]
    reference: Option<String>,

    /// Print JSON only.
    #[arg(long)]
    json: bool,

    /// Base URL for Risk Review links.
    #[arg(long, default_value = "https://jup.sh")]
    review_base_url: String,

    /// Optional policy file. Defaults to ./jup.policy.json when present.
    #[arg(long)]
    policy: Option<PathBuf>,

    /// Intent storage directory.
    #[arg(long)]
    store: Option<PathBuf>,
}

#[derive(Debug, Parser)]
struct IntentCommand {
    #[command(subcommand)]
    command: IntentSubcommand,
}

#[derive(Debug, Subcommand)]
enum IntentSubcommand {
    /// Show a locally saved payment intent.
    Show(IntentShowCommand),
}

#[derive(Debug, Parser)]
struct IntentShowCommand {
    /// Intent ID, for example intent_abc123.
    intent_id: String,

    /// Print JSON only.
    #[arg(long)]
    json: bool,

    /// Intent storage directory.
    #[arg(long)]
    store: Option<PathBuf>,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        Command::Pay(command) => run_pay(command)?,
        Command::Intent(command) => run_intent(command)?,
    }

    Ok(())
}

fn run_pay(command: PayCommand) -> Result<(), Box<dyn std::error::Error>> {
    let policy = load_policy(command.policy.as_ref())?;
    let settle_amount = command
        .settle
        .first()
        .ok_or("--settle requires amount and token")?
        .parse::<f64>()?;
    let settle_token = command
        .settle
        .get(1)
        .ok_or("--settle requires amount and token")?
        .clone();

    let quoter = MockSettlementQuoter;
    let intent = create_payment_intent_with_quoter(
        CreatePaymentIntentInput {
            agent: command.agent,
            pay_token: command.token,
            settle_amount,
            settle_token,
            recipient: command.recipient,
            reference: command.reference,
        },
        &policy,
        &command.review_base_url,
        &quoter,
    )?;
    let path = save_intent(&intent, command.store.as_ref())?;

    if command.json {
        println!("{}", serde_json::to_string_pretty(&intent)?);
    } else {
        print_human(&intent);
        println!("Saved: {}", path.display());
    }

    Ok(())
}

fn run_intent(command: IntentCommand) -> Result<(), Box<dyn std::error::Error>> {
    match command.command {
        IntentSubcommand::Show(command) => run_intent_show(command),
    }
}

fn run_intent_show(command: IntentShowCommand) -> Result<(), Box<dyn std::error::Error>> {
    let intent = load_intent(&command.intent_id, command.store.as_ref())?;

    if command.json {
        println!("{}", serde_json::to_string_pretty(&intent)?);
    } else {
        print_human(&intent);
    }

    Ok(())
}

fn load_policy(path: Option<&PathBuf>) -> Result<Policy, Box<dyn std::error::Error>> {
    let path = path.cloned().or_else(|| {
        let default = PathBuf::from("jup.policy.json");
        default.exists().then_some(default)
    });

    match path {
        Some(path) => {
            let content = fs::read_to_string(path)?;
            Ok(serde_json::from_str(&content)?)
        }
        None => Ok(Policy::default()),
    }
}

fn save_intent(
    intent: &PaymentIntent,
    store: Option<&PathBuf>,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let dir = intent_store_dir(store);
    fs::create_dir_all(&dir)?;
    let path = dir.join(format!("{}.json", intent.intent_id));
    fs::write(&path, serde_json::to_string_pretty(intent)?)?;
    Ok(path)
}

fn load_intent(
    intent_id: &str,
    store: Option<&PathBuf>,
) -> Result<PaymentIntent, Box<dyn std::error::Error>> {
    let path = intent_store_dir(store).join(format!("{intent_id}.json"));
    let content = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn intent_store_dir(store: Option<&PathBuf>) -> PathBuf {
    store
        .cloned()
        .unwrap_or_else(|| PathBuf::from(".jup-sh").join("intents"))
}

fn print_human(intent: &PaymentIntent) {
    println!("jup.sh payment intent");
    println!();
    println!("Intent: {}", intent.intent_id);
    println!("Agent: {}", intent.agent);
    println!("Pay with: {}", intent.pay_token);
    println!(
        "Settle: {} {}",
        trim_number(intent.settlement.amount),
        intent.settlement.token
    );
    println!("Status: {}", intent_status_label(&intent.status));
    println!("Decision: {}", decision_label(&intent.decision));
    println!("Next action: {}", next_action_label(&intent.next_action));
    println!("Risk: {}", risk_level_label(&intent.risk_level));
    if !intent.reasons.is_empty() {
        println!("Reason: {}", intent.reasons.join("; "));
    }
    if let Some(quote) = &intent.quote {
        println!(
            "Quote: {} {} -> {} {} via {}",
            trim_number(quote.input_amount),
            quote.input_token,
            trim_number(quote.settle_amount),
            quote.settle_token,
            quote.source
        );
    }
    println!("Policy checks:");
    for check in &intent.policy_checks {
        println!(
            "- [{}] {}: {}",
            policy_check_status_label(&check.status),
            check.name,
            check.message
        );
    }
    println!("Review: {}", intent.review_url);
}

fn decision_label(decision: &Decision) -> &'static str {
    match decision {
        Decision::AutoPay => "auto_pay",
        Decision::ReviewRequired => "review_required",
        Decision::Rejected => "rejected",
    }
}

fn intent_status_label(status: &IntentStatus) -> &'static str {
    match status {
        IntentStatus::ReadyForAuthorization => "ready_for_authorization",
        IntentStatus::ReviewRequired => "review_required",
        IntentStatus::Rejected => "rejected",
    }
}

fn next_action_label(next_action: &NextAction) -> &'static str {
    match next_action {
        NextAction::ReadyForAuthorization => "ready_for_authorization",
        NextAction::OpenReview => "open_review",
        NextAction::Rejected => "rejected",
    }
}

fn risk_level_label(risk_level: &RiskLevel) -> &'static str {
    match risk_level {
        RiskLevel::Low => "low",
        RiskLevel::Medium => "medium",
        RiskLevel::High => "high",
    }
}

fn policy_check_status_label(status: &PolicyCheckStatus) -> &'static str {
    match status {
        PolicyCheckStatus::Pass => "pass",
        PolicyCheckStatus::Review => "review",
        PolicyCheckStatus::Reject => "reject",
    }
}

fn trim_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        value.to_string()
    }
}
