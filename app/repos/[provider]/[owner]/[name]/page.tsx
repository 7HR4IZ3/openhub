import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  DotFilledIcon as CircleDot,
  LockClosedIcon as LockKeyhole,
} from "@radix-ui/react-icons";

import { RepositoryWorkspace } from "@/components/repository/repository-workspace";
import { Button } from "@/components/ui/button";
import type { ProviderId } from "@/lib/providers/types";
import { getPublicProvider } from "@/lib/providers/server";
import {
  isRepositoryOwner,
  isRepositorySegment,
  loadRepositoryView,
} from "@/lib/providers/workspace";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ provider: string; owner: string; name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublicProviderRepositoryPage({
  params,
  searchParams,
}: Props) {
  const raw = await params;
  const query = await searchParams;
  const provider = providerId(raw.provider);
  const owner = decodeSegment(raw.owner);
  const name = decodeSegment(raw.name);
  if (
    !provider ||
    !owner ||
    !name ||
    !isRepositoryOwner(owner, provider) ||
    !isRepositorySegment(name)
  )
    notFound();

  const adapter = getPublicProvider(provider);
  if (!adapter) return <ProviderUnavailable provider={provider} />;
  const result = await loadRepositoryView(adapter, owner, name, query);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error")
    return <ProviderError provider={adapter.displayName} />;

  return (
    <RepositoryWorkspace
      repository={result.repository}
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
      sourceRef={result.sourceRef}
      treePath={result.treePath}
      entries={result.entries}
      file={result.file}
      surfaces={result.surfaces}
      workspaceBasePath={`/repos/${provider}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`}
    />
  );
}

function providerId(value: string): ProviderId | null {
  return value === "github" ||
    value === "gitlab" ||
    value === "bitbucket" ||
    value === "codeberg"
    ? value
    : null;
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function ProviderUnavailable({ provider }: { provider: ProviderId }) {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-8 dark:bg-background md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to explore
        </Link>
        <section className="my-auto py-24">
          <CircleDot className="h-6 w-6 text-foreground" />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {provider} provider
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            This reading room is not connected yet.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            OpenHub can search this provider, but this deployment has not
            enabled its public repository adapter.
          </p>
          <Button asChild className="mt-8 rounded-md">
            <Link href="/explore">
              Return to discovery <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}

function ProviderError({ provider }: { provider: string }) {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-8 dark:bg-background md:px-8 md:py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to explore
        </Link>
        <h1 className="mt-20 text-4xl font-semibold tracking-[-0.05em]">
          {provider} could not open this repository.
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          The provider request failed or the selected source is no longer
          available. Try again or open the original repository directly.
        </p>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="h-4 w-4" /> OpenHub never edits or executes
          provider source.
        </p>
      </div>
    </main>
  );
}
