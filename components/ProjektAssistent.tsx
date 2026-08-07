"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useHandoffPublisher } from "@/components/HandoffLinks";
import { galabau } from "@/lib/galabau";
import { buildKostenHref, type Handoff } from "@/lib/handoff";
import {
  bestandFrage,
  bestandOptionen,
  berechnePflege,
  berechneProjekt,
  budgetBandsFor,
  findBauModell,
  HANG_OPTIONEN,
  isHybridService,
  isPflegeService,
  matchBudget,
  mengeFrage,
  PFLEGE_LEISTUNGEN,
  TURNUS_OPTIONEN,
  ZUGANG_OPTIONEN,
  ZUSTAND_OPTIONEN,
  type Bestandslage,
  type BudgetMatch,
  type Hangstufe,
  type Pflegezustand,
  type ProjectSize,
  type Turnus,
  type Zugang
} from "@/lib/kalkulator";
import {
  scoreLead,
  type Anfragemodus,
  type Kundentyp,
  type Planungsstand,
  type ProjektAnfragePayload,
  type Zeitrahmen
} from "@/lib/lead-score";
import { checkServiceArea, type ServiceAreaResult } from "@/lib/service-area";

/**
 * Mehrstufiger Projekt-Assistent, verzweigt nach Projektart.
 *
 * Eine Baumaßnahme und ein Pflegeauftrag haben fast keine gemeinsamen Fragen.
 * Wer Gartenpflege anfragt, wird deshalb nicht mehr nach Neubau oder Bestand,
 * nach Hanglage, nach Planungsstand oder nach einem Budgetrahmen in
 * Zehntausenderschritten gefragt — sondern nach Flächen, Zustand, Turnus und
 * Leistungen. Wer beides anfragt, bekommt beide Blöcke.
 *
 * Der Budgetschritt im Bau-Funnel zeigt bewusst keine Rechnung mehr. Die
 * ausführliche Kalkulation lebt im Kostenrechner (/kosten). Der Assistent
 * fragt nur noch den Rahmen ab und wie belastbar er ist. Intern wird die
 * Kalkulation trotzdem gerechnet, für Priorisierung und Budget-Abgleich im
 * Büro.
 *
 * Die Budgetstufen kommen aus dieser internen Kalkulation (`budgetBandsFor`):
 * eine Terrasse über 12 m² wird in Tausenderschritten abgefragt, eine
 * Gartenneugestaltung über 900 m² in Fünfzigtausendern. Solange keine Menge
 * eingetragen ist, gilt eine Leiter je Leistung. Sonst landet jede kleine
 * Anfrage in der untersten Stufe und die Antwort sagt nichts.
 */

type PhotoDraft = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

type GewerbeArt = "bau" | "pflege" | "beides" | "";
type BudgetFestigkeit = "fest" | "spielraum" | "unklar" | "";

type AssistantState = {
  serviceKeys: string[];
  gewerbeArt: GewerbeArt;
  sonstiges: string;
  plz: string;
  ort: string;
  // Bau
  qm: string;
  lfm: string;
  bestand: Bestandslage;
  zugang: Zugang;
  hang: Hangstufe;
  planungsstand: Planungsstand | "";
  skizzen: boolean;
  // Pflege
  pflegeLeistungen: string[];
  rasenQm: string;
  beetQm: string;
  heckeLfm: string;
  heckeSchnitte: number;
  zustand: Pflegezustand;
  turnus: Turnus | "";
  entsorgung: boolean;
  // Gemeinsam
  zeitrahmen: Zeitrahmen | "";
  fotos: PhotoDraft[];
  budgetBand: string;
  budgetFestigkeit: BudgetFestigkeit;
  name: string;
  telefon: string;
  email: string;
  kanal: "telefon" | "whatsapp" | "email";
  kundentyp: Kundentyp;
  nachricht: string;
  einwilligung: boolean;
};

const INITIAL_STATE: AssistantState = {
  serviceKeys: [],
  gewerbeArt: "",
  sonstiges: "",
  plz: "",
  ort: "",
  qm: "",
  lfm: "",
  bestand: "unklar",
  zugang: "unklar",
  hang: "unklar",
  planungsstand: "",
  skizzen: false,
  pflegeLeistungen: [],
  rasenQm: "",
  beetQm: "",
  heckeLfm: "",
  heckeSchnitte: 1,
  zustand: "gepflegt",
  turnus: "",
  entsorgung: true,
  zeitrahmen: "",
  fotos: [],
  budgetBand: "",
  budgetFestigkeit: "",
  name: "",
  telefon: "",
  email: "",
  kanal: "telefon",
  kundentyp: "privat",
  nachricht: "",
  einwilligung: false
};

type StepId =
  | "projektart"
  | "ort"
  | "umfang"
  | "pflege"
  | "planung"
  | "zeitrahmen"
  | "fotos"
  | "budget"
  | "kontakt";

const STEP_TITLES: Record<StepId, string> = {
  projektart: "Projektart",
  ort: "Ort",
  umfang: "Umfang",
  pflege: "Pflegeumfang",
  planung: "Planung",
  zeitrahmen: "Zeitrahmen",
  fotos: "Fotos",
  budget: "Budget",
  kontakt: "Kontakt"
};

const ZEITRAHMEN_BAU: Array<{ id: Zeitrahmen; label: string }> = [
  { id: "sofort", label: "So bald wie möglich" },
  { id: "1-3-monate", label: "In 1 bis 3 Monaten" },
  { id: "dieses-jahr", label: "Dieses Jahr" },
  { id: "orientierung", label: "Nur Orientierung" }
];

