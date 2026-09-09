"use client";

import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ArrowLeftIcon as ArrowLeft,
  GitHubLogoIcon as Github,
  LockClosedIcon as LockKeyhole,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-4xl items-center gap-10 px-5 py-8 md:grid-cols-[1fr_0.85fr] md:px-8">
        <div className="hidden self-stretch border-r border-border py-5 pr-12 md:flex md:flex-col md:justify-between">
          <Link href="/" aria-label="OpenHub home">
            <OpenHubMark />
          </Link>
          <div>
            <p className="max-w-lg editorial-title text-4xl">
              Explore the source behind the software.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Open-source, with context.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-12 flex items-center justify-between md:hidden">
            <Link href="/" aria-label="OpenHub home">
              <OpenHubMark />
            </Link>
            <Link href="/" className="text-sm text-muted-foreground">
              <ArrowLeft className="mr-1 inline h-4 w-4" /> Home
            </Link>
          </div>
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Enter OpenHub
            </p>
            <h1 className="mt-3 editorial-title text-3xl">Bring your GitHub trail.</h1>
          </div>

          {process.env.NEXT_PUBLIC_CONVEX_URL ? (
            <GitHubSignIn />
          ) : (
            <div role="status" className="rounded-lg border p-5">
              <p className="text-sm font-medium">
                Sign-in is unavailable right now.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                You can continue exploring public repositories.
              </p>
              <Button asChild className="mt-4">
                <Link href="/explore">Browse repositories</Link>
              </Button>
            </div>
          )}
          <Link href="/explore" className="mt-4 inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground">
            Browse without an account
          </Link>
          <p className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-foreground" />
            Read-only source access. GitHub remains the source of truth.
          </p>
        </div>
      </div>
    </main>
  );
}

function GitHubSignIn() {
  const { signIn } = useAuthActions();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setIsSigningIn(true);
    setError(null);
    try {
      await signIn("github", { redirectTo: "/home" });
    } catch (signInError) {
      console.error(signInError);
      setError("GitHub sign-in could not be started. Try again in a moment.");
      setIsSigningIn(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-md"
        onClick={handleSignIn}
        disabled={isSigningIn}
      >
        <Github className="h-5 w-5" />
        {isSigningIn ? "Connecting to GitHub…" : "Continue with GitHub"}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
