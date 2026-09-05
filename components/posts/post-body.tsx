import type { ReactNode } from "react";

type BodyBlock =
  | { kind: "text"; value: string }
  | { kind: "code"; language: string | null; value: string };

export function PostBody({ body }: { body: string }) {
  if (body.trim().length === 0) return null;

  return (
    <div className="space-y-4 text-[1.02rem] leading-8 text-foreground/90">
      {parseBlocks(body).map((block, index) =>
        block.kind === "code" ? (
          <CodeBlock key={`code-${index}`} language={block.language} value={block.value} />
        ) : (
          <MarkdownBlock key={`text-${index}`} value={block.value} />
        ),
      )}
    </div>
  );
}

function parseBlocks(value: string): BodyBlock[] {
  const normalized = value.replace(/\r\n?/g, "\n");
  const blocks: BodyBlock[] = [];
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(normalized)) !== null) {
    appendTextBlocks(blocks, normalized.slice(cursor, match.index));
    const language = match[1].trim();
    blocks.push({ kind: "code", language: language || null, value: match[2].replace(/\n$/, "") });
    cursor = match.index + match[0].length;
  }

  appendTextBlocks(blocks, normalized.slice(cursor));
  return blocks;
}

function appendTextBlocks(blocks: BodyBlock[], value: string) {
  value.split(/\n{2,}/).forEach((paragraph) => {
    if (paragraph.trim()) blocks.push({ kind: "text", value: paragraph });
  });
}

function MarkdownBlock({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, index) => <MarkdownLine key={`${index}-${line}`} value={line} />)}
    </div>
  );
}

function MarkdownLine({ value }: { value: string }) {
  const heading = /^(#{1,3})\s+(.+)$/.exec(value);
  if (heading) {
    const level = heading[1].length;
    const Heading = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
    return <Heading className="pt-2 text-lg font-semibold leading-7 tracking-[-0.02em]">{renderInline(heading[2])}</Heading>;
  }
  const quote = /^>\s?(.*)$/.exec(value);
  if (quote) return <blockquote className="border-l-2 border-[#b45e3c]/50 pl-4 text-muted-foreground dark:border-[#e99970]/50">{renderInline(quote[1])}</blockquote>;
  const unordered = /^[-*]\s+(.+)$/.exec(value);
  if (unordered) return <p className="pl-5"><span className="-ml-5 mr-2 text-[#b45e3c] dark:text-[#e99970]">•</span>{renderInline(unordered[1])}</p>;
  const ordered = /^(\d+)\.\s+(.+)$/.exec(value);
  if (ordered) return <p className="pl-7"><span className="-ml-7 mr-2 inline-block w-5 font-mono text-xs text-muted-foreground">{ordered[1]}.</span>{renderInline(ordered[2])}</p>;
  return <p className="whitespace-pre-wrap">{renderInline(value)}</p>;
}

function renderInline(value: string): ReactNode {
  const token = /(\[[^\]\n]{1,200}\]\((https?:\/\/[^\s)]+)\)|`[^`\n]{1,200}`|\*\*[^*\n]{1,200}\*\*|__[^_\n]{1,200}__|\*[^*\n]{1,200}\*|_[^_\n]{1,200}_)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(value)) !== null) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const raw = match[0];
    if (raw.startsWith("[")) {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(raw);
      if (link && isSafeHttpUrl(link[2])) {
        nodes.push(<a key={`${match.index}-${raw}`} href={link[2]} target="_blank" rel="noreferrer" className="font-medium text-[#9b4d31] underline decoration-[#b45e3c]/40 underline-offset-2 hover:decoration-[#b45e3c] dark:text-[#e99970]">{link[1]}</a>);
      } else nodes.push(raw);
    } else if (raw.startsWith("`")) {
      nodes.push(<code key={`${match.index}-${raw}`} className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] dark:bg-white/[0.08]">{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith("**") || raw.startsWith("__")) {
      nodes.push(<strong key={`${match.index}-${raw}`}>{raw.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${match.index}-${raw}`}>{raw.slice(1, -1)}</em>);
    }
    cursor = match.index + raw.length;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes.length === 1 ? nodes[0] : nodes;
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function CodeBlock({ language, value }: { language: string | null; value: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.1] bg-[#f0efe9] dark:border-white/[0.1] dark:bg-[#0f120f]">
      {language ? <div className="border-b border-black/[0.08] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:border-white/[0.08]">{language}</div> : null}
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-6"><code>{value}</code></pre>
    </div>
  );
}
