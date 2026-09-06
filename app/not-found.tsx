import Link from "next/link";
import { RouteState } from "@/components/app/route-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <RouteState
      title="Nothing at this address."
      description="The page may have moved or the link may be incomplete. Start again from discovery."
    >
      <Button asChild>
        <Link href="/explore">Explore repositories</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/home">Back to home</Link>
      </Button>
    </RouteState>
  );
}
