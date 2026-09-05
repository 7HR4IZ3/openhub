"use client";

import dynamic from "next/dynamic";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((module) => module.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(68vh,720px)] items-center justify-center bg-[#1a1d1b] text-sm text-[#8e9b93]">
        Loading the read-only diff editor…
      </div>
    ),
  },
);

export function DiffCodeViewer({
  path,
  language,
  baseSnapshot,
  headSnapshot,
}: {
  path: string;
  language?: string;
  baseSnapshot: string;
  headSnapshot: string;
}) {
  const editorLanguage = languageForPath(path, language ?? null);

  return (
    <div className="overflow-hidden bg-[#1a1d1b]">
      <MonacoDiffEditor
        height="min(68vh, 720px)"
        original={baseSnapshot}
        modified={headSnapshot}
        language={editorLanguage}
        originalLanguage={editorLanguage}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          contextmenu: true,
          domReadOnly: true,
          enableSplitViewResizing: true,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          minimap: { enabled: false },
          originalEditable: false,
          padding: { top: 18, bottom: 24 },
          readOnly: true,
          renderOverviewRuler: false,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
}

function languageForPath(path: string, primaryLanguage: string | null) {
  const fileName = path.split("/").pop()?.toLowerCase() ?? "";
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1)
    : fileName;
  const languages: Record<string, string> = {
    bash: "shell",
    c: "c",
    cc: "cpp",
    cpp: "cpp",
    cs: "csharp",
    css: "css",
    dockerfile: "dockerfile",
    go: "go",
    graphql: "graphql",
    h: "c",
    hpp: "cpp",
    html: "html",
    java: "java",
    js: "javascript",
    json: "json",
    jsx: "javascript",
    md: "markdown",
    mdx: "markdown",
    mjs: "javascript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    sh: "shell",
    sql: "sql",
    svg: "xml",
    toml: "ini",
    ts: "typescript",
    tsx: "typescript",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
  };
  return languages[extension] ?? primaryLanguage?.toLowerCase() ?? "plaintext";
}
