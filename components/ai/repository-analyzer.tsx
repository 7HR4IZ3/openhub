"use client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAction, useQuery } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  MagicWandIcon as Bot,
  CheckIcon as Check,
  UpdateIcon as LoaderCircle,
  GlobeIcon as Map,
} from "@radix-ui/react-icons";
import { useState } from "react";

type AnalysisMode = "summary" | "diagram";
type AnalysisCitation = {
  path: string;
  startLine: number;
  endLine: number;
  canonicalUrl: string;
};

export function RepositoryAnalyzer({
  owner,
  name,
  sourceRef,
  repositoryUrl,
  convexConfigured,
}: {
  owner: string;
  name: string;
  sourceRef: string;
  repositoryUrl: string;
  convexConfigured: boolean;
}) {
  const analyze = useAction(api.ai.analyzeRepository);
  const [clock] = useState(() => Date.now());
  const dayKey = new Date(clock).toISOString().slice(0, 10);
  const usage = useQuery(
    api.ai.usage,
    convexConfigured ? { dayKey, now: clock } : "skip",
  );
  const [mode, setMode] = useState<AnalysisMode>("summary");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Awaited<
    ReturnType<typeof analyze>
  > | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!convexConfigured || pending) return;
    setPending(true);
    setError(null);
    try {
      setAnswer(
        await analyze({
          owner,
          name,
          ref: sourceRef,
          mode,
          ...(question.trim() ? { question: question.trim() } : {}),
        }),
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Repository analysis could not be generated",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-ring bg-accent p-5 dark:border-ring dark:bg-accent"
      aria-labelledby="repository-analysis-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground dark:bg-accent">
            <Map className="h-4 w-4" />
          </div>
          <div>
            <h2
              id="repository-analysis-heading"
              className="text-sm font-semibold"
            >
              Read the codebase with AI
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              OpenHub reads a small, commit-pinned set of public or authorized
              files and returns an explanation with file-level citations. It
              cannot edit or execute the repository.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {usage
            ? `${usage.plan === "pro" ? "Pro" : "Free"} · ${usage.dailyRequestsUsed}/${usage.dailyRequestLimit} reads today`
            : "Free · 5 reads/day"}
        </span>
      </div>

      {!convexConfigured ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Connect Convex before repository analysis is available.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="repository-analysis-question">
              What should OpenHub explain?
            </label>
            <input
              id="repository-analysis-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={2_000}
              placeholder="Where should I start reading?"
              className="h-9 min-w-0 flex-1 rounded-md border border-black/[0.12] bg-transparent px-3 text-xs outline-none focus-visible:ring-1 focus-visible:ring-[#b45e3c] dark:border-white/[0.12]"
            />
            <label className="sr-only" htmlFor="repository-analysis-mode">
              Analysis mode
            </label>
            <select
              id="repository-analysis-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as AnalysisMode)}
              className="h-9 rounded-md border border-black/[0.12] bg-transparent px-3 text-xs dark:border-white/[0.12]"
            >
              <option value="summary">Orientation</option>
              <option value="diagram">Flow map</option>
            </select>
            <Button
              type="button"
              size="sm"
              className="rounded-md"
              onClick={() => void submit()}
              disabled={
                pending ||
                (usage !== null &&
                  usage !== undefined &&
                  usage.dailyRequestsUsed >= usage.dailyRequestLimit)
              }
            >
              {pending ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              {pending ? "Reading…" : "Analyze"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-xs leading-5 text-destructive">
              {error}
            </p>
          ) : null}
          {answer ? (
            <div className="mt-5 border-t border-ring pt-5 dark:border-ring">
              <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                {answer.text}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-foreground" />
                  {answer.filesIncluded} commit-pinned files
                </span>
                <span>Commit {answer.commitSha.slice(0, 7)}</span>
              </div>
              <div
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Analysis citations"
              >
                {answer.citations.map((citation: AnalysisCitation) => (
                  <a
                    key={citation.path}
                    href={`${citation.canonicalUrl}#L${citation.startLine}-L${citation.endLine}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-mono text-[10px] text-foreground hover:border-ring hover:underline"
                  >
                    <span className="truncate">
                      {citation.path}:L{citation.startLine}–L{citation.endLine}
                    </span>
                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-4 text-muted-foreground">
                Analysis is grounded in the selected commit.{" "}
                <a
                  href={repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Open the original repository
                </a>{" "}
                to verify the source.
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
