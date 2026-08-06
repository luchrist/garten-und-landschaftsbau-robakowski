"use client";

import { motion } from "framer-motion";

import { galabau } from "@/lib/galabau";

/**
 * Startseite, Abschnitt "Kurze Leistungsübersicht" aus dem Konzept: jede Karte
 * verlinkt auf ihre Leistungsseite und trägt den leistungsspezifischen CTA.
 */
export function Leistungen() {
  return (
    <section id="leistungen" className="relative bg-bone py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-end gap-6 border-b border-ink/15 pb-12">
          <div className="col-span-12 md:col-span-8">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Leistungen</span>
            </div>
            <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[58px]">
              Was wir bauen <span className="italic text-laub-500">und pflegen.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4">
            <p className="text-[15px] leading-relaxed text-ink/65 md:text-right">
              Jede Leistung hat eine eigene Seite mit Ablauf, typischen Projekten und ehrlicher Budget-Orientierung.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galabau.services.map((service, index) => (
            <motion.a
              key={service.key}
              href={`/leistungen/${service.slug}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 110, damping: 22, delay: (index % 3) * 0.06 }}
              className="group relative overflow-hidden rounded-4xl border border-ink/10 bg-white"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-creme">
                <img
                  src={service.image}
                  alt={service.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-5 font-display text-[24px] tracking-tight text-bone drop-shadow-md md:text-[28px]">
                  {service.label}
                </span>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <p className="text-[14px] leading-relaxed text-ink/70">{service.teaser}</p>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-laub-600 transition-colors group-hover:text-laub-700">
                  {service.cta}
                  <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
