"use client";

import { motion } from "framer-motion";

import company from "@/config/company";
import { galabau } from "@/lib/galabau";

/**
 * Konzept, Startseite: "Google-Profil, Siegel/Mitgliedschaften, Team,
 * Maschinen/Arbeitsweise." Facts only: empty fields (foundedYear, teamSize,
 * machines, seals) simply do not render, so the demo never claims anything
 * the company has not verified.
 */
export function Vertrauen() {
  const facts = [
    galabau.company.foundedYear ? { label: "Gegründet", value: galabau.company.foundedYear } : null,
    galabau.company.teamSize ? { label: "Team", value: galabau.company.teamSize } : null,
    galabau.company.machines ? { label: "Maschinen", value: galabau.company.machines } : null
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <section id="vertrauen" className="relative bg-bone py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-10 gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Arbeitsweise</span>
            </div>
            <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[54px]">
              So arbeiten <span className="italic text-laub-500">wir.</span>
            </h2>
            <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-ink/70">
              Ein Projekt läuft bei uns immer gleich: klare Anfrage, Aufmaß vor Ort, nachvollziehbares Angebot,
              feste Bauzeit. Keine Überraschungen auf der Rechnung.
            </p>

            {facts.length > 0 ? (
              <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">{fact.label}</dt>
                    <dd className="mt-2 font-display text-[22px] tracking-tight text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {galabau.trust.seals.length > 0 ? (
              <ul className="mt-10 flex flex-wrap gap-2">
                {galabau.trust.seals.map((seal) => (
                  <li
                    key={seal.label}
                    title={seal.note}
                    className="rounded-full border border-erde-300 bg-erde-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-erde-800"
                  >
                    {seal.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid gap-6 sm:grid-cols-3">
              {galabau.trust.usps.map((usp, index) => (
                <motion.div
                  key={usp.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ type: "spring", stiffness: 110, damping: 22, delay: index * 0.06 }}
                  className="flex flex-col gap-4 rounded-4xl border border-ink/10 bg-white p-7"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-laub-50 font-display text-[18px] text-laub-600">
                    {index + 1}
                  </span>
                  <h3 className="font-display text-[20px] tracking-tight text-ink">{usp.label}</h3>
                  <p className="text-[14px] leading-relaxed text-ink/65">{usp.text}</p>
                </motion.div>
              ))}
            </div>

            <a
              href={company.googleBusinessProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-between rounded-4xl border border-ink/10 bg-creme px-7 py-6 transition-colors hover:border-laub-400"
            >
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">Google-Profil</span>
                <p className="mt-1 font-display text-[20px] tracking-tight text-ink">
                  {company.reviews.rating.toFixed(1)} von 5 bei {company.reviews.count.toLocaleString("de-DE")} Bewertungen
                </p>
              </div>
              <span className="font-mono text-[13px] text-laub-600">&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
