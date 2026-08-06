import { galabau } from "@/lib/galabau";

/**
 * Konzept: "Projekt-Assistent als Hauptkontaktweg: mehrstufig, mobil, mit
 * Foto-Upload und Budgetrahmen." Der Teaser erklärt in drei Schritten, warum
 * die strukturierte Anfrage besser ist als ein Kontaktformular, und führt auf
 * /projekt-anfragen.
 */
const SCHRITTE = [
  {
    title: "Projekt beschreiben",
    text: "Projektart, Ort und grobe Fläche. Fotos vom Ist-Zustand ersparen die erste Runde Rückfragen."
  },
  {
    title: "Ehrliche Orientierung",
    text: "Sie sehen sofort eine grobe Budgetspanne und ob das Projekt in unserem Einsatzgebiet liegt."
  },
  {
    title: "Wir melden uns",
    text: "Mit einer klaren Antwort und dem nächsten Schritt, meist ein Ortstermin mit Aufmaß."
  }
];

export function AssistentTeaser() {
  return (
    <section className="relative bg-ink py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-10 gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/55">
              <span className="inline-block h-[0.4rem] w-[0.4rem] rounded-full bg-erde-400" />
              <span>Projekt anfragen</span>
            </div>
            <h2 className="mt-6 font-display text-[30px] leading-[1.06] tracking-tight text-bone sm:text-[38px] md:text-[50px]">
              Kein Kontaktformular. Ein <span className="italic text-laub-300">Projekt-Assistent.</span>
            </h2>
            <p className="mt-6 max-w-[50ch] text-[15px] leading-relaxed text-bone/75">
              In wenigen Minuten haben wir alles, was wir für eine belastbare Antwort brauchen. Sie sparen sich das
              Telefon-Pingpong, wir können sofort sinnvoll planen.
            </p>
            <a
              href="/projekt-anfragen"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-laub-500 px-8 py-4 text-[14px] font-medium text-bone transition-colors hover:bg-laub-400"
            >
              Jetzt Projekt anfragen
              <span>&rarr;</span>
            </a>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-bone/50">
              {galabau.assistant.responsePromise}
            </p>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <ol className="grid gap-4 sm:grid-cols-3">
              {SCHRITTE.map((schritt, index) => (
                <li key={schritt.title} className="rounded-4xl border border-bone/12 bg-bone/[0.04] p-7">
                  <span className="font-mono text-[12px] tracking-[0.2em] text-erde-300">0{index + 1}</span>
                  <h3 className="mt-4 font-display text-[19px] tracking-tight text-bone">{schritt.title}</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-bone/65">{schritt.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
