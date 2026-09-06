"use client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  CurationEmptyState,
  CurationLoading,
  CurationStatus,
} from "@/components/curation/curation-states";
import {
  CurationRail,
  CurationShell,
} from "@/components/curation/curation-shell";
import { Input } from "@/components/ui/input";
import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import {
  MinusCircledIcon as Ban,
  MixerHorizontalIcon as Filter,
  LockClosedIcon as LockKeyhole,
  CheckCircledIcon as ShieldCheck,
  SpeakerOffIcon as VolumeX,
} from "@radix-ui/react-icons";
import { useState } from "react";

export function SafetySettingsScreen({
  convexConfigured,
}: {
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return <SafetySetup />;
  return <AuthenticatedSafetySettings />;
}

function AuthenticatedSafetySettings() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading)
    return (
      <CurationShell
        active="Profile"
        eyebrow="safety"
        title="Safety and control"
      >
        <div className="page-section">
          <CurationLoading label="Loading account…" />
        </div>
      </CurationShell>
    );
  if (!isAuthenticated) return <SafetySignIn />;
  return <ConnectedSafetySettings />;
}

function ConnectedSafetySettings() {
  const blocks = usePaginatedQuery(
    api.trust.myBlocks,
    {},
    { initialNumItems: 30 },
  );
  const mutes = usePaginatedQuery(
    api.trust.myMutes,
    {},
    { initialNumItems: 30 },
  );
  const filters = usePaginatedQuery(
    api.trust.myKeywordFilters,
    {},
    { initialNumItems: 30 },
  );
  const setBlock = useMutation(api.trust.setBlock);
  const setMute = useMutation(api.trust.setMute);
  const setKeywordFilter = useMutation(api.trust.setKeywordFilter);
  const removeKeywordFilter = useMutation(api.trust.removeKeywordFilter);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);

  async function updateSetting(action: () => Promise<unknown>) {
    if (pending) return;
    setPending(true);
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError("This setting could not be saved. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function addFilter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phrase.trim() || pending) return;
    setPending(true);
    setFilterError(null);
    try {
      await setKeywordFilter({ phrase, enabled: true });
      setPhrase("");
    } catch (error) {
      setFilterError(
        error instanceof Error ? error.message : "Filter could not be saved",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <CurationShell
      active="Profile"
      eyebrow="safety"
      title="Safety and control"
      description="Shape what reaches your trail. Blocking and muting are private settings and never appear in public profiles."
      aside={<CurationRail />}
    >
      <section className="border-b border-border p-5 sm:p-7">
        <div className="flex items-start gap-3 rounded-xl bg-secondary p-5 dark:bg-secondary">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
          <div>
            <p className="text-sm font-semibold">Your reading boundary</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Muted people, repositories, topics, and keywords are filtered from
              feed and conversation reads. Reports create a traceable review
              record; they do not instantly delete another person’s work.
            </p>
          </div>
        </div>
      </section>
      {actionError ? (
        <p role="alert" className="px-5 py-3 text-sm text-destructive sm:px-7">
          {actionError}
        </p>
      ) : null}
      <section className="grid gap-5 p-5 sm:p-7">
        <SafetyPanel
          icon={Ban}
          title="Blocked people"
          description="Blocked accounts cannot appear in your feed or interact with your posts."
        >
          <div className="space-y-2">
            {blocks.results.map((block) => (
              <div
                key={block._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"
              >
                <span className="truncate font-mono">
                  {block.blockedUserId}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-md"
                  disabled={pending}
                  onClick={() =>
                    void updateSetting(() =>
                      setBlock({
                        blockedUserId: block.blockedUserId,
                        blocked: false,
                      }),
                    )
                  }
                >
                  Unblock
                </Button>
              </div>
            ))}
            {blocks.results.length === 0 &&
            blocks.status === "LoadingFirstPage" ? (
              <CurationLoading label="Loading blocks…" />
            ) : null}
            {blocks.results.length === 0 &&
            blocks.status !== "LoadingFirstPage" ? (
              <p className="text-sm text-muted-foreground">
                No blocked accounts.
              </p>
            ) : null}
          </div>
          {blocks.status === "CanLoadMore" ||
          blocks.status === "LoadingMore" ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              disabled={blocks.status === "LoadingMore"}
              onClick={() => blocks.loadMore(30)}
            >
              {blocks.status === "LoadingMore" ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </SafetyPanel>
        <SafetyPanel
          icon={VolumeX}
          title="Muted targets"
          description="Mute a person or repository from its context menu. Topic and category mutes are stored here too."
        >
          <div className="space-y-2">
            {mutes.results.map((mute) => (
              <div
                key={mute._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"
              >
                <span className="truncate font-mono">{mute.targetKey}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-md"
                  disabled={pending}
                  onClick={() =>
                    void updateSetting(() =>
                      setMute({ target: mute.target, muted: false }),
                    )
                  }
                >
                  Unmute
                </Button>
              </div>
            ))}
            {mutes.results.length === 0 &&
            mutes.status === "LoadingFirstPage" ? (
              <CurationLoading label="Loading mutes…" />
            ) : null}
            {mutes.results.length === 0 &&
            mutes.status !== "LoadingFirstPage" ? (
              <p className="text-sm text-muted-foreground">No muted targets.</p>
            ) : null}
          </div>
          {mutes.status === "CanLoadMore" || mutes.status === "LoadingMore" ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              disabled={mutes.status === "LoadingMore"}
              onClick={() => mutes.loadMore(30)}
            >
              {mutes.status === "LoadingMore" ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </SafetyPanel>
        <SafetyPanel
          icon={Filter}
          title="Keyword filters"
          description="Hide posts containing words or phrases you do not want in your reading trail."
        >
          <label
            htmlFor="keyword-filter"
            className="mb-2 block text-sm font-medium"
          >
            Word or phrase
          </label>
          <form onSubmit={addFilter} className="flex gap-2">
            <Input
              id="keyword-filter"
              disabled={pending}
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder="Add a phrase"
              maxLength={120}
            />
            <Button
              type="submit"
              className="shrink-0 rounded-md"
              disabled={!phrase.trim() || pending}
            >
              Add
            </Button>
          </form>
          {filterError ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {filterError}
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            {filters.results.map((filter) => (
              <div
                key={filter._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"
              >
                <span className="truncate">{filter.phrase}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-md"
                  disabled={pending}
                  onClick={() =>
                    void updateSetting(() =>
                      removeKeywordFilter({ filterId: filter._id }),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            {filters.results.length === 0 &&
            filters.status !== "LoadingFirstPage" ? (
              <p className="text-sm text-muted-foreground">
                No keyword filters.
              </p>
            ) : null}
          </div>
          {filters.status === "CanLoadMore" ||
          filters.status === "LoadingMore" ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              disabled={filters.status === "LoadingMore"}
              onClick={() => filters.loadMore(30)}
            >
              {filters.status === "LoadingMore" ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </SafetyPanel>
        <SafetyPanel
          icon={LockKeyhole}
          title="Privacy boundary"
          description="OpenHub only displays and caches provider content. Blocking and moderation never grant access to private repositories."
        >
          <p className="text-sm leading-6 text-muted-foreground">
            Private repository access is always checked against the provider
            connection. A profile, list, or post ID is never treated as
            permission.
          </p>
        </SafetyPanel>
      </section>
    </CurationShell>
  );
}

function SafetyPanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Ban;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SafetySetup() {
  return (
    <CurationShell
      active="Profile"
      eyebrow="safety"
      title="Safety and control"
      aside={<CurationRail />}
    >
      <div className="p-5 sm:p-7">
        <CurationStatus
          title="Safety settings are unavailable right now"
          body="Please return later to manage your settings. Public repository browsing is still available."
        />
      </div>
    </CurationShell>
  );
}
function SafetySignIn() {
  return (
    <CurationShell
      active="Profile"
      eyebrow="safety"
      title="Safety and control"
      aside={<CurationRail />}
    >
      <CurationEmptyState
        className="m-5 sm:m-7"
        icon={ShieldCheck}
        eyebrow="Sign in to continue"
        title="Your reading boundary is private."
        body="Connect GitHub to manage blocks, mutes, keyword filters, and reports."
        action="Connect GitHub"
        actionHref="/signin"
        secondaryAction="Explore first"
        secondaryHref="/explore"
      />
    </CurationShell>
  );
}
