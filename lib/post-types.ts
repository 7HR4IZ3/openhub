import type { DiffContext, SourceReferenceDraft } from "@/lib/source-references";

export type PostType =
  | "text"
  | "snippet"
  | "question"
  | "review"
  | "discussion"
  | "showcase"
  | "tutorial"
  | "task"
  | "bounty";

export type PostVisibility = "public" | "followers" | "private";

export type CreatePostInput = {
  type: PostType;
  body: string;
  visibility: PostVisibility;
  sourceReference?: SourceReferenceDraft;
  diffReference?: DiffContext;
};
