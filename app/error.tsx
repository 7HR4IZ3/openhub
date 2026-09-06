"use client";

import Link from "next/link";
import { RouteState } from "@/components/app/route-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteState
      title="This page could not load."
      description="Try loading it again, or return to repository discovery."
    >
      <Button onClick={() => retry()}>Try again</Button>
      <Button asChild variant="outline">
        <Link href="/explore">Explore repositories</Link>
      </Button>
    </RouteState>
  );
}
