"use client";

import dynamic from "next/dynamic";

import type { RepositoryFile } from "@/lib/providers/types";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((module) => module.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(68vh,720px)] items-center justify-center bg-[#1a1d1b] text-sm text-[#8e9b93]">
        Loading the read-only editor…
      </div>
    ),
  },
);

export function SourceCodeViewer({
  file,
  primaryLanguage,
}: {
  file: RepositoryFile;
  primaryLanguage: string | null;
}) {
  return (
    <div className="overflow-hidden bg-[#1a1d1b]">
      <MonacoEditor
        height="min(68vh, 720px)"
        language={languageForPath(file.path, primaryLanguage)}
        value={file.text}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          contextmenu: true,
          copyWithSyntaxHighlighting: true,
          domReadOnly: true,
          folding: true,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          glyphMargin: false,
          lineDecorationsWidth: 12,
          lineNumbers: "on",
          minimap: { enabled: false },
          padding: { top: 18, bottom: 24 },
          readOnly: true,
          renderLineHighlight: "line",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          selectOnLineNumbers: true,
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
    css: "css",
    cpp: "cpp",
    cs: "csharp",
    csv: "plaintext",
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

  if (fileName === "dockerfile") return "dockerfile";
  if (languages[extension]) return languages[extension];

  const normalizedPrimaryLanguage = primaryLanguage?.toLowerCase();
  if (normalizedPrimaryLanguage === "typescript") return "typescript";
  if (normalizedPrimaryLanguage === "javascript") return "javascript";
  if (normalizedPrimaryLanguage === "python") return "python";
  if (normalizedPrimaryLanguage === "ruby") return "ruby";
  if (normalizedPrimaryLanguage === "rust") return "rust";
  if (normalizedPrimaryLanguage === "go") return "go";

  return "plaintext";
}
