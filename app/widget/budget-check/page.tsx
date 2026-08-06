import type { Metadata } from "next";

import { BudgetCheck } from "@/components/BudgetCheck";
import { WidgetChrome } from "@/components/WidgetChrome";
import company from "@/config/company";

export const metadata: Metadata = {
  title: `Budget-Check | ${company.name}`,
  robots: { index: false }
};

/** Budget-Check-Widget: Orientierungslogik + Preisgefühl-Abfrage, embeddable. */
export default function WidgetBudgetCheckPage() {
  return (
    <WidgetChrome>
      <BudgetCheck />
    </WidgetChrome>
  );
}
