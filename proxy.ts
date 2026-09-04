import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/home(.*)", "/compose(.*)"]);

const authMiddleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/home");
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export default function proxy(...args: Parameters<typeof authMiddleware>) {
  // Public routes should render for design review before a Convex deployment
  // has been linked. Auth becomes active as soon as the URL exists.
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.next();
  }
  return authMiddleware(...args);
}

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
