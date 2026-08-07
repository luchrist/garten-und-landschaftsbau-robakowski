import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnfrageLink, HandoffProvider } from "@/components/HandoffLinks";
import { Kostenrechner } from "@/components/Kostenrechner";
import { WhatsappFloat } from "@/components/WhatsappFloat";
import company from "@/config/company";
import { galabau } from "@/lib/galabau";
import { parseHandoff } from "@/lib/handoff";
import { preisTabelle } from "@/lib/kalkulator";

/**
 * Kostenseite: eigenständige Landingpage zum Suchintent „was kostet …“.
 *
 * Der Rechner steht bewusst hier und nicht mehr im Projekt-Assistenten. Wer
 * anfragt, will nicht rechnen; wer rechnet, will noch nichts von sich
 * preisgeben. Beides zu trennen macht beide Wege kürzer — und die Seite
 * beantwortet die meistgestellte Frage überhaupt, was sie zur stärksten
 * SEO-Seite des Auftritts macht.
 */

const TITLE = `Was kostet mein Gartenprojekt? Kostenrechner für ${galabau.serviceArea.centerCity}`;

export const metadata: Metadata = {
  title: `${TITLE} | ${company.name}`,
  description: `Kostenrechner für Gartenbau in ${galabau.serviceArea.centerCity}: Pflaster, Terrasse, Gartenneugestaltung, Zaun, Bewässerung und Gartenpflege. Preisspannen pro m² und lfm, aufgeschlüsselt nach Positionen.`,
  keywords: [
    "was kostet eine Terrasse",
    "Pflaster Preis pro m2",
    "Gartengestaltung Kosten",
    "Gartenpflege Preise",
    `Garten und Landschaftsbau ${galabau.serviceArea.centerCity}`
  ],
  alternates: { canonical: "/kosten" }
};

const PREISTREIBER = [
  {
    titel: "Untergrund und Unterbau",
    text: "Was unter dem Belag liegt, sieht später niemand und kostet doch am meisten. Ein tragfähiger Aufbau für eine Zufahrt ist ein Vielfaches einer Terrassenfläche."
  },
  {
    titel: "Zugang zur Baustelle",
    text: "Kommt der Bagger bis an die Fläche, geht es schnell. Muss alles durch den Keller getragen werden, verdoppelt sich die Arbeitszeit für dieselbe Menge."
  },
  {
    titel: "Material",
    text: "Zwischen einfachem Betonstein und Naturstein liegen leicht 100 € pro Quadratmeter — bei identischem Arbeitsaufwand."
  },
  {
    titel: "Entsorgung",
    text: "Aushub, alter Belag und Grünschnitt müssen abgefahren und entsorgt werden. Belasteter Boden ändert die Rechnung erheblich."
  },
  {
    titel: "Gelände",
    text: "Am Hang kommen Modellierung, Abfangungen oder Stützmauern dazu. Auch die Maschinenwahl ändert sich."
  },
  {
    titel: "Projektgröße",
    text: "Anfahrt und Rüstzeit fallen einmal an. Deshalb ist eine kleine Fläche pro Quadratmeter fast immer teurer als eine große."
  }
];

