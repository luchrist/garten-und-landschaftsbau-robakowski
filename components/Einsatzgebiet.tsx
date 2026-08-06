"use client";

import { useMemo, useState } from "react";

import { galabau } from "@/lib/galabau";
import { checkServiceArea } from "@/lib/service-area";

/**
 * Konzept: Einsatzgebietskarte auf der Startseite. Statt einer externen
 * Kartenbibliothek (CSP/Datenschutz) rendert die Sektion einen stilisierten
 * Radius plus Ortsliste und einen PLZ-Schnellcheck, der dieselbe Logik nutzt
 * wie der Projekt-Assistent.
 */
export function Einsatzgebiet() {
  const [plz, setPlz] = useState("");
  const result = useMemo(() => (plz.trim().length === 5 ? checkServiceArea(plz) : null), [plz]);

  const area = galabau.serviceArea;

  return (
    <section id="einsatzgebiet" className="relative bg-bone py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-10 gap-y-12">
          <div className="col-span-12 lg:col-span-6">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Einsatzgebiet</span>
            </div>
            <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[54px]">
              {area.centerCity} und rund <span className="italic text-laub-500">{area.radiusKm} km</span> Umkreis.
            </h2>
            <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink/70">{area.note}</p>

            {area.places.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-2">
                {area.places.map((place) => (
                  <li
                    key={place}
                    className="rounded-full border border-ink/12 bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/70"
                  >
                    {place}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-10 max-w-md">
              <label htmlFor="plz-check" className="field-label">
                PLZ-Schnellcheck
              </label>
              <div className="flex gap-3">
                <input
                  id="plz-check"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="z.B. 67098"
                  value={plz}
                  onChange={(event) => setPlz(event.target.value.replace(/\D/g, ""))}
                  className="field-input flex-1"
                />
              </div>
              {result ? (
                <div
                  className={`mt-4 rounded-2xl border px-5 py-4 text-[14px] leading-relaxed ${
                    result.verdict === "inside"
                      ? "border-laub-300 bg-laub-50 text-laub-800"
                      : result.verdict === "border"
                        ? "border-erde-300 bg-erde-50 text-erde-800"
                        : "border-kies-300 bg-kies-50 text-kies-800"
                  }`}
                >
                  <strong className="block font-medium">{result.headline}</strong>
                  <span>{result.detail}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <div className="relative mx-auto aspect-square max-w-[520px]">
              {/* Stylised radius rings */}
              <div className="absolute inset-0 rounded-full border border-ink/10" />
              <div className="absolute inset-[12%] rounded-full border border-ink/10" />
              <div className="absolute inset-[26%] rounded-full border border-laub-300/60 bg-laub-50/40" />
              <div className="absolute inset-[42%] rounded-full border border-laub-400/60 bg-laub-100/50" />
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-laub-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-bone" />
                </span>
                <span className="rounded-full bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink shadow-sm">
                  {area.centerCity}
                </span>
              </div>
              <span className="absolute right-[8%] top-[18%] rounded-full bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60 shadow-sm">
                ~{area.radiusKm} km
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
