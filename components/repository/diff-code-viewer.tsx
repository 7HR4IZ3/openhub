import { cn } from "@/lib/utils";

export function DiffCodeViewer({
  path,
  baseSnapshot,
  headSnapshot,
  language,
}: {
  path: string;
  baseSnapshot: string;
  headSnapshot: string;
  language: string | null;
}) {
  return (
    <div className="grid min-w-0 divide-y divide-black/[0.08] dark:divide-white/[0.08] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <DiffPane
        label="Before"
        commit={baseSnapshot ? "base commit" : "file absent"}
        snapshot={baseSnapshot}
        language={language}
        tone="base"
      />
      <DiffPane
        label="After"
        commit={headSnapshot ? "head commit" : "file absent"}
        snapshot={headSnapshot}
        language={language}
        tone="head"
      />
    </div>
  );
}

function DiffPane({
  label,
  commit,
  snapshot,
  language,
  tone,
}: {
  label: string;
  commit: string;
  snapshot: string;
  language: string | null;
  tone: "base" | "head";
}) {
  const lines = snapshot ? snapshot.split(/\r?\n/) : [];
  return (
    <section className="min-w-0" aria-label={`${label} code`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.16em]",
            tone === "head" ? "text-[#66856c]" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {commit}
          {language ? ` · ${language}` : ""}
        </span>
      </div>
      <pre className="max-h-[28rem] overflow-auto bg-muted p-4 text-xs leading-6 dark:bg-muted sm:text-sm">
        <code>
          {lines.length > 0 ? (
            lines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                <span className="mr-4 inline-block w-8 select-none text-right text-[10px] text-muted-foreground/70">
                  {index + 1}
                </span>
                {line || " "}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">
              No file at this commit.
            </span>
          )}
        </code>
      </pre>
    </section>
  );
}
