import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const packageDir = resolve(repoRoot, "npm");
const packageJsonPath = resolve(packageDir, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: packageDir,
  encoding: "utf8",
  env: {
    ...process.env,
    npm_config_cache: "/tmp/jup-sh-npm-cache",
    npm_config_logs_dir: "/tmp/jup-sh-npm-logs",
  },
});

if (result.status !== 0) {
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  throw new Error("npm pack --dry-run failed");
}

const packs = JSON.parse(result.stdout);
if (!Array.isArray(packs) || packs.length !== 1) {
  throw new Error("npm pack --dry-run returned an unexpected result");
}

const pack = packs[0];
const files = pack.files.map((file) => file.path).sort();
const expectedFiles = ["README.md", "bin/jup-sh", "package.json"];
const forbiddenPatterns = [
  /^\.env/,
  /^node_modules\//,
  /^\.wrangler\//,
  /^rust\/target\//,
  /^\.jup-sh\//,
  /GITHUB_TOKEN/i,
  /CLOUDFLARE/i,
];

for (const expected of expectedFiles) {
  if (!files.includes(expected)) {
    throw new Error(`npm package is missing ${expected}`);
  }
}

for (const file of files) {
  if (forbiddenPatterns.some((pattern) => pattern.test(file))) {
    throw new Error(`npm package includes forbidden file: ${file}`);
  }
}

if (packageJson.name !== "jup-sh") {
  throw new Error(`unexpected npm package name: ${packageJson.name}`);
}

if (packageJson.bin?.["jup-sh"] !== "bin/jup-sh") {
  throw new Error("npm package must expose bin/jup-sh as jup-sh");
}

if (packageJson.private === true) {
  throw new Error("npm alpha package is still private");
}

if (packageJson.version !== "0.1.0-alpha.6") {
  throw new Error(`unexpected npm alpha version: ${packageJson.version}`);
}

if (packageJson.publishConfig?.tag !== "alpha") {
  throw new Error("npm alpha package must publish with the alpha tag");
}

console.log("npm alpha pack dry-run: ok");
console.log(`package: ${pack.id}`);
console.log(`files: ${files.join(", ")}`);
console.log(`size: ${pack.size} bytes`);
