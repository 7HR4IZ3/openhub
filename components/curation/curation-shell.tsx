import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell,
  Compass,
  Home,
  List,
  PenLine,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type CurationSection =
  | "Home"
  | "Explore"
  | "Notifications"
  | "Lists"
  | "Communities"
  | "Profile";

const navigation: Array<{
  label: CurationSection;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Lists", href: "/lists", icon: List },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function CurationShell({
  active,
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  active: CurationSection;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f4] text-foreground dark:bg-[#111310]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)_280px]">
        <aside className="sticky top-0 hidden h-screen flex-col justify-between px-5 py-6 lg:flex">
          <div>
            <Link href="/home" className="inline-flex" aria-label="OpenHub home">
              <OpenHubMark />
            </Link>
            <nav className="mt-12 space-y-1" aria-label="Primary navigation">
              {navigation.map((item) => (
                <CurationNavItem key={item.label} {...item} active={item.label === active} />
              ))}
            </nav>
            <Button asChild className="mt-8 h-11 w-full rounded-full">
              <Link href="/compose">
                <PenLine className="h-4 w-4" />
                Write a post
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
            <p className="text-sm font-medium">Your trail</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Connect GitHub to make this space yours.
            </p>
            <Link
              href="/signin"
              className="mt-3 inline-flex text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"
            >
              Continue with GitHub
            </Link>
          </div>
        </aside>

        <main className="min-h-screen min-w-0 border-x border-black/[0.08] bg-[#fbfbf9] pb-24 dark:border-white/[0.08] dark:bg-[#151714] lg:pb-0">
          <header className="sticky top-0 z-10 border-b border-black/[0.08] bg-[#fbfbf9]/90 px-5 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-[#151714]/90 sm:px-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <Link href="/home" className="shrink-0 lg:hidden" aria-label="OpenHub home">
                  <OpenHubMark compact />
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    OpenHub / {eyebrow}
                  </p>
                  <h1 className="mt-1 truncate text-xl font-semibold tracking-[-0.035em] sm:text-2xl">
                    {title}
                  </h1>
                </div>
              </div>
              <Link
                href="/explore"
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-black/[0.1] px-3 text-xs font-semibold transition-colors hover:border-[#b45e3c] dark:border-white/[0.1]"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
              </Link>
            </div>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:pl-12">
                {description}
              </p>
            ) : null}
          </header>

          {children}
        </main>

        <aside className="hidden px-5 py-6 xl:block">
          <div className="sticky top-6 space-y-5">
            {aside ?? <CurationRail />}
          </div>
        </aside>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-black/[0.1] bg-[#fbfbf9]/95 px-3 py-2 backdrop-blur dark:border-white/[0.1] dark:bg-[#151714]/95 lg:hidden"
        aria-label="Mobile navigation"
      >
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5 py-1.5 text-[9px] text-muted-foreground",
              item.label === active && "text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function CurationNavItem({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: CurationSection;
  href: string;
  icon: LucideIcon;
  active: boolean;
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

export function CurationRail() {
  return (
    <>
      <section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Discovery principles
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-5 text-muted-foreground">
          <li>Start with source, not a sales pitch.</li>
          <li>Keep the original owner and license visible.</li>
          <li>Reward useful context over empty volume.</li>
        </ul>
      </section>
      <section className="rounded-2xl bg-[#e9e6dc] p-5 dark:bg-[#20251f]">
        <p className="text-sm font-semibold">A calmer social layer</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Lists and communities are trails through software, not another place to broadcast a launch.
        </p>
        <Link
          href="/explore"
          className="mt-4 inline-flex items-center text-sm font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"
        >
          Browse a repository <span className="ml-1">↗</span>
        </Link>
        <Link href="/bounties" className="mt-3 inline-flex items-center text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          Find contribution tasks <span className="ml-1">↗</span>
        </Link>
        <Link href="/settings/safety" className="mt-3 inline-flex text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          Safety and control
        </Link>
      </section>
    </>
  );
}
