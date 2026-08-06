"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

import company from "@/config/company";
import { galabau } from "@/lib/galabau";
import { checkServiceArea } from "@/lib/service-area";

/**
 * Konzept: Einsatzgebietskarte auf der Startseite. Eine echte OpenStreetMap
 * mit dem Radius als Overlay — der Umkreis ist die eigentliche Aussage, eine
 * Ortsliste daneben war nur Aufzählung.
 *
 * Leaflet wird erst im Effect geladen, weil es beim Import auf `window`
 * zugreift und sonst das Server-Rendering bricht. Ohne Koordinaten in der
 * Config fällt die Sektion auf die stilisierten Ringe zurück.
 *
 * Datenschutz: die Kacheln kommen von tile.openstreetmap.org, dabei wird die
 * IP der Besucher an OSM übertragen. Der Hinweis gehört in die
 * Datenschutzerklärung.
 */
export function Einsatzgebiet() {
  const [plz, setPlz] = useState("");
  const result = useMemo(() => (plz.trim().length === 5 ? checkServiceArea(plz) : null), [plz]);

  const area = galabau.serviceArea;
  const center = area.center;

  // Aus der eigenen Adresse statt hart kodiert: sonst steht im generierten
  // Projekt die Beispiel-PLZ des Templates.
  const plzPlaceholder = company.address.cityLine.match(/\b\d{5}\b/)?.[0] ?? "12345";

  const mapNode = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!center || !mapNode.current) return;

    let map: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !mapNode.current) return;

        const instance = L.map(mapNode.current, {
          center: [center.lat, center.lng],
          zoom: 9,
          // Scrolling past the section must not hijack the page scroll.
          scrollWheelZoom: false,
          attributionControl: true
        });
        map = instance;

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(instance);

        const radius = L.circle([center.lat, center.lng], {
          radius: area.radiusKm * 1000,
          color: "#3E7538",
          weight: 2,
          fillColor: "#3E7538",
          fillOpacity: 0.12
        }).addTo(instance);

        // A circleMarker instead of L.marker: the default marker needs image
        // assets that bundlers routinely fail to resolve.
        L.circleMarker([center.lat, center.lng], {
          radius: 7,
          color: "#F7F6F2",
          weight: 2,
          fillColor: "#2F5C2B",
          fillOpacity: 1
        })
          .addTo(instance)
          .bindTooltip(area.centerCity, { permanent: true, direction: "top", offset: [0, -8] });

        instance.fitBounds(radius.getBounds(), { padding: [24, 24] });
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [area.centerCity, area.radiusKm, center]);

  const showMap = Boolean(center) && !mapFailed;

  return (
    <section id="einsatzgebiet" className="relative bg-bone py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-center gap-x-10 gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Einsatzgebiet</span>
            </div>
            <h2 className="mt-6 font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[54px]">
              {area.centerCity} und rund <span className="italic text-laub-500">{area.radiusKm} km</span> Umkreis.
            </h2>
            <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink/70">{area.note}</p>

            {/* Der Schnellcheck ist die eigentliche Interaktion der Sektion und
                darf entsprechend Gewicht haben. */}
            <div className="mt-10 rounded-4xl border border-ink/10 bg-white p-7 shadow-sm md:p-8">
              <label htmlFor="plz-check" className="field-label">
                PLZ-Schnellcheck
              </label>
              <p className="mb-4 mt-1 text-[13px] leading-relaxed text-ink/55">
                Postleitzahl eingeben und sofort sehen, ob Ihr Projekt in unserem Gebiet liegt.
              </p>
              <input
                id="plz-check"
                inputMode="numeric"
                maxLength={5}
                placeholder={`z.B. ${plzPlaceholder}`}
                value={plz}
                onChange={(event) => setPlz(event.target.value.replace(/\D/g, ""))}
                className="field-input w-full text-[18px] tracking-[0.08em]"
              />
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

          <div className="col-span-12 lg:col-span-7">
            {showMap ? (
              <div
                ref={mapNode}
                aria-label={`Karte des Einsatzgebiets um ${area.centerCity}`}
                className="h-[380px] w-full overflow-hidden rounded-4xl border border-ink/10 md:h-[520px]"
              />
            ) : (
              // Fallback ohne Koordinaten: die stilisierten Ringe von vorher.
              <div className="relative mx-auto aspect-square max-w-[520px]">
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
