/**
 * Teaser für den Kostenrechner auf der Startseite.
 *
 * Die Preisfrage ist die erste, die jeder Besucher hat, und die einzige, auf
 * die GaLaBau-Websites üblicherweise keine Antwort geben. Der Teaser nennt sie
 * beim Namen und führt auf /kosten — konkrete Zahlen stehen bewusst erst dort,
 * im Kontext des vollständigen Rechners.
 */
export function KostenTeaser() {
  return (
    <section className="bg-creme py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
          <span className="marker" />
          <span>Kosten</span>
        </div>
        <h2 className="mt-6 max-w-[18ch] font-display text-[30px] leading-[1.05] tracking-tight text-ink md:text-[42px]">
          Finden Sie heraus, was Ihr Projekt kosten könnte
          <span className="text-erde-500">.</span>
        </h2>
        <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-ink/70">
          Leistung wählen, Größe eintragen, fertig. Der Rechner schlüsselt die Positionen einzeln auf.
        </p>
        <a
          href="/kosten"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-laub-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-laub-600"
        >
          Zum Kostenrechner
          <span>&rarr;</span>
        </a>
      </div>
    </section>
  );
}
