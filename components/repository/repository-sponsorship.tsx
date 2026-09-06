"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowUpRight, HeartHandshake } from "lucide-react";

export function RepositorySponsorship({ repositoryId }: { repositoryId: Id<"repositories"> | null | undefined }) {
  const links = useQuery(api.business.linksForRepository, repositoryId ? { repositoryId } : "skip");
  if (!links || links.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-[#b45e3c]/25 bg-[#b45e3c]/[0.04] p-5 dark:border-[#e99970]/25 dark:bg-[#e99970]/[0.05]" aria-labelledby="support-project-heading">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#b45e3c]/10 text-[#9b4d31] dark:bg-[#e99970]/10 dark:text-[#e99970]"><HeartHandshake className="h-4 w-4" /></div>
        <div>
          <h2 id="support-project-heading" className="text-sm font-semibold">Support this project</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Maintainer-provided links. OpenHub does not process or hold payments.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => <a key={link._id} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.12] px-3 py-2 text-xs font-semibold text-[#9b4d31] hover:border-[#b45e3c] hover:underline dark:border-white/[0.14] dark:text-[#e99970]"><span>{link.label}</span><ArrowUpRight className="h-3.5 w-3.5" /></a>)}
      </div>
    </section>
  );
}
