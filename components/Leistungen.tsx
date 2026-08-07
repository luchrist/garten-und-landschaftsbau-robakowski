"use client";

import { motion } from "framer-motion";

import { galabau } from "@/lib/galabau";
import { buildAnfrageHref, presetFuerLeistung } from "@/lib/handoff";

/**
 * Startseite, Abschnitt "Kurze Leistungsübersicht" aus dem Konzept.
 *
 * Zwei Ziele pro Karte, bewusst getrennt: Die Karte selbst führt auf die
 * Leistungsseite, wer erst lesen will. Der Button darauf startet direkt die
 * Anfrage mit dieser Leistung vorausgewählt — wer schon weiß, was er braucht,
 * soll nicht über eine Zwischenseite laufen und die Leistung dort ein zweites
 * Mal auswählen müssen.
 *
 * Deshalb ist die Karte kein <a> mehr, sondern ein Container mit einem
 * flächendeckenden Link darunter und dem CTA darüber — verschachtelte Links
 * wären ungültiges Markup.
 */
export function Leistungen() {
  return (
    <section id="leistungen" className="relative bg-bone py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="border-b border-ink/15 pb-12">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
            <span className="marker" />
            <span>Leistungen</span>
          </div>
          <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[58px]">
            Was wir bauen <span className="italic text-laub-500">und pflegen.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galabau.services.map((service, index) => (
            <motion.div
              key={service.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 110, damping: 22, delay: (index % 3) * 0.06 }}
              className="group relative flex flex-col overflow-hidden rounded-4xl border border-ink/10 bg-white"
            >
              {/* Flächendeckender Link auf die Leistungsseite. Liegt über Bild
                  und Text (die sonst die Klicks abfangen würden), aber unter
                  dem CTA, damit ein Klick auf den Button die Anfrage startet. */}
              <a
                href={`/leistungen/${service.slug}`}
                aria-label={`${service.label}: Leistung ansehen`}
                className="absolute inset-0 z-20 rounded-4xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laub-500"
              />

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

              <div className="flex flex-1 flex-col gap-5 p-6">
                <p className="text-[14px] leading-relaxed text-ink/70">{service.teaser}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3">
                  <a
                    href={buildAnfrageHref(presetFuerLeistung(service.key))}
                    className="relative z-30 inline-flex items-center gap-2 rounded-full bg-laub-500 px-5 py-2.5 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600"
                  >
                    {service.cta}
                    <span>&rarr;</span>
                  </a>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45 transition-colors group-hover:text-laub-700">
                    Mehr erfahren
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