const FAQ = [
  {
    q: "Wie genau ist der Kostenrechner?",
    a: "Er rechnet mit echten Positionen — Baustelleneinrichtung, Erdarbeiten, Unterbau, Material und Lohn — und berücksichtigt Materialklasse, Zugang, Gelände und Projektgröße. Das ergibt eine belastbare Größenordnung, aber kein Angebot. Verbindlich wird der Preis erst nach dem Aufmaß vor Ort, weil sich Boden, Entwässerung und Anschlusshöhen nicht online prüfen lassen."
  },
  {
    q: "Warum ist die Spanne trotzdem breit?",
    a: "Weil zwei gleich große Flächen unterschiedlich teuer sind, sobald der Untergrund oder der Zugang abweicht. Eine ehrliche Spanne ist uns lieber als eine exakt wirkende Zahl, die beim Aufmaß nicht hält."
  },
  {
    q: "Was kostet Gartenpflege im Monat?",
    a: "Gartenpflege wird nicht pro Monat, sondern pro Einsatz kalkuliert. Ein regulärer Einsatz für einen mittleren Hausgarten liegt meist im niedrigen dreistelligen Bereich; über die Saison ergibt sich daraus ein Jahresbetrag, den wir auf Wunsch in gleiche monatliche Raten aufteilen."
  },
  {
    q: "Warum ist der erste Pflegeeinsatz teurer?",
    a: "Weil dort der Rückstand aufgeholt wird: mehr Schnittgut, mehr Entsorgung, mehr Zeit. Ab dem zweiten Termin ist die Fläche auf Stand und der Preis fällt auf das reguläre Niveau."
  },
  {
    q: "Gibt es ein Mindestprojektvolumen?",
    a: `Wir setzen kein starres Minimum, unterhalb von rund ${new Intl.NumberFormat("de-DE").format(galabau.estimator.minProjectEur)} € lohnt sich ein eigener Maschineneinsatz aber selten. Kleinere Arbeiten bündeln wir deshalb gern mit anderen Terminen in Ihrer Nähe.`
  },
  {
    q: "Kostet das Aufmaß vor Ort etwas?",
    a: "Der erste Termin zur Aufnahme und das darauf aufbauende Angebot sind kostenfrei. Eine ausgearbeitete Planung mit Varianten stimmen wir vorher separat ab."
  }
];

