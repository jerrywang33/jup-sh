use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use clap::{Parser, Subcommand};
use jup_sh_core::{
    CreatePaymentIntentInput, Decision, IntentStatus, MockSettlementQuoter, NextAction,
    PaymentIntent, Policy, PolicyCheckStatus, RiskLevel, SettlementQuote, SettlementQuoter,
    create_payment_intent_with_quoter,
};
use serde::Deserialize;
use std::{fs, path::PathBuf, process::ExitCode, time::Duration};

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
    /// Manage local payment policy.
    Policy(PolicyCommand),
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

    /// Settlement quote provider. Use mock for local development or jupiter for quote-only real routing.
    #[arg(long, default_value = "mock", value_enum)]
    quote_provider: QuoteProvider,

    /// Jupiter quote endpoint. Defaults to Jupiter Swap quote API.
    #[arg(long, default_value = "https://api.jup.ag/swap/v1/quote")]
    jupiter_quote_url: String,

    /// Slippage tolerance in basis points for Jupiter quotes.
    #[arg(long, default_value_t = 50)]
    slippage_bps: u16,

    /// Optional Jupiter API key. Defaults to JUPITER_API_KEY when set.
    #[arg(long, env = "JUPITER_API_KEY")]
    jupiter_api_key: Option<String>,

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

#[derive(Debug, Clone, Copy, clap::ValueEnum)]
enum QuoteProvider {
    Mock,
    Jupiter,
}

#[derive(Debug, Parser)]
struct IntentCommand {
    #[command(subcommand)]
    command: IntentSubcommand,
}

#[derive(Debug, Subcommand)]
enum IntentSubcommand {
    /// Export a saved intent as a Risk Review URL.
    Export(IntentExportCommand),
    /// List locally saved payment intents.
    List(IntentListCommand),
    /// Show a locally saved payment intent.
    Show(IntentShowCommand),
}

#[derive(Debug, Parser)]
struct IntentListCommand {
    /// Print JSON only.
    #[arg(long)]
    json: bool,

    /// Maximum number of intents to show.
    #[arg(long, default_value_t = 20)]
    limit: usize,

    /// Intent storage directory.
    #[arg(long)]
    store: Option<PathBuf>,
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

#[derive(Debug, Parser)]
struct IntentExportCommand {
    /// Intent ID, for example intent_abc123.
    intent_id: String,

    /// Base URL for Risk Review links.
    #[arg(long, default_value = "https://jup.sh")]
    review_base_url: String,

    /// Print only the encoded payload.
    #[arg(long)]
    payload_only: bool,

    /// Intent storage directory.
    #[arg(long)]
    store: Option<PathBuf>,
}

#[derive(Debug, Parser)]
struct PolicyCommand {
    #[command(subcommand)]
    command: PolicySubcommand,
}

#[derive(Debug, Subcommand)]
enum PolicySubcommand {
    /// Write a default local policy file.
    Init(PolicyInitCommand),
    /// Show the effective local policy.
    Show(PolicyShowCommand),
}

#[derive(Debug, Parser)]
struct PolicyInitCommand {
    /// Policy file path.
    #[arg(long, default_value = "jup.policy.json")]
    path: PathBuf,

    /// Overwrite an existing policy file.
    #[arg(long)]
    force: bool,
}

#[derive(Debug, Parser)]
struct PolicyShowCommand {
    /// Optional policy file. Defaults to ./jup.policy.json when present.
    #[arg(long)]
    policy: Option<PathBuf>,

    /// Print JSON only.
    #[arg(long)]
    json: bool,
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => code,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}

fn run() -> Result<ExitCode, Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        Command::Pay(command) => run_pay(command),
        Command::Intent(command) => run_intent(command),
        Command::Policy(command) => run_policy(command),
    }
}

fn run_pay(command: PayCommand) -> Result<ExitCode, Box<dyn std::error::Error>> {
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

    let input = CreatePaymentIntentInput {
        agent: command.agent,
        pay_token: command.token,
        settle_amount,
        settle_token,
        recipient: command.recipient,
        reference: command.reference,
    };
    let intent = match command.quote_provider {
        QuoteProvider::Mock => create_payment_intent_with_quoter(
            input,
            &policy,
            &command.review_base_url,
            &MockSettlementQuoter,
        )?,
        QuoteProvider::Jupiter => {
            let quoter = JupiterSettlementQuoter::new(
                command.jupiter_quote_url,
                command.jupiter_api_key,
                command.slippage_bps,
            )?;
            create_payment_intent_with_quoter(input, &policy, &command.review_base_url, &quoter)?
        }
    };
    let path = save_intent(&intent, command.store.as_ref())?;

    if command.json {
        println!("{}", serde_json::to_string_pretty(&intent)?);
    } else {
        print_human(&intent);
        println!("Saved: {}", path.display());
    }

    Ok(exit_code_for_decision(&intent.decision))
}

