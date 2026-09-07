(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const screenSelect = $("#screen-select");
  if (screenSelect) {
    const updatePreview = () => {
      const screen = screenSelect.value;
      $$("iframe[data-screen-frame]").forEach((frame) => {
        frame.src = `${screen}.html`;
      });
      const title = $("#preview-screen-name");
      if (title) title.textContent = screen[0].toUpperCase() + screen.slice(1);
    };
    screenSelect.addEventListener("change", updatePreview);
    updatePreview();
  }

  const menuToggle = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  if (menuToggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };
    menuToggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (event) => {
      if (menu.classList.contains("is-open") && !menu.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const sheetOpen = $("[data-sheet-open]");
  const sheet = $("[data-sheet]");
  const sheetBackdrop = $("[data-sheet-backdrop]");
  if (sheetOpen && sheet && sheetBackdrop) {
    const closeSheet = () => {
      sheet.classList.remove("is-open");
      sheetBackdrop.classList.remove("is-open");
      sheetOpen.setAttribute("aria-expanded", "false");
    };
    sheetOpen.addEventListener("click", () => {
      sheet.classList.add("is-open");
      sheetBackdrop.classList.add("is-open");
      sheetOpen.setAttribute("aria-expanded", "true");
    });
    sheetBackdrop.addEventListener("click", closeSheet);
    $$('[data-sheet-close]').forEach((button) => button.addEventListener("click", closeSheet));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSheet();
    });
  }

  $$('[data-demo-toggle]').forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const enabled = toggle.classList.toggle("is-off");
      toggle.setAttribute("aria-pressed", String(!enabled));
    });
  });

  $$('[data-tab-group]').forEach((group) => {
    const tabs = $$('[data-tab]', group);
    const panels = $$('[data-tab-panel]', group);
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        tabs.forEach((item) => {
          const selected = item === tab;
          item.classList.toggle("selected", selected);
          item.setAttribute("aria-selected", String(selected));
        });
        panels.forEach((panel) => panel.toggleAttribute("hidden", panel.dataset.tabPanel !== target));
      });
    });
  });
})();
