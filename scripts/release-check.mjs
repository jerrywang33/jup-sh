import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "check"]],
  ["npm", ["run", "sdk:smoke"]],
  ["npm", ["run", "alpha:smoke"]],
  ["npm", ["run", "alpha:pack"]],
  ["cargo", ["test", "--workspace"], { cwd: "rust" }],
];

for (const [command, args, options = {}] of steps) {
  console.log(`release check: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw new Error(`failed to start ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("release check: ok");
