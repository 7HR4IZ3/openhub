"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CurationEmptyState, CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { ProfilePostTrail } from "@/components/curation/profile-post-trail";
import { ProfileListTrail } from "@/components/curation/profile-list-trail";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  Check,
  Code2,
  ExternalLink,
  FileCode2,
  Github,
  Globe2,
  Heart,
  Link2,
  Map,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

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
  const [editing, setEditing] = useState(false);

  return (
    <CurationShell
      active="Profile"
      eyebrow="profile"
      title="Your developer trail"
      description="A living profile for the repositories you study, the context you add, and the people you learn with."
      aside={<ProfileRail profile={profile} />}
    >
      <div>
        <ProfileHero profile={profile} githubUrl={githubUrl} onEdit={() => setEditing(true)} />
        {editing ? <ProfileEditor profile={profile} onDone={() => setEditing(false)} /> : null}

        <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="repository-trail-heading">
          <SectionHeading
            id="repository-trail-heading"
            eyebrow="Source trail"
            title="Repositories"
            actionHref={repositoriesUrl}
            actionLabel="View GitHub repositories"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <RepositoryPreviewCard
              icon={Map}
              title="Your repository trail"
              body="Repositories you browse, save, and discuss will collect here with their source context intact."
              href="/explore"
              action="Browse repositories"
            />
            <RepositoryPreviewCard
              icon={Code2}
              title="Learning signals"
              body="Approachability, meaningful activity, and maintainer context will make the next project easier to choose."
              href="/explore"
              action="See discovery signals"
            />
          </div>
        </section>

        <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="posts-heading">
          <SectionHeading
            id="posts-heading"
            eyebrow="Source-backed writing"
            title="Posts and snippets"
            actionHref="/compose"
            actionLabel="Write a post"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <RepositoryPreviewCard
              icon={FileCode2}
              title="Snippets with provenance"
              body="Share a useful function or line range while keeping the original owner, commit, language, and license attached."
              href="/compose"
              action="Compose a snippet"
            />
            <RepositoryPreviewCard
              icon={Heart}
              title="Conversations worth returning to"
              body="Questions, reviews, and discussions form a readable record of how you understand software."
              href="/home"
              action="Find a conversation"
            />
          </div>
        </section>

        <ProfilePostTrail userId={profile.userId} own />

        <ProfileListTrail userId={profile.userId} own />

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

        <ReputationSection userId={profile.userId} />
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
          <Button type="button" variant="outline" className="rounded-full" onClick={onEdit}>
            Edit profile
          </Button>
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

function ProfileEditor({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const updateProfile = useMutation(api.profiles.update);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl ?? "");
  const [availability, setAvailability] = useState(profile.availability ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        bio,
        interests: interests.split(",").map((value) => value.trim()).filter(Boolean),
        portfolioUrl,
        availability,
      });
      onDone();
    } catch {
      setError("Profile changes could not be saved. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-b border-black/[0.08] bg-[#f7f7f4] p-5 dark:border-white/[0.08] dark:bg-[#111310] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">Profile settings</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">Shape your public context</h2></div>
        <Button type="button" variant="ghost" className="rounded-full" onClick={onDone}>Cancel</Button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ProfileField id="profile-display-name" label="Display name" value={displayName} onChange={setDisplayName} maxLength={100} />
        <ProfileField id="profile-availability" label="Availability" value={availability} onChange={setAvailability} maxLength={200} placeholder="Open to collaboration" />
        <label className="text-xs font-semibold sm:col-span-2" htmlFor="profile-bio">Bio<textarea id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={4000} rows={3} className="mt-2 w-full resize-y rounded-xl border border-black/[0.1] bg-transparent px-3 py-2 text-sm leading-6 font-normal outline-none focus:border-[#b45e3c] dark:border-white/[0.1]" /></label>
        <ProfileField id="profile-interests" label="Interests" value={interests} onChange={setInterests} placeholder="typescript, compilers, ui" hint="Comma-separated" />
        <ProfileField id="profile-portfolio" label="Portfolio URL" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://example.com" />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">GitHub identity fields stay linked to your account.</p><Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button></div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function ProfileField({ id, label, value, onChange, maxLength, placeholder, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string; hint?: string }) {
  return <label className="text-xs font-semibold" htmlFor={id}>{label}{hint ? <span className="ml-2 font-normal text-muted-foreground">({hint})</span> : null}<input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} placeholder={placeholder} className="mt-2 h-10 w-full rounded-xl border border-black/[0.1] bg-transparent px-3 text-sm font-normal outline-none focus:border-[#b45e3c] dark:border-white/[0.1]" /></label>;
}

function ReputationSection({ userId }: { userId: Profile["userId"] }) {
  const reputation = useQuery(api.reputation.forUser, { userId });
  const achievements = useQuery(api.reputation.achievementsForUser, { userId });
  const refresh = useAction(api.reputation.refreshViewer);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshReputation() {
    setError(null); setRefreshing(true);
    try { await refresh({}); } catch { setError("GitHub contribution data could not be refreshed yet."); }
    finally { setRefreshing(false); }
  }

  return (
    <section className="p-5 sm:p-7" aria-labelledby="reputation-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading id="reputation-heading" eyebrow="Trust, slowly earned" title="Reputation and achievements" />
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void refreshReputation()} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh GitHub signal"}</Button>
      </div>
      {reputation === undefined ? <div className="mt-5"><CurationLoading label="Loading reputation signal..." /></div> : reputation ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SignalCard icon={ShieldCheck} title={`${reputation.score} context score`} body="A bounded signal from verified public GitHub contributions and repositories. It is not a popularity ranking." />
          <SignalCard icon={Code2} title={`${reputation.contributionCount} contributions`} body={`Observed from GitHub on ${formatDate(reputation.observedAt)}.`} />
          <SignalCard icon={Award} title={`${reputation.publicRepositoryCount} public repositories`} body="Public repository count is shown as context, not as a quality claim." />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-black/[0.14] p-5 dark:border-white/[0.14]"><p className="text-sm font-semibold">No verified contribution signal yet</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Refresh after the Convex deployment has a server-only GitHub credential. OpenHub will cite the GitHub profile used for the calculation.</p></div>
      )}
      {achievements && achievements.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{achievements.map((achievement) => <span key={achievement._id} className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] px-3 py-1.5 text-xs font-semibold dark:border-white/[0.1]"><Award className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />{achievement.title}</span>)}</div> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-[#9b4d31] dark:text-[#e99970]" />Signals include evidence URLs and observation dates.</div>
    </section>
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

function SignalCard({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
      <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
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
            <p className="text-sm font-semibold">Follow graph connected</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Follow people, repositories, and technical topics.</p>
          </div>
        </div>
        <Button asChild type="button" variant="outline" className="mt-5 w-full rounded-full"><Link href="/explore">Find a trail</Link></Button>
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

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
