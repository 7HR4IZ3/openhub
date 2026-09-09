import { CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon as ArrowRight } from "@radix-ui/react-icons";
import Link from "next/link";

export const metadata = {
  title: "Principles",
  description: "The product principles behind OpenHub.",
};

const principles = [
  ["Source first", "Every useful conversation should point back to the code."],
  ["Small signals", "A clear trail beats a noisy feed. Keep the useful parts visible."],
  ["Open by choice", "Public work can travel; private work stays behind its provider permissions."],
] as const;

export default function ProductPage() {
  return (
    <CurationShell active="Explore" eyebrow="principles" title="OpenHub principles">
      <div className="p-5 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            How OpenHub works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
            Make software easier to understand.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            OpenHub connects repositories, people, and the context that helps a reader decide what to open next.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {principles.map(([title, body]) => (
            <article key={title} className="rounded-lg bg-secondary/60 p-4">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/explore">
              Explore repositories <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/communities">Find a circle</Link>
          </Button>
        </div>
      </div>
    </CurationShell>
  );
}
