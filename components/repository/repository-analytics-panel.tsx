"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { BarChart3 } from "lucide-react";

type Summary = {
  windowDays: number;
  totalEvents: number;
  uniqueReaders: number;
  eventsByName: Array<{ name: string; count: number }>;
  popularFiles: Array<{ path: string; views: number }>;
};

export function RepositoryAnalyticsPanel({ repositoryId }: { repositoryId: Id<"repositories"> | null | undefined }) {
  const summary = useQuery(api.analytics.repositorySummary, repositoryId ? { repositoryId, windowDays: 30 } : "skip") as Summary | null | undefined;
  if (!repositoryId || summary === undefined || summary === null) return null;
  return <section className="mt-4 rounded-2xl border border-black/[0.1] p-5 dark:border-white/[0.1]" aria-label="Repository analytics"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" /><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Maintainer view</p><h2 className="mt-1 text-base font-semibold">Repository analytics</h2></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label={`Readers / ${summary.windowDays}d`} value={String(summary.uniqueReaders)} /><Metric label="Useful events" value={String(summary.totalEvents)} /><Metric label="Files opened" value={String(summary.popularFiles.length)} /></div>{summary.popularFiles.length > 0 ? <div className="mt-4 border-t border-black/[0.08] pt-4 dark:border-white/[0.08]"><p className="text-xs font-semibold">Most opened files</p><div className="mt-2 space-y-2">{summary.popularFiles.slice(0, 5).map((file) => <div key={file.path} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-mono text-muted-foreground">{file.path}</span><span className="shrink-0 text-muted-foreground">{file.views}</span></div>)}</div></div> : null}<p className="mt-4 text-[10px] leading-4 text-muted-foreground">Aggregate, first-party events only. Organic discovery and sponsored placement remain separate.</p></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.08]"><p className="text-lg font-semibold">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>; }
