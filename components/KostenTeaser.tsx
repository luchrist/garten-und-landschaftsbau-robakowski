import { galabau } from "@/lib/galabau";
import { buildKostenHref, presetFuerLeistung } from "@/lib/handoff";
import { preisTabelle } from "@/lib/kalkulator";

/**
 * Teaser für den Kostenrechner auf der Startseite.
 *
 * Die Preisfrage ist die erste, die jeder Besucher hat, und die einzige, auf
 * die GaLaBau-Websites üblicherweise keine Antwort geben. Statt den ganzen
 * Rechner auf die Startseite zu laden, zeigt der Teaser drei echte Spannen
 * aus demselben Modell und führt auf /kosten.
 */
export function KostenTeaser() {
  const zeilen = preisTabelle().slice(0, 3);

  return (
    <section className="bg-creme py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-10 gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Kosten</span>
            </div>
            <h2 className="mt-6 max-w-[18ch] font-display text-[30px] leading-[1.05] tracking-tight text-ink md:text-[42px]">
              Finden Sie heraus, was Ihr Projekt kosten könnte
              <span className="text-erde-500">.</span>
            </h2>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-ink/70">
              Leistung wählen, Größe eintragen, fertig. Der Rechner schlüsselt die Positionen einzeln auf — vom
              Aushub bis zum Material. Ohne Formular, ohne Anmeldung.
            </p>
            <a
              href="/kosten"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-laub-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-laub-600"
            >
              Zum Kostenrechner
              <span>&rarr;</span>
            </a>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <ul className="grid gap-3">
              {zeilen.map((zeile) => (
                <li key={zeile.key}>
                  {/* Wer auf „Terrasse — 4.800 €“ klickt, will die Terrasse
                      rechnen, nicht die erste Kachel im Rechner. */}
                  <a
                    href={buildKostenHref(presetFuerLeistung(zeile.key))}
                    className="flex flex-col gap-2 rounded-4xl border border-ink/10 bg-white px-7 py-6 transition-colors hover:border-laub-400 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="block font-display text-[20px] tracking-tight text-ink">{zeile.label}</span>
                      <span className="block text-[13px] text-ink/55">{zeile.beispiel}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[13px] tracking-tight text-laub-700">{zeile.gesamt}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12px] leading-relaxed text-ink/50">
              Unverbindliche Orientierung für gut erreichbare, ebene Flächen in {galabau.serviceArea.centerCity} und
              Umgebung. Verbindlich wird der Preis nach dem Aufmaß vor Ort.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
