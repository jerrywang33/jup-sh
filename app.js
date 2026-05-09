const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const TOKENS = [
  { symbol: "USDC", name: "USD Coin", className: "usdc", balance: "1,240.82", price: 1, verified: true },
  { symbol: "SOL", name: "Solana", className: "sol", balance: "18.42", price: 162.34, verified: true },
  { symbol: "JUP", name: "Jupiter", className: "jup", balance: "3,480.00", price: 1.18, verified: true },
  { symbol: "BONK", name: "Bonk", className: "bonk", balance: "42,000,000", price: 0.000021, verified: true },
];

const state = {
  invoice: {
    id: "pay_f7K2m9",
    merchant: "Agent payment",
    amount: 20,
    memo: "Paid API task",
    wallet: "7EcDhSx9d5qYcJm2aFZc8N9sZK4uLq2Vx3RkP8bA6mQ",
    expires: "30 minutes",
  },
  selectedToken: "SOL",
  connected: false,
  paymentState: "review",
};

const app = document.querySelector("#app");

function parseIntentPayload() {
  const hash = window.location.hash || "";
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const payload = params.get("intent");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(window.atob(padded), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    console.warn("Failed to parse jup.sh intent payload", error);
    return null;
  }
}

function applyIntentPayload(intent) {
  if (!intent || !intent.intentId || !intent.settlement) return;

  const quote = intent.quote || {};
  state.invoice = {
    ...state.invoice,
    id: intent.intentId,
    merchant: "Agent payment",
    amount: Number(intent.settlement.amount) || state.invoice.amount,
    memo: `${intent.agent || "agent"} intent`,
    wallet: intent.recipient || state.invoice.wallet,
  };
  state.selectedToken = intent.payToken || quote.inputToken || state.selectedToken;
  state.paymentState = intent.status === "rejected" ? "rejected" : "review";
  state.intent = intent;
}

function money(value, digits = 2) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function shortAddress(value) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSelectedToken() {
  return TOKENS.find((token) => token.symbol === state.selectedToken) || TOKENS[1];
}

function getQuote() {
  if (state.intent?.quote) {
    const token =
      TOKENS.find((item) => item.symbol === state.intent.quote.inputToken) ||
      TOKENS.find((item) => item.symbol === state.intent.payToken) ||
      getSelectedToken();
    const payAmount = Number(state.intent.quote.inputAmount) || 0;
    const decimals = token.price < 0.01 ? 0 : token.symbol === "USDC" ? 2 : 6;

    return {
      token,
      payAmount,
      formattedPayAmount: money(payAmount, decimals),
      route:
        state.intent.quote.source === "jupiter_swap_exact_out"
          ? `${token.symbol} -> USDC via Jupiter`
          : `${token.symbol} -> USDC route`,
      slippage: "Policy controlled",
      networkFee: "Estimated at authorization",
    };
  }

  const token = getSelectedToken();
  const fee = token.symbol === "USDC" ? 0 : 0.0035;
  const rawAmount = state.invoice.amount / token.price;
  const payAmount = rawAmount * (1 + fee);
  const decimals = token.price < 0.01 ? 0 : token.symbol === "USDC" ? 2 : 4;

  return {
    token,
    payAmount,
    formattedPayAmount: money(payAmount, decimals),
    route: token.symbol === "USDC" ? "Direct USDC transfer" : `${token.symbol} -> USDC route`,
    slippage: token.symbol === "USDC" ? "0%" : "0.5%",
    networkFee: "0.000005 SOL",
  };
}