fn run_intent(command: IntentCommand) -> Result<ExitCode, Box<dyn std::error::Error>> {
    match command.command {
        IntentSubcommand::Export(command) => run_intent_export(command)?,
        IntentSubcommand::List(command) => run_intent_list(command)?,
        IntentSubcommand::Show(command) => run_intent_show(command)?,
    };

    Ok(ExitCode::SUCCESS)
}

fn run_intent_list(command: IntentListCommand) -> Result<(), Box<dyn std::error::Error>> {
    let intents = list_intents(command.store.as_ref(), command.limit)?;

    if command.json {
        println!("{}", serde_json::to_string_pretty(&intents)?);
    } else {
        print_intent_list(&intents);
    }

    Ok(())
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

fn run_intent_export(command: IntentExportCommand) -> Result<(), Box<dyn std::error::Error>> {
    let intent = load_intent(&command.intent_id, command.store.as_ref())?;
    let payload = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&intent)?);

    if command.payload_only {
        println!("{payload}");
    } else {
        let base_url = command.review_base_url.trim_end_matches('/');
        println!(
            "{base_url}/pay/{id}#intent={payload}",
            id = intent.intent_id
        );
    }

    Ok(())
}

fn run_policy(command: PolicyCommand) -> Result<ExitCode, Box<dyn std::error::Error>> {
    match command.command {
        PolicySubcommand::Init(command) => run_policy_init(command)?,
        PolicySubcommand::Show(command) => run_policy_show(command)?,
    };

    Ok(ExitCode::SUCCESS)
}

fn run_policy_init(command: PolicyInitCommand) -> Result<(), Box<dyn std::error::Error>> {
    if command.path.exists() && !command.force {
        return Err(format!(
            "{} already exists; pass --force to overwrite it",
            command.path.display()
        )
        .into());
    }

    let policy = Policy::default();
    fs::write(
        &command.path,
        format!("{}\n", serde_json::to_string_pretty(&policy)?),
    )?;
    println!("Wrote {}", command.path.display());

    Ok(())
}

fn run_policy_show(command: PolicyShowCommand) -> Result<(), Box<dyn std::error::Error>> {
    let policy = load_policy(command.policy.as_ref())?;

    if command.json {
        println!("{}", serde_json::to_string_pretty(&policy)?);
    } else {
        print_policy(&policy);
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

fn list_intents(
    store: Option<&PathBuf>,
    limit: usize,
) -> Result<Vec<PaymentIntent>, Box<dyn std::error::Error>> {
    let dir = intent_store_dir(store);
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut intents = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }

        let content = fs::read_to_string(path)?;
        intents.push(serde_json::from_str::<PaymentIntent>(&content)?);
    }

    intents.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    intents.truncate(limit);

    Ok(intents)
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

fn print_intent_list(intents: &[PaymentIntent]) {
    if intents.is_empty() {
        println!("No local payment intents found.");
        return;
    }

    println!("jup.sh local payment intents");
    println!();

    for intent in intents {
        println!(
            "{}  {}  {} {}  {}  {}",
            intent.intent_id,
            intent.agent,
            trim_number(intent.settlement.amount),
            intent.settlement.token,
            intent_status_label(&intent.status),
            intent.created_at.to_rfc3339()
        );
    }
}

fn print_policy(policy: &Policy) {
    println!("jup.sh policy");
    println!();
    println!(
        "Max auto settle: {} USDC",
        trim_number(policy.max_auto_settle_usdc)
    );
    println!(
        "Max allowed settle: {} USDC",
        trim_number(policy.max_allowed_settle_usdc)
    );
    println!("Max price impact: {} bps", policy.max_price_impact_bps);
    println!(
        "Review high price impact: {}",
        policy.review_high_price_impact
    );
    println!("Verified tokens: {}", policy.verified_tokens.join(", "));
    println!(
        "Trusted recipients: {}",
        if policy.trusted_recipients.is_empty() {
            "(none)".to_string()
        } else {
            policy.trusted_recipients.join(", ")
        }
    );
    println!(
        "Review unknown recipients: {}",
        policy.review_unknown_recipients
    );
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

fn exit_code_for_decision(decision: &Decision) -> ExitCode {
    match decision {
        Decision::AutoPay => ExitCode::SUCCESS,
        Decision::ReviewRequired => ExitCode::from(2),
        Decision::Rejected => ExitCode::from(1),
    }
}

fn trim_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        value.to_string()
    }
}

#[derive(Debug)]
struct JupiterSettlementQuoter {
    client: reqwest::blocking::Client,
    quote_url: String,
    api_key: Option<String>,
    slippage_bps: u16,
}

