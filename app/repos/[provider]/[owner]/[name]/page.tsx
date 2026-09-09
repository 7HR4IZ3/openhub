import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  DotFilledIcon as CircleDot,
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
  if (!adapter) return <ProviderUnavailable provider={provider} owner={owner} name={name} />;
  const result = await loadRepositoryView(adapter, owner, name, query);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error")
    return <ProviderError provider={adapter.displayName} owner={owner} name={name} />;

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

function ProviderUnavailable({ provider, owner, name }: { provider: ProviderId; owner: string; name: string }) {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-8 dark:bg-background md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to explore
        </Link>
        <section className="my-auto py-16">
          <CircleDot className="h-5 w-5 text-muted-foreground" />
          <p className="mt-4 font-mono text-sm text-muted-foreground">{provider} · {owner}/{name}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Provider unavailable.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">This source adapter is not enabled for the current deployment.</p>
          <div className="mt-6 flex flex-wrap gap-2"><Button asChild className="rounded-md"><Link href="/explore">Back to explore <ArrowUpRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline" className="rounded-md bg-transparent"><a href={providerUrl(provider, owner, name)} target="_blank" rel="noreferrer">Open source</a></Button></div>
        </section>
      </div>
    </main>
  );
}

function ProviderError({ provider, owner, name }: { provider: string; owner: string; name: string }) {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-8 dark:bg-background md:px-8 md:py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to explore
        </Link>
        <div className="mt-16 rounded-lg border border-border p-5">
          <p className="font-mono text-sm text-muted-foreground">{provider} · {owner}/{name}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Could not open this repository.</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Try again or open the original source.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Button asChild className="rounded-md"><Link href={`/repos/${encodeURIComponent(provider.toLowerCase())}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`}>Retry</Link></Button><Button asChild variant="outline" className="rounded-md bg-transparent"><a href={providerUrl(provider.toLowerCase() as ProviderId, owner, name)} target="_blank" rel="noreferrer">Open source</a></Button></div>
        </div>
      </div>
    </main>
  );
}

function providerUrl(provider: ProviderId, owner: string, name: string) {
  const origins: Record<ProviderId, string> = {
    github: "https://github.com",
    gitlab: "https://gitlab.com",
    bitbucket: "https://bitbucket.org",
    codeberg: "https://codeberg.org",
  };
  return `${origins[provider]}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}
