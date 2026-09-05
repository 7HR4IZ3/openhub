import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      profile(profile) {
        return { id: String(profile.id), name: profile.name ?? profile.login,
          email: profile.email, image: profile.avatar_url,
          githubLogin: profile.login, githubId: String(profile.id), bio: profile.bio ?? "" };
      },
      // Identity login stays separate from the future private-repository
      // connection, which must use a constrained server-side authorization.
      authorization: {
        params: { scope: "read:user user:email read:org" },
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.provider.id !== "github" || typeof args.profile.githubLogin !== "string" ||
          typeof args.profile.githubId !== "string") throw new Error("GitHub identity required");
      // Convex Auth exposes an AnyDataModel context to this callback. Cast only
      // after the callback has established that this is the configured provider;
      // the runtime context still uses the application's complete schema.
      const appCtx = ctx as unknown as MutationCtx;
      const login = args.profile.githubLogin;
      const displayName = typeof args.profile.name === "string" ? args.profile.name : login;
      const image = typeof args.profile.image === "string" ? args.profile.image : undefined;
      const userData = { name: displayName, ...(image ? { image } : {}),
        ...(args.profile.email ? { email: args.profile.email } : {}) };
      const authAccount = await appCtx.db.query("authAccounts")
        .withIndex("providerAndAccountId", q => q.eq("provider", "github").eq("providerAccountId", args.profile.githubId as string)).unique();
      const providerAccount = await appCtx.db.query("providerAccounts")
        .withIndex("by_provider_account", q => q.eq("provider", "github").eq("providerUserId", args.profile.githubId as string)).unique();
      if (authAccount && authAccount.userId !== args.existingUserId) throw new Error("GitHub identity is already linked");
      if (providerAccount && providerAccount.userId !== args.existingUserId) throw new Error("GitHub identity is already linked");
      const userId = args.existingUserId ?? await appCtx.db.insert("users", userData);
      if (args.existingUserId) await appCtx.db.patch(userId, userData);
      const account = await appCtx.db.query("providerAccounts")
        .withIndex("by_user_provider", q => q.eq("userId", userId).eq("provider", "github")).unique();
      if (account && account.providerUserId !== args.profile.githubId) throw new Error("Only one GitHub account is supported");
      const now = Date.now();
      if (account) await appCtx.db.patch(account._id, { login, status: "active", lastValidatedAt: now, updatedAt: now });
      else await appCtx.db.insert("providerAccounts", { userId, provider: "github",
        providerUserId: args.profile.githubId, login, scopes: ["read:user", "user:email", "read:org"],
        status: "active", lastValidatedAt: now, createdAt: now, updatedAt: now });
      const profile = await appCtx.db.query("profiles").withIndex("by_user_id", q => q.eq("userId", userId)).unique();
      if (profile) await appCtx.db.patch(profile._id, {
        githubLogin: login, githubProfileUrl: `https://github.com/${login}`, updatedAt: now,
      });
      else {
        const preferred = login.toLowerCase();
        const taken = await appCtx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", preferred)).unique();
        await appCtx.db.insert("profiles", { userId, handle: taken ? `gh-${args.profile.githubId}` : preferred,
          displayName, ...(image ? { avatarUrl: image } : {}),
          bio: typeof args.profile.bio === "string" ? args.profile.bio : "",
          githubLogin: login, githubProfileUrl: `https://github.com/${login}`,
          interests: [], createdAt: now, updatedAt: now });
      }
      return userId;
    },
  },
});
