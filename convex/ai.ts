import { getAuthUserId } from "@convex-dev/auth/server";
import { Agent } from "@convex-dev/agent";
import { ConvexError, v } from "convex/values";
import type { FunctionReference } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { verifyPublicSource } from "./github-source";

const modeValidator = v.union(v.literal("explain"), v.literal("summary"), v.literal("diagram"));
const sourceInputValidator = v.object({
  provider: v.string(),
  repositoryId: v.string(),
  repositoryFullName: v.string(),
  originalOwner: v.string(),
  path: v.string(),
  commitSha: v.string(),
  startLine: v.number(),
  endLine: v.number(),
  language: v.optional(v.string()),
  canonicalUrl: v.string(),
  licenseSpdxId: v.optional(v.string()),
  visibility: v.union(v.literal("public"), v.literal("private")),
  sourceSnapshot: v.string(),
});
const citationValidator = v.object({
  repositoryFullName: v.string(),
  path: v.string(),
  commitSha: v.string(),
  startLine: v.number(),
  endLine: v.number(),
  canonicalUrl: v.string(),
});
const resultValidator = v.object({
  threadId: v.string(),
  mode: modeValidator,
  text: v.string(),
  citation: citationValidator,
});

const repositoryModeValidator = v.union(v.literal("summary"), v.literal("diagram"));
const repositoryCitationValidator = v.object({
  path: v.string(),
  startLine: v.number(),
  endLine: v.number(),
  canonicalUrl: v.string(),
});
const repositoryResultValidator = v.object({
  threadId: v.string(),
  mode: repositoryModeValidator,
  text: v.string(),
  commitSha: v.string(),
  citations: v.array(repositoryCitationValidator),
  filesIncluded: v.number(),
});

type AiResult = {
  threadId: string;
  mode: "explain" | "summary" | "diagram";
  text: string;
  citation: {
    repositoryFullName: string;
    path: string;
    commitSha: string;
    startLine: number;
    endLine: number;
    canonicalUrl: string;
  };
};
type RepositoryAnalysisResult = {
  threadId: string;
  mode: "summary" | "diagram";
  text: string;
  commitSha: string;
  citations: Array<{
    path: string;
    startLine: number;
    endLine: number;
    canonicalUrl: string;
  }>;
  filesIncluded: number;
};
type QuotaRefs = {
  consumeQuota: FunctionReference<"mutation", "internal", { userId: Id<"users">; dayKey: string; inputCharacters: number }, boolean>;
};
const refs = internal.ai as unknown as QuotaRefs;

const repositoryGuide = new Agent(components.agent, {
  name: "OpenHub repository guide",
  languageModel: "openai/gpt-5.4-mini",
  instructions: "You are OpenHub's read-only repository guide. Explain public source for learning. Never claim to have run, modified, or executed code. Never invent APIs or citations. Use the supplied citation when referring to the source. For diagram requests, return Mermaid flowchart code plus a short explanation. Do not generate promotional copy.",
});

export const consumeQuota = internalMutation({
  args: { userId: v.id("users"), dayKey: v.string(), inputCharacters: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.inputCharacters) || args.inputCharacters < 0 || args.inputCharacters > 100_000) throw new ConvexError("AI input is too large");
    const existing = await ctx.db.query("aiUsage").withIndex("by_user_day", (q) => q.eq("userId", args.userId).eq("dayKey", args.dayKey)).unique();
    if (existing && existing.requestCount >= 5) return false;
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { requestCount: existing.requestCount + 1, inputCharacters: existing.inputCharacters + args.inputCharacters, updatedAt: now });
    } else {
      await ctx.db.insert("aiUsage", { userId: args.userId, dayKey: args.dayKey, requestCount: 1, inputCharacters: args.inputCharacters, updatedAt: now });
    }
    return true;
  },
});

