import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const env = { ...process.env, CONVEX_AGENT_MODE: "anonymous" };
const convex = spawn("node_modules/.bin/convex", ["dev", "--typecheck", "enable", "--codegen", "enable"], {
  env,
  stdio: "inherit",
});

let frontend;
let stopped = false;

function stop(exitCode = 0) {
  if (stopped) return;
  stopped = true;
  if (frontend && !frontend.killed) frontend.kill("SIGTERM");
  if (!convex.killed) convex.kill("SIGTERM");
  process.exit(exitCode);
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
convex.on("exit", (code) => {
  if (!stopped && code !== 0) stop(code ?? 1);
});

const deadline = Date.now() + 120_000;
while (!stopped && Date.now() < deadline) {
  if (existsSync(".env.local")) {
    const localEnv = readFileSync(".env.local", "utf8");
    if (/^CONVEX_URL=.+$/m.test(localEnv) || /^NEXT_PUBLIC_CONVEX_URL=.+$/m.test(localEnv)) break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (stopped) process.exit(130);
if (!existsSync(".env.local")) {
  console.error("Convex did not create .env.local within two minutes.");
  stop(1);
}

const prepare = spawn(process.execPath, ["scripts/prepare-convex-local.mjs"], { env, stdio: "inherit" });
await new Promise((resolve) => prepare.on("exit", resolve));
if (stopped) process.exit(130);

frontend = spawn("npm", ["run", "dev:frontend"], { env, stdio: "inherit" });
frontend.on("exit", (code) => stop(code ?? 0));
await new Promise(() => {});
