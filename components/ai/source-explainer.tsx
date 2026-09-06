"use client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAction } from "convex/react";
import {
  MagicWandIcon as Bot,
  CheckIcon as Check,
  Share2Icon as GitBranch,
  UpdateIcon as LoaderCircle,
} from "@radix-ui/react-icons";
import { useState } from "react";

export type ExplainableSource = {
  provider: string;
  repositoryId: string;
  repositoryFullName: string;
  originalOwner: string;
  path: string;
  commitSha: string;
  startLine: number;
  endLine: number;
  language?: string;
  canonicalUrl: string;
  licenseSpdxId?: string;
  visibility: "public" | "private";
  sourceSnapshot: string;
};

export function SourceExplainer({ source }: { source: ExplainableSource }) {
  const explain = useAction(api.ai.explainSource);
  const [mode, setMode] = useState<"explain" | "summary" | "diagram">(
    "explain",
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{
    text: string;
    mode: string;
    citation: {
      canonicalUrl: string;
      repositoryFullName: string;
      path: string;
      startLine: number;
      endLine: number;
    };
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await explain({ sourceReference: source, question, mode });
      setAnswer(result);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "AI explanation could not be generated",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="mt-4 rounded-xl border border-ring bg-accent p-4 dark:border-ring dark:bg-accent"
      aria-label="Read-only AI explanation"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Bot className="h-4 w-4 text-foreground" />
          Read-only source guide
        </div>
        <span className="text-[10px] text-muted-foreground">
          5 free explanations per day
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-medium">
          Question
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should I understand first?"
            maxLength={2000}
            className="mt-2 h-11 w-full min-w-0 rounded-md border border-black/[0.12] bg-transparent px-3 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-white/[0.12]"
          />
        </label>
        <label className="text-xs font-medium">
          Response type
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
            className="mt-2 block h-11 w-full rounded-md border border-black/[0.12] bg-transparent px-3 text-xs dark:border-white/[0.12]"
          >
            <option value="explain">Explain</option>
            <option value="summary">Summarize</option>
            <option value="diagram">Map flow</option>
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          className="rounded-md"
          onClick={() => void submit()}
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}
          {pending ? "Reading…" : "Ask"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs leading-5 text-destructive">
          {error}
        </p>
      ) : null}
      {answer ? (
        <div className="mt-4 border-t border-ring pt-4 dark:border-ring">
          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {answer.text}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-foreground" />
            <span>
              Verified context: {answer.citation.repositoryFullName}/
              {answer.citation.path} · lines {answer.citation.startLine}–
              {answer.citation.endLine}
            </span>
            <a
              href={answer.citation.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Open source
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