export const explainSource = action({
  args: { question: v.string(), mode: modeValidator, sourceReference: sourceInputValidator },
  returns: resultValidator,
  handler: async (ctx, args): Promise<AiResult> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required for AI explanations");
    const question = args.question.trim().slice(0, 2_000);
    const trusted = await verifyPublicSource(args.sourceReference);
    const dayKey = new Date().toISOString().slice(0, 10);
    const allowed = await ctx.runMutation(refs.consumeQuota, { userId, dayKey, inputCharacters: question.length + trusted.sourceSnapshot.length });
    if (!allowed) throw new ConvexError("Free AI limit reached for today");
    const citation = {
      repositoryFullName: trusted.repositoryFullName,
      path: trusted.path,
      commitSha: trusted.commitSha,
      startLine: trusted.startLine,
      endLine: trusted.endLine,
      canonicalUrl: trusted.canonicalUrl,
    };
    const { threadId } = await repositoryGuide.createThread(ctx, { userId: String(userId), title: `${trusted.repositoryFullName}/${trusted.path}` });
    const prompt = buildPrompt(args.mode, question, trusted);
    const response = await repositoryGuide.generateText(ctx, { userId: String(userId), threadId }, { prompt });
    return { threadId, mode: args.mode, text: response.text.slice(0, 20_000), citation };
  },
});

export const analyzeRepository = action({
  args: {
    owner: v.string(),
    name: v.string(),
    ref: v.string(),
    question: v.optional(v.string()),
    mode: repositoryModeValidator,
  },
  returns: repositoryResultValidator,
  handler: async (ctx, args): Promise<RepositoryAnalysisResult> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required for repository analysis");
    const context = await loadRepositoryContext(args.owner, args.name, args.ref);
    const question = (args.question ?? "").trim().slice(0, 2_000);
    const inputCharacters = context.prompt.length + question.length;
    const dayKey = new Date().toISOString().slice(0, 10);
    const allowed = await ctx.runMutation(refs.consumeQuota, { userId, dayKey, inputCharacters });
    if (!allowed) throw new ConvexError("Free AI limit reached for today");
    const { threadId } = await repositoryGuide.createThread(ctx, {
      userId: String(userId),
      title: `${context.owner}/${context.name} repository map`,
    });
    const task = args.mode === "diagram"
      ? "Create a compact Mermaid flowchart showing the most important control or data flow visible in this repository context. Return Mermaid code first, followed by a short plain-language explanation."
      : "Summarize how this repository is organized, where execution starts, how its main pieces connect, and what a new developer should read first.";
    const prompt = `${task}\n\nUser focus: ${question || "Give me the most useful orientation for learning this repository."}\n\nRules:\n- You are read-only. Never claim to run or modify code.\n- Use only the supplied files. If the context is incomplete, say so.\n- Cite files inline using [path:Lstart-Lend] when making concrete claims.\n- Do not invent dependencies, commands, or architecture.\n\nRepository: ${context.owner}/${context.name}\nResolved commit: ${context.commitSha}\n\n${context.prompt}`;
    const response = await repositoryGuide.generateText(ctx, { userId: String(userId), threadId }, { prompt });
    return {
      threadId,
      mode: args.mode,
      text: response.text.slice(0, 24_000),
      commitSha: context.commitSha,
      citations: context.citations,
      filesIncluded: context.citations.length,
    };
  },
});

function buildPrompt(mode: "explain" | "summary" | "diagram", question: string, source: Awaited<ReturnType<typeof verifyPublicSource>>) {
  const task = mode === "diagram" ? "Produce a compact Mermaid flowchart showing the control or data flow visible in this source. Follow it with a short explanation." : mode === "summary" ? "Summarize what this source does, its inputs and outputs, and the main tradeoffs." : "Explain this source line by line at a useful level for a developer learning the codebase.";
  return `${task}\n\nUser question: ${question || "What should I understand first?"}\n\nTrusted citation: ${source.repositoryFullName}/${source.path} at commit ${source.commitSha}, lines ${source.startLine}-${source.endLine}.\n\nSource:\n${source.sourceSnapshot}`;
}

type RepositoryContext = {
  owner: string;
  name: string;
  commitSha: string;
  prompt: string;
  citations: Array<{
    path: string;
    startLine: number;
    endLine: number;
    canonicalUrl: string;
  }>;
};

