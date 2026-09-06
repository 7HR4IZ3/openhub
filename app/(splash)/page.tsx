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
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
      <section className="max-w-4xl pb-16 sm:pb-24">
        <p className="mb-6 text-sm text-muted-foreground">
          The open-source reading room
        </p>
        <h1 className="editorial-title max-w-4xl text-[clamp(2.75rem,6vw,5.5rem)]">
          Find software worth understanding.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Explore repositories, read the source, and follow the conversations
          that make the code click.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/explore">
              Explore repositories <ArrowTopRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signin">Continue with GitHub</Link>
          </Button>
        </div>
      </section>
      <section
        className="grid grid-flow-dense gap-4 md:grid-cols-5"
        aria-label="Explore OpenHub"
      >
        <Link
          href="/explore"
          className="group flex flex-col justify-between rounded-xl border bg-card p-7 transition-colors hover:bg-secondary md:col-span-3 sm:p-10"
        >
          <ReaderIcon className="h-7 w-7" />
          <div className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight">
              Follow an idea into the source.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
              Read files, explore commits, and find the exact lines behind a
              question. The repository stays the source of truth.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-medium">
              Browse repositories <ArrowTopRightIcon />
            </span>
          </div>
        </Link>
        <div className="grid gap-4 md:col-span-2">
          <Link
            href="/communities"
            className="rounded-xl border bg-accent/40 p-7 transition-colors hover:bg-accent"
          >
            <ChatBubbleIcon className="h-5 w-5" />
            <h2 className="mt-5 text-lg font-semibold">
              Conversations with context.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Questions, reviews, and useful observations from people learning
              in public.
            </p>
          </Link>
          <Link
            href="/lists"
            className="rounded-xl border bg-secondary p-7 transition-colors hover:bg-muted"
          >
            <CodeIcon className="h-5 w-5" />
            <h2 className="mt-5 text-lg font-semibold">
              Keep a trail worth revisiting.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Collect repositories and posts. Return to the ideas you want to
              spend more time with.
            </p>
          </Link>
        </div>
      </section>
      <section className="mt-16 grid gap-8 border-t pt-8 sm:mt-24 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 className="editorial-title text-3xl sm:text-4xl">
          The code belongs to its authors.
        </h2>
        <div className="space-y-5 text-sm leading-7 text-muted-foreground">
          <p>
            OpenHub is an independent reading and discussion space. It does not
            edit or execute repository code. Shared source references preserve
            the original repository, commit, lines, and attribution.
          </p>
          <p>
            Public browsing is open. Connect GitHub when you want to build your
            profile and take part in the conversation.
          </p>
        </div>
      </section>
    </main>
  );
}
