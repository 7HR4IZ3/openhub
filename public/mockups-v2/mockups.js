(function () {
  var palette = document.querySelector(".palette");
  var backdrop = document.querySelector(".backdrop");
  var commandButtons = document.querySelectorAll("[data-command]");

  function setPalette(open) {
    if (!palette || !backdrop) return;
    palette.dataset.open = String(open);
    backdrop.dataset.open = String(open);
    if (open) {
      var input = palette.querySelector("input");
      if (input) window.setTimeout(function () { input.focus(); }, 20);
    }
  }

  commandButtons.forEach(function (button) {
    button.addEventListener("click", function () { setPalette(true); });
  });

  if (backdrop) backdrop.addEventListener("click", function () { setPalette(false); });

  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPalette(true);
    }
    if (event.key === "Escape") setPalette(false);
  });

  document.querySelectorAll("[data-demo-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = document.querySelector(button.dataset.demoToggle);
      if (!target) return;
      var active = target.dataset.active === "true";
      target.dataset.active = String(!active);
      button.setAttribute("aria-pressed", String(!active));
    });
  });
})();
