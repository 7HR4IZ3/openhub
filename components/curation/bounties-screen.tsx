"use client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import {
  CurationRail,
  CurationShell,
} from "@/components/curation/curation-shell";
import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  TokensIcon as CircleDollarSign,
  ExternalLinkIcon as ExternalLink,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { type FormEvent, useState } from "react";

export function BountiesScreen({
  convexConfigured,
}: {
  convexConfigured: boolean;
}) {
  if (!convexConfigured)
    return (
      <CurationShell
        active="Explore"
        eyebrow="tasks"
        title="Tasks and bounties"
      >
        <div className="p-5 sm:p-7">
          <CurationEmptyState
            icon={CircleDollarSign}
            eyebrow="Connect Convex"
            title="External task listings will appear here."
            body="OpenHub records task context and links out to the issue or payment provider. It never holds funds or executes payments."
            action="Explore repositories"
            actionHref="/explore"
          />
        </div>
      </CurationShell>
    );
  return <ConnectedBounties />;
}

function ConnectedBounties() {
  const listings = usePaginatedQuery(
    api.bounties.discover,
    {},
    { initialNumItems: 20 },
  );
  const { isAuthenticated } = useConvexAuth();
  const [creating, setCreating] = useState(false);
  return (
    <CurationShell
      active="Explore"
      eyebrow="tasks"
      title="Tasks and bounties"
      description="Find concrete ways to contribute. OpenHub links to external issue and payment systems; it does not hold funds."
      aside={<CurationRail />}
    >
      <section className="border-b border-border p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
              Contribution paths
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              Open tasks with a clear next step.
            </h2>
          </div>
          <Button
            type="button"
            className="rounded-md"
            onClick={() => setCreating((value) => !value)}
            disabled={!isAuthenticated}
          >
            {isAuthenticated
              ? creating
                ? "Close form"
                : "Post a task"
              : "Sign in to post"}
          </Button>
        </div>
        {creating ? (
          <CreateBountyForm onCreated={() => setCreating(false)} />
        ) : null}
      </section>
      <section className="p-5 sm:p-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Public listings
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">
              Tasks worth opening
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            External links only
          </span>
        </div>
        {listings.results.length === 0 &&
        listings.status === "LoadingFirstPage" ? (
          <div className="mt-5">
            <CurationLoading label="Loading open tasks…" />
          </div>
        ) : null}
        {listings.results.length === 0 &&
        listings.status !== "LoadingFirstPage" ? (
          <CurationEmptyState
            className="mt-5"
            icon={CircleDollarSign}
            eyebrow="No open tasks"
            title="The first useful task can start with a repository question."
            body="Keep the scope concrete and link the canonical issue or external reward page."
            action="Explore repositories"
            actionHref="/explore"
          />
        ) : null}
        <div className="mt-5 space-y-3">
          {listings.results.map((bounty) => (
            <article
              key={bounty._id}
              className="rounded-xl border border-border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    {bounty.repositoryLabel || "OpenHub task"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.025em]">
                    {bounty.title}
                  </h3>
                </div>
                {bounty.amount !== undefined ? (
                  <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold dark:bg-secondary">
                    {bounty.currency || "USD"} {bounty.amount}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {bounty.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
                <a
                  href={bounty.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-foreground hover:underline"
                >
                  Open issue <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {bounty.paymentUrl ? (
                  <a
                    href={bounty.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-foreground hover:underline"
                  >
                    Reward details <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {listings.status === "CanLoadMore" ||
        listings.status === "LoadingMore" ? (
          <div className="mt-5 text-center">
            <Button
              type="button"
              variant="ghost"
              className="rounded-md text-xs"
              onClick={() => listings.loadMore(20)}
              disabled={listings.status === "LoadingMore"}
            >
              {listings.status === "LoadingMore"
                ? "Loading…"
                : "Load more tasks"}
            </Button>
          </div>
        ) : null}
      </section>
    </CurationShell>
  );
}

function CreateBountyForm({ onCreated }: { onCreated: () => void }) {
  const create = useMutation(api.bounties.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repositoryLabel, setRepositoryLabel] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await create({
        title,
        description,
        repositoryLabel: repositoryLabel || undefined,
        issueUrl,
        paymentUrl: paymentUrl || undefined,
        amount: amount ? Number(amount) : undefined,
        currency: amount ? currency : undefined,
      });
      onCreated();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Task could not be posted",
      );
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-xl border border-border bg-background p-4 dark:bg-background sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>Task title</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            maxLength={160}
            required
          />
        </label>
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>Repository or project (optional)</span>
          <Input
            value={repositoryLabel}
            onChange={(event) => setRepositoryLabel(event.target.value)}
            placeholder="Repository or project (optional)"
            maxLength={160}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What needs to be done?"
          maxLength={8000}
          rows={5}
          required
          className="mt-3 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>Issue link</span>
          <Input
            value={issueUrl}
            onChange={(event) => setIssueUrl(event.target.value)}
            type="url"
            placeholder="Canonical issue URL (https://…)"
            required
          />
        </label>
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>Reward link (optional)</span>
          <Input
            value={paymentUrl}
            onChange={(event) => setPaymentUrl(event.target.value)}
            type="url"
            placeholder="External reward URL (optional)"
          />
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>Reward amount (optional)</span>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="Reward amount (optional)"
          />
        </label>
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>USD</span>
          <Input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            maxLength={3}
            placeholder="USD"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          className="rounded-md"
          disabled={
            saving || !title.trim() || !description.trim() || !issueUrl.trim()
          }
        >
          {saving ? "Posting…" : "Post task"}
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
