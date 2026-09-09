"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SourceCodeViewer } from "@/components/repository/source-code-viewer";
import { DiffCodeViewer } from "@/components/repository/diff-code-viewer";
import { CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import type { RepositoryFile } from "@/lib/providers/types";
import type {
  CreatePostInput,
  PostType,
  PostVisibility,
} from "@/lib/post-types";
import type {
  DiffDisplayContext,
  SourceContext,
} from "@/lib/source-references";
import { useAction, useConvexAuth, useMutation } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  FileTextIcon as FileCode2,
  LockClosedIcon as LockKeyhole,
  PaperPlaneIcon as Send,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const postTypes: Array<{ value: PostType; label: string; hint: string }> = [
  {
    value: "snippet",
    label: "Snippet",
    hint: "Share a useful piece of source",
  },
  {
    value: "question",
    label: "Question",
    hint: "Ask with the relevant code attached",
  },
  {
    value: "review",
    label: "Review",
    hint: "Offer thoughtful technical feedback",
  },
  {
    value: "discussion",
    label: "Discussion",
    hint: "Start a conversation around software",
  },
  {
    value: "task",
    label: "Task",
    hint: "Point people toward a concrete technical task",
  },
  {
    value: "bounty",
    label: "Bounty",
    hint: "Share a task with an external reward or issue link",
  },
  { value: "text", label: "Text", hint: "Write without a source attachment" },
];

export function PostComposer({
  source,
  diff,
  sourceError,
  communityId,
  convexConfigured,
}: {
  source: SourceContext | null;
  diff: DiffDisplayContext | null;
  sourceError: string | null;
  communityId?: string;
  convexConfigured: boolean;
}) {
  if (convexConfigured) {
    return (
      <ConnectedPostComposer
        source={source}
        diff={diff}
        sourceError={sourceError}
        communityId={communityId}
      />
    );
  }

  return (
    <PostComposerForm
      source={source}
      diff={diff}
      sourceError={sourceError}
      communityId={communityId}
      onPublish={undefined}
      publishError={null}
      isPublishing={false}
      publishMode="unavailable"
    />
  );
}

function ConnectedPostComposer({
  source,
  diff,
  sourceError,
  communityId,
}: {
  source: SourceContext | null;
  diff: DiffDisplayContext | null;
  sourceError: string | null;
  communityId?: string;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createPost = useMutation(api.posts.create);
  const createSource = useAction(api.posts.createSource);
  const createDiff = useAction(api.posts.createDiff);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  async function publish(input: CreatePostInput) {
    setPublishError(null);
    setIsPublishing(true);
    try {
      const verifiedCommunityId = input.communityId as
        | Id<"communities">
        | undefined;
      const post = input.sourceReference
        ? await createSource({
            type: input.type,
            body: input.body,
            visibility: input.visibility,
            communityId: verifiedCommunityId,
            sourceReference: input.sourceReference,
          })
        : input.diffReference
          ? await createDiff({
              type: input.type,
              body: input.body,
              visibility: input.visibility,
              communityId: verifiedCommunityId,
              diffReference: input.diffReference,
            })
          : await createPost({
              type: input.type,
              body: input.body,
              visibility: input.visibility,
              ...(verifiedCommunityId === undefined
                ? {}
                : { communityId: verifiedCommunityId }),
            });
      router.push(`/posts/${post._id}`);
    } catch (error) {
      console.error(error);
      setPublishError(
        "OpenHub could not publish this post. Check the source and try again.",
      );
      setIsPublishing(false);
    }
  }

  return (
    <PostComposerForm
      source={source}
      diff={diff}
      sourceError={sourceError}
      communityId={communityId}
      onPublish={publish}
      publishError={publishError}
      isPublishing={isPublishing}
      publishMode={
        isAuthLoading ? "checking" : isAuthenticated ? "ready" : "signed-out"
      }
    />
  );
}

function PostComposerForm({
  source,
  diff,
  sourceError,
  communityId,
  onPublish,
  publishError,
  isPublishing,
  publishMode,
}: {
  source: SourceContext | null;
  diff: DiffDisplayContext | null;
  sourceError: string | null;
  communityId?: string;
  onPublish: ((input: CreatePostInput) => Promise<void>) | undefined;
  publishError: string | null;
  isPublishing: boolean;
  publishMode: "unavailable" | "signed-out" | "checking" | "ready";
}) {
  const [postType, setPostType] = useState<PostType>(
    source ? "snippet" : "text",
  );
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const bodyBytes = new TextEncoder().encode(body).length;
  const bodyTooLarge = bodyBytes > 64_000;
  const canPublish =
    !bodyTooLarge &&
    (body.trim().length > 0 || source !== null || diff !== null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish || onPublish === undefined || isPublishing) return;

    await onPublish({
      type: postType,
      body,
      visibility,
      ...(communityId ? { communityId } : {}),
      sourceReference: source === null ? undefined : toSourceReference(source),
      diffReference: diff === null ? undefined : toDiffReference(diff),
    });
  }

  return (
    <CurationShell active="Compose" eyebrow="compose" title="Write">
      <div className="v2-compose-page px-5 py-5 sm:px-8 sm:py-6">
        <div>
          {source !== null ? (
            <p
              role="status"
              className="mb-5 rounded-md border px-3 py-2 text-xs text-muted-foreground"
            >
              Source pinned to its public commit.
              <Link href="/compose" className="ml-1 underline">
                Remove
              </Link>
            </p>
          ) : null}

          {communityId ? (
            <p className="mb-5 inline-flex rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-foreground dark:bg-secondary">
              Community
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="v2-compose-card min-w-0 rounded-xl border border-border bg-card p-4 dark:bg-card sm:p-6">
              <fieldset disabled={isPublishing}>
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                  <span>Post type</span>
                  <select
                    value={postType}
                    onChange={(event) => setPostType(event.target.value as PostType)}
                    className="rounded-md border border-input bg-secondary px-3 py-2 text-xs font-semibold text-foreground outline-none"
                  >
                    {postTypes.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <div className="mt-5">
                <label className="sr-only" htmlFor="post-body">
                  Post text
                </label>
                <textarea
                  id="post-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={placeholderFor(postType)}
                  rows={8}
                  aria-invalid={bodyTooLarge}
                  aria-describedby="post-size-status"
                  className="mt-4 min-h-48 w-full resize-y rounded-xl border border-border bg-transparent px-4 py-4 text-base leading-7 outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="sr-only">Post size</span>
                  <span
                    id="post-size-status"
                    role={bodyTooLarge ? "alert" : undefined}
                    className={bodyTooLarge ? "text-destructive" : undefined}
                  >
                    {bodyTooLarge
                      ? "Post exceeds the 64 KB limit."
                      : `${new Intl.NumberFormat("en").format(bodyBytes)} / 64,000 bytes`}
                  </span>
                </div>
              </div>

              {source ? <SourceAttachment source={source} /> : null}
              {diff ? <DiffAttachment diff={diff} /> : null}

              {sourceError ? (
                <div className="mt-6 rounded-xl border border-ring bg-accent p-4 text-sm leading-6">
                  <p className="font-semibold">
                    The code context could not be attached.
                  </p>
                  <p className="mt-1 text-muted-foreground">{sourceError}</p>
                  <Link
                    href="/explore"
                    className="mt-3 inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
                  >
                    Return to repositories{" "}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : null}

              {publishError ? (
                <p role="alert" className="mt-5 text-sm text-destructive">
                  {publishError}
                </p>
              ) : null}

              <div className="mt-7 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Visibility</span>
                  <select
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(event.target.value as PostVisibility)
                    }
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers</option>
                    <option value="private">Only me</option>
                  </select>
                </label>
                {publishMode === "ready" ? (
                  <Button
                    type="submit"
                    disabled={!canPublish || isPublishing}
                  >
                    {isPublishing ? "Publishing…" : "Publish"}
                    <Send className="h-4 w-4" />
                  </Button>
                ) : publishMode === "checking" ? (
                  <Button type="button" disabled>
                    Checking account…
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/signin">
                      {publishMode === "signed-out"
                        ? "Sign in to publish"
                        : "Connect to publish"}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </section>
          </form>
        </div>
      </div>
    </CurationShell>
  );
}

function SourceAttachment({ source }: { source: SourceContext }) {
  const file: RepositoryFile = {
    path: source.path,
    commitSha: source.commitSha,
    oid: "source-snapshot",
    text: source.sourceSnapshot,
    byteSize: new TextEncoder().encode(source.sourceSnapshot).byteLength,
  };

  return (
    <div className="mt-7 overflow-hidden rounded-xl border border-border">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="h-4 w-4 shrink-0 text-foreground" />
            <span className="truncate font-mono">{source.path}</span>
          </div>
          <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">
            {source.repositoryFullName} · lines {source.startLine}–
            {source.endLine} · {shortSha(source.commitSha)}
          </p>
        </div>
        <a
          href={source.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
        >
          View on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <SourceCodeViewer
        file={file}
        primaryLanguage={source.language ?? null}
        lineNumberOffset={source.startLine}
      />
      <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
        Source attribution will be stored with this post so the snapshot remains
        understandable even if the repository moves on.
      </div>
    </div>
  );
}

function DiffAttachment({ diff }: { diff: DiffDisplayContext }) {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border border-border">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="h-4 w-4 shrink-0 text-foreground" />
            <span className="truncate font-mono">{diff.path}</span>
          </div>
          <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">
            {diff.repositoryFullName} · {shortSha(diff.baseCommitSha)} →{" "}
            {shortSha(diff.headCommitSha)}
          </p>
        </div>
        <a
          href={diff.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
        >
          Compare on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <DiffCodeViewer
        path={diff.path}
        baseSnapshot={diff.baseSnapshot}
        headSnapshot={diff.headSnapshot}
        language={diff.language ?? null}
      />
      <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
        Both snapshots are read-only and will be rechecked at publish time.
        Original owner: @{diff.originalOwner}
        {diff.licenseSpdxId ? ` · ${diff.licenseSpdxId}` : ""}.
      </div>
    </div>
  );
}

function toSourceReference(source: SourceContext) {
  const { repositoryName: _repositoryName, ...reference } = source;
  return reference;
}

function toDiffReference(diff: DiffDisplayContext) {
  const { repositoryName: _repositoryName, ...reference } = diff;
  return reference;
}

function placeholderFor(postType: PostType) {
  switch (postType) {
    case "snippet":
      return "What makes this snippet worth saving? Add the lesson, edge case, or detail you noticed…";
    case "question":
      return "What are you trying to understand? Include what you expected and what surprised you…";
    case "review":
      return "What would you like the author or community to consider? Keep the reasoning visible…";
    case "discussion":
      return "What idea about this software should the community explore together?";
    case "task":
      return "What technical task would make this project easier to use, learn, or maintain?";
    case "bounty":
      return "Describe the task and include the external issue or reward link in the post.";
    default:
      return "Write something useful for someone exploring software…";
  }
}

function shortSha(value: string) {
  return value.slice(0, 7);
}
