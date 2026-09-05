export function PostBody({ body }: { body: string }) {
  if (body.trim().length === 0) return null;

  const segments = body.split("```");
  return (
    <div className="space-y-4 text-[1.02rem] leading-8 text-foreground/90">
      {segments.map((segment, index) => {
        if (index % 2 === 0) {
          return (
            <p key={`text-${index}`} className="whitespace-pre-wrap">
              {segment}
            </p>
          );
        }

        const lines = segment.replace(/^\r?\n/, "").split(/\r?\n/);
        const hasLanguage = lines.length > 1 && /^[a-zA-Z0-9+#.-]+$/.test(lines[0]);
        const language = hasLanguage ? lines[0] : null;
        const code = (hasLanguage ? lines.slice(1) : lines).join("\n");
        return (
          <div
            key={`code-${index}`}
            className="overflow-hidden rounded-2xl border border-black/[0.1] bg-[#f0efe9] dark:border-white/[0.1] dark:bg-[#0f120f]"
          >
            {language ? (
              <div className="border-b border-black/[0.08] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:border-white/[0.08]">
                {language}
              </div>
            ) : null}
            <pre className="overflow-x-auto px-4 py-4 text-sm leading-6">
              <code>{code}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
