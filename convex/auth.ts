import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      // Identity login stays separate from the future private-repository
      // connection, which must use a constrained server-side authorization.
      authorization: {
        params: { scope: "read:user user:email read:org" },
      },
    }),
  ],
});
