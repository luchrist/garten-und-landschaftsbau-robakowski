/**
 * GaLaBau Widget-Embed (Konzept Abschnitt 6: "iframe/Script-Einbindung").
 *
 * Einbindung auf einer bestehenden Website:
 *
 *   <div data-galabau-widget="projektanfrage"></div>
 *   <script src="https://IHRE-DOMAIN.de/embed.js" defer></script>
 *
 * Verfügbare Widgets: "projektanfrage", "kostenrechner", "recruiting".
 * ("budget-check" bleibt als Alias auf den Kostenrechner bestehen.)
 * Optional: data-base="https://IHRE-DOMAIN.de", wenn das Script von einer
 * anderen Quelle geladen wird als die Widget-Seiten.
 *
 * Das iframe passt seine Höhe automatisch an; die Widget-Seiten melden ihre
 * Höhe per postMessage ({ type: "galabau-widget-height" }).
 */
(function () {
  "use strict";

  var WIDGETS = { projektanfrage: 1, kostenrechner: 1, "budget-check": 1, recruiting: 1 };

  function scriptOrigin() {
    var current = document.currentScript;
    if (current && current.src) {
      try {
        return new URL(current.src).origin;
      } catch (error) {
        /* fall through */
      }
    }
    return window.location.origin;
  }

  function mount(container, base) {
    var kind = container.getAttribute("data-galabau-widget");
    if (!kind || !WIDGETS[kind] || container.getAttribute("data-galabau-mounted")) {
      return;
    }
    container.setAttribute("data-galabau-mounted", "1");

    var origin = container.getAttribute("data-base") || base;
    var frame = document.createElement("iframe");
    frame.src = origin.replace(/\/+$/, "") + "/widget/" + kind;
    frame.title = "Projektanfrage";
    frame.style.width = "100%";
    frame.style.border = "0";
    frame.style.display = "block";
    frame.style.minHeight = "480px";
    frame.setAttribute("loading", "lazy");
    frame.setAttribute("allow", "clipboard-write");
    container.appendChild(frame);

    window.addEventListener("message", function (event) {
      if (!event.data || event.data.type !== "galabau-widget-height") return;
      if (event.source !== frame.contentWindow) return;
      var height = Number(event.data.height);
      if (height > 0) {
        frame.style.height = Math.ceil(height) + "px";
      }
    });
  }

  function boot() {
    var base = scriptOrigin();
    var containers = document.querySelectorAll("[data-galabau-widget]");
    for (var i = 0; i < containers.length; i += 1) {
      mount(containers[i], base);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
