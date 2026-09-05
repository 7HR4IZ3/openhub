"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { ProfilePostTrail } from "@/components/curation/profile-post-trail";
import { ProfileListTrail } from "@/components/curation/profile-list-trail";
import { Button } from "@/components/ui/button";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowUpRight, Award, Check, Github, Heart, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Profile = Doc<"profiles">;

export function PublicProfileScreen({ handle, convexConfigured }: { handle: string; convexConfigured: boolean }) {
  if (!convexConfigured) return <PublicProfileSetup />;
  return <ConnectedPublicProfileScreen handle={handle} />;
}

function ConnectedPublicProfileScreen({ handle }: { handle: string }) {
  const profile = useQuery(api.profiles.byHandle, { handle });
  if (profile === undefined) return <CurationShell active="Profile" eyebrow="profile" title="Developer trail"><div className="p-5 sm:p-7"><CurationLoading label="Loading developer profile..." /></div></CurationShell>;
  if (profile === null) return <CurationShell active="Profile" eyebrow="profile" title="Developer trail"><div className="p-5 sm:p-7"><CurationEmptyState icon={UserRound} eyebrow="Profile not found" title="This developer trail is unavailable." body="The profile may have moved or has not been imported yet." action="Explore repositories" actionHref="/explore" /></div></CurationShell>;
  return <PublicProfileContent profile={profile} />;
}

function PublicProfileSetup() {
  return <CurationShell active="Profile" eyebrow="profile" title="Developer trail"><div className="p-5 sm:p-7"><CurationEmptyState icon={UserRound} eyebrow="Backend connection needed" title="Public profiles are ready to connect." body="Connect the Convex deployment to load public developer context. No profile data is requested while the backend is unavailable." action="Explore repositories" actionHref="/explore" secondaryAction="Connect GitHub" secondaryHref="/signin" /></div></CurationShell>;
}

function PublicProfileContent({ profile }: { profile: Profile }) {
  const { isAuthenticated } = useConvexAuth();
  const viewerProfile = useQuery(api.profiles.viewer);
  const following = useQuery(api.curation.isFollowing, isAuthenticated ? { target: { kind: "person", userId: profile.userId } } : "skip");
  const setFollow = useMutation(api.curation.setFollow);
  const reputation = useQuery(api.reputation.forUser, { userId: profile.userId });
  const achievements = useQuery(api.reputation.achievementsForUser, { userId: profile.userId });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFollow() {
    setBusy(true);
    setError(null);
    try { await setFollow({ target: { kind: "person", userId: profile.userId }, following: following !== true }); }
    catch { setError("Follow state could not be updated yet."); }
    finally { setBusy(false); }
  }

  const githubLogin = profile.githubLogin ?? profile.handle;
  return (
    <CurationShell active="Profile" eyebrow="profile" title={`@${profile.handle}`} description="A public developer trail for source-backed learning and discussion." aside={<CurationRail />}>
      <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#e9e6dc] text-lg font-semibold dark:bg-[#20251f]" style={profile.avatarUrl ? { backgroundImage: `url(${profile.avatarUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>{profile.avatarUrl ? null : profile.displayName.slice(0, 2).toUpperCase()}</div><div><p className="text-xs text-muted-foreground">@{profile.handle}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{profile.displayName}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{profile.bio || "A developer making sense of software one repository at a time."}</p></div></div>
          {viewerProfile?.userId === profile.userId ? <Button asChild variant="outline" className="rounded-full"><Link href="/profile">Your profile</Link></Button> : isAuthenticated ? <Button type="button" className="rounded-full" variant={following ? "outline" : "default"} disabled={busy} onClick={() => void toggleFollow()}><Heart className={following ? "h-4 w-4 fill-current" : "h-4 w-4"} />{busy ? "Saving..." : following ? "Following" : "Follow"}</Button> : <Button asChild className="rounded-full"><Link href="/signin"><Heart className="h-4 w-4" />Follow</Link></Button>}
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">GitHub connected</span>{profile.availability ? <span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">{profile.availability}</span> : null}<span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">Source attribution on</span></div>
      </section>
      <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile context</p><h2 className="mt-2 text-xl font-semibold">Interests and links</h2></div><a href={profile.githubProfileUrl ?? `https://github.com/${githubLogin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">GitHub <ArrowUpRight className="h-3.5 w-3.5" /></a></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><div>{profile.interests.length ? <div className="flex flex-wrap gap-2">{profile.interests.map((interest) => <span key={interest} className="rounded-full bg-[#e9e6dc] px-3 py-1.5 text-xs font-semibold dark:bg-[#20251f]">{interest}</span>)}</div> : <p className="text-sm leading-6 text-muted-foreground">No interests added yet.</p>}</div>{profile.portfolioUrl ? <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground hover:underline">{profile.portfolioUrl} <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></a> : <p className="text-sm text-muted-foreground">No portfolio link added.</p>}</div></section>
      <ProfilePostTrail userId={profile.userId} />
      <ProfileListTrail userId={profile.userId} />
      <section className="p-5 sm:p-7"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trust, slowly earned</p><h2 className="mt-2 text-xl font-semibold">Reputation and achievements</h2>{reputation ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><ProfileSignal icon={ShieldCheck} label="Context score" value={String(reputation.score)} /><ProfileSignal icon={Github} label="Contributions" value={String(reputation.contributionCount)} /><ProfileSignal icon={Award} label="Public repositories" value={String(reputation.publicRepositoryCount)} /></div> : <p className="mt-5 rounded-2xl border border-dashed border-black/[0.14] p-5 text-sm leading-6 text-muted-foreground dark:border-white/[0.14]">No verified GitHub contribution signal is available yet.</p>}{achievements && achievements.length ? <div className="mt-5 flex flex-wrap gap-2">{achievements.map((achievement) => <span key={achievement._id} className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] px-3 py-1.5 text-xs font-semibold dark:border-white/[0.1]"><Award className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />{achievement.title}</span>)}</div> : null}<p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-[#9b4d31] dark:text-[#e99970]" />Evidence and observation dates are retained for trust signals.</p></section>
    </CurationShell>
  );
}

function ProfileSignal({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]"><Icon className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" /><p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}
