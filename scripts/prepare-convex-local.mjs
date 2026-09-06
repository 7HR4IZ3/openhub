import { existsSync, readFileSync, writeFileSync } from "node:fs";

const envPath = ".env.local";
if (!existsSync(envPath)) {
  console.log("No .env.local yet; start the local Convex backend first.");
  process.exit(0);
}

const source = readFileSync(envPath, "utf8");
const lines = source.split(/\r?\n/);
const values = new Map();
for (const line of lines) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match) values.set(match[1], match[2]);
}

const convexUrl = values.get("CONVEX_URL");
if (!values.get("NEXT_PUBLIC_CONVEX_URL") && convexUrl) {
  const nextSource = `${source.replace(/\s*$/, "")}\nNEXT_PUBLIC_CONVEX_URL=${convexUrl}\n`;
  writeFileSync(envPath, nextSource, "utf8");
  console.log("Bridged CONVEX_URL to NEXT_PUBLIC_CONVEX_URL in .env.local.");
} else if (values.get("NEXT_PUBLIC_CONVEX_URL")) {
  console.log("NEXT_PUBLIC_CONVEX_URL is already configured.");
} else {
  console.log("Convex has not written a URL yet.");
}
