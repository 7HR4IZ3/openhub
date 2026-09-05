"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CurationEmptyState, CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { ReputationPanel } from "@/components/curation/reputation-panel";
import { PostBody } from "@/components/posts/post-body";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  Check,
  ExternalLink,
  FileCode2,
  Github,
  Globe2,
  Link2,
  LoaderCircle,
  Map,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";

type Profile = Doc<"profiles">;

export function ProfileScreen({ convexConfigured }: { convexConfigured: boolean }) {
  if (!convexConfigured) {
    return <ProfileSetup />;
  }

  return <ConnectedProfileScreen />;
}

function ConnectedProfileScreen() {
  const profile = useQuery(api.profiles.viewer);

  if (profile === undefined) {
    return (
      <CurationShell
        active="Profile"
        eyebrow="profile"
        title="Developer identity"
        description="Your GitHub context, learning trail, and source-backed contributions in one place."
      >
        <div className="p-5 sm:p-7">
          <CurationLoading label="Importing your GitHub profile…" />
        </div>
      </CurationShell>
    );
  }

  if (profile === null) {
    return <ProfileSignInState />;
  }

  return <ProfileContent profile={profile} />;
}

function ProfileSetup() {
  return (
    <CurationShell
      active="Profile"
      eyebrow="profile"
      title="Developer identity"
      description="Your profile is where a repository trail becomes a point of view."
    >
      <div className="p-5 sm:p-7">
        <CurationStatus
          tone="accent"
          title="GitHub profile import is waiting to connect"
          body="The UI is ready, but profile reads stay off until this environment has a Convex deployment. Nothing is written while the backend is unavailable."
        />
        <CurationEmptyState
          className="mt-5"
          icon={Github}
          eyebrow="Build your trail"
          title="Bring the work you already do."
          body="Connect GitHub to import your name, avatar, public profile, interests, and repository context. OpenHub never edits your repositories."
          action="Continue with GitHub"
          actionHref="/signin"
          secondaryAction="Browse first"
          secondaryHref="/explore"
        />
        <ProfileSectionsPreview />
      </div>
    </CurationShell>
  );
}

function ProfileSignInState() {
  return (
    <CurationShell
      active="Profile"
      eyebrow="profile"
      title="Developer identity"
      description="Your profile is private to you until you choose what to share."
    >
      <div className="p-5 sm:p-7">
        <CurationEmptyState
          icon={UserRound}
          eyebrow="Sign in to continue"
          title="There is no profile trail here yet."
          body="OpenHub uses GitHub as the identity source. Sign in to import your developer profile and choose how your work appears."
          action="Connect GitHub"
          actionHref="/signin"
          secondaryAction="Explore without signing in"
          secondaryHref="/explore"
        />
      </div>
    </CurationShell>
  );
}

