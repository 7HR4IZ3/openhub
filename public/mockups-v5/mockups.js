(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];
  const explorer = $("[data-explorer]");
  const context = $("[data-context]");
  const backdrop = $("[data-backdrop]");
  const refPopover = $("[data-ref-popover]");
  const command = $("[data-command]");

  const closeOverlays = () => {
    explorer?.setAttribute("data-open", "false");
    context?.setAttribute("data-open", "false");
    if (backdrop) backdrop.hidden = true;
    if (refPopover) refPopover.hidden = true;
    if (command) command.hidden = true;
    $("[data-ref-open]")?.setAttribute("aria-expanded", "false");
  };
  const openExplorer = () => {
    closeOverlays();
    explorer?.setAttribute("data-open", "true");
    if (backdrop) backdrop.hidden = false;
  };
  const openContext = () => {
    closeOverlays();
    context?.setAttribute("data-open", "true");
    if (backdrop) backdrop.hidden = false;
  };
  $$("[data-explorer-open]").forEach((button) =>
    button.addEventListener("click", openExplorer),
  );
  $$("[data-explorer-close]").forEach((button) =>
    button.addEventListener("click", closeOverlays),
  );
  $$("[data-context-open]").forEach((button) =>
    button.addEventListener("click", openContext),
  );
  $$("[data-context-close]").forEach((button) =>
    button.addEventListener("click", closeOverlays),
  );
  backdrop?.addEventListener("click", closeOverlays);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOverlays();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("[data-command-open]")?.click();
    }
  });

  $("[data-ref-open]")?.addEventListener("click", () => {
    closeOverlays();
    refPopover.hidden = false;
    $("[data-ref-open]").setAttribute("aria-expanded", "true");
    $("[data-ref-search]")?.focus();
  });
  $$("[data-ref-close]").forEach((button) =>
    button.addEventListener("click", closeOverlays),
  );
  $$("[data-ref]").forEach((button) =>
    button.addEventListener("click", () => {
      $$("[data-ref]").forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      $("[data-ref-label]").textContent = button.dataset.ref || "main";
      closeOverlays();
    }),
  );
  $("[data-ref-search]")?.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    $$("[data-ref]", refPopover).forEach((button) => {
      button.hidden = Boolean(
        query && !button.dataset.ref.toLowerCase().includes(query),
      );
    });
  });
  $("[data-command-open]")?.addEventListener("click", () => {
    closeOverlays();
    command.hidden = false;
    $("[data-command] input")?.focus();
  });

  const codeByFile = {
    "app.ts": [
      '<em>import</em> { createReader } <em>from</em> <mark>"@openhub/core"</mark>;',
      "",
      "<em>const</em> reader = createReader({",
      '  source: <mark>"public"</mark>,',
      '  mode: <mark>"compact"</mark>,',
      "});",
      "",
      "<em>export default</em> reader;",
      "",
      "<em>// source stays readable</em>",
    ],
    "reader.tsx": [
      "<em>export function</em> Reader({ file }: ReaderProps) {",
      "  <em>return</em> &lt;SourcePane file={file} /&gt;",
      "}",
    ],
    "workspace.css": [
      ":root {",
      "  --reader-width: 860px;",
      "  --accent: <mark>#c45b43</mark>;",
      "}",
    ],
    "README.md": [
      "<em># OpenHub</em>",
      "",
      "A compact source reader for people who want the why.",
    ],
    "package.json": [
      "{",
      '  <mark>"name"</mark>: <mark>"openhub"</mark>,',
      '  <mark>"private"</mark>: <em>true</em>',
      "}",
    ],
    "architecture.md": [
      "<em># Reader architecture</em>",
      "",
      "The file is the first surface.",
      "Context stays one click away.",
    ],
    "decisions.md": [
      "<em># Decisions</em>",
      "",
      "Keep navigation close to the source.",
    ],
    "schema.ts": [
      "<em>export const</em> schema = defineSchema({",
      "  readers: defineTable({",
      '    repoId: v.id("repositories"),',
      "  }),",
      "});",
    ],
    "queries.ts": [
      "<em>export const</em> recentFiles = query({",
      '  args: { repoId: v.id("repositories") },',
      "  handler: async (ctx, args) => {",
      '    return ctx.db.query("files").collect();',
      "  },",
      "});",
    ],
  };
  const lineCountByFile = {
    "app.ts": 109,
    "reader.tsx": 84,
    "workspace.css": 146,
    "README.md": 42,
    "package.json": 28,
    "architecture.md": 58,
    "decisions.md": 31,
    "schema.ts": 74,
    "queries.ts": 90,
  };
  const folderContents = {
    docs: [
      {
        file: "architecture.md",
        path: "docs/architecture.md",
        language: "Markdown",
      },
      { file: "decisions.md", path: "docs/decisions.md", language: "Markdown" },
    ],
    convex: [
      { file: "schema.ts", path: "convex/schema.ts", language: "TypeScript" },
      { file: "queries.ts", path: "convex/queries.ts", language: "TypeScript" },
    ],
  };

  const updateSourcePath = (path) => {
    const sourcePath = $("[data-source-path]");
    if (!sourcePath) return;
    sourcePath.replaceChildren();
    const root = document.createElement("a");
    root.href = "#root";
    root.textContent = "openhub";
    sourcePath.append(root);
    const parts = path.split("/").filter(Boolean);
    parts.forEach((part, index) => {
      const slash = document.createElement("i");
      slash.textContent = "/";
      sourcePath.append(slash);
      if (index === parts.length - 1) {
        const file = document.createElement("strong");
        file.dataset.fileLabel = "";
        file.textContent = part;
        sourcePath.append(file);
      } else {
        const directory = document.createElement("a");
        directory.href = "#" + part;
        directory.textContent = part;
        sourcePath.append(directory);
      }
    });
  };

  const renderCode = (file) => {
    const target = $("[data-code]");
    const lines = codeByFile[file] || codeByFile["app.ts"];
    if (target) {
      target.innerHTML = lines
        .map(
          (line, index) =>
            "<div><span>" +
            (index + 1) +
            "</span><code>" +
            line +
            "</code></div>",
        )
        .join("");
    }
  };

  const selectFile = (button) => {
    $$("[data-file]").forEach((item) =>
      item.classList.toggle("active", item === button),
    );
    const file = button.dataset.file || "app.ts";
    const path = button.dataset.path || file;
    $("[data-editor-file]").textContent = file;
    $("[data-file-label]").textContent = file;
    $("[data-editor-language]").textContent =
      button.dataset.language || "Source";
    $("[data-editor-lines]").textContent =
      String(lineCountByFile[file] || 10) + " lines";
    updateSourcePath(path);
    renderCode(file);
    if (window.matchMedia("(max-width: 760px)").matches) closeOverlays();
  };

  const fileIconPath = "M6 3.5h8l4 4v13H6zM14 3.5v4h4";
  const createGeneratedFiles = (folder) => {
    const group = document.createElement("div");
    group.className = "tree-children generated";
    group.setAttribute("role", "group");
    folderContents[folder.dataset.folder]?.forEach((entry) => {
      const file = document.createElement("button");
      file.type = "button";
      file.className = "tree-row file generated";
      file.dataset.file = entry.file;
      file.dataset.path = entry.path;
      file.dataset.language = entry.language;
      file.innerHTML =
        '<span class="indent"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        fileIconPath +
        '"/></svg><span>' +
        entry.file +
        "</span>";
      file.addEventListener("click", () => selectFile(file));
      group.append(file);
    });
    return group;
  };

  $$("[data-file]").forEach((button) =>
    button.addEventListener("click", () => selectFile(button)),
  );
  $$("[data-folder]").forEach((button) =>
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      const next = button.nextElementSibling;
      let children = next?.classList.contains("tree-children") ? next : null;
      button.setAttribute("aria-expanded", String(!open));
      const caret = $(".caret", button);
      if (caret) caret.textContent = open ? "›" : "⌄";
      if (!open && !children && folderContents[button.dataset.folder]) {
        children = createGeneratedFiles(button);
        button.insertAdjacentElement("afterend", children);
      }
      if (children) children.hidden = open;
    }),
  );

  $$("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      $$("[data-view]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      const view = button.dataset.view;
      $(".reader-grid").hidden = view !== "code";
      $$("[data-secondary]").forEach((panel) => {
        panel.hidden = panel.dataset.secondary !== view;
      });
    }),
  );

  $("[data-copy]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.dataset.copied = "true";
    button.setAttribute("aria-label", "Source link copied");
    button.setAttribute("title", "Source link copied");
    window.setTimeout(() => {
      button.dataset.copied = "false";
      button.setAttribute("aria-label", "Copy source link");
      button.setAttribute("title", "Copy source link");
    }, 1400);
  });
})();
