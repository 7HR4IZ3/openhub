"use client";

import dynamic from "next/dynamic";
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
        onMount={(instance, monaco) => {
          monaco.editor.defineTheme("github-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "8b949e" },
              { token: "keyword", foreground: "ff7b72" },
              { token: "string", foreground: "a5d6ff" },
              { token: "number", foreground: "79c0ff" },
              { token: "type", foreground: "ffa657" },
              { token: "delimiter", foreground: "c9d1d9" },
            ],
            colors: {
              "editor.background": "#0d1117",
              "editor.foreground": "#c9d1d9",
              "editorGutter.background": "#0d1117",
              "editorLineNumber.foreground": "#8b949e",
              "editorLineNumber.activeForeground": "#c9d1d9",
              editorLineHighlightBackground: "#0d1117",
              "editor.selectionBackground": "#264f78",
              "editorIndentGuide.background": "#21262d",
              "editorIndentGuide.activeBackground": "#30363d",
              "editorWidget.background": "#161b22",
              "editorWidget.border": "#30363d",
              "scrollbarSlider.background": "#30363d",
              "scrollbarSlider.hoverBackground": "#484f58",
              "scrollbarSlider.activeBackground": "#6e7681",
            },
          });
          monaco.editor.setTheme("github-dark");
          setEditorInstance(instance);
        }}
        theme="github-dark"
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
          renderLineHighlight: "none",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          selectOnLineNumbers: true,
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            horizontal: "auto",
            vertical: "auto",
          },
          smoothScrolling: false,
          wordWrap: "off",
          lineHeight: 20,
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
