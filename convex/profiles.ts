import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const profileValidator = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  handle: v.string(),
  displayName: v.string(),
  bio: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  githubLogin: v.optional(v.string()),
  githubProfileUrl: v.optional(v.string()),
  interests: v.array(v.string()),
  portfolioUrl: v.optional(v.string()),
  availability: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const viewer = query({
  args: {},
  returns: v.union(profileValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const ensure = mutation({
  args: {},
  returns: profileValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    if (existing !== null) return existing;

    const user = await ctx.db.get(userId);
    if (user === null) throw new Error("User was deleted");

    const displayName = user.name ?? "OpenHub developer";
    const baseHandle = normalizeHandle(displayName);
    let handle = baseHandle;
    let suffix = 2;
    while (
      (await ctx.db
        .query("profiles")
        .withIndex("by_handle", (q) => q.eq("handle", handle))
        .unique()) !== null
    ) {
      handle = `${baseHandle}-${suffix}`;
      suffix += 1;
    }

    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      handle,
      displayName,
      avatarUrl: user.image,
      interests: [],
      createdAt: now,
      updatedAt: now,
    });

    const profile = await ctx.db.get(profileId);
    if (profile === null) throw new Error("Profile could not be created");
    return profile;
  },
});

function normalizeHandle(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return normalized || "developer";
}
