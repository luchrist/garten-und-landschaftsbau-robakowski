import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RecruitingForm } from "@/components/RecruitingForm";
import company from "@/config/company";
import { galabau } from "@/lib/galabau";

export const metadata: Metadata = {
  title: `Karriere | ${company.name}`,
  description: `Jobs im Garten- und Landschaftsbau bei ${company.name} in ${company.address.city}. In 60 Sekunden bewerben, ohne Lebenslauf.`
};

/**
 * Recruiting-Funnel aus Abschnitt 10 des Konzepts: ehrlicher Hero, Benefits,
 * 60-Sekunden-Bewerbung ohne Lebenslaufpflicht, WhatsApp-Option.
 */
export default function KarrierePage() {
  return (
    <main style={{ overflowX: "clip" }} className="bg-bone">
      <Navbar />

      <section className="relative overflow-hidden bg-ink pt-40 pb-20 md:pt-52 md:pb-28">
        <img
          src="/assets/karriere-hero.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/65">
            <span className="inline-block h-[0.4rem] w-[0.4rem] rounded-full bg-erde-400" />
            <span>Karriere · {company.address.city}</span>
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-[36px] leading-[1.0] tracking-tight text-bone drop-shadow-lg sm:text-[46px] md:text-[60px]">
            {galabau.recruiting.headline}
          </h1>
          <p className="mt-5 max-w-[50ch] text-[15px] leading-relaxed text-bone/85 md:text-[17px]">
            {galabau.recruiting.teaser}
          </p>
          <a
            href="#bewerbung"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-laub-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-laub-600"
          >
            Direkt zur 60-Sekunden-Bewerbung
            <span>&darr;</span>
          </a>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-12 gap-x-10 gap-y-12">
            <div className="col-span-12 lg:col-span-5">
              <h2 className="font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[34px]">
                Arbeiten bei {company.shortName || company.name}
                <span className="text-erde-500">.</span>
              </h2>
              <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-ink/70">{galabau.recruiting.intro}</p>
              <ul className="mt-8 space-y-4">
                {galabau.recruiting.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-4">
                    <span className="mt-[7px] block h-[6px] w-[6px] shrink-0 rotate-45 bg-laub-500" />
                    <span className="text-[14px] leading-relaxed text-ink/75">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div id="bewerbung" className="col-span-12 scroll-mt-28 lg:col-span-7">
              <RecruitingForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
