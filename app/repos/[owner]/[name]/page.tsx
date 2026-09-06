import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  GitHubLogoIcon as Github,
  LockClosedIcon as LockKeyhole,
} from "@radix-ui/react-icons";

import { RepositoryWorkspace } from "@/components/repository/repository-workspace";
import { PrivateRepositoryRoute } from "@/components/repository/private-repository-route";
import { Button } from "@/components/ui/button";
import { getPublicGitHubProvider } from "@/lib/providers/server";
import {
  isRepositorySegment,
  loadRepositoryView,
} from "@/lib/providers/workspace";

export const dynamic = "force-dynamic";

type RepositoryPageProps = {
  params: Promise<{ owner: string; name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepositoryPage({
  params,
  searchParams,
}: RepositoryPageProps) {
  const { owner, name } = await params;
  const query = await searchParams;

  if (!isRepositorySegment(owner) || !isRepositorySegment(name)) {
    notFound();
  }

  const provider = getPublicGitHubProvider();
  if (provider === null) {
    return process.env.NEXT_PUBLIC_CONVEX_URL ? (
      <PrivateRepositoryRoute owner={owner} name={name} />
    ) : (
      <RepositoryUnavailable />
    );
  }

  const result = await loadRepositoryView(provider, owner, name, query);
  if (result.kind === "not-found") {
    return process.env.NEXT_PUBLIC_CONVEX_URL ? (
      <PrivateRepositoryRoute owner={owner} name={name} />
    ) : (
      notFound()
    );
  }
  if (result.kind === "error") {
    return <RepositoryError />;
  }

  return (
    <RepositoryWorkspace
      repository={result.repository}
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
      sourceRef={result.sourceRef}
      treePath={result.treePath}
      entries={result.entries}
      file={result.file}
      surfaces={result.surfaces}
    />
  );
}

function RepositoryUnavailable() {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-8 dark:bg-background md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to explore
        </Link>
        <section className="my-auto py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary dark:bg-white/[0.08]">
            <Github className="h-5 w-5 text-foreground" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            GitHub provider
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            The reading room is waiting for its source.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Repository browsing is implemented, but this deployment still needs
            its server-side public GitHub credential before it can request
            source.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-md">
              <Link href="/explore">
                Return to discovery
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-md bg-transparent"
            >
              <Link href="/signin">Connect GitHub</Link>
            </Button>
          </div>
          <p className="mt-8 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <LockKeyhole className="mt-1 h-4 w-4 shrink-0" />
            The credential belongs on the server only. It is never sent to this
            page.
          </p>
        </section>
      </div>
    </main>
  );
}

function RepositoryError() {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-8 dark:bg-background md:px-8 md:py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to explore
        </Link>
        <h1 className="mt-20 text-4xl font-semibold tracking-[-0.05em]">
          GitHub could not open this repository.
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          The provider request failed or the selected source is no longer
          available. Try again, or open the original repository directly on
          GitHub.
        </p>
      </div>
    </main>
  );
}
