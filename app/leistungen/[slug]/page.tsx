import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Kostenrechner } from "@/components/Kostenrechner";
import { AnfrageLink, HandoffProvider } from "@/components/HandoffLinks";
import { galabau, findService } from "@/lib/galabau";
import { buildKostenHref, presetFuerLeistung } from "@/lib/handoff";
import { findBauModell } from "@/lib/kalkulator";

/**
 * Eine Route für alle Leistungsseiten aus Abschnitt 3 des Konzepts
 * (Gartenneugestaltung, Pflasterarbeiten, Terrassenbau, Gartenpflege,
 * Zaun/Sichtschutz, Bewässerung, …). Inhalt kommt vollständig aus
 * lib/galabau.ts, damit die Factory pro Betrieb nur die Config seeden muss.
 */

export function generateStaticParams() {
  return galabau.services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) return {};
  return {
    title: service.seo.title,
    description: service.seo.description
  };
}

export default async function LeistungsSeite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();

  const otherServices = galabau.services.filter((entry) => entry.slug !== service.slug);

  // Auf dieser Seite steht die Leistung fest. Jeder Weg zu Formular oder
  // Rechner nimmt sie mit, statt dort erneut danach zu fragen.
  const preset = presetFuerLeistung(service.key);

  return (
    // Der Provider reicht den Stand des eingebetteten Rechners an die CTAs
    // weiter: Wer dort 60 m² Naturstein eingetragen hat, findet das im
    // Assistenten wieder, egal über welchen Button er dorthin geht.
    <HandoffProvider initial={preset}>
      <main style={{ overflowX: "clip" }}>
        <Navbar />

        {/* Header */}
        <section className="relative overflow-hidden bg-ink pt-40 pb-20 md:pt-52 md:pb-28">
          <img
            src={service.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
          <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/65">
              <span className="inline-block h-[0.4rem] w-[0.4rem] rounded-full bg-erde-400" />
              <span>Leistung · {galabau.serviceArea.centerCity}</span>
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-[38px] leading-[1.0] tracking-tight text-bone drop-shadow-lg sm:text-[48px] md:text-[64px]">
              {service.label}
              <span className="text-laub-300">.</span>
            </h1>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-bone/85 md:text-[17px]">
              {service.teaser}
            </p>
            <AnfrageLink className="mt-8 inline-flex items-center gap-3 rounded-full bg-laub-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-laub-600">
              {service.cta}
              <span>&rarr;</span>
            </AnfrageLink>
          </div>
        </section>

        {/* Intro + Bullets */}
        <section className="bg-bone py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="grid grid-cols-12 gap-x-10 gap-y-12">
              <div className="col-span-12 lg:col-span-6">
                <h2 className="font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[34px]">
                  Worauf es ankommt<span className="text-erde-500">.</span>
                </h2>
                <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink/70">{service.intro}</p>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <ul className="space-y-4">
                  {service.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-4 rounded-2xl border border-ink/10 bg-white px-5 py-4"
                    >
                      <span className="mt-[7px] block h-[6px] w-[6px] shrink-0 rotate-45 bg-laub-500" />
                      <span className="text-[14px] leading-relaxed text-ink/75">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Ablauf */}
        <section className="bg-creme py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>So läuft es ab</span>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {service.ablauf.map((schritt, index) => (
                <li key={schritt.title} className="rounded-4xl border border-ink/10 bg-white p-7">
                  <span className="font-mono text-[12px] tracking-[0.2em] text-erde-600">0{index + 1}</span>
                  <h3 className="mt-4 font-display text-[19px] tracking-tight text-ink">{schritt.title}</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink/65">{schritt.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Kostenrechner, auf diese Leistung vorbelegt */}
        {findBauModell(service.key) || service.key === "gartenpflege" ? (
          <section className="bg-bone py-20 md:py-28">
            <div className="mx-auto max-w-[1400px] px-6 md:px-10">
              <div className="grid grid-cols-12 gap-x-10 gap-y-10">
                <div className="col-span-12 lg:col-span-4">
                  <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
                    <span className="marker" />
                    <span>Was kostet das?</span>
                  </div>
                  <h2 className="mt-6 font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[34px]">
                    Rechnen Sie es durch<span className="text-erde-500">.</span>
                  </h2>
                  <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-ink/70">
                    Material, Zugang und Gelände ändern den Preis erheblich. Der Rechner zeigt die Positionen einzeln,
                    damit nachvollziehbar bleibt, wofür das Geld draufgeht.
                  </p>
                  <a
                    href={buildKostenHref(preset)}
                    className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-laub-700 hover:text-laub-800"
                  >
                    Alle Preisspannen ansehen <span>&rarr;</span>
                  </a>
                </div>
                <div className="col-span-12 lg:col-span-8">
                  <Kostenrechner initial={preset} />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        {service.faq.length > 0 ? (
          <section className="bg-creme py-20 md:py-28">
            <div className="mx-auto max-w-[1400px] px-6 md:px-10">
              <div className="grid grid-cols-12 gap-x-10 gap-y-10">
                <div className="col-span-12 lg:col-span-4">
                  <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
                    <span className="marker" />
                    <span>Häufige Fragen</span>
                  </div>
                  <h2 className="mt-6 font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[34px]">
                    Ehrlich beantwortet<span className="text-erde-500">.</span>
                  </h2>
                </div>
                <div className="col-span-12 lg:col-span-8">
                  <dl className="space-y-8">
                    {service.faq.map((entry) => (
                      <div key={entry.q} className="border-b border-ink/10 pb-8">
                        <dt className="font-display text-[19px] tracking-tight text-ink md:text-[22px]">{entry.q}</dt>
                        <dd className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-ink/70">{entry.a}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* CTA + weitere Leistungen */}
        <section className="bg-laub-700 py-20 md:py-24">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <h2 className="font-display text-[26px] leading-[1.1] tracking-tight text-bone md:text-[34px]">
                  Konkretes Projekt im Kopf?
                </h2>
                <p className="mt-3 max-w-[48ch] text-[14px] leading-relaxed text-bone/75">
                  Der Projekt-Assistent sammelt alles ein, was wir für eine belastbare Antwort brauchen.
                </p>
              </div>
              <AnfrageLink className="inline-flex items-center gap-3 rounded-full bg-bone px-8 py-4 text-[14px] font-medium text-laub-800 transition-colors hover:bg-creme">
                {service.cta}
                <span>&rarr;</span>
              </AnfrageLink>
            </div>

            {otherServices.length > 0 ? (
              <div className="mt-14 border-t border-bone/15 pt-10">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone/50">
                  Weitere Leistungen
                </span>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {otherServices.map((entry) => (
                    <li key={entry.slug}>
                      <a
                        href={`/leistungen/${entry.slug}`}
                        className="inline-block rounded-full border border-bone/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-bone/80 transition-colors hover:border-bone hover:text-bone"
                      >
                        {entry.navLabel}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <Footer />
      </main>
    </HandoffProvider>
  );
}
