import type { ReactNode } from "react";

export function PostBody({ body, lineLinkBase }: { body: string; lineLinkBase?: string }) {
  if (body.trim().length === 0) return null;

  const segments = body.split("```");
  return (
    <div className="space-y-4 text-[1.02rem] leading-8 text-foreground/90">
      {segments.map((segment, index) => {
        if (index % 2 === 0) {
          return (
            <div key={`text-${index}`} className="space-y-3">
              {segment.split(/\r?\n/).map((line, lineIndex) => {
                if (line.trim().length === 0) return <div key={`${index}-${lineIndex}`} className="h-1" aria-hidden="true" />;
                const heading = /^(#{1,3})\s+(.+)$/.exec(line);
                if (heading) {
                  const Heading = heading[1].length === 1 ? "h3" : "h4";
                  return <Heading key={`${index}-${lineIndex}`} className="font-semibold tracking-[-0.02em]">{renderInline(heading[2], `${index}-${lineIndex}`, lineLinkBase)}</Heading>;
                }
                if (line.startsWith("> ")) return <blockquote key={`${index}-${lineIndex}`} className="border-l-2 border-[#b45e3c]/50 pl-4 text-muted-foreground">{renderInline(line.slice(2), `${index}-${lineIndex}`, lineLinkBase)}</blockquote>;
                return <p key={`${index}-${lineIndex}`}>{renderInline(line, `${index}-${lineIndex}`, lineLinkBase)}</p>;
              })}
            </div>
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

function renderInline(value: string, keyPrefix: string, lineLinkBase?: string): ReactNode {
  const token = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(@[a-zA-Z0-9][a-zA-Z0-9_-]{1,39})|(#L\d+(?:-L?\d+)?)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = token.exec(value)) !== null) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    if (match[1] && match[2]) {
      nodes.push(<a key={`${keyPrefix}-link-${index}`} href={match[2]} target="_blank" rel="noreferrer" className="font-medium text-[#9b4d31] underline decoration-[#b45e3c]/40 underline-offset-2 hover:decoration-[#b45e3c] dark:text-[#e99970]">{match[1]}</a>);
    } else if (match[3]) {
      nodes.push(<a key={`${keyPrefix}-mention-${index}`} href={`/profile/${match[3].slice(1)}`} className="font-medium text-[#9b4d31] hover:underline dark:text-[#e99970]">{match[3]}</a>);
    } else {
      const lineReference = match[4];
      const href = lineLinkBase ? lineLinkBase.replace(/#.*$/, "") + lineAnchor(lineReference) : null;
      nodes.push(href ? <a key={`${keyPrefix}-line-${index}`} href={href} target="_blank" rel="noreferrer" className="rounded bg-[#e9e6dc] px-1 font-mono text-[0.9em] text-[#9b4d31] underline-offset-2 hover:underline dark:bg-[#20251f] dark:text-[#e99970]">{lineReference}</a> : <span key={`${keyPrefix}-line-${index}`} className="rounded bg-[#e9e6dc] px-1 font-mono text-[0.9em] dark:bg-[#20251f]">{lineReference}</span>);
    }
    cursor = match.index + match[0].length;
    index += 1;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes.length > 0 ? nodes : value;
}

function lineAnchor(reference: string) {
  const match = /^#L(\d+)(?:-L?(\d+))?$/.exec(reference);
  if (!match) return "";
  return match[2] ? `#L${match[1]}-L${match[2]}` : `#L${match[1]}`;
}
