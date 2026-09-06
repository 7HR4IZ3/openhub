"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  HeartIcon as HeartHandshake,
} from "@radix-ui/react-icons";

export function RepositorySponsorship({
  repositoryId,
}: {
  repositoryId: Id<"repositories"> | null | undefined;
}) {
  const links = useQuery(
    api.business.linksForRepository,
    repositoryId ? { repositoryId } : "skip",
  );
  if (!links || links.length === 0) return null;

  return (
    <section
      className="mt-4 rounded-xl border border-ring bg-accent p-5 dark:border-ring dark:bg-accent"
      aria-labelledby="support-project-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground dark:bg-accent">
          <HeartHandshake className="h-4 w-4" />
        </div>
        <div>
          <h2 id="support-project-heading" className="text-sm font-semibold">
            Support this project
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Maintainer-provided links. OpenHub does not process or hold
            payments.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link._id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.12] px-3 py-2 text-xs font-semibold text-foreground hover:border-ring hover:underline dark:border-white/[0.14]"
          >
            <span>{link.label}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
    </section>
  );
}
