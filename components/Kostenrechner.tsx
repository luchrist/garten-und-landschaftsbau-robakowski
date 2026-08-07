"use client";

import { useMemo, useState } from "react";

import { galabau } from "@/lib/galabau";
import {
  BAU_MODELLE,
  berechneBau,
  berechnePflege,
  findBauModell,
  formatEur,
  formatSpanne,
  HANG_OPTIONEN,
  PFLEGE_LEISTUNGEN,
  TURNUS_OPTIONEN,
  ZUGANG_OPTIONEN,
  ZUSTAND_OPTIONEN,
  type Bestandslage,
  type Hangstufe,
  type Kostenposition,
  type Pflegezustand,
  type Turnus,
  type Zugang
} from "@/lib/kalkulator";

/**
 * Kostenrechner als eigenständiges Widget.
 *
 * Bewusst getrennt vom Projekt-Assistenten: Wer anfragt, will nicht rechnen,
 * und wer rechnet, will noch nicht seine Telefonnummer hinterlassen. Der
 * Rechner darf deshalb ausführlich fragen (Material, Zugang, Gelände,
 * Zusatzleistungen) und zeigt im Gegenzug eine aufgeschlüsselte Kalkulation
 * statt einer nackten Spanne.
 *
 * Einsetzbar auf /kosten, als iframe-Widget und als kompakte Variante in
 * Seitenleisten.
 */

type Props = {
  /** Leistung vorauswählen, z.B. auf einer Leistungsseite. */
  serviceKey?: string;
  /** Kompakte Darstellung ohne Positionsaufschlüsselung. */
  compact?: boolean;
};

const PFLEGE_KEY = "gartenpflege";

