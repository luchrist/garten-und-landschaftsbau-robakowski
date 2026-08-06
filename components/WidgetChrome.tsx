"use client";

import { useEffect } from "react";

import company from "@/config/company";

/**
 * Wrapper für die einbettbaren Widgets (Abschnitt 6 des Konzepts). Meldet die
 * eigene Höhe per postMessage an die einbettende Seite, damit public/embed.js
 * das iframe ohne Scrollbalken skalieren kann, und trägt ein dezentes
 * "powered by"-Branding des Betriebs.
 */
export function WidgetChrome({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const post = () => {
      window.parent.postMessage(
        { type: "galabau-widget-height", height: document.documentElement.scrollHeight },
        "*"
      );
    };

    post();
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    window.addEventListener("load", post);
    return () => {
      observer.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {children}
      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
        {company.name}
      </p>
    </div>
  );
}
