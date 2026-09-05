"use client";

import { api } from "@/convex/_generated/api";
import { DiffCodeViewer } from "@/components/repository/diff-code-viewer";
import { SourceCodeViewer } from "@/components/repository/source-code-viewer";
import { Button } from "@/components/ui/button";
import type { RepositoryFile } from "@/lib/providers/types";
import type { CreatePostInput, PostType, PostVisibility } from "@/lib/post-types";
import type { DiffContext, SourceContext } from "@/lib/source-references";
import { cn } from "@/lib/utils";
import { useAction, useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileCode2,
  Github,
  LockKeyhole,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const postTypes: Array<{ value: PostType; label: string; hint: string }> = [
  { value: "snippet", label: "Snippet", hint: "Share a useful piece of source" },
  { value: "question", label: "Question", hint: "Ask with the relevant code attached" },
  { value: "review", label: "Review", hint: "Offer thoughtful technical feedback" },
  { value: "discussion", label: "Discussion", hint: "Start a conversation around software" },
  { value: "text", label: "Text", hint: "Write without a source attachment" },
];

export function PostComposer({
  source,
  diff,
  sourceError,
  convexConfigured,
}: {
  source: SourceContext | null;
  diff: DiffContext | null;
  sourceError: string | null;
  convexConfigured: boolean;
}) {
  if (convexConfigured) {
    return <ConnectedPostComposer source={source} diff={diff} sourceError={sourceError} />;
  }

  return (
    <PostComposerForm
      source={source}
      diff={diff}
      sourceError={sourceError}
      onPublish={undefined}
      publishError={null}
      isPublishing={false}
    />
  );
}

function ConnectedPostComposer({
  source,
  diff,
  sourceError,
}: {
  source: SourceContext | null;
  diff: DiffContext | null;
  sourceError: string | null;
}) {
  const router = useRouter();
  const createPost = useMutation(api.posts.create);
  const createSource = useAction(api.posts.createSource);
  const createDiff = useAction(api.posts.createDiff);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  async function publish(input: CreatePostInput) {
    setPublishError(null);
    setIsPublishing(true);
    try {
      const post = input.diffReference
        ? await createDiff({ type: input.type, body: input.body, visibility: input.visibility, diffReference: input.diffReference })
        : input.sourceReference
          ? await createSource({ type: input.type, body: input.body, visibility: input.visibility, sourceReference: input.sourceReference })
          : await createPost({ type: input.type, body: input.body, visibility: input.visibility });
      router.push(`/posts/${post._id}`);
    } catch (error) {
      console.error(error);
      setPublishError("OpenHub could not publish this post. Check the source and try again.");
      setIsPublishing(false);
    }
  }

  return (
    <PostComposerForm
      source={source}
      diff={diff}
      sourceError={sourceError}
      onPublish={publish}
      publishError={publishError}
      isPublishing={isPublishing}
    />
  );
}

function PostComposerForm({
  source,
  diff,
  sourceError,
  onPublish,
  publishError,
  isPublishing,
}: {
  source: SourceContext | null;
  diff: DiffContext | null;
  sourceError: string | null;
  onPublish: ((input: CreatePostInput) => Promise<void>) | undefined;
  publishError: string | null;
  isPublishing: boolean;
}) {
  const [postType, setPostType] = useState<PostType>(source ? "snippet" : diff ? "review" : "text");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const selectedType = postTypes.find((item) => item.value === postType) ?? postTypes[0];
  const canPublish = body.trim().length > 0 || source !== null || diff !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish || onPublish === undefined) return;

    await onPublish({
      type: postType,
      body,
      visibility,
      sourceReference: source === null ? undefined : toSourceReference(source),
      diffReference: diff === null ? undefined : diff,
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-foreground dark:bg-[#111310]">
      <div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex">
            <LockKeyhole className="h-3.5 w-3.5" />
            Source-backed writing
          </span>
        </header>

        <div className="mx-auto max-w-5xl py-12 sm:py-16">
          {source !== null || diff !== null ? (
            <p role="status" className="mb-6 rounded-md border p-4 text-sm">
              OpenHub will re-check this public repository, commit pair, file,
              attribution, and license on the server before publishing.
            </p>
          ) : null}
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b513d] dark:text-[#e6a07c]">
              OpenHub composer
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
              Publish something worth following.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Bring the source, the question, or the idea. OpenHub keeps the original context attached so a post can lead somewhere useful.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0 rounded-[1.6rem] border border-black/[0.1] bg-[#fbfbf9] p-5 dark:border-white/[0.1] dark:bg-[#151714] sm:p-7">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Post type">
                {postTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={postType === item.value}
                    onClick={() => setPostType(item.value)}
                    className={cn(
                      "rounded-full border border-black/[0.1] px-3.5 py-2 text-xs font-semibold transition-colors dark:border-white/[0.1]",
                      postType === item.value
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-7">
                <p className="text-sm font-semibold">{selectedType.hint}</p>
                <label className="sr-only" htmlFor="post-body">
                  Post text
                </label>
                <textarea
                  id="post-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={placeholderFor(postType)}
                  maxLength={64_000}
                  rows={8}
                  className="mt-4 min-h-48 w-full resize-y rounded-2xl border border-black/[0.1] bg-transparent px-4 py-4 text-base leading-7 outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#b45e3c] dark:border-white/[0.1]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Markdown and code blocks are supported.</span>
                  <span>Up to 64 KB of text.</span>
                </div>
              </div>

              {source ? <SourceAttachment source={source} /> : null}
              {diff ? <DiffAttachment diff={diff} /> : null}

              {sourceError ? (
                <div className="mt-6 rounded-2xl border border-[#b45e3c]/30 bg-[#b45e3c]/[0.06] p-4 text-sm leading-6">
                  <p className="font-semibold">The source could not be attached.</p>
                  <p className="mt-1 text-muted-foreground">{sourceError}</p>
                  <Link href="/explore" className="mt-3 inline-flex items-center gap-1 font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
                    Return to repositories <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : null}

              {publishError ? <p className="mt-5 text-sm text-destructive">{publishError}</p> : null}

              <div className="mt-7 flex flex-col gap-4 border-t border-black/[0.08] pt-5 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Visibility</span>
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as PostVisibility)}
                    className="rounded-full border border-black/[0.1] bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none dark:border-white/[0.1]"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers</option>
                    <option value="private">Only me</option>
                  </select>
                </label>
                <Button
                  type="submit"
                  disabled={!canPublish || onPublish === undefined || isPublishing}
                  className="rounded-full"
                >
                  {onPublish === undefined ? "Connect Convex to publish" : isPublishing ? "Publishing…" : "Publish"}
                  {onPublish !== undefined ? <Send className="h-4 w-4" /> : null}
                </Button>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[1.6rem] bg-[#e9e6dc] p-5 dark:bg-[#20251f]">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">A source is a promise</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Attached code is read-only, pinned to a commit, attributed to its original owner, and linked back to GitHub.
                </p>
              </section>

              <section className="rounded-[1.6rem] border border-black/[0.1] p-5 dark:border-white/[0.1]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Good OpenHub posts</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#9b4d31] dark:text-[#e99970]" />Name the question a reader can help answer.</li>
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#9b4d31] dark:text-[#e99970]" />Keep the relevant lines close to the claim.</li>
                  <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#9b4d31] dark:text-[#e99970]" />Give maintainers room to respond.</li>
                </ul>
              </section>
            </aside>
          </form>
        </div>
      </div>
    </main>
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
    <div className="mt-7 overflow-hidden rounded-2xl border border-black/[0.1] dark:border-white/[0.1]">
      <div className="flex flex-col gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
            <span className="truncate font-mono">{source.path}</span>
          </div>
          <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">
            {source.repositoryFullName} · lines {source.startLine}–{source.endLine} · {shortSha(source.commitSha)}
          </p>
        </div>
        <a
          href={source.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"
        >
          View on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <SourceCodeViewer
        file={file}
        primaryLanguage={source.language ?? null}
        lineNumberOffset={source.startLine}
      />
      <div className="border-t border-black/[0.08] px-4 py-3 text-xs leading-5 text-muted-foreground dark:border-white/[0.08]">
        Source attribution will be stored with this post so the snapshot remains understandable even if the repository moves on.
      </div>
    </div>
  );
}

function DiffAttachment({ diff }: { diff: DiffContext }) {
  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-black/[0.1] dark:border-white/[0.1]">
      <div className="flex flex-col gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
            <span className="truncate font-mono">{diff.path}</span>
          </div>
          <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">
            {diff.repositoryFullName} · {shortSha(diff.baseCommitSha)} → {shortSha(diff.headCommitSha)}
          </p>
        </div>
        <a
          href={diff.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"
        >
          View comparison <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <DiffCodeViewer
        path={diff.path}
        language={diff.language}
        baseSnapshot={diff.baseSnapshot}
        headSnapshot={diff.headSnapshot}
      />
      <div className="border-t border-black/[0.08] px-4 py-3 text-xs leading-5 text-muted-foreground dark:border-white/[0.08]">
        This comparison is pinned to both commits and will be verified again before publication.
      </div>
    </div>
  );
}

function toSourceReference(source: SourceContext) {
  const { repositoryName: _repositoryName, ...reference } = source;
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
    default:
      return "Write something useful for someone exploring software…";
  }
}

function shortSha(value: string) {
  return value.slice(0, 7);
}
