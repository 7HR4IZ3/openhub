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

  const refOpen = $("[data-ref-open]");
  refOpen?.addEventListener("click", () => {
    closeOverlays();
    refPopover.hidden = false;
    refOpen.setAttribute("aria-expanded", "true");
    $("[data-ref-search]")?.focus();
  });
  $$("[data-ref-close]").forEach((button) =>
    button.addEventListener("click", closeOverlays),
  );

  const commandOpen = $("[data-command-open]");
  commandOpen?.addEventListener("click", () => {
    closeOverlays();
    command.hidden = false;
    $(".command-popover input")?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOverlays();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      commandOpen?.click();
    }
  });

  $$("[data-mode-group] [data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-mode-group] [data-mode]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      const mode = button.dataset.mode;
      $(".source-frame").hidden = mode !== "reader";
      $(".activity-panel").hidden = mode !== "activity";
      $(".history-panel").hidden = mode !== "history";
    });
  });

  $$("[data-ref]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-ref]").forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      const label = $("[data-ref-label]");
      if (label) label.textContent = button.dataset.ref || "main";
      closeOverlays();
    });
  });

  $("[data-ref-search]")?.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    $$("[data-ref]", refPopover).forEach((button) => {
      button.hidden =
        query.length > 0 && !button.dataset.ref.toLowerCase().includes(query);
    });
  });

  const codeByFile = {
    "app.ts": [
      '<em>import</em> { createReader } <em>from</em> <mark>"@openhub/core"</mark>;',
      "",
      "<em>const</em> reader = createReader({",
      '  source: <mark>"public"</mark>,',
      '  mode: <mark>"context-first"</mark>,',
      "});",
      "",
      "<em>export default</em> reader;",
      "",
      "<em>// source stays readable</em>",
    ],
    "reader.tsx": [
      "<em>export function</em> Reader({ file }: ReaderProps) {",
      "  <em>const</em> [line, setLine] = useState(1);",
      "",
      "  <em>return</em> (",
      "    &lt;SourcePane file={file} line={line} /&gt;",
      "  );",
      "}",
    ],
    "workspace.css": [
      ":root {",
      "  --reader-width: 860px;",
      "  --accent: <mark>#ec6b48</mark>;",
      "}",
      "",
      ".workspace {",
      "  display: grid;",
      "  grid-template-columns: 238px 1fr;",
      "}",
    ],
    "README.md": [
      "<em># OpenHub</em>",
      "",
      "A source reader for people who want the why,",
      "not another wall of repository chrome.",
      "",
      "- Read the file",
      "- Follow the context",
      "- Discuss the line",
    ],
    "package.json": [
      "{",
      '  <mark>"name"</mark>: <mark>"openhub"</mark>,',
      '  <mark>"private"</mark>: <em>true</em>,',
      '  <mark>"scripts"</mark>: {',
      '    <mark>"dev"</mark>: <mark>"next dev"</mark>',
      "  }",
      "}",
    ],
  };

  const renderCode = (file) => {
    const code = codeByFile[file] || codeByFile["app.ts"];
    const target = $("[data-code]");
    if (!target) return;
    target.innerHTML = code
      .map(
        (line, index) =>
          `<div><span>${index + 1}</span><code>${line}</code></div>`,
      )
      .join("");
  };

  $$("[data-file]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-file]").forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      const file = button.dataset.file || "app.ts";
      const language = button.dataset.language || "Source";
      $("[data-editor-file]").textContent = file;
      $("[data-editor-language]").textContent = language;
      $("[data-editor-stat]").textContent =
        `${(codeByFile[file] || []).length || 10} lines`;
      renderCode(file);
      if (window.matchMedia("(max-width: 700px)").matches) closeOverlays();
    });
  });

  $$("[data-folder]").forEach((button) => {
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      const caret = $(".tree-caret", button);
      if (caret) caret.textContent = open ? "›" : "⌄";
      const treePath = $("[data-tree-path]");
      if (treePath) {
        treePath.textContent = open
          ? "src"
          : button.dataset.folder || "src";
      }
      if (button.dataset.folder === "docs" && !open) {
        if ($('.tree-row.generated[data-file="architecture.md"]')) return;
        const child = document.createElement("button");
        child.type = "button";
        child.className = "tree-row file generated";
        child.dataset.file = "architecture.md";
        child.dataset.language = "Markdown";
        child.innerHTML =
          '<span class="tree-indent"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4v13H6zM14 3.5v4h4"/></svg><span>architecture.md</span>';
        child.addEventListener("click", () => {
          $$("[data-file]").forEach((item) =>
            item.classList.toggle("active", item === child),
          );
          $("[data-editor-file]").textContent = "architecture.md";
          $("[data-editor-language]").textContent = "Markdown";
          $("[data-editor-stat]").textContent = "18 lines";
          renderCode("README.md");
        });
        button.insertAdjacentElement("afterend", child);
      }
    });
  });
})();