const ZEITRAHMEN_PFLEGE: Array<{ id: Zeitrahmen; label: string }> = [
  { id: "sofort", label: "So bald wie möglich" },
  { id: "1-3-monate", label: "In den nächsten Wochen" },
  { id: "dieses-jahr", label: "Diese Saison" },
  { id: "orientierung", label: "Nur eine Preisauskunft" }
];

const PLANUNG_OPTIONS: Array<{ id: Planungsstand; label: string; hint: string }> = [
  { id: "konkret", label: "Konkrete Planung", hint: "Ich weiß, was gebaut werden soll." },
  { id: "idee", label: "Grobe Idee", hint: "Richtung klar, Details offen." },
  { id: "beratung", label: "Beratung nötig", hint: "Ich möchte Vorschläge bekommen." }
];

const FESTIGKEIT_OPTIONS: Array<{ id: Exclude<BudgetFestigkeit, "">; label: string; hint: string }> = [
  { id: "fest", label: "Fester Rahmen", hint: "Darüber geht es nicht, bitte darauf planen." },
  { id: "spielraum", label: "Richtwert mit Spielraum", hint: "Wenn es sich lohnt, ginge auch mehr." },
  { id: "unklar", label: "Erst einmal wissen, was realistisch ist", hint: "Bitte offen sagen, was die Sache kostet." }
];

/**
 * Startzustand aus der Übergabe. Was auf der Leistungsseite oder im
 * Kostenrechner schon beantwortet wurde, steht hier bereits ausgefüllt —
 * ändern lässt es sich trotzdem, die Schritte werden nicht übersprungen.
 */
function ausHandoff(initial: Handoff): AssistantState {
  const key = galabau.services.some((service) => service.key === initial.leistung)
    ? (initial.leistung as string)
    : "";
  const pflegeService = key ? isPflegeService(key) : false;

  return {
    ...INITIAL_STATE,
    serviceKeys: key ? [key] : [],
    gewerbeArt: key && isHybridService(key) ? initial.art ?? "" : "",
    qm: initial.qm ?? "",
    lfm: initial.lfm ?? "",
    bestand: initial.bestand ?? "unklar",
    zugang: initial.zugang ?? "unklar",
    hang: initial.hang ?? "unklar",
    pflegeLeistungen: initial.pflege?.length ? [...initial.pflege] : pflegeService ? ["rasen"] : [],
    // Eine allgemein übergebene Fläche ist bei Pflege die Rasenfläche.
    rasenQm: initial.rasen ?? (pflegeService ? initial.qm ?? "" : ""),
    beetQm: initial.beet ?? "",
    heckeLfm: initial.hecke ?? "",
    heckeSchnitte: initial.schnitte ?? 1,
    zustand: initial.zustand ?? "gepflegt",
    turnus: initial.turnus ?? "",
    entsorgung: initial.entsorgung ?? true,
    kundentyp: initial.kundentyp ?? "privat"
  };
}

const PHOTO_MAX_EDGE = 1600;

/**
 * Uploads travel as JSON, so raw 8-MB camera photos would blow the request up
 * to tens of MB. Downscale to max 1600px JPEG client-side; the office needs
 * the photo to assess the site, not the original resolution.
 */
