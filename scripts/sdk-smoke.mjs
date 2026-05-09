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

  console.log("sdk smoke: ok");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
