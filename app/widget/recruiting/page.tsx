import type { Metadata } from "next";

import { RecruitingForm } from "@/components/RecruitingForm";
import { WidgetChrome } from "@/components/WidgetChrome";
import company from "@/config/company";

export const metadata: Metadata = {
  title: `Bewerbung | ${company.name}`,
  robots: { index: false }
};

/** Recruiting-Widget: die 60-Sekunden-Bewerbung als embeddable Seite. */
export default function WidgetRecruitingPage() {
  return (
    <WidgetChrome>
      <RecruitingForm variant="widget" />
    </WidgetChrome>
  );
}
