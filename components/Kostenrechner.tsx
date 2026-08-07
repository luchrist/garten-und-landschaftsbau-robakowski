"use client";

import { useEffect, useMemo, useState } from "react";

import { useHandoffPublisher } from "@/components/HandoffLinks";
import { galabau } from "@/lib/galabau";
import { buildAnfrageHref, presetFuerLeistung, type Handoff } from "@/lib/handoff";
import {
  BAU_MODELLE,
  berechneBau,
  berechnePflege,
  findBauModell,
  formatEur,
  formatSpanne,
  HANG_OPTIONEN,
  HECKE_SCHNITT_OPTIONEN,
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
  /**
   * Vorbelegung aus der Adresszeile oder von der aufrufenden Seite — Leistung,
   * Menge, Material, Zugang, Gelände, Pflegeumfang.
   */
  initial?: Handoff;
  /** Kompakte Darstellung ohne Positionsaufschlüsselung. */
  compact?: boolean;
};

const PFLEGE_KEY = "gartenpflege";

/**
 * Aus der Übergabe die Startwerte der Felder ableiten. „unklar“ ist im Rechner
 * keine wählbare Option — dort muss eine Annahme her, sonst ließe sich nichts
 * rechnen.
 */
function startwerte(initial: Handoff, serviceKey: string) {
  const modell = findBauModell(serviceKey);
  const istPflege = serviceKey === PFLEGE_KEY;
  return {
    menge: (modell?.unit === "lfm" ? initial.lfm : initial.qm) ?? "",
    varianteId: initial.material ?? "",
    bestand: initial.bestand && initial.bestand !== "unklar" ? initial.bestand : ("frei" as Bestandslage),
    zugang: initial.zugang && initial.zugang !== "unklar" ? initial.zugang : ("gut" as Zugang),
    hang: initial.hang && initial.hang !== "unklar" ? initial.hang : ("eben" as Hangstufe),
    extras: initial.extras ?? [],
    pflegeLeistungen: initial.pflege?.length ? [...initial.pflege] : ["rasen"],
    // Eine Fläche, die als allgemeines qm ankommt, ist bei Gartenpflege die Rasenfläche.
    rasenQm: initial.rasen ?? (istPflege ? initial.qm ?? "" : ""),
    beetQm: initial.beet ?? "",
    heckeLfm: initial.hecke ?? "",
    heckeSchnitte: initial.schnitte ?? 1,
    zustand: initial.zustand ?? ("gepflegt" as Pflegezustand),
    turnus: initial.turnus ?? ("zweiwoechentlich" as Turnus),
    entsorgung: initial.entsorgung ?? true
  };
}

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

export function Kostenrechner({ initial = {}, compact = false }: Props) {
  const rechenbareServices = useMemo(
    () => galabau.services.filter((service) => findBauModell(service.key) || service.key === PFLEGE_KEY),
    []
  );

  const startServiceKey = rechenbareServices.some((service) => service.key === initial.leistung)
    ? (initial.leistung as string)
    : rechenbareServices[0]?.key ?? "";
  const start = startwerte(initial, startServiceKey);

  const [serviceKey, setServiceKey] = useState(startServiceKey);

  // Bau
  const [menge, setMenge] = useState(start.menge);
  const [varianteId, setVarianteId] = useState(start.varianteId);
  const [bestand, setBestand] = useState<Bestandslage>(start.bestand);
  const [zugang, setZugang] = useState<Zugang>(start.zugang);
  const [hang, setHang] = useState<Hangstufe>(start.hang);
  const [extras, setExtras] = useState<string[]>(start.extras);

  // Pflege
  const [pflegeLeistungen, setPflegeLeistungen] = useState<string[]>(start.pflegeLeistungen);
  const [rasenQm, setRasenQm] = useState(start.rasenQm);
  const [beetQm, setBeetQm] = useState(start.beetQm);
  const [heckeLfm, setHeckeLfm] = useState(start.heckeLfm);
  const [heckeSchnitte, setHeckeSchnitte] = useState(start.heckeSchnitte);
  const [zustand, setZustand] = useState<Pflegezustand>(start.zustand);
  const [turnus, setTurnus] = useState<Turnus>(start.turnus);
  const [entsorgung, setEntsorgung] = useState(start.entsorgung);

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

  /**
   * Alles, was hier eingetragen wurde, wandert mit in den Projekt-Assistenten.
   * Wer Material, Zugang und Gelände schon einmal beantwortet hat, soll die
   * Fragen im Formular nicht ein zweites Mal sehen.
   *
   * Material, Zugang, Gelände, Zustand und Turnus gehen aber erst mit, sobald
   * eine Größe eingetragen ist. Ohne Größe hat der Besucher den Rechner nicht
   * wirklich benutzt — dann wären es die Vorgaben des Rechners und keine
   * Antworten, und im Assistenten stünde eine ungeprüfte Behauptung.
   */
  const handoff = useMemo<Handoff>(() => {
    const next: Handoff = { ...presetFuerLeistung(serviceKey), leistung: serviceKey };

    if (istPflege) {
      next.pflege = pflegeLeistungen;
      const flaechen = [rasenQm, beetQm, heckeLfm].some((wert) => Number(wert) > 0);
      if (Number(rasenQm) > 0) {
        next.rasen = rasenQm;
        next.qm = rasenQm;
      }
      if (Number(beetQm) > 0) next.beet = beetQm;
      if (Number(heckeLfm) > 0) {
        next.hecke = heckeLfm;
        next.schnitte = heckeSchnitte;
      }
      if (flaechen) {
        next.zustand = zustand;
        next.turnus = turnus;
        next.entsorgung = entsorgung;
      }
      return next;
    }

    if (modell && Number(menge) > 0) {
      next[modell.unit === "lfm" ? "lfm" : "qm"] = menge;
      if (aktiveVariante) next.material = aktiveVariante.id;
      next.bestand = bestand;
      next.zugang = zugang;
      next.hang = hang;
      if (extras.length) next.extras = extras;
    }
    return next;
  }, [
    serviceKey,
    istPflege,
    pflegeLeistungen,
    rasenQm,
    beetQm,
    heckeLfm,
    heckeSchnitte,
    zustand,
    turnus,
    entsorgung,
    modell,
    menge,
    aktiveVariante,
    bestand,
    zugang,
    hang,
    extras
  ]);

  const anfrageHref = buildAnfrageHref(handoff);

  // Damit die Buttons im Seitenlayout (z.B. „Projekt anfragen“ in der
  // Seitenleiste von /kosten) denselben Stand mitnehmen wie der Button hier.
  const publishHandoff = useHandoffPublisher();
  useEffect(() => {
    publishHandoff(handoff);
  }, [handoff, publishHandoff]);

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
                {HECKE_SCHNITT_OPTIONEN.map((option) => (
                  <button
                    key={option.anzahl}
                    type="button"
                    className="choice"
                    data-selected={heckeSchnitte === option.anzahl}
                    onClick={() => setHeckeSchnitte(option.anzahl)}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        heckeSchnitte === option.anzahl ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
                      }`}
                    >
                      {heckeSchnitte === option.anzahl ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
                    </span>
                    <span>{option.label}</span>
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
