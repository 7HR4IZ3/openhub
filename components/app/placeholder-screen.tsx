import { OpenHubMark } from "@/components/openhub-mark";
import { ArrowLeft, ArrowUpRight, Compass, Github } from "lucide-react";
import Link from "next/link";

export function PlaceholderScreen({
  eyebrow,
  title,
  body,
  action = "Explore repositories",
  actionHref = "/explore",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-6 dark:bg-[#111310] md:px-8 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="OpenHub home">
            <OpenHubMark />
          </Link>
          <Link href="/home" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Open home
          </Link>
        </header>

        <section className="my-auto py-20">
          <Link href="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <p className="mt-10 flex items-center gap-2 text-sm font-semibold text-[#9b4d31] dark:text-[#e99970]">
            <Compass className="h-4 w-4" /> {eyebrow}
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">{title}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">{body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={actionHref} className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-transform hover:-translate-y-px">
              {action} <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/signin" className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.12] px-5 text-sm font-semibold hover:border-[#b45e3c] dark:border-white/[0.12]">
              <Github className="h-4 w-4" /> Connect GitHub
            </Link>
          </div>
        </section>

        <p className="border-t border-black/[0.1] py-6 text-sm text-muted-foreground dark:border-white/[0.1]">
          OpenHub is building this surface around repository discovery and source-backed discussion.
        </p>
      </div>
    </main>
  );
}
