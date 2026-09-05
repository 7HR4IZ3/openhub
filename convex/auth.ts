import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { encryptProviderToken } from "./provider-tokens";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      profile(profile, tokens) {
        return { id: String(profile.id), name: profile.name ?? profile.login,
          email: profile.email, image: profile.avatar_url,
          githubLogin: profile.login, githubId: String(profile.id), bio: profile.bio ?? "",
          ...(typeof tokens.access_token === "string" ? { githubAccessToken: tokens.access_token } : {}) };
      },
      // Identity login and private-repository access share the GitHub OAuth
      // callback. The token is encrypted server-side and only used for
      // read-only provider requests; OpenHub never writes to repositories.
      authorization: {
        params: { scope: "read:user user:email read:org repo" },
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(context, args) {
      const ctx = context as MutationCtx;
      if (args.provider.id !== "github" || typeof args.profile.githubLogin !== "string" ||
          typeof args.profile.githubId !== "string") throw new Error("GitHub identity required");
      const login = args.profile.githubLogin;
      const displayName = typeof args.profile.name === "string" ? args.profile.name : login;
      const image = typeof args.profile.image === "string" ? args.profile.image : undefined;
      const userData = { name: displayName, ...(image ? { image } : {}),
        ...(args.profile.email ? { email: args.profile.email } : {}) };
      const userId = args.existingUserId ?? await ctx.db.insert("users", userData);
      if (args.existingUserId) await ctx.db.patch(userId, userData);
      const encryptedTokenRef = typeof args.profile.githubAccessToken === "string"
        ? await encryptProviderToken(args.profile.githubAccessToken)
        : null;
      const account = await ctx.db.query("providerAccounts")
        .withIndex("by_user_provider", q => q.eq("userId", userId).eq("provider", "github")).unique();
      if (account && account.providerUserId !== args.profile.githubId) throw new Error("Only one GitHub account is supported");
      const now = Date.now();
      if (account) await ctx.db.patch(account._id, { login, status: "active", lastValidatedAt: now, updatedAt: now,
        ...(encryptedTokenRef ? { encryptedTokenRef } : {}) });
      else await ctx.db.insert("providerAccounts", { userId, provider: "github",
        providerUserId: args.profile.githubId, login, scopes: ["read:user", "user:email", "read:org", "repo"],
        ...(encryptedTokenRef ? { encryptedTokenRef } : {}),
        status: "active", lastValidatedAt: now, createdAt: now, updatedAt: now });
      const profile = await ctx.db.query("profiles").withIndex("by_user_id", q => q.eq("userId", userId)).unique();
      if (profile) await ctx.db.patch(profile._id, {
        githubLogin: login, githubProfileUrl: `https://github.com/${login}`, updatedAt: now,
      });
      else {
        const preferred = login.toLowerCase();
        const taken = await ctx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", preferred)).unique();
        await ctx.db.insert("profiles", { userId, handle: taken ? `gh-${args.profile.githubId}` : preferred,
          displayName, ...(image ? { avatarUrl: image } : {}),
          bio: typeof args.profile.bio === "string" ? args.profile.bio : "",
          githubLogin: login, githubProfileUrl: `https://github.com/${login}`,
          interests: [], createdAt: now, updatedAt: now });
      }
      return userId;
    },
  },
});

export const providerTokenForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.object({ login: v.string(), providerUserId: v.string(), encryptedTokenRef: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const account = await ctx.db.query("providerAccounts")
      .withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("provider", "github"))
      .unique();
    if (!account || account.status !== "active" || !account.encryptedTokenRef) return null;
    return { login: account.login, providerUserId: account.providerUserId, encryptedTokenRef: account.encryptedTokenRef };
  },
});
