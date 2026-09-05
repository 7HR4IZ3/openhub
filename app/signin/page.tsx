"use client";

import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, Github, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <SignInSetup />;
  }

  return <ConnectedSignIn />;
}

function ConnectedSignIn() {
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
    <main className="min-h-screen bg-[#f7f7f4] dark:bg-[#111310]">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-10 md:grid-cols-[1fr_0.8fr] md:px-8">
        <div className="hidden self-stretch border-r border-black/[0.08] py-6 pr-16 dark:border-white/[0.08] md:flex md:flex-col md:justify-between">
          <Link href="/" aria-label="OpenHub home">
            <OpenHubMark />
          </Link>
          <div>
            <p className="max-w-lg text-5xl font-semibold leading-[0.98] tracking-[-0.055em]">
              Your next rabbit hole starts with a repository.
            </p>
            <p className="mt-6 max-w-md leading-7 text-muted-foreground">
              Follow the source, the people, and the conversations that make
              software worth learning.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Open-source, with context.</p>
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Enter OpenHub</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">Bring your GitHub trail.</h1>
            <p className="mt-4 leading-7 text-muted-foreground">
              One account. Your profile, contributions, and the repositories you can access.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-full"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            <Github className="h-5 w-5" />
            {isSigningIn ? "Connecting to GitHub…" : "Continue with GitHub"}
          </Button>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          <div className="mt-8 space-y-4 border-t border-black/[0.1] pt-6 text-sm text-muted-foreground dark:border-white/[0.1]">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span>OpenHub never edits or executes repository code.</span>
            </div>
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span>AI explanations stay read-only and cite their sources.</span>
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

function SignInSetup() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-5 py-12 dark:bg-[#111310]">
      <section className="w-full max-w-xl rounded-3xl border border-black/[0.1] bg-[#fbfbf9] p-7 dark:border-white/[0.1] dark:bg-[#151714] sm:p-10">
        <OpenHubMark />
        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">GitHub connection</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">The account layer is waiting to connect.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          GitHub sign-in is ready in the app, but this environment has no Convex
          deployment URL yet. Configure the backend before starting OAuth.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link href="/explore">Explore repositories</Link></Button>
          <Button asChild variant="outline" className="rounded-full bg-transparent"><Link href="/">Back home</Link></Button>
        </div>
      </section>
    </main>
  );
}