export default async function KostenPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tabelle = preisTabelle();
  // Wer von einer Leistungsseite oder aus dem Assistenten kommt, hat die
  // Leistung längst gewählt — der Rechner startet dann darauf, nicht auf der
  // ersten Kachel.
  const handoff = parseHandoff(await searchParams);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a }
    }))
  };

  return (
    // Die Anfrage-Buttons in Seitenleiste und Abschluss-CTA nehmen mit, was
    // gerade im Rechner steht — Leistung, Menge, Material, Zugang, Gelände.
    <HandoffProvider initial={handoff}>
      <main style={{ overflowX: "clip" }} className="bg-bone">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <Navbar />

        <section className="bg-ink pt-40 pb-16 md:pt-52 md:pb-24">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/60">
              <span className="inline-block h-[0.4rem] w-[0.4rem] rounded-full bg-erde-400" />
              <span>Kostenrechner</span>
            </div>
            <h1 className="mt-6 max-w-4xl font-display text-[36px] leading-[1.0] tracking-tight text-bone sm:text-[46px] md:text-[60px]">
              Finden Sie heraus, was Ihr Projekt kosten könnte<span className="text-laub-300">.</span>
            </h1>
            <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-bone/80 md:text-[16px]">
              Kein Kontaktformular, keine Anmeldung. Wählen Sie die Leistung, tragen Sie eine grobe Größe ein und Sie
              sehen sofort eine Spanne — aufgeschlüsselt nach Positionen, damit nachvollziehbar bleibt, wofür das Geld
              eigentlich draufgeht.
            </p>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-x-10 gap-y-10 px-6 md:px-10">
            <div className="col-span-12 lg:col-span-8">
              <Kostenrechner initial={handoff} />
            </div>
            <aside className="col-span-12 lg:col-span-4">
              <div className="rounded-4xl border border-ink/10 bg-white p-7">
                <span className="field-label">Und dann?</span>
                <p className="text-[14px] leading-relaxed text-ink/70">
                  Wenn die Größenordnung passt, ist der nächste Schritt die strukturierte Anfrage. Dort fragen wir nur
                  noch das ab, was zu Ihrer Leistung gehört — bei Pflege zum Beispiel keine Bauplanung.
                </p>
                <AnfrageLink className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-laub-500 px-6 py-3.5 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600">
                  Projekt anfragen
                  <span>&rarr;</span>
                </AnfrageLink>
                <div className="mt-7 border-t border-ink/10 pt-6">
                  <span className="field-label">Lieber direkt sprechen?</span>
                  <a
                    href={company.contact.phoneLink || "#"}
                    className="block font-display text-[24px] tracking-tight text-ink hover:text-laub-600"
                  >
                    {company.contact.phone}
                  </a>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink/60">
                    {company.officeHours.map((entry) => `${entry.day}: ${entry.hours}`).join(" · ")}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Preistabelle */}
        <section className="bg-creme py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Typische Spannen</span>
            </div>
            <h2 className="mt-6 max-w-3xl font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[36px]">
              Was Projekte in {galabau.serviceArea.centerCity} und der Vorderpfalz üblicherweise kosten
              <span className="text-erde-500">.</span>
            </h2>
            <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-ink/70">
              Die Werte stammen aus demselben Modell wie der Rechner oben und gelten für gut erreichbare, ebene Flächen
              in mittlerer Ausführung. Rückbau, Hanglage und enger Zugang kommen jeweils obendrauf.
            </p>

            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink/15">
                    <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
                      Leistung
                    </th>
                    <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
                      Beispielgröße
                    </th>
                    <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
                      Preis je Einheit
                    </th>
                    <th className="pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelle.map((zeile) => (
                    <tr key={zeile.key} className="border-b border-ink/10">
                      <td className="py-4 pr-4">
                        <a
                          href={`/leistungen/${zeile.slug}`}
                          className="font-display text-[18px] tracking-tight text-ink hover:text-laub-600"
                        >
                          {zeile.label}
                        </a>
                      </td>
                      <td className="py-4 pr-4 text-[13px] text-ink/65">{zeile.beispiel}</td>
                      <td className="py-4 pr-4 font-mono text-[12px] text-ink/75">{zeile.proEinheit}</td>
                      <td className="py-4 font-mono text-[13px] text-ink">{zeile.gesamt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Preistreiber */}
        <section className="bg-bone py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="marker" />
              <span>Was den Preis wirklich treibt</span>
            </div>
            <h2 className="mt-6 max-w-3xl font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[36px]">
              Sechs Faktoren, die eine Zahl kippen lassen<span className="text-erde-500">.</span>
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PREISTREIBER.map((eintrag, index) => (
                <li key={eintrag.titel} className="rounded-4xl border border-ink/10 bg-white p-7">
                  <span className="font-mono text-[12px] tracking-[0.2em] text-erde-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-[19px] tracking-tight text-ink">{eintrag.titel}</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink/65">{eintrag.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-creme py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="grid grid-cols-12 gap-x-10 gap-y-10">
              <div className="col-span-12 lg:col-span-4">
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
                  <span className="marker" />
                  <span>Häufige Fragen zu Preisen</span>
                </div>
                <h2 className="mt-6 font-display text-[26px] leading-[1.1] tracking-tight text-ink md:text-[34px]">
                  Ehrlich beantwortet<span className="text-erde-500">.</span>
                </h2>
              </div>
              <div className="col-span-12 lg:col-span-8">
                <dl className="space-y-8">
                  {FAQ.map((entry) => (
                    <div key={entry.q} className="border-b border-ink/10 pb-8">
                      <dt className="font-display text-[19px] tracking-tight text-ink md:text-[22px]">{entry.q}</dt>
                      <dd className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-ink/70">{entry.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-laub-700 py-20 md:py-24">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center md:px-10">
            <div>
              <h2 className="font-display text-[26px] leading-[1.1] tracking-tight text-bone md:text-[34px]">
                Größenordnung passt?
              </h2>
              <p className="mt-3 max-w-[48ch] text-[14px] leading-relaxed text-bone/75">
                Dann sammeln wir im Projekt-Assistenten alles ein, was wir für eine belastbare Antwort brauchen —
                zugeschnitten auf Ihre Leistung.
              </p>
            </div>
            <AnfrageLink className="inline-flex items-center gap-3 rounded-full bg-bone px-8 py-4 text-[14px] font-medium text-laub-800 transition-colors hover:bg-creme">
              Projekt anfragen
              <span>&rarr;</span>
            </AnfrageLink>
          </div>
        </section>

        <Footer />
        <WhatsappFloat />
      </main>
    </HandoffProvider>
  );
}
