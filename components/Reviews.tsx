"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import company from "@/config/company";

const REVIEW_TRUNCATE_AT = 280;

function ReviewQuote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (text ?? "").length > REVIEW_TRUNCATE_AT;
  const showClamp = isLong && !expanded;
  return (
    <>
      <blockquote
        className={`break-words font-display text-[20px] leading-snug tracking-tight text-ink sm:text-[22px] md:text-[26px] ${
          showClamp ? "line-clamp-5" : ""
        }`}
      >
        <span className="text-laub-500">&bdquo;</span>
        {text}
        <span className="text-laub-500">&ldquo;</span>
      </blockquote>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-laub-600 transition-colors hover:text-laub-800"
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      )}
    </>
  );
}

function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-[3px] ${className}`} aria-label={`${value} von 5 Sternen`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.floor(value);
        const half = !filled && i + 0.5 < value;
        return (
          <svg key={i} viewBox="0 0 24 24" className="h-3.5 w-3.5">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="#B3874F" />
                <stop offset="50%" stopColor="rgba(20,24,26,0.18)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2.5l2.94 6.43 7.06.71-5.3 4.76 1.55 6.91L12 17.77l-6.25 3.54 1.55-6.91L2 9.64l7.06-.71L12 2.5z"
              fill={filled ? "#B3874F" : half ? `url(#half-${i})` : "rgba(20,24,26,0.18)"}
            />
          </svg>
        );
      })}
    </div>
  );
}

export function Reviews() {
  const r = company.reviews;
  if (!r.excerpts.length) return null;
  return (
    <section id="stimmen" className="relative bg-creme py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-end gap-6 border-b border-ink/15 pb-12">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Stimmen</span>
            </div>
            <h2 className="mt-6 break-words font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[64px] lg:text-[78px]">
              <span className="italic text-erde-600">{r.rating.toFixed(1)}</span> aus{" "}
              <span className="font-mono text-[24px] tracking-tight text-ink sm:text-[28px] md:text-[48px]">
                {r.count.toLocaleString("de-DE")}
              </span>{" "}
              Bewertungen.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="flex flex-col items-start gap-4 md:items-end">
              <Stars value={r.rating} className="origin-left scale-[1.6] md:origin-right" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">Quelle: {r.source}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-12 gap-x-10 gap-y-16">
          {r.excerpts.map((review, i) => {
            const positions = [
              "col-span-12 md:col-span-7 md:col-start-1",
              "col-span-12 md:col-span-5 md:col-start-8",
              "col-span-12 md:col-span-6 md:col-start-2",
              "col-span-12 md:col-span-5 md:col-start-8",
              "col-span-12 md:col-span-6 md:col-start-3"
            ];
            return (
              <motion.figure
                key={`${review.name}-${i}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ type: "spring", stiffness: 110, damping: 22, delay: (i % 3) * 0.05 }}
                className={positions[i % positions.length]}
              >
                <div className="mb-4 flex items-center justify-between">
                  <Stars value={review.rating} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/45">{review.date}</span>
                </div>
                <ReviewQuote text={review.text} />
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="block h-[1px] w-8 bg-ink/40" />
                  <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink/70">{review.name}</span>
                </figcaption>
              </motion.figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
