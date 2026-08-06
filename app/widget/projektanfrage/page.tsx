import type { Metadata } from "next";

import { ProjektAssistent } from "@/components/ProjektAssistent";
import { WidgetChrome } from "@/components/WidgetChrome";
import company from "@/config/company";

export const metadata: Metadata = {
  title: `Projektanfrage | ${company.name}`,
  robots: { index: false }
};

/**
 * Projektanfrage-Widget (Konzept Abschnitt 6): das komplette mehrstufige
 * Formular als iframe-einbettbare Seite für Betriebe, die ihre bestehende
 * Website behalten. Einbindung siehe public/embed.js.
 */
export default function WidgetProjektanfragePage() {
  return (
    <WidgetChrome>
      <ProjektAssistent variant="widget" />
    </WidgetChrome>
  );
}