function navigate(path) {
  window.history.pushState({}, "", path);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function createHeader() {
  return `
    <header class="topbar">
      <a class="brand" href="/" data-link aria-label="jup.sh home">
        <span class="brand-mark" aria-hidden="true">
          <span class="brand-symbol">🌈</span>
        </span>
      </a>
      <nav class="nav">
        <a href="https://jerrywang33.github.io/jup-sh/" target="_blank" rel="noreferrer">Docs</a>
        <a href="https://github.com/jerrywang33/jup-sh" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
    </header>
  `;
}

function createFooter() {
  return `
    <footer class="footer">
      Jupiter-powered risk and settlement for Solana agent payments. Independent community-built tool.
    </footer>
  `;
}

function tokenIcon(token) {
  return `<span class="token-icon ${token.className}">${token.symbol.slice(0, 1)}</span>`;
}

function fakeQR(seed) {
  let html = "";
  for (let index = 0; index < 289; index += 1) {
    const x = index % 17;
    const y = Math.floor(index / 17);
    const finder =
      (x < 5 && y < 5) ||
      (x > 11 && y < 5) ||
      (x < 5 && y > 11);
    const ring =
      finder &&
      (x === 0 || x === 4 || y === 0 || y === 4 || x === 12 || x === 16 || y === 12 || y === 16);
    const fill = ring || ((index * 37 + seed.length * 11 + x * y) % 5 < 2);
    html += `<i class="${fill ? "" : "off"}"></i>`;
  }
  return `<div class="qr" aria-label="Payment QR preview">${html}</div>`;
}

function renderEcosystemWall() {
  const items = [
    { label: "Qwen", logo: "/assets/logos/qwen.png", mark: "Q", tone: "qwen" },
    { label: "Claude", logo: "/assets/logos/claude.svg", mark: "C", tone: "claude" },
    { label: "Codex", logo: "/assets/logos/openai.svg", mark: "AI", tone: "codex" },
    { label: "Jupiter", logo: "/assets/logos/jupiter.png", mark: "JUP", tone: "jupiter" },
    { label: "Solana", logo: "/assets/logos/solana.svg", mark: "SOL", tone: "solana" },
    { label: "DeepSeek", logo: "/assets/logos/deepseek.svg", mark: "D", tone: "deepseek" },
    { label: "AWS", logo: "/assets/logos/aws.svg", mark: "aws", tone: "aws" },
    { label: "Google Cloud", logo: "/assets/logos/googlecloud.svg", mark: "G", tone: "google" },
    { label: "Cloudflare", logo: "/assets/logos/cloudflare.svg", mark: "CF", tone: "cloudflare" },
    { label: "GitHub", logo: "/assets/logos/github.svg", mark: "GH", tone: "github" },
  ];
  const row = items
    .map(
      ({ label, logo, mark, tone }) => `
        <span class="ecosystem-chip ecosystem-${tone}">
          <i>
            ${
              logo
                ? `<img src="${logo}" alt="" loading="lazy" onerror="this.remove()" />`
                : ""
            }
            <span>${mark}</span>
          </i>
          <b>${label}</b>
        </span>
      `
    )
    .join("");

  return `
    <div class="ecosystem-wall" aria-label="Ecosystem signals">
      <div class="ecosystem-label">Ecosystem signals</div>
      <div class="ecosystem-marquee">
        <div class="ecosystem-track">${row}${row}</div>
      </div>
    </div>
  `;
}

function renderHome() {
  return `
    <section class="pay-sh-hero">
      <div class="hero-wordmark" data-word="JUP.SH" aria-label="JUP.SH">
        ${["J", "U", "P", ".", "S", "H"]
          .map((letter, index) => `<span style="--i: ${index}">${letter}</span>`)
          .join("")}
      </div>
      <div class="pay-home-grid hero-single">
        <div class="pay-home-copy">
          <h1>
            Risk and settlement for <span>Solana agent payments.</span>
          </h1>
          <p class="hero-lines">
            <span>Agents pay with any verified token.</span>
            <span>Recipients settle in USDC.</span>
            <span>Policy decides when humans step in.</span>
          </p>
          <div class="try-block">
            <div class="try-label">Try it now</div>
            <button class="terminal-line" type="button" data-copy-command>
              <span>
                <em>$</em> <strong>pay</strong>
                <code>--agent claude</code>
                <code>--token SOL</code>
                <code>--settle 20 USDC</code>
              </span>
              <small>Copy</small>
            </button>
          </div>
          <div class="agent-row">
            <div>
              <span>Works with agents</span>
              <strong>Claude</strong>
              <strong>Codex</strong>
              <strong>DeepSeek</strong>
              <strong>Kimi</strong>
              <strong>MiniMax</strong>
              <strong>Qwen</strong>
            </div>
            <div>
              <span>Powered by</span>
              <strong>Jupiter API</strong>
              <strong>Solana</strong>
            </div>
          </div>
          ${renderEcosystemWall()}
        </div>
      </div>
    </section>

    <section class="pay-sh-split">
      <div>
        <span class="section-kicker">Product Layer</span>
        <h2>Jupiter-powered settlement, policy-driven risk.</h2>
        <p>
          jup.sh sits between agents and Solana payments. Jupiter routes any
          verified token into USDC settlement, while the risk layer decides
          whether a payment should auto-execute, require review, or be rejected.
        </p>
        <div class="hero-actions tight-actions">
          <a class="primary-btn" href="/pay/${state.invoice.id}" data-link>View Risk Review</a>
        </div>
      </div>
      <div class="mini-table">
        <div><span>Settlement</span><strong>Jupiter API</strong></div>
        <div><span>Risk</span><strong>Policy engine</strong></div>
        <div><span>Agents pay with</span><strong>Any verified token</strong></div>
        <div><span>Recipients get</span><strong>USDC</strong></div>
        <div><span>Decision</span><strong>Auto pay / review / reject</strong></div>
        <div><span>Flow</span><strong>Agent-native payments</strong></div>
      </div>
    </section>

    <section class="pay-sh-split">
      <div>
        <span class="section-kicker">How it works</span>
        <h2>Intent. Policy. Settlement.</h2>
        <p>
          Agents never receive private keys. They submit a structured payment
          intent; jup.sh evaluates policy, asks Jupiter for settlement, then
          continues to wallet authorization or Risk Review.
        </p>
      </div>
      <div class="flow-stack">
        <article class="flow-step">
          <span class="flow-index">01</span>
          <div>
            <strong>Agent intent</strong>
            <span>Agent, token, amount, recipient, and reference are captured in one structured request.</span>
          </div>
        </article>
        <article class="flow-step">
          <span class="flow-index">02</span>
          <div>
            <strong>Policy decision</strong>
            <span>Limits, token verification, recipient history, route quality, and behavior are checked.</span>
          </div>
        </article>
        <article class="flow-step">
          <span class="flow-index">03</span>
          <div>
            <strong>Jupiter settlement</strong>
            <span>Allowed payments use Jupiter API to quote the payer token into USDC settlement.</span>
          </div>
        </article>
        <article class="flow-step">
          <span class="flow-index">04</span>
          <div>
            <strong>Authorize or review</strong>
            <span>Clean intents continue to wallet authorization. Flagged intents open Risk Review.</span>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderNewPayment() {
  return `
    <div class="layout-grid">
      <section class="panel">
        <h2>Create payment</h2>
        <p>Create a USDC payment intent for an agent, app, or wallet flow.</p>
        <form class="form-grid" data-create-form>
          <div class="field">
            <label for="merchant">Payment name</label>
            <input id="merchant" name="merchant" value="${state.invoice.merchant}" />
          </div>
          <div class="two-col">
            <div class="field">
              <label for="amount">Amount</label>
              <input id="amount" name="amount" type="number" min="1" step="0.01" value="${state.invoice.amount}" />
            </div>
            <div class="field">
              <label for="settlement">Settlement token</label>
              <select id="settlement" name="settlement">
                <option>USDC</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="wallet">Recipient wallet</label>
            <input id="wallet" name="wallet" value="${state.invoice.wallet}" />
          </div>
          <div class="field">
            <label for="memo">Memo</label>
            <input id="memo" name="memo" value="${state.invoice.memo}" />
          </div>
          <button class="primary-btn" type="submit">Create payment</button>
        </form>
      </section>

      <section class="panel">
        <h2>Agent payment flow</h2>
        <div class="summary-box">
          <div class="summary-line"><span>Agent creates</span><strong>Payment intent</strong></div>
          <div class="summary-line"><span>Default mode</span><strong>Auto Pay</strong></div>
          <div class="summary-line"><span>Exception mode</span><strong>Risk Review</strong></div>
          <div class="summary-line"><span>Recipient gets</span><strong>${money(state.invoice.amount)} USDC</strong></div>
          <div class="summary-line"><span>Route model</span><strong>Jupiter API</strong></div>
          <div class="summary-line"><span>Custody</span><strong>Non-custodial</strong></div>
        </div>
        <div class="timeline">
          <div class="step done"><span class="dot"></span><span>Agent creates payment intent</span></div>
          <div class="step done"><span class="dot"></span><span>Policy checks amount, token, route, and recipient</span></div>
          <div class="step"><span class="dot"></span><span>Auto Pay if policy passes</span></div>
          <div class="step"><span class="dot"></span><span>Risk Review if policy flags it</span></div>
          <div class="step"><span class="dot"></span><span>Jupiter API routes and settles USDC</span></div>
        </div>
      </section>
    </div>
  `;
}
function renderCheckout() {
  applyIntentPayload(parseIntentPayload());
  const quote = getQuote();
  const paid = state.paymentState === "paid";
  const rejected = state.paymentState === "rejected";
  const settled = paid || rejected;
  const status = paid
    ? "Approved"
    : rejected
      ? "Rejected"
      : state.intent?.status === "ready_for_authorization"
        ? "Ready for authorization"
        : "Review required";
  const policyResult = state.intent?.decision
    ? state.intent.decision.replace(/_/g, " ")
    : "Review required";
  const riskReason =
    state.intent?.reasons?.length > 0 ? state.intent.reasons.join("; ") : "New recipient";
  const recipient = state.intent?.recipient || state.invoice.wallet;
  const merchant = escapeHtml(state.invoice.merchant);
  const memo = escapeHtml(state.invoice.memo);
  const avatar = escapeHtml(state.invoice.merchant.slice(0, 1));
  const reviewRows = state.intent?.policyChecks
    ? state.intent.policyChecks
        .map(
          (check) => `
            <div>
              <span>${escapeHtml(check.name.replace(/_/g, " "))}</span>
              <strong>${escapeHtml(check.status)}: ${escapeHtml(check.message)}</strong>
            </div>
          `,
        )
        .join("")
    : "";

  return `
    <section class="pay-page">
      <div class="pay-card checkout-pay-card">
        <div class="pay-card-head">
          <div class="merchant-pill">
            <span class="avatar">${avatar}</span>
            <div>
              <strong>${merchant}</strong><br />
              <small class="note">${memo}</small>
            </div>
          </div>
          <span class="status-pill ${rejected ? "rejected" : ""}">${status}</span>
        </div>

        <div class="pay-card-body">
          <div class="qr-center">
            <div class="qr-wrap">${fakeQR(state.invoice.id)}</div>
          </div>

          <div class="simple-amount">${money(state.invoice.amount)} <span>USDC</span></div>
          <div class="simple-copy">Risk Review for an agent-created payment.</div>

          <div class="compact-token-grid">
            ${TOKENS.map(
              (token) => `
                <button class="compact-token ${quote.token.symbol === token.symbol ? "active" : ""}" data-token="${token.symbol}">
                  ${tokenIcon(token)}
                  <span>${token.symbol}</span>
                </button>
              `,
            ).join("")}
          </div>

          <div class="clean-summary">
            <div><span>Policy result</span><strong>${escapeHtml(policyResult)}</strong></div>
            <div><span>You pay</span><strong>${quote.formattedPayAmount} ${quote.token.symbol}</strong></div>
            <div><span>Recipient gets</span><strong>${money(state.invoice.amount)} USDC</strong></div>
            <div><span>Route</span><strong>${escapeHtml(quote.route)}</strong></div>
            <div><span>Risk reason</span><strong>${escapeHtml(riskReason)}</strong></div>
            <div><span>Recipient</span><strong class="mono">${escapeHtml(shortAddress(recipient))}</strong></div>
            ${reviewRows}
          </div>

          <div class="review-actions">
            <button class="primary-btn pay-action" data-pay ${settled ? "disabled" : ""}>
              ${paid ? "Payment approved" : rejected ? "Payment rejected" : "Approve payment"}
            </button>
            <button class="ghost-btn pay-action" data-reject ${settled ? "disabled" : ""}>Reject</button>
          </div>
          <button class="ghost-btn pay-link-btn" data-copy>Copy reference</button>
        </div>

        <div class="pay-card-foot">
          Risk Review · Non-custodial · Reference <span class="mono">${state.invoice.id}</span>
        </div>
      </div>
    </section>
  `;
}

function renderDocs() {
  return `
    <section class="docs-page">
      <aside class="docs-sidebar">
        <a href="#overview">Overview</a>
        <a href="#quickstart">Quickstart</a>
        <a href="#model">Model</a>
        <a href="#api">API</a>
        <a href="#product-layer">Product Layer</a>
        <a href="#open-source">Open source</a>
        <a href="#safety">Safety</a>
      </aside>

      <article class="docs-content">
        <span class="eyebrow">Documentation</span>
        <h1>jup.sh docs</h1>
        <p class="docs-lede">
          jup.sh is a Jupiter-powered risk and settlement layer for Solana
          agent payments. Agents pay with any verified token, recipients settle
          in USDC, and policy decides when humans step in.
        </p>

        <section id="overview" class="doc-section">
          <h2>Overview</h2>
          <p>
            The product direction is simple: Jupiter-powered risk and settlement
            for Solana agent payments. Agents create payment intents, policy
            checks the risk, Jupiter routes the payer token, and settlement lands
            in USDC. Human review appears only when the policy engine flags the
            payment.
          </p>
          <div class="code-card">Risk and settlement for Solana agent payments.</div>
        </section>

        <section id="quickstart" class="doc-section">
          <h2>Quickstart</h2>
          <p>
            The intended developer experience is one command or one SDK call.
            The agent asks for a payment, jup.sh evaluates policy, and payments
            inside policy continue automatically. Flagged payments return a
            Risk Review link.
          </p>
          <div class="code-card">pay --agent claude --token SOL --settle 20 USDC</div>
        </section>

        <section id="model" class="doc-section">
          <h2>Payment model</h2>
          <p>
            jup.sh is not a trading UI. It is a payment intent layer that uses
            Jupiter routing and a policy gate to produce a safe Solana agent
            payment flow.
          </p>
          <div class="code-card">agent intent -> policy decision -> Jupiter settlement -> authorize or review</div>
        </section>

        <section id="api" class="doc-section">
          <h2>API surface</h2>
          <div class="api-table">
            <div><code>POST /api/intents</code><span>Create a payment intent for an agent or app.</span></div>
            <div><code>POST /api/intents/:id/risk</code><span>Evaluate policy, token, route, recipient, and behavior risk.</span></div>
            <div><code>POST /api/intents/:id/quote</code><span>Quote any supported payer token into USDC.</span></div>
            <div><code>POST /api/intents/:id/transaction</code><span>Build a Solana transaction request for wallet approval.</span></div>
            <div><code>GET /pay/:id</code><span>Open Risk Review only when policy requires human inspection.</span></div>
            <div><code>GET /api/intents/:id/status</code><span>Track confirmation and settlement status.</span></div>
          </div>
        </section>

        <section id="product-layer" class="doc-section">
          <h2>Product Layer</h2>
          <p>
            jup.sh is powered by Jupiter API for token-to-USDC settlement. It
            helps agents pay with any verified token. Auto Pay is the default
            path, and Risk Review is only triggered by policy or risk signals.
          </p>
          <ul class="doc-list">
            <li>Agent creates a USDC-denominated payment intent.</li>
            <li>Policy checks amount, daily limits, token verification, route quality, recipient, and frequency.</li>
            <li>Payments inside policy continue to local wallet authorization.</li>
            <li>Risk Review appears for flagged payments such as new recipients or high slippage.</li>
            <li>Jupiter API quotes and routes the payer's verified token into USDC settlement.</li>
          </ul>
        </section>

        <section id="open-source" class="doc-section">
          <h2>Open source</h2>
          <p>
            The planned repo should make jup.sh easy to inspect and integrate:
            policy examples, Risk Review pages, an agent SDK, CLI examples, and
            transaction request examples for Solana wallets.
          </p>
        </section>

        <section id="safety" class="doc-section">
          <h2>Safety</h2>
          <ul class="doc-list">
            <li>No custody of user funds.</li>
            <li>No hidden routes or blind signing.</li>
            <li>Only verified or trusted token inputs.</li>
            <li>Policy limits must be explicit and inspectable.</li>
            <li>Risk Review must show amount, route, recipient, and payment reference.</li>
          </ul>
          <p class="disclaimer">
            jup.sh is an independent community-built tool. It is inspired by
            Jupiter routing and pay.sh-style agent payments, but is not
            affiliated with, sponsored by, or endorsed by Jupiter Exchange or
            Solana Foundation.
          </p>
        </section>

        <a class="primary-btn" href="/pay/${state.invoice.id}" data-link>View Risk Review</a>
      </article>
    </section>
  `;
}

function render() {
  const path = window.location.pathname;
  let view = renderHome();
  document.body.classList.add("light-route");

  if (path === "/pay/new") view = renderNewPayment();
  if (path.startsWith("/pay/") && path !== "/pay/new") view = renderCheckout();
  if (path === "/docs") view = renderDocs();

  app.innerHTML = `
    <div class="shell">
      ${createHeader()}
      <main class="main">${view}</main>
      ${createFooter()}
    </div>
  `;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-link]");
  if (link) {
    const href = link.getAttribute("href");
    if (href && href.startsWith("/")) {
      event.preventDefault();
      navigate(href);
    }
  }

  const connect = event.target.closest("[data-connect]");
  if (connect) {
    state.connected = !state.connected;
    render();
    showToast(state.connected ? "Wallet connected for prototype payment." : "Wallet disconnected.");
  }

  const tokenButton = event.target.closest("[data-token]");
  if (tokenButton) {
    state.selectedToken = tokenButton.dataset.token;
    render();
  }

  const pay = event.target.closest("[data-pay]");
  if (pay) {
    state.connected = true;
    state.paymentState = "paid";
    render();
    showToast("Payment approved. Recipient receives USDC.");
  }

  const reject = event.target.closest("[data-reject]");
  if (reject) {
    state.paymentState = "rejected";
    render();
    showToast("Payment rejected. No transaction will be sent.");
  }

  const copy = event.target.closest("[data-copy]");
  if (copy) {
    const url = `${window.location.origin}/pay/${state.invoice.id}`;
    navigator.clipboard?.writeText(url);
    showToast("Reference copied.");
  }

  const command = event.target.closest("[data-copy-command]");
  if (command) {
    navigator.clipboard?.writeText("pay --agent claude --token SOL --settle 20 USDC");
    showToast("Command copied.");
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-create-form]");
  if (!form) return;

  event.preventDefault();
  const data = new FormData(form);
  state.invoice = {
    ...state.invoice,
    id: `pay_${Math.random().toString(36).slice(2, 8)}`,
    merchant: data.get("merchant") || state.invoice.merchant,
    amount: Number(data.get("amount")) || state.invoice.amount,
    wallet: data.get("wallet") || state.invoice.wallet,
    memo: data.get("memo") || "USDC payment",
  };
  state.paymentState = "review";
  navigate(`/pay/${state.invoice.id}`);
  showToast("Payment created.");
});

window.addEventListener("popstate", render);

render();
