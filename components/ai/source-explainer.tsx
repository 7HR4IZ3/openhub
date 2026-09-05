"use client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAction } from "convex/react";
import { Bot, Check, GitBranch, LoaderCircle } from "lucide-react";
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
  const [mode, setMode] = useState<"explain" | "summary" | "diagram">("explain");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ text: string; mode: string; citation: { canonicalUrl: string; repositoryFullName: string; path: string; startLine: number; endLine: number } } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await explain({ sourceReference: source, question, mode });
      setAnswer(result);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "AI explanation could not be generated");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-[#b45e3c]/30 bg-[#b45e3c]/[0.04] p-4 dark:border-[#e99970]/30 dark:bg-[#e99970]/[0.05]" aria-label="Read-only AI explanation">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold"><Bot className="h-4 w-4 text-[#9b4d31] dark:text-[#e99970]" />Read-only source guide</div><span className="text-[10px] text-muted-foreground">5 free explanations per day</span></div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should I understand first?" maxLength={2000} className="h-9 min-w-0 flex-1 rounded-md border border-black/[0.12] bg-transparent px-3 text-xs outline-none focus-visible:ring-1 focus-visible:ring-[#b45e3c] dark:border-white/[0.12]" /><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="h-9 rounded-md border border-black/[0.12] bg-transparent px-3 text-xs dark:border-white/[0.12]"><option value="explain">Explain</option><option value="summary">Summarize</option><option value="diagram">Map flow</option></select><Button type="button" size="sm" className="rounded-full" onClick={() => void submit()} disabled={pending}>{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}{pending ? "Reading…" : "Ask"}</Button></div>
      {error ? <p role="alert" className="mt-3 text-xs leading-5 text-destructive">{error}</p> : null}
      {answer ? <div className="mt-4 border-t border-[#b45e3c]/20 pt-4 dark:border-[#e99970]/20"><div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{answer.text}</div><div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><Check className="h-3.5 w-3.5 text-[#9b4d31] dark:text-[#e99970]" /><span>Verified context: {answer.citation.repositoryFullName}/{answer.citation.path} · lines {answer.citation.startLine}–{answer.citation.endLine}</span><a href={answer.citation.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"><GitBranch className="h-3.5 w-3.5" />Open source</a></div></div> : null}
    </section>
  );
}
