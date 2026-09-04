import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const postTypeValidator = v.union(
  v.literal("text"),
  v.literal("snippet"),
  v.literal("question"),
  v.literal("review"),
  v.literal("discussion"),
  v.literal("showcase"),
  v.literal("tutorial"),
  v.literal("task"),
  v.literal("bounty"),
);

const visibilityValidator = v.union(
  v.literal("public"),
  v.literal("followers"),
  v.literal("private"),
);

const sourceVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("private"),
);

const sourceReferenceInputValidator = v.object({
  provider: v.string(),
  repositoryId: v.string(),
  repositoryFullName: v.string(),
  originalOwner: v.string(),
  path: v.string(),
  commitSha: v.string(),
  startLine: v.number(),
  endLine: v.number(),
  language: v.optional(v.string()),
  canonicalUrl: v.string(),
  licenseSpdxId: v.optional(v.string()),
  visibility: sourceVisibilityValidator,
  sourceSnapshot: v.string(),
});

const postValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  type: postTypeValidator,
  body: v.string(),
  sourceReferenceId: v.optional(v.id("sourceReferences")),
  visibility: visibilityValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
  commentCount: v.number(),
  repostCount: v.number(),
});

export const recent = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(postValidator),
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);

    return await ctx.db
      .query("posts")
      .withIndex("by_visibility_created_at", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    sourceReference: v.optional(sourceReferenceInputValidator),
  },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    if (args.body.trim().length === 0 && args.sourceReference === undefined) {
      throw new Error("A post needs text or a source reference");
    }

    if (args.sourceReference !== undefined) {
      validateSourceReference(args.sourceReference, args.visibility);
    }

    const now = Date.now();
    const sourceReferenceId =
      args.sourceReference === undefined
        ? undefined
        : await ctx.db.insert("sourceReferences", {
            ...args.sourceReference,
            createdAt: now,
          });

    const postId = await ctx.db.insert("posts", {
      authorId: userId,
      type: args.type,
      body: args.body,
      sourceReferenceId,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
    });

    const post = await ctx.db.get(postId);
    if (post === null) throw new Error("Post could not be created");
    return post;
  },
});

function validateSourceReference(
  sourceReference: {
    startLine: number;
    endLine: number;
    sourceSnapshot: string;
    visibility: "public" | "followers" | "private";
  },
  postVisibility: "public" | "followers" | "private",
) {
  if (
    !Number.isInteger(sourceReference.startLine) ||
    !Number.isInteger(sourceReference.endLine) ||
    sourceReference.startLine < 1 ||
    sourceReference.endLine < sourceReference.startLine
  ) {
    throw new Error("Source line range is invalid");
  }

  if (sourceReference.sourceSnapshot.trim().length === 0) {
    throw new Error("Source snapshot cannot be empty");
  }

  if (
    sourceReference.visibility === "private" &&
    postVisibility !== "private"
  ) {
    throw new Error("Private source can only be attached to a private post");
  }
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(Math.floor(value), 50));
}
