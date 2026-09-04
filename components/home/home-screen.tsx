"use client";

import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Compass,
  FileCode2,
  FolderGit2,
  Github,
  Home,
  Layers3,
  List,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Lists", href: "/lists", icon: List },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Profile", href: "/profile", icon: UserRound },
];

const tabs = ["For you", "Following", "Trending"] as const;

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("For you");

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-foreground dark:bg-[#111310]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[232px_minmax(0,680px)_304px]">
        <aside className="sticky top-0 hidden h-screen flex-col justify-between px-5 py-6 lg:flex">
          <div>
            <Link href="/home" className="inline-flex" aria-label="OpenHub home">
              <OpenHubMark />
            </Link>
            <nav className="mt-12 space-y-1" aria-label="Primary navigation">
              {navigation.map((item) => (
                <NavItem key={item.label} {...item} active={item.label === "Home"} />
              ))}
            </nav>
            <Button asChild className="mt-8 h-11 w-full rounded-full">
              <Link href="/compose">
                <PenLine className="h-4 w-4" />
                Write a post
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9e6dc] text-xs font-semibold dark:bg-white/[0.1]">
                OH
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Your trail</p>
                <p className="truncate text-xs text-muted-foreground">Sign in to personalize</p>
              </div>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        </aside>

        <main className="min-h-screen border-x border-black/[0.08] bg-[#fbfbf9] dark:border-white/[0.08] dark:bg-[#151714]">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#fbfbf9]/90 px-5 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-[#151714]/90 lg:px-7">
            <div className="flex items-center gap-3">
              <button className="rounded-full p-1.5 text-muted-foreground hover:bg-black/[0.05] lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">OpenHub / home</p>
                <h1 className="mt-1 text-xl font-semibold tracking-[-0.035em]">Discover</h1>
              </div>
            </div>
            <Button asChild size="sm" className="rounded-full lg:hidden">
              <Link href="/compose" aria-label="Write a post">
                <PenLine className="h-4 w-4" />
                <span className="sr-only">Write a post</span>
              </Link>
            </Button>
          </header>

          <div className="border-b border-black/[0.08] px-5 pt-4 dark:border-white/[0.08] lg:px-7">
            <div className="flex gap-6" role="tablist" aria-label="Home feed">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative pb-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    activeTab === tab && "text-foreground",
                  )}
                >
                  {tab}
                  {activeTab === tab ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#b45e3c]" /> : null}
                </button>
              ))}
            </div>
          </div>

          <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] lg:p-7">
            <div className="relative overflow-hidden rounded-[1.6rem] bg-[#e9e6dc] p-6 dark:bg-[#20251f] sm:p-8">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-[#d9d4c6] dark:border-[#2b332c]" />
              <div className="relative max-w-lg">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{activeTab} trail</span>
                </div>
                <h2 className="mt-5 text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl">
                  Find the next repository you want to understand.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  OpenHub will turn GitHub activity, technical writing, and thoughtful discussion into a calmer way to discover software.
                </p>
                <Button asChild variant="outline" className="mt-7 rounded-full bg-transparent">
                  <Link href="/explore">
                    Explore repositories <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="p-5 lg:p-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your starting point</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">A better kind of feed</h2>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">No engagement bait</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <StarterCard icon={FolderGit2} title="Repository trails" body="Move from a project overview to its files, commits, and the ideas around it." />
              <StarterCard icon={FileCode2} title="Source-backed posts" body="Share a function or line range without losing where it came from." />
              <StarterCard icon={BookOpen} title="Learning signals" body="See what is active, documented, and approachable before you dive in." />
              <StarterCard icon={MessageCircle} title="Technical discussion" body="Ask a real question with the relevant code already attached." />
            </div>
          </section>

          <section className="border-t border-black/[0.08] p-5 dark:border-white/[0.08] lg:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                <Github className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Connect your GitHub trail</p>
                <p className="text-xs text-muted-foreground">Import your identity and make recommendations useful.</p>
              </div>
            </div>
            <Button asChild size="sm" className="mt-5 rounded-full">
              <Link href="/signin">Continue with GitHub <ArrowUpRight className="h-4 w-4" /></Link>
            </Button>
          </section>
        </main>

        <aside className="hidden px-5 py-6 xl:block">
          <div className="sticky top-6 space-y-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search OpenHub"
                className="h-10 w-full rounded-full border border-black/[0.08] bg-transparent pl-10 pr-4 text-sm outline-none transition focus:border-[#b45e3c] dark:border-white/[0.08]"
              />
            </label>

            <aside className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />
                <h2 className="text-sm font-semibold">Worth looking into</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Trending projects will be ranked by meaningful activity, not just volume.
              </p>
              <Link href="/explore" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
                See the discovery map <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </aside>

            <aside className="rounded-2xl bg-[#e9e6dc] p-5 dark:bg-[#20251f]">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4" />
                <h2 className="text-sm font-semibold">OpenHub principles</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-5 text-muted-foreground">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#9b4d31] dark:text-[#e99970]" />Source stays attached.</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#9b4d31] dark:text-[#e99970]" />AI explains; it does not publish.</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#9b4d31] dark:text-[#e99970]" />People matter more than promotion.</li>
              </ul>
            </aside>

            <p className="px-1 text-xs leading-5 text-muted-foreground">
              OpenHub is independent from GitHub. Repository code remains on its original host.
            </p>
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-black/[0.1] bg-[#fbfbf9]/95 px-3 py-2 backdrop-blur dark:border-white/[0.1] dark:bg-[#151714]/95 lg:hidden" aria-label="Mobile navigation">
        {navigation.slice(0, 5).map((item) => (
          <Link key={item.label} href={item.href} className={cn("flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground", item.label === "Home" && "text-foreground")}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]",
        active && "bg-black/[0.05] text-foreground dark:bg-white/[0.07]",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}

function StarterCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <article className="group rounded-2xl border border-black/[0.08] p-5 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.08]">
      <div className="flex items-start justify-between gap-4">
        <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <h3 className="mt-8 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}
