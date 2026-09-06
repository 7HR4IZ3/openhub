"use client";

import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ArrowLeftIcon as ArrowLeft,
  GitHubLogoIcon as Github,
  LockClosedIcon as LockKeyhole,
  MagicWandIcon as Sparkles,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-12 px-5 py-10 md:grid-cols-[1fr_0.8fr] md:px-8">
        <div className="hidden self-stretch border-r border-border py-6 pr-16 md:flex md:flex-col md:justify-between">
          <Link href="/" aria-label="OpenHub home">
            <OpenHubMark />
          </Link>
          <div>
            <p className="max-w-lg editorial-title text-5xl">
              Your next rabbit hole starts with a repository.
            </p>
            <p className="mt-6 max-w-md leading-7 text-muted-foreground">
              Follow the source, the people, and the conversations that make
              software worth learning.
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
          <div className="mb-9">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Enter OpenHub
            </p>
            <h1 className="mt-3 editorial-title text-4xl">
              Bring your GitHub trail.
            </h1>
            <p className="mt-4 leading-7 text-muted-foreground">
              One account. Your profile, contributions, and the repositories you
              can access.
            </p>
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
          <Link
            href="/explore"
            className="mt-4 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            Continue browsing without an account
          </Link>

          <div className="mt-8 space-y-4 border-t border-border pt-6 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span>OpenHub never edits or executes repository code.</span>
            </div>
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span>
                AI explanations stay read-only and cite their sources.
              </span>
            </div>
          </div>

          <p className="mt-10 text-xs leading-5 text-muted-foreground">
            By continuing, you agree to use OpenHub for constructive technical
            discussion. GitHub remains the source of truth for repositories.
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
