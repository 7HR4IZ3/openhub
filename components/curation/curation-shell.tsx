import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  BellIcon,
  GlobeIcon,
  HomeIcon,
  ListBulletIcon,
  Pencil2Icon,
  MagnifyingGlassIcon,
  PersonIcon,
  ChatBubbleIcon,
  ArrowTopRightIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import type { ReactNode } from "react";

export type CurationSection =
  | "Home"
  | "Explore"
  | "Notifications"
  | "Lists"
  | "Communities"
  | "Profile";
const navigation = [
  { label: "Home", href: "/home", icon: HomeIcon },
  { label: "Explore", href: "/explore", icon: GlobeIcon },
  { label: "Notifications", href: "/notifications", icon: BellIcon },
  { label: "Lists", href: "/lists", icon: ListBulletIcon },
  { label: "Communities", href: "/communities", icon: ChatBubbleIcon },
  { label: "Profile", href: "/profile", icon: PersonIcon },
] as const;

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
    <div className="min-h-[100dvh] bg-background">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="mx-auto grid min-h-[100dvh] max-w-[1440px] lg:grid-cols-[216px_minmax(0,1fr)] xl:grid-cols-[216px_minmax(0,1fr)_272px]">
        <aside className="sticky top-0 hidden h-[100dvh] flex-col overflow-y-auto px-5 py-7 lg:flex">
          <Link href="/home" aria-label="OpenHub home">
            <OpenHubMark />
          </Link>
          <nav className="mt-10 space-y-1" aria-label="Primary navigation">
            {navigation.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active === label ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  active === label &&
                    "bg-secondary font-semibold text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <Button asChild className="mt-6 w-full">
            <Link href="/compose">
              <Pencil2Icon />
              Write a post
            </Link>
          </Button>
          <div className="mt-auto space-y-4 pt-12">
            <Link
              href="/settings/safety"
              className="block px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Safety and control
            </Link>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="app-content min-w-0 bg-card outline-none lg:border-x"
        >
          <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-3 border-b bg-card px-5 py-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/home"
                className="shrink-0 lg:hidden"
                aria-label="OpenHub home"
              >
                <OpenHubMark compact />
              </Link>
              <div className="min-w-0">
                <span className="sr-only">OpenHub / {eyebrow}</span>
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild variant="ghost" size="icon">
                <Link href="/explore" aria-label="Search OpenHub">
                  <MagnifyingGlassIcon />
                </Link>
              </Button>
              <Button asChild variant="outline" className="lg:hidden">
                <Link href="/compose" aria-label="Write a post">
                  <Pencil2Icon />
                  <span className="hidden sm:inline">Write</span>
                </Link>
              </Button>
            </div>
          </header>
          {description ? (
            <p className="max-w-3xl px-5 pb-2 pt-6 text-sm leading-6 text-muted-foreground sm:px-8">
              {description}
            </p>
          ) : null}
          {children}
        </main>
        <aside className="hidden px-6 py-7 xl:block">
          <div className="sticky top-7 space-y-8">
            {aside ?? <CurationRail />}
          </div>
        </aside>
      </div>
      <nav
        className="mobile-navigation fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t bg-card px-1 pt-2 lg:hidden"
        aria-label="Mobile navigation"
      >
        {navigation.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={label === active ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[9px] text-muted-foreground",
              label === active && "bg-secondary font-semibold text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function CurationRail() {
  return (
    <>
      <section>
        <h2 className="text-sm font-semibold">
          A place for curious developers.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Read the code. Follow an idea. Add the context that helps someone else
          understand it.
        </p>
        <Link
          href="/explore"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
        >
          Explore repositories <ArrowTopRightIcon />
        </Link>
      </section>
      <section className="border-t pt-6">
        <h2 className="text-xs font-semibold text-muted-foreground">
          Keep exploring
        </h2>
        <div className="mt-3 space-y-1">
          {[
            ["/lists", "Curated lists"],
            ["/communities", "Technical communities"],
            ["/bounties", "Contribution tasks"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center justify-between gap-3 text-sm hover:underline"
            >
              {label}
              <ArrowTopRightIcon className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
      <p className="border-t pt-5 text-xs leading-5 text-muted-foreground">
        Source belongs to its original authors. Every shared reference keeps its
        attribution.
      </p>
    </>
  );
}