function ProfileContent({ profile }: { profile: Profile }) {
  const githubLogin = profile.githubLogin ?? profile.handle;
  const githubUrl = profile.githubProfileUrl ?? `https://github.com/${githubLogin}`;
  const repositoriesUrl = `https://github.com/${githubLogin}?tab=repositories`;
  const updateProfile = useMutation(api.profiles.update);
  const syncRepositories = useAction(api.profiles.syncRepositories);
  const repositories = useQuery(api.profiles.repositories, { githubLogin, limit: 12 });
  const posts = usePaginatedQuery(api.posts.byAuthor, { userId: profile.userId }, { initialNumItems: 6 });
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function refreshRepositories() {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await syncRepositories({});
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "GitHub repositories could not be imported");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <CurationShell
      active="Profile"
      eyebrow="profile"
      title="Your developer trail"
      description="A living profile for the repositories you study, the context you add, and the people you learn with."
      aside={<ProfileRail profile={profile} />}
    >
      <div>
        <ProfileHero profile={profile} githubUrl={githubUrl} onEdit={() => setEditing((value) => !value)} />
        {editing ? <ProfileEditForm profile={profile} updateProfile={updateProfile} onDone={() => setEditing(false)} /> : null}

        <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="repository-trail-heading">
          <SectionHeading
            id="repository-trail-heading"
            eyebrow="Source trail"
            title="Repositories"
            actionHref={repositoriesUrl}
            actionLabel="View GitHub repositories"
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-muted-foreground">Public repositories owned by @{githubLogin}, imported from GitHub when you ask OpenHub to refresh.</p>
            <Button type="button" variant="outline" size="sm" className="rounded-full bg-transparent" onClick={() => void refreshRepositories()} disabled={syncing}>
              {syncing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {syncing ? "Refreshing…" : "Refresh GitHub"}
            </Button>
          </div>
          {syncError ? <p role="alert" className="mt-3 text-xs text-destructive">{syncError}</p> : null}
          {repositories === undefined ? <div className="mt-5"><CurationLoading label="Loading repository trail…" /></div> : repositories.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-black/[0.12] p-5 dark:border-white/[0.12]">
              <p className="text-sm font-semibold">No imported public repositories yet.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Refresh GitHub to bring your owned repositories into your OpenHub identity. Private repositories remain private.</p>
              <Button type="button" size="sm" className="mt-4 rounded-full" onClick={() => void refreshRepositories()} disabled={syncing}>Import repositories</Button>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {repositories.map((repository) => <RepositoryCard key={repository._id} repository={repository} />)}
            </div>
          )}
        </section>

        <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="posts-heading">
          <SectionHeading
            id="posts-heading"
            eyebrow="Source-backed writing"
            title="Posts and snippets"
            actionHref="/compose"
            actionLabel="Write a post"
          />
          {posts.results.length === 0 && posts.status === "LoadingFirstPage" ? <div className="mt-5"><CurationLoading label="Loading your public posts…" /></div> : null}
          {posts.results.length === 0 && posts.status !== "LoadingFirstPage" ? <CurationEmptyState className="mt-5" icon={FileCode2} eyebrow="No public writing" title="Your source-backed trail starts with one useful post." body="Open a repository, select a line range, and add the context that helps the next reader." action="Explore repositories" actionHref="/explore" /> : null}
          {posts.results.length > 0 ? <div className="mt-5 divide-y divide-black/[0.08] rounded-2xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.08]">{posts.results.map((post) => <article key={post._id} className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b4d31] dark:text-[#e99970]">{post.type}</span><Link href={`/posts/${post._id}`} className="text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open <ArrowUpRight className="inline h-3.5 w-3.5" /></Link></div><div className="mt-3"><PostBody body={post.body} lineLinkBase={post.sourceReference?.canonicalUrl} /></div>{post.sourceReference ? <p className="mt-4 text-xs text-muted-foreground">{post.sourceReference.repositoryFullName} · {post.sourceReference.path}</p> : null}</article>)}</div> : null}
          {posts.status === "CanLoadMore" || posts.status === "LoadingMore" ? <div className="mt-4 text-center"><Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => posts.loadMore(6)} disabled={posts.status === "LoadingMore"}>{posts.status === "LoadingMore" ? "Loading…" : "Load more posts"}</Button></div> : null}
        </section>

        <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="identity-heading">
          <SectionHeading id="identity-heading" eyebrow="Profile context" title="What you care about" />
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />
                <h3 className="text-sm font-semibold">Interests</h3>
              </div>
              {profile.interests.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span key={interest} className="rounded-full bg-[#e9e6dc] px-3 py-1.5 text-xs font-semibold dark:bg-[#20251f]">
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Add a few layers of software you want to understand. They will shape recommendations, not lock you into a niche.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />
                <h3 className="text-sm font-semibold">Availability and links</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <ProfileDetail icon={Globe2} label="Portfolio" value={profile.portfolioUrl ?? "Add a portfolio link when you are ready."} href={profile.portfolioUrl} />
                <ProfileDetail icon={Users} label="Availability" value={profile.availability ?? "Share whether you are open to collaboration."} />
              </div>
            </div>
          </div>
        </section>

        <ReputationPanel userId={profile.userId} canRefresh />
      </div>
    </CurationShell>
  );
}

function ProfileHero({ profile, githubUrl, onEdit }: { profile: Profile; githubUrl: string; onEdit: () => void }) {
  return (
    <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="profile-name">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <ProfileAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-[#e9e6dc] px-2.5 py-1 font-semibold dark:bg-[#20251f]">GitHub connected</span>
              {profile.githubLogin ? <span>@{profile.githubLogin}</span> : null}
            </div>
            <h2 id="profile-name" className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              {profile.displayName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.handle}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              {profile.bio ?? "A developer making sense of software one repository at a time."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" className="rounded-full">
            <a href={githubUrl} target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={onEdit}>{"Edit profile"}</Button>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {profile.availability ? <span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">{profile.availability}</span> : null}
        <span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">Source attribution on</span>
        <span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">Read-only by design</span>
      </div>
    </section>
  );
}

export function RepositoryCard({
  repository,
}: {
  repository: {
    _id: string;
    ownerLogin: string;
    name: string;
    fullName: string;
    description: string | null;
    primaryLanguage: string | null;
    stars: number;
    forks: number;
    licenseSpdxId: string | null;
    topics: string[];
  };
}) {
  return (
    <Link href={`/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}`} className="group rounded-2xl border border-black/[0.08] p-5 transition-colors hover:border-[#b45e3c]/60 dark:border-white/[0.08] dark:hover:border-[#e99970]/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] text-muted-foreground">{repository.fullName}</p>
          <h3 className="mt-2 truncate text-base font-semibold tracking-[-0.02em]">{repository.name}</h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{repository.description ?? "No description provided by the maintainer."}</p>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {repository.primaryLanguage ? <span>{repository.primaryLanguage}</span> : null}
        <span>★ {formatCount(repository.stars)}</span>
        <span>⑂ {formatCount(repository.forks)}</span>
        {repository.licenseSpdxId ? <span>{repository.licenseSpdxId}</span> : null}
      </div>
      {repository.topics.length > 0 ? <div className="mt-3 flex flex-wrap gap-1.5">{repository.topics.slice(0, 4).map((topic) => <span key={topic} className="rounded-full bg-[#e9e6dc] px-2 py-1 text-[10px] font-semibold dark:bg-[#20251f]">{topic}</span>)}</div> : null}
    </Link>
  );
}

function ProfileEditForm({
  profile,
  updateProfile,
  onDone,
}: {
  profile: Profile;
  updateProfile: ReturnType<typeof useMutation<typeof api.profiles.update>>;
  onDone: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl ?? "");
  const [availability, setAvailability] = useState(profile.availability ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        displayName,
        bio,
        interests: interests.split(",").map((value) => value.trim()).filter(Boolean),
        portfolioUrl,
        availability,
      });
      onDone();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Profile could not be updated");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-b border-black/[0.08] bg-[#f7f7f4] p-5 dark:border-white/[0.08] dark:bg-[#111310] sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Display name<Input className="mt-2" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} required /></label>
        <label className="text-xs font-semibold">Availability<Input className="mt-2" value={availability} onChange={(event) => setAvailability(event.target.value)} maxLength={200} placeholder="Open to collaboration…" /></label>
      </div>
      <label className="mt-4 block text-xs font-semibold">Bio<textarea className="mt-2 min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={4000} /></label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Interests<Input className="mt-2" value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={2000} placeholder="TypeScript, systems, design" /></label>
        <label className="text-xs font-semibold">Portfolio URL<Input className="mt-2" value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} maxLength={500} placeholder="https://…" /></label>
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" className="rounded-full" onClick={onDone}>Cancel</Button><Button type="submit" className="rounded-full" disabled={saving || !displayName.trim()}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </form>
  );
}

function ProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#e9e6dc] text-lg font-semibold dark:bg-[#20251f]"
      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
      aria-label={`${name} avatar`}
      role="img"
    >
      {!avatarUrl ? initials : null}
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  actionHref,
  actionLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-xl font-semibold tracking-[-0.035em]">{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          {actionLabel} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function RepositoryPreviewCard({
  icon: Icon,
  title,
  body,
  href,
  action,
}: {
  icon: typeof Map;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
      <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <Link href={href} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
        {action} <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function ProfileDetail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground hover:underline">
            {value} <ExternalLink className="ml-1 inline h-3 w-3" />
          </a>
        ) : (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function SignalCard({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
      <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <span className="mt-5 inline-flex rounded-full border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:border-white/[0.1]">Coming later</span>
    </article>
  );
}

function ProfileSectionsPreview() {
  return (
    <section className="mt-5 rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-6" aria-labelledby="profile-preview-heading">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />
        <h2 id="profile-preview-heading" className="text-sm font-semibold">Your profile will bring together</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ["Source trail", "Repositories, files, and the lines you return to."],
          ["Social context", "Posts, snippets, questions, and thoughtful reviews."],
          ["Your point of view", "Interests, portfolio links, and availability."],
          ["Trust over hype", "Contribution signals, endorsements, and achievements."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl bg-[#f7f7f4] p-4 dark:bg-[#111310]">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileRail({ profile }: { profile: Profile }) {
  return (
    <>
      <section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Network state</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9e6dc] dark:bg-[#20251f]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Follow graph is next</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Your profile is ready for people and trails.</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="mt-5 w-full rounded-full" disabled title="Follow actions will use the social graph once it is connected.">
          Follow state unavailable
        </Button>
      </section>
      <section className="rounded-2xl bg-[#e9e6dc] p-5 dark:bg-[#20251f]">
        <div className="flex items-center gap-2">
          <Github className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Imported from GitHub</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {profile.githubLogin ? `@${profile.githubLogin} is the source identity for this profile.` : "Your GitHub identity is the source for this profile."}
        </p>
        <Link href="/explore" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          Continue exploring <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </>
  );
}
