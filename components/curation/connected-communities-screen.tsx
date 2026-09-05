"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { BookOpen, Code2, Compass, Globe2, LockKeyhole, Plus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";

type Community = Doc<"communities">;
type CommunityTab = "discover" | "following" | "create";
const page = { paginationOpts: { numItems: 30, cursor: null } } as const;

export function ConnectedCommunitiesScreen() {
  const [activeTab, setActiveTab] = useState<CommunityTab>("discover");
  const tabs: Array<{ value: CommunityTab; label: string }> = [
    { value: "discover", label: "Discover" },
    { value: "following", label: "Your circles" },
    { value: "create", label: "Create" },
  ];

  return (
    <CurationShell
      active="Communities"
      eyebrow="communities"
      title="Technical circles"
      description="Find people who care about the same layer of software."
      aside={<CommunitiesRail />}
    >
      <div className="border-b border-black/[0.08] px-5 pt-4 dark:border-white/[0.08] sm:px-7">
        <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="Community views">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative whitespace-nowrap pb-4 text-sm font-medium transition-colors ${activeTab === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
              {activeTab === tab.value ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#b45e3c]" /> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 sm:p-7">
        {activeTab === "discover" ? <DiscoverCommunities /> : null}
        {activeTab === "following" ? <FollowingCommunities /> : null}
        {activeTab === "create" ? <CreateCommunity /> : null}
      </div>
    </CurationShell>
  );
}

function DiscoverCommunities() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const communities = useQuery(api.curation.discoverCommunities, page);
  const memberships = useQuery(api.curation.myCommunities, isAuthenticated ? page : "skip");
  const joinCommunity = useMutation(api.curation.joinCommunity);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (communities === undefined || authLoading) return <CurationLoading label="Finding public communities..." />;
  if (communities.page.length === 0) {
    return (
      <CurationEmptyState
        icon={Compass}
        eyebrow="No public circles yet"
        title="Give a technical question a home."
        body="Create the first public circle and keep the source close to the conversation."
        action="Create a circle"
        actionHref="/communities"
      />
    );
  }

  async function join(community: Community) {
    if (!isAuthenticated) return;
    setJoining(community._id);
    setError(null);
    try {
      await joinCommunity({ communityId: community._id });
      setJoined((current) => new Set(current).add(community._id));
    } catch {
      setError("This community could not be joined yet.");
    } finally {
      setJoining(null);
    }
  }

  return (
    <div>
      <CurationStatus title="Browse by layer" body="Public circles are discoverable. Membership gives you a focused place to follow the technical context around a topic." />
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {communities.page.map((community) => {
          const isJoined = joined.has(community._id) || memberships?.page.some((item) => item._id === community._id) === true;
          return (
            <article key={community._id} className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-3">
                <Users className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{community.visibility}</span>
              </div>
              <h2 className="mt-6 text-base font-semibold tracking-[-0.02em]">{community.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{community.description || "A technical circle for source-backed discussion."}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Moderated by its owner</span>
                {isAuthenticated ? (
                  <Button type="button" size="sm" variant={isJoined ? "outline" : "default"} className="rounded-full" disabled={isJoined || joining === community._id} onClick={() => void join(community)}>
                    {isJoined ? "Joined" : joining === community._id ? "Joining..." : "Join"}
                  </Button>
                ) : <Button asChild size="sm" variant="outline" className="rounded-full"><a href="/signin">Connect</a></Button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FollowingCommunities() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const communities = useQuery(api.curation.myCommunities, isAuthenticated ? page : "skip");
  const leaveCommunity = useMutation(api.curation.leaveCommunity);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading || (isAuthenticated && communities === undefined)) return <CurationLoading label="Loading your circles..." />;
  if (!isAuthenticated) {
    return <CurationEmptyState icon={Users} eyebrow="Sign in to join" title="Keep a focused technical trail." body="Connect GitHub to join public circles and return to their context later." action="Connect GitHub" actionHref="/signin" secondaryAction="Browse repositories" secondaryHref="/explore" />;
  }
  if (!communities || communities.page.length === 0) {
    return <CurationEmptyState icon={Users} eyebrow="Your circles" title="Follow a layer worth staying with." body="Joined public communities will appear here." action="Discover communities" actionHref="/communities" />;
  }

  async function leave(community: Community) {
    setLeaving(community._id);
    setError(null);
    try { await leaveCommunity({ communityId: community._id }); } catch { setError("This community could not be left yet."); } finally { setLeaving(null); }
  }

  return <div>{error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}<div className="grid gap-3 sm:grid-cols-2">{communities.page.map((community) => <article key={community._id} className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]"><div className="flex items-center justify-between"><Users className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" /><span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Joined</span></div><h2 className="mt-6 text-base font-semibold">{community.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{community.description || "A technical circle."}</p><Button type="button" variant="ghost" size="sm" className="mt-4 rounded-full" disabled={leaving === community._id} onClick={() => void leave(community)}>{leaving === community._id ? "Leaving..." : "Leave"}</Button></article>)}</div></div>;
}

function CreateCommunity() {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) return <CurationEmptyState icon={Plus} eyebrow="Create a circle" title="Give a technical question a home." body="Connect GitHub to create a public or private circle with clear moderation ownership." action="Connect GitHub" actionHref="/signin" secondaryAction="Read the principles" secondaryHref="/product" />;
  return <CreateCommunityForm />;
}

function CreateCommunityForm() {
  const createCommunity = useMutation(api.curation.createCommunity);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setSaving(true);
    try { await createCommunity({ name, description, visibility }); setName(""); setDescription(""); setCreated(true); }
    catch { setError("The circle could not be created. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl rounded-2xl border border-black/[0.1] p-5 dark:border-white/[0.1]">
      <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" /><h2 className="text-sm font-semibold">New technical circle</h2></div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Write a clear purpose. Communities should help people understand real software, not become project promotion channels.</p>
      <label className="mt-5 block text-xs font-semibold" htmlFor="community-name">Name</label>
      <input id="community-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="mt-2 h-10 w-full rounded-xl border border-black/[0.1] bg-transparent px-3 text-sm outline-none focus:border-[#b45e3c] dark:border-white/[0.1]" placeholder="Frontend architecture" />
      <label className="mt-4 block text-xs font-semibold" htmlFor="community-description">Description</label>
      <textarea id="community-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-black/[0.1] bg-transparent px-3 py-2 text-sm leading-6 outline-none focus:border-[#b45e3c] dark:border-white/[0.1]" placeholder="What should members understand together?" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="community-visibility"><span>Visibility</span><select id="community-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")} className="rounded-lg border border-black/[0.1] bg-transparent px-2 py-1.5 text-xs text-foreground dark:border-white/[0.1]"><option value="public">Public</option><option value="private">Private</option></select></label><Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Creating..." : "Create circle"}</Button></div>
      {created ? <p role="status" className="mt-3 text-sm text-[#66856c]">Circle created. It is now available in your circles.</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function CommunitiesRail() {
  return <><CurationRail /><section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Community promise</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Every circle should make it easier to understand a real repository. Moderators can keep promotion, harassment, and low-context noise out.</p></section></>;
}
