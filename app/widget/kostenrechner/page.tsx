import type { Metadata } from "next";

import { Kostenrechner } from "@/components/Kostenrechner";
import { WidgetChrome } from "@/components/WidgetChrome";
import company from "@/config/company";
import { parseHandoff } from "@/lib/handoff";

export const metadata: Metadata = {
  title: `Kostenrechner | ${company.name}`,
  robots: { index: false }
};

/**
 * Kostenrechner als iframe-einbettbares Widget — für Betriebe, die ihre
 * bestehende Website behalten, und für Platzierungen auf Unterseiten, an
 * denen die Preisfrage ohnehin aufkommt.
 *
 * Genau dafür nimmt auch dieses Widget die Übergabe-Parameter entgegen:
 * `?leistung=pflasterarbeiten` bettet den Rechner direkt auf der richtigen
 * Leistung ein.
 */
export default async function WidgetKostenrechnerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const handoff = parseHandoff(await searchParams);

  return (
    <WidgetChrome>
      <Kostenrechner initial={handoff} />
    </WidgetChrome>
  );
}
