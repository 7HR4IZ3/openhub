import { Button } from "@/components/ui/button";
import {
  ArrowTopRightIcon,
  CodeIcon,
  ChatBubbleIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
      <section className="max-w-4xl pb-12 sm:pb-16">
        <h1 className="editorial-title max-w-4xl text-[clamp(2.75rem,6vw,4.5rem)]">
          Code, with context.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Explore source, ideas, and discussion in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/explore">
              Explore <ArrowTopRightIcon />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </section>
      <section
        className="grid grid-flow-dense gap-4 md:grid-cols-5"
        aria-label="Explore OpenHub"
      >
        <Link
          href="/explore"
          className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors hover:bg-secondary md:col-span-3 sm:p-7"
        >
          <ReaderIcon className="h-7 w-7" />
          <div className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">
              Repositories
            </h2>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
              Browse <ArrowTopRightIcon />
            </span>
          </div>
        </Link>
        <div className="grid gap-4 md:col-span-2">
          <Link
            href="/communities"
            className="rounded-xl border bg-accent/40 p-5 transition-colors hover:bg-accent"
          >
            <ChatBubbleIcon className="h-5 w-5" />
            <h2 className="mt-5 text-lg font-semibold">Conversations</h2>
          </Link>
          <Link
            href="/lists"
            className="rounded-xl border bg-secondary p-5 transition-colors hover:bg-muted"
          >
            <CodeIcon className="h-5 w-5" />
            <h2 className="mt-5 text-lg font-semibold">Reading trails</h2>
          </Link>
        </div>
      </section>
      <section className="mt-12 grid gap-3 border-t pt-6 sm:mt-16 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 className="editorial-title text-2xl sm:text-3xl">
          Source stays attributed.
        </h2>
        <div className="text-sm leading-6 text-muted-foreground">
          <p>
            OpenHub reads public repositories without editing or executing them.
            Shared references keep their original repository, commit, and lines.
          </p>
        </div>
      </section>
    </main>
  );
}
