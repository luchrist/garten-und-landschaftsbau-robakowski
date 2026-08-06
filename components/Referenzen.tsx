"use client";

import { motion } from "framer-motion";

import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { referenzen } from "@/lib/referenzen-data";

/**
 * Konzept: "Vorher-Nachher-Projekte mit Slider … Jede Referenz bekommt Ort,
 * Leistung." Entries without a genuine before shot render as a plain project
 * image; the slider only appears for honest pairs.
 */
export function Referenzen() {
  if (!referenzen.length) return null;

  return (
    <section id="referenzen" className="relative bg-creme py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-end gap-6 border-b border-ink/15 pb-12">
          <div className="col-span-12 md:col-span-8">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Referenzen</span>
            </div>
            <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[58px]">
              Vorher, nachher, <span className="italic text-laub-500">nachvollziehbar.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4">
            <p className="text-[15px] leading-relaxed text-ink/65 md:text-right">
              Echte Projekte mit Ort und Leistung. Regler ziehen und den Unterschied ansehen.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-16 lg:grid-cols-2">
          {referenzen.map((projekt, index) => (
            <motion.figure
              key={projekt.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 110, damping: 22, delay: (index % 2) * 0.06 }}
              className={index % 3 === 0 ? "lg:col-span-2" : ""}
            >
              {projekt.beforeImage ? (
                <BeforeAfterSlider beforeSrc={projekt.beforeImage} afterSrc={projekt.afterImage} alt={projekt.alt} />
              ) : (
                <div className="relative aspect-[4/3] overflow-hidden rounded-4xl bg-bone">
                  <img src={projekt.afterImage} alt={projekt.alt} loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}

              <figcaption className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <h3 className="font-display text-[22px] tracking-tight text-ink md:text-[26px]">{projekt.title}</h3>
                  <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink/65">{projekt.text}</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/55">
                  <span>{projekt.ort}</span>
                  <span className="text-erde-500">&middot;</span>
                  <span>{projekt.leistung}</span>
                  {projekt.jahr ? (
                    <>
                      <span className="text-erde-500">&middot;</span>
                      <span>{projekt.jahr}</span>
                    </>
                  ) : null}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <a
            href="/projekt-anfragen"
            className="inline-flex items-center gap-3 rounded-full bg-laub-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-laub-600"
          >
            So ein Projekt anfragen
            <span>&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
