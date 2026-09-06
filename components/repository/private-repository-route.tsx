"use client";

import { api } from "@/convex/_generated/api";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import { RepositoryWorkspace } from "@/components/repository/repository-workspace";
import { useAction } from "convex/react";
import { LockClosedIcon as LockKeyhole } from "@radix-ui/react-icons";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PrivateRepositoryRoute({
  owner,
  name,
}: {
  owner: string;
  name: string;
}) {
  const searchParams = useSearchParams();
  const getView = useAction(api.privateRepositories.getView);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; value: Awaited<ReturnType<typeof getView>> }
  >({ kind: "loading" });
  const ref = searchParams.get("ref") ?? undefined;
  const path = searchParams.get("path") ?? undefined;

  useEffect(() => {
    let active = true;
    void getView({
      owner,
      name,
      ...(ref ? { ref } : {}),
      ...(path ? { path } : {}),
    })
      .then((value) => {
        if (active) setState({ kind: "ready", value });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Private repository access failed",
          });
      });
    return () => {
      active = false;
    };
  }, [getView, name, owner, path, ref]);

  if (state.kind === "loading")
    return (
      <main className="min-h-[100dvh] bg-background px-5 py-20 dark:bg-background">
        <div className="mx-auto max-w-3xl">
          <CurationLoading label="Checking your GitHub access…" />
        </div>
      </main>
    );
  if (state.kind === "error")
    return (
      <main className="min-h-[100dvh] bg-background px-5 py-20 dark:bg-background">
        <div className="mx-auto max-w-3xl">
          <CurationEmptyState
            icon={LockKeyhole}
            eyebrow="Private repository"
            title="This repository is not available in your connected GitHub account."
            body={state.message}
            action="Explore public repositories"
            actionHref="/explore"
            secondaryAction="Open profile"
            secondaryHref="/profile"
          />
        </div>
      </main>
    );

  return (
    <RepositoryWorkspace
      repository={state.value.repository}
      convexConfigured
      sourceRef={state.value.sourceRef}
      treePath={state.value.treePath}
      entries={state.value.entries}
      file={state.value.file}
      surfaces={{
        refs: [],
        commits: [],
        issues: [],
        pullRequests: [],
        releases: [],
        contributors: [],
        license: null,
        resolvedRefSha: state.value.sourceRef,
      }}
    />
  );
}