function PositionListe({ positionen }: { positionen: Kostenposition[] }) {
  return (
    <ul className="mt-4 divide-y divide-ink/8 border-t border-ink/8">
      {positionen.map((position) => (
        <li key={position.id} className="flex items-baseline justify-between gap-4 py-2.5">
          <span className="text-[13px] leading-snug text-ink/70">
            {position.label}
            {position.note ? <span className="block text-[12px] text-ink/45">{position.note}</span> : null}
          </span>
          <span className="shrink-0 font-mono text-[12px] tracking-tight text-ink/80">
            {formatEur(position.low)} – {formatEur(position.high)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Kostenrechner({ serviceKey: initialServiceKey = "", compact = false }: Props) {
  const rechenbareServices = useMemo(
    () => galabau.services.filter((service) => findBauModell(service.key) || service.key === PFLEGE_KEY),
    []
  );

  const [serviceKey, setServiceKey] = useState(() =>
    rechenbareServices.some((service) => service.key === initialServiceKey)
      ? initialServiceKey
      : rechenbareServices[0]?.key ?? ""
  );

  // Bau
  const [menge, setMenge] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [bestand, setBestand] = useState<Bestandslage>("frei");
  const [zugang, setZugang] = useState<Zugang>("gut");
  const [hang, setHang] = useState<Hangstufe>("eben");
  const [extras, setExtras] = useState<string[]>([]);

  // Pflege
  const [pflegeLeistungen, setPflegeLeistungen] = useState<string[]>(["rasen"]);
  const [rasenQm, setRasenQm] = useState("");
  const [beetQm, setBeetQm] = useState("");
  const [heckeLfm, setHeckeLfm] = useState("");
  const [heckeSchnitte, setHeckeSchnitte] = useState(1);
  const [zustand, setZustand] = useState<Pflegezustand>("gepflegt");
  const [turnus, setTurnus] = useState<Turnus>("zweiwoechentlich");
  const [entsorgung, setEntsorgung] = useState(true);

  const istPflege = serviceKey === PFLEGE_KEY;
  const modell = findBauModell(serviceKey);
  const service = galabau.services.find((entry) => entry.key === serviceKey);

  // Beim Leistungswechsel gelten die alten Varianten- und Extra-IDs nicht mehr.
  function waehleLeistung(key: string) {
    setServiceKey(key);
    setVarianteId("");
    setExtras([]);
    setMenge("");
    setBestand("frei");
  }

  const aktiveVariante = useMemo(() => {
    if (!modell) return null;
    return modell.varianten.find((variante) => variante.id === varianteId) ?? modell.varianten[0];
  }, [modell, varianteId]);

  const bauErgebnis = useMemo(() => {
    if (!modell || !aktiveVariante) return null;
    const wert = Number(menge);
    if (!(wert > 0)) return null;
    return berechneBau({
      serviceKey: modell.key,
      menge: wert,
      varianteId: aktiveVariante.id,
      bestand,
      zugang,
      hang,
      extras
    });
  }, [modell, aktiveVariante, menge, bestand, zugang, hang, extras]);

  const pflegeErgebnis = useMemo(() => {
    if (!istPflege) return null;
    if (!pflegeLeistungen.length) return null;
    return berechnePflege({
      leistungen: pflegeLeistungen,
      rasenQm: Number(rasenQm) || undefined,
      beetQm: Number(beetQm) || undefined,
      heckeLfm: Number(heckeLfm) || undefined,
      heckeSchnitteProJahr: heckeSchnitte,
      zustand,
      turnus,
      entsorgung
    });
  }, [istPflege, pflegeLeistungen, rasenQm, beetQm, heckeLfm, heckeSchnitte, zustand, turnus, entsorgung]);

  function toggleExtra(id: string) {
    setExtras((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function togglePflegeLeistung(id: string) {
    setPflegeLeistungen((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  }

  const anfrageHref = useMemo(() => {
    const params = new URLSearchParams({ leistung: serviceKey });
    if (istPflege) {
      if (Number(rasenQm) > 0) params.set("qm", rasenQm);
    } else if (Number(menge) > 0) {
      params.set(modell?.unit === "lfm" ? "lfm" : "qm", menge);
    }
    return `/projekt-anfragen?${params.toString()}`;
  }, [serviceKey, istPflege, rasenQm, menge, modell]);

  const zeigtFlaechenfelder = pflegeLeistungen.some((id) =>
    ["rasen", "beet", "hecke", "vertikutieren"].includes(id)
  );

  return (
    <div className="rounded-4xl border border-ink/10 bg-white p-6 shadow-[0_20px_60px_rgba(20,24,26,0.06)] md:p-9">
      {/* Leistung */}
      <div>
        <span className="field-label">Welche Leistung?</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {rechenbareServices.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="choice"
              data-selected={serviceKey === entry.key}
              onClick={() => waehleLeistung(entry.key)}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  serviceKey === entry.key ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
                }`}
              >
                {serviceKey === entry.key ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
              </span>
              <span>{entry.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------- Bau ------------------------- */}
      {modell && !istPflege ? (
        <>
          <div className="mt-7">
            <label htmlFor="rechner-menge" className="field-label">
              {modell.mengeLabel} in {modell.unitLabel}
            </label>
            <input
              id="rechner-menge"
              inputMode="numeric"
              className="field-input"
              placeholder={modell.placeholder}
              value={menge}
              onChange={(event) => setMenge(event.target.value.replace(/[^\d]/g, ""))}
            />
            <p className="mt-2 text-[12px] leading-relaxed text-ink/50">{modell.mengeHint}</p>
          </div>

          <div className="mt-7">
            <span className="field-label">{modell.variantenLabel}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {modell.varianten.map((variante) => (
                <button
                  key={variante.id}
                  type="button"
                  className="choice items-start"
                  data-selected={aktiveVariante?.id === variante.id}
                  onClick={() => setVarianteId(variante.id)}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      aktiveVariante?.id === variante.id ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
                    }`}
                  >
                    {aktiveVariante?.id === variante.id ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
                  </span>
                  <span>
                    <span className="block font-medium">{variante.label}</span>
                    <span className="block text-[13px] text-ink/55">{variante.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <span className="field-label">{modell.rueckbau.label}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { id: "frei" as Bestandslage, label: modell.rueckbau.freiLabel },
                  { id: "gruen-rueckbau" as Bestandslage, label: modell.rueckbau.gruen.label },
                  { id: "belag-rueckbau" as Bestandslage, label: modell.rueckbau.belag.label }
                ]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  data-selected={bestand === option.id}
                  onClick={() => setBestand(option.id)}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      bestand === option.id ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
                    }`}
                  >
                    {bestand === option.id ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="field-label">Zugang</span>
              <select
                className="field-input"
                value={zugang}
                onChange={(event) => setZugang(event.target.value as Zugang)}
                aria-label="Zugang zur Baustelle"
              >
                {ZUGANG_OPTIONEN.filter((option) => option.id !== "unklar").map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} – {option.hint}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="field-label">Gelände</span>
              <select
                className="field-input"
                value={hang}
                onChange={(event) => setHang(event.target.value as Hangstufe)}
                aria-label="Gelände"
              >
                {HANG_OPTIONEN.filter((option) => option.id !== "unklar").map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} – {option.hint}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {modell.extras.length ? (
            <div className="mt-7">
              <span className="field-label">Zusatzleistungen (optional)</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {modell.extras.map((extra) => (
                  <button
                    key={extra.id}
                    type="button"
                    className="choice items-start"
                    data-selected={extras.includes(extra.id)}
                    onClick={() => toggleExtra(extra.id)}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
                        extras.includes(extra.id) ? "border-laub-500 bg-laub-500" : "border border-ink/25 bg-white"
                      }`}
                    >
                      {extras.includes(extra.id) ? <span className="text-[12px] leading-none text-bone">✓</span> : null}
                    </span>
                    <span>
                      <span className="block">{extra.label}</span>
                      {extra.hint ? <span className="block text-[13px] text-ink/55">{extra.hint}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ------------------------- Pflege ------------------------- */}
      {istPflege ? (
        <>
          <div className="mt-7">
            <span className="field-label">Was sollen wir übernehmen?</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {PFLEGE_LEISTUNGEN.map((leistung) => (
                <button
                  key={leistung.id}
                  type="button"
                  className="choice"
                  data-selected={pflegeLeistungen.includes(leistung.id)}
                  onClick={() => togglePflegeLeistung(leistung.id)}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
                      pflegeLeistungen.includes(leistung.id)
                        ? "border-laub-500 bg-laub-500"
                        : "border border-ink/25 bg-white"
                    }`}
                  >
                    {pflegeLeistungen.includes(leistung.id) ? (
                      <span className="text-[12px] leading-none text-bone">✓</span>
                    ) : null}
                  </span>
                  <span>{leistung.label}</span>
                </button>
              ))}
            </div>
          </div>

          {zeigtFlaechenfelder ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {pflegeLeistungen.includes("rasen") || pflegeLeistungen.includes("vertikutieren") ? (
                <div>
                  <label htmlFor="rechner-rasen" className="field-label">
                    Rasen (m²)
                  </label>
                  <input
                    id="rechner-rasen"
                    inputMode="numeric"
                    className="field-input"
                    placeholder="250"
                    value={rasenQm}
                    onChange={(event) => setRasenQm(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              ) : null}
              {pflegeLeistungen.includes("hecke") ? (
                <div>
                  <label htmlFor="rechner-hecke" className="field-label">
                    Hecke (lfm)
                  </label>
                  <input
                    id="rechner-hecke"
                    inputMode="numeric"
                    className="field-input"
                    placeholder="30"
                    value={heckeLfm}
                    onChange={(event) => setHeckeLfm(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              ) : null}
              {pflegeLeistungen.includes("beet") ? (
                <div>
                  <label htmlFor="rechner-beet" className="field-label">
                    Beete (m²)
                  </label>
                  <input
                    id="rechner-beet"
                    inputMode="numeric"
                    className="field-input"
                    placeholder="40"
                    value={beetQm}
                    onChange={(event) => setBeetQm(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {pflegeLeistungen.includes("hecke") ? (
            <div className="mt-5">
              <span className="field-label">Heckenschnitte pro Jahr</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[1, 2].map((anzahl) => (
                  <button
                    key={anzahl}
                    type="button"
                    className="choice"
                    data-selected={heckeSchnitte === anzahl}
                    onClick={() => setHeckeSchnitte(anzahl)}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        heckeSchnitte === anzahl ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
                      }`}
                    >
                      {heckeSchnitte === anzahl ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
                    </span>
                    <span>{anzahl === 1 ? "Einmal im Jahr" : "Zweimal im Jahr"}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="field-label">Zustand heute</span>
              <select
                className="field-input"
                value={zustand}
                onChange={(event) => setZustand(event.target.value as Pflegezustand)}
                aria-label="Zustand des Gartens"
              >
                {ZUSTAND_OPTIONEN.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} – {option.hint}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="field-label">Turnus</span>
              <select
                className="field-input"
                value={turnus}
                onChange={(event) => setTurnus(event.target.value as Turnus)}
                aria-label="Turnus"
              >
                {TURNUS_OPTIONEN.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              className="choice"
              data-selected={entsorgung}
              onClick={() => setEntsorgung((current) => !current)}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
                  entsorgung ? "border-laub-500 bg-laub-500" : "border border-ink/25 bg-white"
                }`}
              >
                {entsorgung ? <span className="text-[12px] leading-none text-bone">✓</span> : null}
              </span>
              <span>Schnittgut abfahren und entsorgen</span>
            </button>
          </div>
        </>
      ) : null}

      {/* ------------------------- Ergebnis ------------------------- */}
      <div className="mt-8 border-t border-ink/10 pt-8">
        {bauErgebnis ? (
          <div className="rounded-3xl border border-erde-300 bg-erde-50 p-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-erde-700">
              Orientierung für {menge} {modell?.unitLabel}
            </span>
            <p className="mt-2 font-display text-[30px] leading-none tracking-tight text-ink md:text-[38px]">
              {formatSpanne(bauErgebnis.low, bauErgebnis.high)}
            </p>
            <p className="mt-2 font-mono text-[12px] tracking-tight text-ink/60">
              entspricht {formatEur(bauErgebnis.proEinheitLow)} – {formatEur(bauErgebnis.proEinheitHigh)} pro{" "}
              {bauErgebnis.unitLabel}
            </p>
            {!compact ? <PositionListe positionen={bauErgebnis.positionen} /> : null}
            {!compact ? (
              <ul className="mt-5 space-y-2">
                {bauErgebnis.hinweise.map((hinweis) => (
                  <li key={hinweis} className="flex items-start gap-3 text-[13px] leading-relaxed text-ink/65">
                    <span className="mt-[7px] block h-[5px] w-[5px] shrink-0 rotate-45 bg-erde-500" />
                    <span>{hinweis}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : pflegeErgebnis ? (
          <div className="rounded-3xl border border-laub-300 bg-laub-50 p-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-laub-700">
              {pflegeErgebnis.turnusLabel}
              {pflegeErgebnis.einsaetzeProJahr > 1 ? ` · rund ${pflegeErgebnis.einsaetzeProJahr} Einsätze im Jahr` : ""}
            </span>
            <div className="mt-3 grid gap-5 sm:grid-cols-2">
              {pflegeErgebnis.einsaetzeProJahr > 0 ? (
                <div>
                  <span className="block text-[12px] uppercase tracking-[0.14em] text-ink/50">Je Einsatz</span>
                  <p className="mt-1 font-display text-[26px] leading-none tracking-tight text-ink md:text-[30px]">
                    {formatSpanne(pflegeErgebnis.regelEinsatz.low, pflegeErgebnis.regelEinsatz.high)}
                  </p>
                </div>
              ) : null}
              <div>
                <span className="block text-[12px] uppercase tracking-[0.14em] text-ink/50">
                  {pflegeErgebnis.einsaetzeProJahr > 1 ? "Im Jahr insgesamt" : "Gesamt"}
                </span>
                <p className="mt-1 font-display text-[26px] leading-none tracking-tight text-ink md:text-[30px]">
                  {formatSpanne(pflegeErgebnis.jahrLow, pflegeErgebnis.jahrHigh)}
                </p>
              </div>
            </div>
            {!compact ? <PositionListe positionen={pflegeErgebnis.positionen} /> : null}
            {!compact ? (
              <ul className="mt-5 space-y-2">
                {pflegeErgebnis.hinweise.map((hinweis) => (
                  <li key={hinweis} className="flex items-start gap-3 text-[13px] leading-relaxed text-ink/65">
                    <span className="mt-[7px] block h-[5px] w-[5px] shrink-0 rotate-45 bg-laub-500" />
                    <span>{hinweis}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-bone px-6 py-8 text-center">
            <p className="text-[14px] leading-relaxed text-ink/60">
              {istPflege
                ? "Wählen Sie mindestens eine Leistung und tragen Sie grobe Größen ein — dann erscheint hier der Preis je Einsatz und pro Jahr."
                : `Tragen Sie oben die ${modell?.unitLabel === "lfm" ? "Länge" : "Fläche"} ein, dann erscheint hier die Kalkulation.`}
            </p>
          </div>
        )}

        <p className="mt-5 text-[12px] leading-relaxed text-ink/55">{galabau.estimator.disclaimer}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={anfrageHref}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-laub-500 px-7 py-3.5 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600"
          >
            {service?.cta ?? "Projekt anfragen"}
            <span>&rarr;</span>
          </a>
          <a
            href={galabau.contact.phoneLink || "#"}
            className="inline-flex items-center justify-center rounded-full border border-ink/20 px-7 py-3.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
          >
            {galabau.contact.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
