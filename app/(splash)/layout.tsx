import { OpenHubMark } from "@/components/openhub-mark";
import Link from "next/link";
import { ReactNode } from "react";

export default function SplashPageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur dark:bg-background/90">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <Link href="/">
            <OpenHubMark />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/explore"
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Explore
            </Link>
            <Link
              href="/signin"
              className="rounded-md bg-foreground px-4 py-2 font-semibold text-background transition-transform hover:-translate-y-px"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>
      <div className="flex grow flex-col">{children}</div>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <span>Open-source software, with context.</span>
          <div className="flex gap-4">
            <FooterLink href="/explore">Explore</FooterLink>
            <FooterLink href="https://github.com">GitHub</FooterLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="underline underline-offset-4 hover:no-underline"
      target={href.startsWith("https://") ? "_blank" : undefined}
      rel={href.startsWith("https://") ? "noreferrer" : undefined}
    >
      {children}
    </Link>
  );
}
