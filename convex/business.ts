import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { sponsorshipLinkDocument } from "./business-schema";

const linkInput = {
  repositoryId: v.id("repositories"),
  label: v.string(),
  url: v.string(),
  note: v.optional(v.string()),
};

export const linksForRepository = query({
  args: { repositoryId: v.id("repositories") },
  returns: v.array(sponsorshipLinkDocument),
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.visibility !== "public") return [];
    return await ctx.db
      .query("sponsorshipLinks")
      .withIndex("by_repository_active", (query) => query.eq("repositoryId", args.repositoryId).eq("active", true))
      .order("desc")
      .take(5);
  },
});

export const myLinks = query({
  args: {},
  returns: v.array(sponsorshipLinkDocument),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("sponsorshipLinks")
      .withIndex("by_owner_updated_at", (query) => query.eq("ownerUserId", userId))
      .order("desc")
      .take(30);
  },
});

export const createLink = mutation({
  args: linkInput,
  returns: v.id("sponsorshipLinks"),
  handler: async (ctx, args) => {
    const ownerUserId = await getAuthUserId(ctx);
    if (ownerUserId === null) throw new ConvexError("Sign in required");
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.visibility !== "public") throw new ConvexError("Only public repositories can receive sponsorship links");
    if (repository.ownerUserId !== ownerUserId) throw new ConvexError("Only the imported repository owner can manage this link");
    const label = clean(args.label, 80);
    const note = args.note === undefined ? undefined : clean(args.note, 500, true);
    const url = externalUrl(args.url);
    const existing = await ctx.db
      .query("sponsorshipLinks")
      .withIndex("by_repository_active", (query) => query.eq("repositoryId", args.repositoryId).eq("active", true))
      .take(5);
    if (existing.some((link) => link.url === url)) return existing.find((link) => link.url === url)!._id;
    const now = Date.now();
    return await ctx.db.insert("sponsorshipLinks", {
      repositoryId: args.repositoryId,
      ownerUserId,
      label,
      url,
      ...(note ? { note } : {}),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setLinkActive = mutation({
  args: { linkId: v.id("sponsorshipLinks"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required");
    const link = await ctx.db.get(args.linkId);
    if (!link || link.ownerUserId !== userId) throw new ConvexError("Sponsorship link is not available");
    await ctx.db.patch(link._id, { active: args.active, updatedAt: Date.now() });
    return null;
  },
});

function clean(value: string, limit: number, allowEmpty = false) {
  const result = value.trim();
  if ((!allowEmpty && result.length === 0) || result.length > limit) throw new ConvexError("Sponsorship link text is invalid");
  return result;
}

function externalUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new ConvexError("Sponsorship links must use HTTPS");
  }
}
