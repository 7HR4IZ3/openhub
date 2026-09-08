"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";
import { useEffect, useState } from "react";

import type { RepositoryFile } from "@/lib/providers/types";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((module) => module.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(68vh,720px)] items-center justify-center bg-card text-sm text-muted-foreground">
        Loading the read-only editor…
      </div>
    ),
  },
);

export function SourceCodeViewer({
  file,
  primaryLanguage,
  lineNumberOffset = 1,
  onSelectionChange,
}: {
  file: RepositoryFile;
  primaryLanguage: string | null;
  lineNumberOffset?: number;
  onSelectionChange?: (selection: CodeSelection | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [editorInstance, setEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorInstance === null || onSelectionChange === undefined) return;

    const disposable = editorInstance.onDidChangeCursorSelection((event) => {
      if (event.selection.isEmpty()) {
        onSelectionChange(null);
        return;
      }

      onSelectionChange({
        startLineNumber:
          Math.min(
            event.selection.startLineNumber,
            event.selection.endLineNumber,
          ) +
          lineNumberOffset -
          1,
        endLineNumber:
          Math.max(
            event.selection.startLineNumber,
            event.selection.endLineNumber,
          ) +
          lineNumberOffset -
          1,
      });
    });

    return () => disposable.dispose();
  }, [editorInstance, lineNumberOffset, onSelectionChange]);

  return (
    <div className="overflow-hidden bg-card">
      <MonacoEditor
        height="min(68vh, 720px)"
        language={languageForPath(file.path, primaryLanguage)}
        value={file.text}
        onMount={(instance) => setEditorInstance(instance)}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        options={{
          automaticLayout: true,
          contextmenu: true,
          copyWithSyntaxHighlighting: true,
          domReadOnly: true,
          fixedOverflowWidgets: true,
          folding: true,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          glyphMargin: false,
          lineDecorationsWidth: 12,
          lineNumbers:
            lineNumberOffset === 1
              ? "on"
              : (lineNumber) => String(lineNumber + lineNumberOffset - 1),
          minimap: { enabled: false },
          mouseWheelZoom: false,
          padding: { top: 18, bottom: 24 },
          readOnly: true,
          renderLineHighlight: "line",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          selectOnLineNumbers: true,
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            horizontal: "auto",
            vertical: "auto",
          },
          smoothScrolling: false,
          wordWrap: "on",
        }}
      />
    </div>
  );
}

export type CodeSelection = {
  startLineNumber: number;
  endLineNumber: number;
};

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
