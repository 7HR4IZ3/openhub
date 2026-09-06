"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { PersonIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  return process.env.NEXT_PUBLIC_CONVEX_URL ? (
    <ConnectedAccountMenu />
  ) : (
    <AccountMenuContent authenticated={false} />
  );
}

function ConnectedAccountMenu() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  return (
    <AccountMenuContent
      authenticated={isAuthenticated}
      loading={isLoading}
      onSignOut={signOut}
    />
  );
}

function AccountMenuContent({
  authenticated,
  loading = false,
  onSignOut,
}: {
  authenticated: boolean;
  loading?: boolean;
  onSignOut?: () => Promise<void>;
}) {
  const { theme, setTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function leave() {
    if (!onSignOut || pending) return;
    setPending(true);
    setError(null);
    try {
      await onSignOut();
    } catch {
      setError("Sign-out failed. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account and appearance"
          >
            <PersonIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          {loading ? (
            <DropdownMenuItem disabled>Loading account…</DropdownMenuItem>
          ) : authenticated ? (
            <DropdownMenuItem asChild>
              <Link href="/profile">Your profile</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link href="/signin">Sign in with GitHub</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/settings/safety">Safety and control</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme ?? "system"}
            onValueChange={setTheme}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              Use device setting
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          {authenticated && onSignOut ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pending}
                onSelect={(event) => {
                  event.preventDefault();
                  void leave();
                }}
              >
                {pending ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </>
          ) : null}
          {error ? (
            <p role="alert" className="px-2 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
