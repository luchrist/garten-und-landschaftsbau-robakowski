import type { Metadata } from "next";

import { Kostenrechner } from "@/components/Kostenrechner";
import { WidgetChrome } from "@/components/WidgetChrome";
import company from "@/config/company";

export const metadata: Metadata = {
  title: `Kostenrechner | ${company.name}`,
  robots: { index: false }
};

/**
 * Kostenrechner als iframe-einbettbares Widget — für Betriebe, die ihre
 * bestehende Website behalten, und für Platzierungen auf Unterseiten, an
 * denen die Preisfrage ohnehin aufkommt.
 */
export default function WidgetKostenrechnerPage() {
  return (
    <WidgetChrome>
      <Kostenrechner />
    </WidgetChrome>
  );
}
