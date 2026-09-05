import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { bountyDocument, bountyStatus } from "./bounty-schema";

const pageValidator = v.object({ page: v.array(bountyDocument), isDone: v.boolean(), continueCursor: v.string() });

function bounded(options: PaginationOptions): PaginationOptions {
  if (!Number.isInteger(options.numItems) || options.numItems < 1 || options.numItems > 50) throw new ConvexError("Page size must be an integer from 1 to 50");
  return { numItems: options.numItems, cursor: options.cursor, maximumRowsRead: 100, maximumBytesRead: 256_000 };
}
async function viewer(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in required");
  return userId;
}
function clean(value: string, limit: number, allowEmpty = false) {
  const result = value.trim();
  if ((!allowEmpty && !result) || result.length > limit) throw new ConvexError("Bounty text is invalid");
  return result;
}
function externalUrl(value: string) {
  const result = value.trim();
  if (!result) throw new ConvexError("Use a valid HTTPS URL");
  try {
    const url = new URL(result);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch { throw new ConvexError("Use a valid HTTPS URL"); }
}

export const discover = query({
  args: { paginationOpts: paginationOptsValidator }, returns: pageValidator,
  handler: async (ctx, args) => {
    const result = await ctx.db.query("bounties").withIndex("by_status_created_at", (q) => q.eq("status", "open")).order("desc").paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const mine = query({
  args: { paginationOpts: paginationOptsValidator }, returns: pageValidator,
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("bounties").withIndex("by_creator_created_at", (q) => q.eq("creatorId", userId)).order("desc").paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const create = mutation({
  args: {
    title: v.string(), description: v.string(), repositoryLabel: v.optional(v.string()), issueUrl: v.string(), paymentUrl: v.optional(v.string()),
    amount: v.optional(v.number()), currency: v.optional(v.string()),
  }, returns: v.id("bounties"),
  handler: async (ctx, args) => {
    const creatorId = await viewer(ctx);
    const amount = args.amount === undefined ? undefined : Number.isFinite(args.amount) && args.amount >= 0 && args.amount <= 1_000_000_000 ? Math.round(args.amount * 100) / 100 : (() => { throw new ConvexError("Bounty amount is invalid"); })();
    const currency = args.currency?.trim().toUpperCase();
    if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) throw new ConvexError("Currency must be a three-letter code");
    const now = Date.now();
    return ctx.db.insert("bounties", {
      creatorId, title: clean(args.title, 160), description: clean(args.description, 8_000),
      ...(args.repositoryLabel?.trim() ? { repositoryLabel: clean(args.repositoryLabel, 160) } : {}),
      issueUrl: externalUrl(args.issueUrl), ...(args.paymentUrl?.trim() ? { paymentUrl: externalUrl(args.paymentUrl) } : {}),
      ...(amount === undefined ? {} : { amount }), ...(currency === undefined ? {} : { currency }), status: "open", createdAt: now, updatedAt: now,
    });
  },
});

export const setStatus = mutation({
  args: { bountyId: v.id("bounties"), status: bountyStatus }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const bounty = await ctx.db.get(args.bountyId);
    if (!bounty || bounty.creatorId !== userId) throw new ConvexError("Bounty is not available");
    await ctx.db.patch(bounty._id, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});