impl JupiterSettlementQuoter {
    fn new(
        quote_url: String,
        api_key: Option<String>,
        slippage_bps: u16,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent("jup-sh-cli/0.1.0")
            .build()?;

        Ok(Self {
            client,
            quote_url,
            api_key: api_key.filter(|value| !value.trim().is_empty()),
            slippage_bps,
        })
    }
}

impl SettlementQuoter for JupiterSettlementQuoter {
    fn quote_settlement(
        &self,
        input: &CreatePaymentIntentInput,
    ) -> Result<SettlementQuote, jup_sh_core::JupShError> {
        quote_jupiter_settlement(self, input)
            .map_err(|error| jup_sh_core::JupShError::ExternalQuote(error.to_string()))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JupiterQuoteResponse {
    in_amount: String,
    out_amount: String,
    input_mint: String,
    output_mint: String,
    price_impact_pct: String,
}

#[derive(Debug, Clone, Copy)]
struct TokenMetadata {
    symbol: &'static str,
    mint: &'static str,
    decimals: u8,
}

fn quote_jupiter_settlement(
    quoter: &JupiterSettlementQuoter,
    input: &CreatePaymentIntentInput,
) -> Result<SettlementQuote, Box<dyn std::error::Error>> {
    let input_token = token_metadata(&input.pay_token)
        .ok_or_else(|| format!("Jupiter quote token is not configured: {}", input.pay_token))?;
    let settle_token = token_metadata(&input.settle_token).ok_or_else(|| {
        format!(
            "Jupiter quote token is not configured: {}",
            input.settle_token
        )
    })?;
    if settle_token.symbol != "USDC" {
        return Err("Jupiter quote provider currently supports USDC settlement only".into());
    }

    let out_amount_raw = to_raw_amount(input.settle_amount, settle_token.decimals)?;
    let slippage_bps = quoter.slippage_bps.to_string();
    let mut request = quoter.client.get(&quoter.quote_url).query(&[
        ("inputMint", input_token.mint),
        ("outputMint", settle_token.mint),
        ("amount", out_amount_raw.as_str()),
        ("slippageBps", slippage_bps.as_str()),
        ("swapMode", "ExactOut"),
    ]);

    if let Some(api_key) = &quoter.api_key {
        request = request.header("x-api-key", api_key);
    }

    let response = request.send()?.error_for_status()?;
    let quote = response.json::<JupiterQuoteResponse>()?;

    if quote.input_mint != input_token.mint {
        return Err("Jupiter quote returned a different input mint".into());
    }
    if quote.output_mint != settle_token.mint {
        return Err("Jupiter quote returned a different output mint".into());
    }

    Ok(SettlementQuote {
        source: "jupiter_swap_exact_out".to_string(),
        input_token: input_token.symbol.to_string(),
        input_amount: from_raw_amount(&quote.in_amount, input_token.decimals)?,
        settle_amount: from_raw_amount(&quote.out_amount, settle_token.decimals)?,
        settle_token: settle_token.symbol.to_string(),
        price_impact_bps: price_impact_bps(&quote.price_impact_pct)?,
    })
}

fn token_metadata(symbol: &str) -> Option<TokenMetadata> {
    match symbol.trim().to_uppercase().as_str() {
        "SOL" => Some(TokenMetadata {
            symbol: "SOL",
            mint: "So11111111111111111111111111111111111111112",
            decimals: 9,
        }),
        "USDC" => Some(TokenMetadata {
            symbol: "USDC",
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            decimals: 6,
        }),
        "JUP" => Some(TokenMetadata {
            symbol: "JUP",
            mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
            decimals: 6,
        }),
        "BONK" => Some(TokenMetadata {
            symbol: "BONK",
            mint: "DezXAZ8z7PnrnRJjz3my2u6r5KiL3HR8APpPB2634B2",
            decimals: 5,
        }),
        _ => None,
    }
}

fn to_raw_amount(amount: f64, decimals: u8) -> Result<String, Box<dyn std::error::Error>> {
    if !amount.is_finite() || amount <= 0.0 {
        return Err("amount must be positive".into());
    }

    let multiplier = 10_u64.pow(u32::from(decimals)) as f64;
    Ok(format!("{:.0}", (amount * multiplier).round()))
}

fn from_raw_amount(raw: &str, decimals: u8) -> Result<f64, Box<dyn std::error::Error>> {
    let value = raw.parse::<f64>()?;
    let multiplier = 10_u64.pow(u32::from(decimals)) as f64;
    Ok(value / multiplier)
}

fn price_impact_bps(value: &str) -> Result<u16, Box<dyn std::error::Error>> {
    let impact = value.parse::<f64>()?.abs();
    Ok((impact * 10_000.0).round().clamp(0.0, u16::MAX as f64) as u16)
}