async function loadRepositoryContext(owner: string, name: string, ref: string): Promise<RepositoryContext> {
  validateRepositorySegment(owner, "owner");
  validateRepositorySegment(name, "repository");
  const safeRef = validateRepositoryRef(ref);
  const token = process.env.GITHUB_PUBLIC_TOKEN?.trim();
  if (!token) throw new ConvexError("Public GitHub access is not configured for repository analysis");

  const repository = record(await githubJson(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`));
  if (repository.private === true || repository.disabled === true || repository.visibility !== "public") {
    throw new ConvexError("Only public GitHub repositories can be analyzed");
  }
  const commit = record(await githubJson(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(safeRef)}`));
  const commitSha = typeof commit.sha === "string" && /^[a-f0-9]{40}$/i.test(commit.sha) ? commit.sha : null;
  if (commitSha === null) throw new ConvexError("GitHub did not resolve the repository ref");
  const tree = record(await githubJson(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`));
  const entries = Array.isArray(tree.tree) ? tree.tree.filter(isTreeEntry) : [];
  if (entries.length === 0) throw new ConvexError("The repository did not return a readable file tree");

  const paths = chooseAnalysisPaths(entries);
  const files = await Promise.all(paths.map(async (path) => {
    try {
      const value = record(await githubJson(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodePath(path)}?ref=${encodeURIComponent(commitSha)}`));
      if (value.type !== "file" || value.encoding !== "base64" || typeof value.content !== "string") return null;
      const text = decodeBase64(value.content.replace(/\s/g, ""));
      if (text.length === 0 || text.length > 32_000) return null;
      return { path, text };
    } catch {
      return null;
    }
  }));
  const usable: Array<{ path: string; text: string }> = [];
  let remainingCharacters = 84_000;
  for (const file of files) {
    if (file === null || remainingCharacters <= 0) continue;
    const text = file.text.slice(0, remainingCharacters);
    if (text.length === 0) continue;
    usable.push({ path: file.path, text });
    remainingCharacters -= text.length;
  }
  if (usable.length === 0) throw new ConvexError("No readable source files were available for analysis");

  const citations = usable.map(({ path, text }) => ({
    path,
    startLine: 1,
    endLine: Math.max(1, text.split(/\r?\n/).length),
    canonicalUrl: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/blob/${commitSha}/${encodePath(path)}`,
  }));
  const prompt = usable.map(({ path, text }) => {
    const numbered = text.split(/\r?\n/).map((line, index) => `${index + 1}| ${line}`).join("\n");
    return `--- FILE ${path} ---\n${numbered}`;
  }).join("\n\n");
  return { owner, name, commitSha, prompt, citations };
}

function chooseAnalysisPaths(entries: Array<{ path: string; type: string; size: number | null }>) {
  const files = entries
    .filter((entry) => entry.type === "blob" && entry.size !== null && entry.size <= 32_000 && isReadablePath(entry.path))
    .map((entry) => entry.path);
  const selected: string[] = [];
  const add = (path: string) => { if (files.includes(path) && !selected.includes(path) && selected.length < 8) selected.push(path); };
  const manifestNames = ["README.md", "README", "package.json", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml", "Dockerfile", "docker-compose.yml", "tsconfig.json"];
  for (const name of manifestNames) add(name);
  for (const path of files.filter((candidate) => /(^|\/)(index|main|app|server|cli)\.[a-z0-9]+$/i.test(candidate)).sort((a, b) => a.length - b.length)) add(path);
  for (const path of files.filter((candidate) => /^(src|app|lib|packages)\//.test(candidate) && !candidate.includes("/test") && !candidate.includes("/spec")).sort((a, b) => a.length - b.length)) add(path);
  for (const path of files) add(path);
  return selected.slice(0, 8);
}

function isReadablePath(path: string) {
  return path.length <= 240 && !/(^|\/)(node_modules|vendor|dist|build|\.git)\//.test(path) && !/\.(png|jpe?g|gif|webp|svg|ico|pdf|zip|lock)$/i.test(path);
}

function isTreeEntry(value: unknown): value is { path: string; type: string; size: number | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.path === "string" && typeof row.type === "string" && (row.size === undefined || row.size === null || typeof row.size === "number");
}

function validateRepositorySegment(value: string, label: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(value)) throw new ConvexError(`Invalid GitHub ${label}`);
}

function validateRepositoryRef(value: string) {
  if (!value || value.length > 255 || value.startsWith("/") || value.includes("..") || /[\u0000-\u001f\u007f]/.test(value)) throw new ConvexError("Invalid repository ref");
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConvexError("GitHub returned invalid repository data");
  return value as Record<string, unknown>;
}

async function githubJson(token: string, path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28" },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  if (raw.length > 4_000_000) throw new ConvexError("GitHub repository response is too large");
  if (!response.ok) throw new ConvexError("GitHub repository analysis failed");
  try { return JSON.parse(raw) as unknown; } catch { throw new ConvexError("GitHub returned invalid repository data"); }
}

function encodePath(value: string) { return value.split("/").map(encodeURIComponent).join("/"); }
function decodeBase64(value: string) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return new TextDecoder().decode(bytes); }