async function downscaleToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });

    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function ChoiceButton({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="choice items-start" data-selected={selected} onClick={onClick}>
      <span
        aria-hidden="true"
        className={`mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
        }`}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 first:mt-0">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

export function ProjektAssistent({
  variant = "page",
  initial = {}
}: {
  variant?: "page" | "widget";
  /** Vorauswahl aus dem Kostenrechner, einer Leistungsseite oder der Adresszeile. */
  initial?: Handoff;
}) {
  const [state, setState] = useState<AssistantState>(() => ausHandoff(initial));
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<AssistantState>) => {
    setState((current) => ({ ...current, ...partial }));
    setStepError("");
  };

  /* ---------------- Verzweigung ---------------- */

  const hatGewerbe = state.serviceKeys.includes("gewerbeflaechen");

  /**
   * Leistungen, die als Baumaßnahme abgefragt werden. Solange bei den
   * Gewerbeflächen noch nicht beantwortet ist, ob es um Bau oder Pflege geht,
   * gilt der Bau-Ablauf — sonst würde der Schrittzähler bei der Antwort
   * springen. Weiter kommt man ohne Antwort ohnehin nicht.
   */
  const bauKeys = useMemo(
    () =>
      state.serviceKeys.filter((key) => {
        if (isPflegeService(key)) return false;
        if (isHybridService(key)) return state.gewerbeArt !== "pflege";
        return true;
      }),
    [state.serviceKeys, state.gewerbeArt]
  );

  const hatPflege = useMemo(
    () =>
      state.serviceKeys.some((key) => {
        if (isPflegeService(key)) return true;
        if (isHybridService(key)) return state.gewerbeArt === "pflege" || state.gewerbeArt === "beides";
        return false;
      }),
    [state.serviceKeys, state.gewerbeArt]
  );

  // Ohne Leistungsauswahl (auch bei reinem "Sonstiges") gilt der Bau-Ablauf.
  // Er ist der längere von beiden, deshalb wird der Schrittzähler beim
  // Auswählen höchstens kürzer — und genau das erklärt der Hinweis unten.
  const hatBau = bauKeys.length > 0 || state.serviceKeys.length === 0;
  const modus: Anfragemodus = hatBau ? "bau" : "pflege";

  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ["projektart", "ort"];
    if (hatBau) list.push("umfang");
    if (hatPflege) list.push("pflege");
    if (hatBau) list.push("planung");
    list.push("zeitrahmen", "fotos");
    if (hatBau) list.push("budget");
    list.push("kontakt");
    return list;
  }, [hatBau, hatPflege]);

  // Wer die Projektart nachträglich wechselt, würde sonst hinter das Ende des
  // neuen, kürzeren Ablaufs rutschen.
  const step = Math.min(stepIndex, steps.length - 1);
  const stepId = steps[step];

  const areaResult: ServiceAreaResult | null = useMemo(
    () => (state.plz.trim().length === 5 ? checkServiceArea(state.plz) : null),
    [state.plz]
  );

  const needsQm = useMemo(() => bauKeys.some((key) => findBauModell(key)?.unit === "qm"), [bauKeys]);
  const needsLfm = useMemo(() => bauKeys.some((key) => findBauModell(key)?.unit === "lfm"), [bauKeys]);
  const zeigeQm = needsQm || (!needsQm && !needsLfm);

  const qmFrage = useMemo(() => mengeFrage(bauKeys, "qm"), [bauKeys]);
  const lfmFrage = useMemo(() => mengeFrage(bauKeys, "lfm"), [bauKeys]);
  const bestandOptions = useMemo(() => bestandOptionen(bauKeys), [bauKeys]);
  const bestandLabel = useMemo(() => bestandFrage(bauKeys), [bauKeys]);

  /* ---------------- Interne Kalkulation (nicht sichtbar) ---------------- */

  const bauKalkulation = useMemo(() => {
    if (!hatBau) return null;
    return berechneProjekt({
      serviceKeys: bauKeys,
      qm: Number(state.qm) > 0 ? Number(state.qm) : undefined,
      lfm: Number(state.lfm) > 0 ? Number(state.lfm) : undefined,
      bestand: state.bestand,
      zugang: state.zugang,
      hang: state.hang
    });
  }, [hatBau, bauKeys, state.qm, state.lfm, state.bestand, state.zugang, state.hang]);

  const pflegeKalkulation = useMemo(() => {
    if (!hatPflege || !state.turnus) return null;
    return berechnePflege({
      leistungen: state.pflegeLeistungen,
      rasenQm: Number(state.rasenQm) || undefined,
      beetQm: Number(state.beetQm) || undefined,
      heckeLfm: Number(state.heckeLfm) || undefined,
      heckeSchnitteProJahr: state.heckeSchnitte,
      zustand: state.zustand,
      turnus: state.turnus,
      entsorgung: state.entsorgung,
      gewerblich: state.kundentyp === "gewerblich"
    });
  }, [
    hatPflege,
    state.pflegeLeistungen,
    state.rasenQm,
    state.beetQm,
    state.heckeLfm,
    state.heckeSchnitte,
    state.zustand,
    state.turnus,
    state.entsorgung,
    state.kundentyp
  ]);

  const budgetBands = useMemo(() => budgetBandsFor(bauKeys, bauKalkulation), [bauKeys, bauKalkulation]);

  // Wer die Leistung nachträglich wechselt, hätte sonst eine Stufe ausgewählt,
  // die es auf der neuen Leiter nicht mehr gibt: sichtbar keine Auswahl, aber
  // eine ID im State, die die Validierung durchwinkt.
  useEffect(() => {
    if (state.budgetBand && !budgetBands.some((band) => band.id === state.budgetBand)) {
      setState((current) => ({ ...current, budgetBand: "", budgetFestigkeit: "" }));
    }
  }, [budgetBands, state.budgetBand]);

  const budgetMatch: BudgetMatch = useMemo(() => {
    if (!bauKalkulation || !state.budgetBand) return "unbekannt";
    return matchBudget(state.budgetBand, bauKalkulation, bauKeys);
  }, [bauKalkulation, state.budgetBand, bauKeys]);

  const projektGroesse: ProjectSize = bauKalkulation?.size ?? pflegeKalkulation?.size ?? "klein";

  /**
   * Wer mitten in der Anfrage doch erst rechnen will, soll den Rechner nicht
   * leer vorfinden. Der Rechner kennt nur eine Leistung, deshalb geht die erste
   * rechenbare Auswahl mit.
   */
  const kostenHandoff = useMemo<Handoff>(() => {
    const rechenbar = state.serviceKeys.find((key) => findBauModell(key) || isPflegeService(key));
    const next: Handoff = { kundentyp: state.kundentyp };
    if (rechenbar) next.leistung = rechenbar;
    if (state.gewerbeArt) next.art = state.gewerbeArt;
    if (state.qm) next.qm = state.qm;
    if (state.lfm) next.lfm = state.lfm;
    if (state.bestand !== "unklar") next.bestand = state.bestand;
    if (state.zugang !== "unklar") next.zugang = state.zugang;
    if (state.hang !== "unklar") next.hang = state.hang;
    if (state.pflegeLeistungen.length) next.pflege = state.pflegeLeistungen;
    if (state.rasenQm) next.rasen = state.rasenQm;
    if (state.beetQm) next.beet = state.beetQm;
    if (state.heckeLfm) {
      next.hecke = state.heckeLfm;
      next.schnitte = state.heckeSchnitte;
    }
    next.zustand = state.zustand;
    if (state.turnus) next.turnus = state.turnus;
    next.entsorgung = state.entsorgung;
    return next;
  }, [state]);

  const publishHandoff = useHandoffPublisher();
  useEffect(() => {
    publishHandoff(kostenHandoff);
  }, [kostenHandoff, publishHandoff]);

  /* ---------------- Interaktion ---------------- */

  function toggleService(key: string) {
    setState((current) => {
      const drin = current.serviceKeys.includes(key);
      const serviceKeys = drin
        ? current.serviceKeys.filter((existing) => existing !== key)
        : [...current.serviceKeys, key];
      return {
        ...current,
        serviceKeys,
        gewerbeArt: serviceKeys.includes("gewerbeflaechen") ? current.gewerbeArt : ""
      };
    });
    setStepError("");
  }

  function togglePflegeLeistung(id: string) {
    setState((current) => ({
      ...current,
      pflegeLeistungen: current.pflegeLeistungen.includes(id)
        ? current.pflegeLeistungen.filter((existing) => existing !== id)
        : [...current.pflegeLeistungen, id]
    }));
    setStepError("");
  }

  function validateStep(id: StepId): string {
    switch (id) {
      case "projektart":
        if (!state.serviceKeys.length && !state.sonstiges.trim()) {
          return "Bitte mindestens eine Projektart auswählen.";
        }
        if (hatGewerbe && !state.gewerbeArt) {
          return "Bitte angeben, ob es um den Bau der Außenanlage oder um die laufende Pflege geht.";
        }
        return "";
      case "ort":
        return state.plz.trim().length === 5 ? "" : "Bitte eine fünfstellige Postleitzahl eingeben.";
      case "pflege":
        if (!state.pflegeLeistungen.length) return "Bitte mindestens eine Pflegeleistung auswählen.";
        if (!state.turnus) return "Bitte angeben, wie oft wir kommen sollen.";
        return "";
      case "zeitrahmen":
        return state.zeitrahmen ? "" : "Bitte einen Zeitrahmen auswählen.";
      case "budget":
        return state.budgetBand ? "" : "Bitte einen Budgetrahmen auswählen (auch „Noch unklar“ ist eine Antwort).";
      case "kontakt": {
        if (!state.name.trim()) return "Bitte Ihren Namen eintragen.";
        if (!state.telefon.trim() && !state.email.trim()) {
          return "Bitte Telefonnummer oder E-Mail angeben, sonst können wir uns nicht melden.";
        }
        if (!state.einwilligung) return "Bitte der Kontaktaufnahme zustimmen.";
        return "";
      }
      default:
        return "";
    }
  }

  function goNext() {
    const error = validateStep(stepId);
    if (error) {
      setStepError(error);
      return;
    }
    setStepIndex(Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setStepError("");
    setStepIndex(Math.max(step - 1, 0));
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const maxFiles = galabau.assistant.photoUploadMaxFiles;
    const maxBytes = galabau.assistant.photoUploadMaxMb * 1024 * 1024;
    const accepted: PhotoDraft[] = [...state.fotos];

    for (const file of Array.from(fileList)) {
      if (accepted.length >= maxFiles) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > maxBytes) {
        setStepError(`„${file.name}“ ist größer als ${galabau.assistant.photoUploadMaxMb} MB und wurde übersprungen.`);
        continue;
      }
      try {
        const dataUrl = await downscaleToDataUrl(file);
        accepted.push({ name: file.name, size: file.size, type: "image/jpeg", dataUrl });
      } catch {
        setStepError(`„${file.name}“ konnte nicht gelesen werden und wurde übersprungen.`);
      }
    }

    patch({ fotos: accepted.slice(0, maxFiles) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const error = validateStep("kontakt");
    if (error) {
      setStepError(error);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const selectedLabels = galabau.services
      .filter((service) => state.serviceKeys.includes(service.key))
      .map((service) => {
        if (service.key === "gewerbeflaechen" && state.gewerbeArt) {
          const zusatz =
            state.gewerbeArt === "bau" ? "Neubau/Umbau" : state.gewerbeArt === "pflege" ? "Unterhaltspflege" : "Bau und Pflege";
          return `${service.label} (${zusatz})`;
        }
        return service.label;
      });
    if (state.sonstiges.trim()) selectedLabels.push(`Sonstiges: ${state.sonstiges.trim()}`);

    const score = scoreLead({
      modus,
      serviceArea: areaResult?.verdict ?? "unknown",
      servicesMatch: state.serviceKeys.length > 0,
      size: projektGroesse,
      budgetMatch,
      photoCount: state.fotos.length,
      zeitrahmen: state.zeitrahmen || undefined,
      planungsstand: hatBau ? state.planungsstand || undefined : undefined,
      turnus: state.turnus || undefined,
      kundentyp: state.kundentyp,
      // Wiederkehrendes Potenzial: laufende Pflege oder Bewässerungswartung.
      // Gewerbeflächen zählen nur mit, wenn tatsächlich Pflege gewünscht ist.
      wiederkehrend: hatPflege || state.serviceKeys.includes("bewaesserung")
    });

    const payload: ProjektAnfragePayload = {
      quelle: variant === "widget" ? "widget" : "website",
      stage: "neue_anfrage",
      modus,
      projektarten: selectedLabels,
      ort: { plz: state.plz.trim(), ort: state.ort.trim(), einsatzgebiet: areaResult?.verdict ?? "unknown" },
      zeitrahmen: state.zeitrahmen || "orientierung",
      fotos: state.fotos,
      kontakt: {
        name: state.name.trim(),
        telefon: state.telefon.trim(),
        email: state.email.trim(),
        kanal: state.kanal,
        kundentyp: state.kundentyp,
        nachricht: state.nachricht.trim(),
        einwilligung: state.einwilligung
      },
      score,
      eingegangenAm: new Date().toISOString()
    };

    if (hatBau) {
      payload.umfang = {
        qm: Number(state.qm) > 0 ? Number(state.qm) : undefined,
        lfm: Number(state.lfm) > 0 ? Number(state.lfm) : undefined,
        bestand: state.bestand,
        zugang: state.zugang,
        hang: state.hang
      };
      payload.planung = { stand: state.planungsstand || "idee", skizzen: state.skizzen };
      payload.budget = {
        band: state.budgetBand,
        // Die IDs hängen jetzt an der Leistung, im Büro liest sich das Label.
        bandLabel: budgetBands.find((band) => band.id === state.budgetBand)?.label ?? "",
        festigkeit: state.budgetFestigkeit,
        orientierung: bauKalkulation ? { low: bauKalkulation.low, high: bauKalkulation.high } : null,
        match: budgetMatch
      };
    }

    if (hatPflege) {
      payload.pflege = {
        leistungen: state.pflegeLeistungen,
        rasenQm: Number(state.rasenQm) > 0 ? Number(state.rasenQm) : undefined,
        beetQm: Number(state.beetQm) > 0 ? Number(state.beetQm) : undefined,
        heckeLfm: Number(state.heckeLfm) > 0 ? Number(state.heckeLfm) : undefined,
        heckeSchnitteProJahr: state.heckeSchnitte,
        zustand: state.zustand,
        turnus: state.turnus || "zweiwoechentlich",
        entsorgung: state.entsorgung,
        orientierung: pflegeKalkulation
          ? {
              proEinsatzLow: pflegeKalkulation.regelEinsatz.low,
              proEinsatzHigh: pflegeKalkulation.regelEinsatz.high,
              jahrLow: pflegeKalkulation.jahrLow,
              jahrHigh: pflegeKalkulation.jahrHigh
            }
          : null
      };
    }

    try {
      const response = await fetch("/api/projekt-anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSubmitted(true);
    } catch {
      setSubmitError(
        "Die Anfrage konnte gerade nicht übertragen werden. Bitte rufen Sie uns an oder versuchen Sie es gleich noch einmal."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-4xl border border-laub-300 bg-laub-50 p-8 md:p-12">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-laub-700">
          <span className="marker" />
          <span>Anfrage eingegangen</span>
        </div>
        <h3 className="mt-5 font-display text-[28px] leading-tight tracking-tight text-ink md:text-[36px]">
          Danke, {state.name.split(" ")[0] || "Ihre Anfrage ist da"}.
        </h3>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink/75">
          {galabau.assistant.responsePromise} Sie erhalten außerdem eine kurze Bestätigung mit der Zusammenfassung
          Ihrer Angaben{state.email.trim() ? " per E-Mail" : ""}.
        </p>
        <p className="mt-4 max-w-[56ch] text-[13px] leading-relaxed text-ink/55">
          {modus === "pflege"
            ? "Für den Pflegepreis schauen wir uns die Fläche einmal an oder werten Ihre Fotos aus. Danach steht der Preis je Einsatz fest."
            : "Den verbindlichen Preis nennen wir nach dem Aufmaß vor Ort. Bis dahin bleibt jede Zahl eine Orientierung."}
        </p>
      </div>
    );
  }

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="rounded-4xl border border-ink/10 bg-white p-6 shadow-[0_20px_60px_rgba(20,24,26,0.06)] md:p-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
            Schritt {step + 1} von {steps.length}
          </span>
          <span className="font-display text-[18px] tracking-tight text-ink md:text-[20px]">{STEP_TITLES[stepId]}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full rounded-full bg-laub-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Projektart */}
      {stepId === "projektart" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Worum geht es? Mehrfachauswahl ist möglich.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {galabau.services.map((service) => (
              <ChoiceButton
                key={service.key}
                selected={state.serviceKeys.includes(service.key)}
                onClick={() => toggleService(service.key)}
              >
                {service.label}
              </ChoiceButton>
            ))}
          </div>

          {hatGewerbe ? (
            <FieldBlock label="Gewerbliche Außenanlage: Bau oder Pflege?">
              <div className="grid gap-3 sm:grid-cols-3">
                <ChoiceButton selected={state.gewerbeArt === "bau"} onClick={() => patch({ gewerbeArt: "bau" })}>
                  <span className="block font-medium">Neubau oder Umbau</span>
                  <span className="block text-[13px] text-ink/55">Die Fläche wird hergestellt oder umgebaut.</span>
                </ChoiceButton>
                <ChoiceButton selected={state.gewerbeArt === "pflege"} onClick={() => patch({ gewerbeArt: "pflege" })}>
                  <span className="block font-medium">Unterhaltspflege</span>
                  <span className="block text-[13px] text-ink/55">Laufende Pflege im Turnus, ggf. Winterdienst.</span>
                </ChoiceButton>
                <ChoiceButton selected={state.gewerbeArt === "beides"} onClick={() => patch({ gewerbeArt: "beides" })}>
                  <span className="block font-medium">Beides</span>
                  <span className="block text-[13px] text-ink/55">Erst herstellen, danach im Vertrag pflegen.</span>
                </ChoiceButton>
              </div>
            </FieldBlock>
          ) : null}

          <div className="mt-7">
            <label htmlFor="assistent-sonstiges" className="field-label">
              Sonstiges (optional)
            </label>
            <input
              id="assistent-sonstiges"
              className="field-input"
              placeholder="z.B. Teichbau, Mauerarbeiten"
              value={state.sonstiges}
              onChange={(event) => patch({ sonstiges: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {/* Ort */}
      {stepId === "ort" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Wo liegt das Projekt? Wir prüfen sofort, ob es in unserem Einsatzgebiet liegt.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-[140px_1fr]">
            <div>
              <label htmlFor="assistent-plz" className="field-label">
                PLZ
              </label>
              <input
                id="assistent-plz"
                inputMode="numeric"
                maxLength={5}
                className="field-input"
                placeholder="67098"
                value={state.plz}
                onChange={(event) => patch({ plz: event.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <label htmlFor="assistent-ort" className="field-label">
                Ort
              </label>
              <input
                id="assistent-ort"
                className="field-input"
                placeholder={galabau.serviceArea.centerCity}
                value={state.ort}
                onChange={(event) => patch({ ort: event.target.value })}
              />
            </div>
          </div>
          {areaResult ? (
            <div
              className={`mt-5 rounded-2xl border px-5 py-4 text-[14px] leading-relaxed ${
                areaResult.verdict === "inside"
                  ? "border-laub-300 bg-laub-50 text-laub-800"
                  : areaResult.verdict === "border"
                    ? "border-erde-300 bg-erde-50 text-erde-800"
                    : "border-kies-300 bg-kies-50 text-kies-800"
              }`}
            >
              <strong className="block font-medium">{areaResult.headline}</strong>
              <span>{areaResult.detail}</span>
              {areaResult.verdict === "outside" ? (
                <span className="mt-1 block">Sie können die Anfrage trotzdem abschicken, wir melden uns ehrlich zurück.</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Umfang (nur Bau) */}
      {stepId === "umfang" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Grobe Zahlen reichen völlig. Sie helfen uns, das Projekt richtig einzuordnen.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {zeigeQm ? (
              <div>
                <label htmlFor="assistent-qm" className="field-label">
                  {qmFrage.label}
                </label>
                <input
                  id="assistent-qm"
                  inputMode="numeric"
                  className="field-input"
                  placeholder={qmFrage.placeholder}
                  value={state.qm}
                  onChange={(event) => patch({ qm: event.target.value.replace(/[^\d]/g, "") })}
                />
                <p className="mt-2 text-[12px] leading-relaxed text-ink/50">{qmFrage.hint}</p>
              </div>
            ) : null}
            {needsLfm ? (
              <div>
                <label htmlFor="assistent-lfm" className="field-label">
                  {lfmFrage.label}
                </label>
                <input
                  id="assistent-lfm"
                  inputMode="numeric"
                  className="field-input"
                  placeholder={lfmFrage.placeholder}
                  value={state.lfm}
                  onChange={(event) => patch({ lfm: event.target.value.replace(/[^\d]/g, "") })}
                />
                <p className="mt-2 text-[12px] leading-relaxed text-ink/50">{lfmFrage.hint}</p>
              </div>
            ) : null}
          </div>

          <FieldBlock label={bestandLabel}>
            <div className="grid gap-3 sm:grid-cols-2">
              {bestandOptions.map((option) => (
                <ChoiceButton
                  key={option.id}
                  selected={state.bestand === option.id}
                  onClick={() => patch({ bestand: option.id })}
                >
                  {option.label}
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>

          <FieldBlock label="Zugang zur Baustelle">
            <div className="grid gap-3 sm:grid-cols-2">
              {ZUGANG_OPTIONEN.map((option) => (
                <ChoiceButton
                  key={option.id}
                  selected={state.zugang === option.id}
                  onClick={() => patch({ zugang: option.id })}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-[13px] text-ink/55">{option.hint}</span>
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>

          <FieldBlock label="Gelände">
            <div className="grid gap-3 sm:grid-cols-2">
              {HANG_OPTIONEN.map((option) => (
                <ChoiceButton key={option.id} selected={state.hang === option.id} onClick={() => patch({ hang: option.id })}>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-[13px] text-ink/55">{option.hint}</span>
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>
        </div>
      ) : null}

      {/* Pflegeumfang (nur Pflege) */}
      {stepId === "pflege" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Was sollen wir übernehmen? Die Flächenfelder erscheinen passend zur Auswahl.
          </p>

          <FieldBlock label="Leistungen">
            <div className="grid gap-3 sm:grid-cols-2">
              {PFLEGE_LEISTUNGEN.map((leistung) => (
                <ChoiceButton
                  key={leistung.id}
                  selected={state.pflegeLeistungen.includes(leistung.id)}
                  onClick={() => togglePflegeLeistung(leistung.id)}
                >
                  {leistung.label}
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>

          {state.pflegeLeistungen.some((id) => ["rasen", "beet", "hecke", "vertikutieren"].includes(id)) ? (
            <FieldBlock label="Grobe Größen">
              <div className="grid gap-4 sm:grid-cols-3">
                {state.pflegeLeistungen.includes("rasen") || state.pflegeLeistungen.includes("vertikutieren") ? (
                  <div>
                    <label htmlFor="pflege-rasen" className="text-[13px] text-ink/70">
                      Rasenfläche (m²)
                    </label>
                    <input
                      id="pflege-rasen"
                      inputMode="numeric"
                      className="field-input mt-1"
                      placeholder="z.B. 250"
                      value={state.rasenQm}
                      onChange={(event) => patch({ rasenQm: event.target.value.replace(/[^\d]/g, "") })}
                    />
                  </div>
                ) : null}
                {state.pflegeLeistungen.includes("hecke") ? (
                  <div>
                    <label htmlFor="pflege-hecke" className="text-[13px] text-ink/70">
                      Heckenlänge (lfm)
                    </label>
                    <input
                      id="pflege-hecke"
                      inputMode="numeric"
                      className="field-input mt-1"
                      placeholder="z.B. 30"
                      value={state.heckeLfm}
                      onChange={(event) => patch({ heckeLfm: event.target.value.replace(/[^\d]/g, "") })}
                    />
                  </div>
                ) : null}
                {state.pflegeLeistungen.includes("beet") ? (
                  <div>
                    <label htmlFor="pflege-beet" className="text-[13px] text-ink/70">
                      Beetfläche (m²)
                    </label>
                    <input
                      id="pflege-beet"
                      inputMode="numeric"
                      className="field-input mt-1"
                      placeholder="z.B. 40"
                      value={state.beetQm}
                      onChange={(event) => patch({ beetQm: event.target.value.replace(/[^\d]/g, "") })}
                    />
                  </div>
                ) : null}
              </div>
              {state.pflegeLeistungen.includes("hecke") ? (
                <div className="mt-4">
                  <span className="text-[13px] text-ink/70">Wie oft soll die Hecke geschnitten werden?</span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <ChoiceButton selected={state.heckeSchnitte === 1} onClick={() => patch({ heckeSchnitte: 1 })}>
                      Einmal im Jahr
                    </ChoiceButton>
                    <ChoiceButton selected={state.heckeSchnitte === 2} onClick={() => patch({ heckeSchnitte: 2 })}>
                      Zweimal im Jahr
                    </ChoiceButton>
                  </div>
                </div>
              ) : null}
            </FieldBlock>
          ) : null}

          <FieldBlock label="Wie ist der Zustand heute?">
            <div className="grid gap-3 sm:grid-cols-3">
              {ZUSTAND_OPTIONEN.map((option) => (
                <ChoiceButton
                  key={option.id}
                  selected={state.zustand === option.id}
                  onClick={() => patch({ zustand: option.id })}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-[13px] text-ink/55">{option.hint}</span>
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>

          <FieldBlock label="Wie oft sollen wir kommen?">
            <div className="grid gap-3 sm:grid-cols-2">
              {TURNUS_OPTIONEN.map((option) => (
                <ChoiceButton
                  key={option.id}
                  selected={state.turnus === option.id}
                  onClick={() => patch({ turnus: option.id })}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-[13px] text-ink/55">{option.hint}</span>
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>

          <div className="mt-7">
            <ChoiceButton selected={state.entsorgung} onClick={() => patch({ entsorgung: !state.entsorgung })}>
              Schnittgut und Grünabfall bitte abfahren und entsorgen
            </ChoiceButton>
          </div>
        </div>
      ) : null}

      {/* Planung (nur Bau) */}
      {stepId === "planung" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Wie weit sind Sie mit der Planung?</p>
          <div className="mt-6 grid gap-3">
            {PLANUNG_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.id}
                selected={state.planungsstand === option.id}
                onClick={() => patch({ planungsstand: option.id })}
              >
                <span className="block font-medium">{option.label}</span>
                <span className="block text-[13px] text-ink/55">{option.hint}</span>
              </ChoiceButton>
            ))}
          </div>
          <div className="mt-6">
            <ChoiceButton selected={state.skizzen} onClick={() => patch({ skizzen: !state.skizzen })}>
              Es gibt Skizzen oder Pläne (können im Foto-Schritt hochgeladen werden)
            </ChoiceButton>
          </div>
        </div>
      ) : null}

      {/* Zeitrahmen */}
      {stepId === "zeitrahmen" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            {modus === "pflege" ? "Ab wann sollen wir die Pflege übernehmen?" : "Wann soll es losgehen?"}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(modus === "pflege" ? ZEITRAHMEN_PFLEGE : ZEITRAHMEN_BAU).map((option) => (
              <ChoiceButton
                key={option.id}
                selected={state.zeitrahmen === option.id}
                onClick={() => patch({ zeitrahmen: option.id })}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ) : null}

      {/* Fotos */}
      {stepId === "fotos" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            {modus === "pflege"
              ? "Fotos von Rasen, Hecke und Beeten. Damit sehen wir den Aufwand und können den Preis je Einsatz oft ohne Ortstermin nennen."
              : "Fotos vom Garten, der Zufahrt, dem aktuellen Zustand oder von Skizzen und Inspirationsbildern. Optional, aber sie sparen meist eine ganze Runde Rückfragen."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void onFilesSelected(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/25 bg-bone px-6 py-10 text-center transition-colors hover:border-laub-400"
          >
            <span className="font-display text-[20px] tracking-tight text-ink">Fotos auswählen</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
              Bis zu {galabau.assistant.photoUploadMaxFiles} Bilder, je max. {galabau.assistant.photoUploadMaxMb} MB
            </span>
          </button>
          {state.fotos.length > 0 ? (
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {state.fotos.map((foto, index) => (
                <li key={`${foto.name}-${index}`} className="relative">
                  <img src={foto.dataUrl} alt={foto.name} className="aspect-square w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    aria-label={`${foto.name} entfernen`}
                    onClick={() => patch({ fotos: state.fotos.filter((_, i) => i !== index) })}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[12px] text-bone"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Budget (nur Bau, ohne Rechnung) */}
      {stepId === "budget" ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Damit wir gleich in der richtigen Größenordnung planen: In welchem Rahmen soll sich das Projekt bewegen?
            Wir rechnen Ihnen hier nichts vor, wir richten uns danach.
          </p>

          <FieldBlock label="Welcher Budgetrahmen passt für Sie?">
            <div className="grid gap-3 sm:grid-cols-2">
              {budgetBands.map((band) => (
                <ChoiceButton
                  key={band.id}
                  selected={state.budgetBand === band.id}
                  // Bei "Noch unklar" verschwindet die Folgefrage, also darf
                  // auch keine alte Antwort darauf mitgeschickt werden.
                  onClick={() =>
                    patch({ budgetBand: band.id, budgetFestigkeit: band.id === "unklar" ? "" : state.budgetFestigkeit })
                  }
                >
                  {band.label}
                </ChoiceButton>
              ))}
            </div>
          </FieldBlock>

          {state.budgetBand && state.budgetBand !== "unklar" ? (
            <FieldBlock label="Wie fest ist dieser Rahmen?">
              <div className="grid gap-3">
                {FESTIGKEIT_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    selected={state.budgetFestigkeit === option.id}
                    onClick={() => patch({ budgetFestigkeit: option.id })}
                  >
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-[13px] text-ink/55">{option.hint}</span>
                  </ChoiceButton>
                ))}
              </div>
            </FieldBlock>
          ) : null}

          <p className="mt-7 rounded-2xl border border-erde-200 bg-erde-50 px-5 py-4 text-[13px] leading-relaxed text-ink/70">
            Keine Vorstellung, was so etwas kostet?{" "}
            <a
              href={buildKostenHref(kostenHandoff)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-laub-700 underline"
            >
              Im Kostenrechner
            </a>{" "}
            können Sie es in einer Minute durchspielen — mit Material, Zugang und Gelände. Ihre Eingaben hier bleiben
            erhalten.
          </p>
        </div>
      ) : null}

      {/* Kontakt */}
      {stepId === "kontakt" ? (
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="assistent-name" className="field-label">
                Name
              </label>
              <input
                id="assistent-name"
                className="field-input"
                autoComplete="name"
                value={state.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="assistent-telefon" className="field-label">
                Telefon
              </label>
              <input
                id="assistent-telefon"
                className="field-input"
                inputMode="tel"
                autoComplete="tel"
                value={state.telefon}
                onChange={(event) => patch({ telefon: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="assistent-email" className="field-label">
                E-Mail
              </label>
              <input
                id="assistent-email"
                className="field-input"
                inputMode="email"
                autoComplete="email"
                value={state.email}
                onChange={(event) => patch({ email: event.target.value })}
              />
            </div>
          </div>

          <FieldBlock label="Wie dürfen wir uns melden?">
            <div className="grid gap-3 sm:grid-cols-3">
              <ChoiceButton selected={state.kanal === "telefon"} onClick={() => patch({ kanal: "telefon" })}>
                Anruf
              </ChoiceButton>
              <ChoiceButton selected={state.kanal === "whatsapp"} onClick={() => patch({ kanal: "whatsapp" })}>
                WhatsApp
              </ChoiceButton>
              <ChoiceButton selected={state.kanal === "email"} onClick={() => patch({ kanal: "email" })}>
                E-Mail
              </ChoiceButton>
            </div>
          </FieldBlock>

          <FieldBlock label="Privat oder gewerblich?">
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton selected={state.kundentyp === "privat"} onClick={() => patch({ kundentyp: "privat" })}>
                Privat
              </ChoiceButton>
              <ChoiceButton selected={state.kundentyp === "gewerblich"} onClick={() => patch({ kundentyp: "gewerblich" })}>
                Gewerblich / Verwaltung
              </ChoiceButton>
            </div>
          </FieldBlock>

          <div className="mt-7">
            <label htmlFor="assistent-nachricht" className="field-label">
              Noch etwas, das wir wissen sollten? (optional)
            </label>
            <textarea
              id="assistent-nachricht"
              rows={3}
              className="field-input resize-y"
              value={state.nachricht}
              onChange={(event) => patch({ nachricht: event.target.value })}
            />
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink/70">
            <input
              type="checkbox"
              checked={state.einwilligung}
              onChange={(event) => patch({ einwilligung: event.target.checked })}
              className="mt-1 h-4 w-4 accent-laub-600"
            />
            <span>{galabau.assistant.consentText}</span>
          </label>
        </div>
      ) : null}

      {stepError ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {stepError}
        </p>
      ) : null}
      {submitError ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="rounded-full border border-ink/20 px-6 py-3 text-[13px] font-medium text-ink transition-opacity disabled:opacity-0"
        >
          Zurück
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-full bg-laub-500 px-7 py-3 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600"
          >
            Weiter
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-laub-500 px-7 py-3 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600 disabled:opacity-60"
          >
            {submitting ? "Wird gesendet …" : "Anfrage absenden"}
          </button>
        )}
      </div>
    </div>
  );
}
