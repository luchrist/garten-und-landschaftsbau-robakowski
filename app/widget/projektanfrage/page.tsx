import type { Metadata } from "next";

import { ProjektAssistent } from "@/components/ProjektAssistent";
import { WidgetChrome } from "@/components/WidgetChrome";
import company from "@/config/company";
import { parseHandoff } from "@/lib/handoff";

export const metadata: Metadata = {
  title: `Projektanfrage | ${company.name}`,
  robots: { index: false }
};

/**
 * Projektanfrage-Widget (Konzept Abschnitt 6): das komplette mehrstufige
 * Formular als iframe-einbettbare Seite für Betriebe, die ihre bestehende
 * Website behalten. Einbindung siehe public/embed.js.
 *
 * Die Übergabe-Parameter gelten auch hier: Wer das Widget auf seiner
 * Terrassen-Unterseite einbettet, hängt `?leistung=terrassenbau` an die
 * iframe-URL und die Leistung steht vorausgewählt.
 */
export default async function WidgetProjektanfragePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const handoff = parseHandoff(await searchParams);

  return (
    <WidgetChrome>
      <ProjektAssistent variant="widget" initial={handoff} />
    </WidgetChrome>
  );
}
