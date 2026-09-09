import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  GitHubLogoIcon as Github,
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
      <RepositoryUnavailable owner={owner} name={name} />
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
    return <RepositoryError owner={owner} name={name} />;
  }

  return (
    <RepositoryWorkspace
      repository={result.repository}
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
      sourceRef={result.sourceRef}
      treePath={result.treePath}
      entries={result.entries}
      file={result.file}
      fileError={result.fileError}
      surfaces={result.surfaces}
    />
  );
}

function RepositoryUnavailable({ owner, name }: { owner: string; name: string }) {
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
        <section className="my-auto py-16">
          <div className="flex items-center gap-3 text-muted-foreground"><Github className="h-5 w-5" /><span className="font-mono text-sm">{owner}/{name}</span></div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">GitHub source is unavailable.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">The public provider is not configured for this deployment.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild className="rounded-md"><Link href="/explore">Back to explore <ArrowUpRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="rounded-md bg-transparent"><a href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`} target="_blank" rel="noreferrer">Open on GitHub</a></Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function RepositoryError({ owner, name }: { owner: string; name: string }) {
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
        <div className="mt-16 rounded-lg border border-border p-5">
          <p className="font-mono text-sm text-muted-foreground">{owner}/{name}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">GitHub could not open this repository.</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Try again or open the original source.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="rounded-md"><Link href={`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`}>Retry</Link></Button>
            <Button asChild variant="outline" className="rounded-md bg-transparent"><a href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`} target="_blank" rel="noreferrer">Open on GitHub</a></Button>
          </div>
        </div>
      </div>
    </main>
  );
}
