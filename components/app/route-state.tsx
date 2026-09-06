import Link from "next/link";
import type { ReactNode } from "react";
import { OpenHubMark } from "@/components/openhub-mark";

/** Recovery surfaces deliberately avoid data and auth hooks. */
export function RouteState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 py-7 sm:px-8">
      <Link href="/" className="w-fit" aria-label="OpenHub home">
        <OpenHubMark />
      </Link>
      <section className="my-auto max-w-xl py-16">
        <h1 className="editorial-title text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          {description}
        </p>
        {children ? (
          <div className="mt-7 flex flex-wrap gap-3">{children}</div>
        ) : null}
      </section>
    </main>
  );
}
