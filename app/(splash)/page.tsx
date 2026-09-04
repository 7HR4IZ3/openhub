import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BookOpen,
  Code2,
  Compass,
  GitFork,
  Github,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";

const principles = [
  {
    icon: Compass,
    title: "Discover without the noise",
    body: "Find projects through signals, thoughtful posts, and people you trust—not a popularity contest.",
  },
  {
    icon: Code2,
    title: "Learn from the source",
    body: "Jump from a conversation to the exact file, function, line range, and commit behind it.",
  },
  {
    icon: MessageSquareText,
    title: "Discuss with context",
    body: "Ask questions, share snippets, and review ideas while the code is still in view.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-20 pt-16 md:px-8 md:pt-24">
      <section className="grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
        <div>
          <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <OpenHubMark />
            <span className="h-px w-10 bg-border" />
            <span>the open-source reading room</span>
          </div>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-foreground sm:text-7xl">
            Find software worth falling into.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            OpenHub makes open-source discovery feel less like searching an
            archive and more like following a great trail of ideas.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link href="/signin">
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="rounded-full">
              <Link href="/explore">
                Browse the idea <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            GitHub is used for identity and repository access. OpenHub does not
            modify your source code.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-black/[0.1] bg-[#1a1d1b] p-4 text-[#d9e3dc] shadow-2xl shadow-black/10 dark:border-white/[0.1]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 pb-4 text-xs text-[#8e9b93]">
            <span className="font-mono">openhub / reading-trail</span>
            <span className="rounded-full border border-white/10 px-2 py-1">read only</span>
          </div>
          <div className="grid grid-cols-[108px_1fr] gap-4 pt-4">
            <div className="space-y-2 border-r border-white/10 pr-3 text-[11px] text-[#8e9b93]">
              <div className="font-mono text-[#d9e3dc]">src</div>
              <div className="pl-3 font-mono">app</div>
              <div className="pl-3 font-mono">lib</div>
              <div className="pl-3 font-mono text-[#f0b37e]">README.md</div>
              <div className="pl-3 font-mono">package.json</div>
            </div>
            <pre className="overflow-hidden font-mono text-[11px] leading-6 sm:text-xs">
              <code>
                <span className="text-[#8e9b93]">01 </span>
                <span className="text-[#b0d7c0]">export function </span>
                <span className="text-[#f0b37e]">understand</span>
                <span className="text-[#d9e3dc]">(source) &#123;</span>
                {"\n"}
                <span className="text-[#8e9b93]">02 </span>
                <span className="text-[#d9e3dc]">  </span>
                <span className="text-[#b0d7c0]">return </span>
                <span className="text-[#c9b4ef]">source</span>
                <span className="text-[#d9e3dc]">.withContext();</span>
                {"\n"}
                <span className="text-[#8e9b93]">03 </span>
                <span className="text-[#d9e3dc]">&#125;</span>
                {"\n\n"}
                <span className="text-[#8e9b93]">05 </span>
                <span className="text-[#849189]">{"// share the exact lines"}</span>
                {"\n"}
                <span className="text-[#8e9b93]">06 </span>
                <span className="rounded bg-[#e8a96f]/15 px-1 text-[#f0b37e]">
                  {"// #L1-3"}
                </span>
              </code>
            </pre>
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-[#aebbb2]">
            <BookOpen className="h-3.5 w-3.5 text-[#f0b37e]" />
            <span>Every idea stays linked to its source.</span>
          </div>
        </div>
      </section>

      <section className="mt-28 border-t border-black/[0.1] pt-8 dark:border-white/[0.1]">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              The point of OpenHub
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              A social layer for understanding software.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitFork className="h-4 w-4" />
            <span>Independent from GitHub</span>
          </div>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-black/[0.1] bg-black/[0.1] dark:border-white/[0.1] dark:bg-white/[0.1] md:grid-cols-3">
          {principles.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-[#f7f7f4] p-6 dark:bg-[#111310] sm:p-8">
              <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
              <h3 className="mt-12 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-24 flex flex-col justify-between gap-6 rounded-2xl bg-[#e9e6dc] p-7 dark:bg-white/[0.06] sm:flex-row sm:items-center sm:p-9">
        <div>
          <p className="text-lg font-semibold tracking-[-0.02em]">Built for the curious.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with one repository. Leave with a better mental model.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit rounded-full bg-transparent">
          <Link href="/signin">Enter OpenHub <ArrowUpRight className="h-4 w-4" /></Link>
        </Button>
      </section>
    </main>
  );
}
