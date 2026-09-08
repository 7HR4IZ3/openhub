"use client";

import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "dark" ? "openhub-dark" : "openhub-light";

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
          monaco.editor.defineTheme("openhub-light", {
            base: "vs",
            inherit: true,
            rules: [
              { token: "comment", foreground: "8c8b86" },
              { token: "keyword", foreground: "76529b" },
              { token: "string", foreground: "3f7951" },
              { token: "number", foreground: "376a93" },
              { token: "type", foreground: "9a552e" },
              { token: "delimiter", foreground: "45454a" },
            ],
            colors: {
              "editor.background": "#fbfaf7",
              "editor.foreground": "#202124",
              "editorGutter.background": "#fbfaf7",
              "editorLineNumber.foreground": "#95938d",
              "editorLineNumber.activeForeground": "#696b70",
              editorLineHighlightBackground: "#f5f3ee",
              "editor.selectionBackground": "#f2ddd6",
              "editorIndentGuide.background": "#e5e2db",
              "editorIndentGuide.activeBackground": "#cbc8c0",
              "editorWidget.background": "#efede7",
              "editorWidget.border": "#cbc8c0",
              "scrollbarSlider.background": "#cbc8c0",
              "scrollbarSlider.hoverBackground": "#aaa69e",
              "scrollbarSlider.activeBackground": "#95938d",
            },
          });
          monaco.editor.defineTheme("openhub-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "959aa5" },
              { token: "keyword", foreground: "f39a86" },
              { token: "string", foreground: "9ed0ad" },
              { token: "number", foreground: "9ac2e8" },
              { token: "type", foreground: "f0b17b" },
              { token: "delimiter", foreground: "f2f0eb" },
            ],
            colors: {
              "editor.background": "#17191e",
              "editor.foreground": "#f2f0eb",
              "editorGutter.background": "#17191e",
              "editorLineNumber.foreground": "#959aa5",
              "editorLineNumber.activeForeground": "#f2f0eb",
              editorLineHighlightBackground: "#1c1e24",
              "editor.selectionBackground": "#392827",
              "editorIndentGuide.background": "#262932",
              "editorIndentGuide.activeBackground": "#30333c",
              "editorWidget.background": "#1c1e24",
              "editorWidget.border": "#30333c",
              "scrollbarSlider.background": "#30333c",
              "scrollbarSlider.hoverBackground": "#4b4e58",
              "scrollbarSlider.activeBackground": "#6b6f7b",
            },
          });
          monaco.editor.setTheme(monacoTheme);
          setEditorInstance(instance);
        }}
        theme={monacoTheme}
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
