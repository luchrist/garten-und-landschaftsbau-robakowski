import type {
  Bestandslage,
  BudgetMatch,
  Hangstufe,
  Pflegezustand,
  ProjectSize,
  Turnus,
  Zugang
} from "@/lib/kalkulator";
import type { ServiceAreaVerdict } from "@/lib/service-area";

/**
 * Status model from section 7 of the concept. The website only ever creates
 * leads in `neue_anfrage`; everything after that is moved by the operator in
 * the CRM. Exported here so the backend and the site agree on one vocabulary.
 */
export const LEAD_STAGES = [
  "neue_anfrage",
  "qualifiziert",
  "rueckfrage_noetig",
  "kontakt_erfolgt",
  "besichtigung",
  "angebot_vorbereitung",
  "angebot_versendet",
  "nachfassen_faellig",
  "gewonnen",
  "verloren",
  "projekt_abgeschlossen",
  "bewertung_angefragt"
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  neue_anfrage: "Neue Anfrage",
  qualifiziert: "Qualifiziert",
  rueckfrage_noetig: "Rückfrage nötig",
  kontakt_erfolgt: "Kontaktaufnahme erfolgt",
  besichtigung: "Besichtigung/Telefonat",
  angebot_vorbereitung: "Angebot in Vorbereitung",
  angebot_versendet: "Angebot versendet",
  nachfassen_faellig: "Nachfassen fällig",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
  projekt_abgeschlossen: "Projekt abgeschlossen",
  bewertung_angefragt: "Bewertung/Referenz angefragt"
};

export type Zeitrahmen = "sofort" | "1-3-monate" | "dieses-jahr" | "orientierung";
export type Planungsstand = "konkret" | "idee" | "beratung";
export type Kundentyp = "privat" | "gewerblich";

/**
 * Der Assistent verzweigt nach der Projektart. Eine Baumaßnahme und ein
 * Pflegeauftrag haben fast keine gemeinsamen Fragen, deshalb trennt der
 * Modus beide Funnel bis in Payload und Scoring hinein.
 */
export type Anfragemodus = "bau" | "pflege";

export type LeadScoreInput = {
  /**
   * Welcher Funnel gelaufen ist. Pflegeanfragen durchlaufen weder den
   * Planungs- noch den Budgetschritt, dürfen dafür aber auch nicht dafür
   * bestraft werden, dass diese Angaben fehlen.
   */
  modus: Anfragemodus;
  serviceArea: ServiceAreaVerdict;
  /** Whether every selected Projektart maps to a service the company offers. */
  servicesMatch: boolean;
  size: ProjectSize;
  budgetMatch: BudgetMatch;
  photoCount: number;
  zeitrahmen?: Zeitrahmen;
  planungsstand?: Planungsstand;
  kundentyp?: Kundentyp;
  /** Turnus der Pflege — im Pflegemodus der stärkste Werttreiber. */
  turnus?: Turnus;
  /** Pflege, Bewässerungswartung, Winterdienst: recurring revenue potential. */
  wiederkehrend: boolean;
};

export type LeadScore = {
  /** 0-100. Higher means "call this one first". */
  value: number;
  label: "heiß" | "warm" | "kalt";
  /** Human-readable reasons, used in the internal notification email. */
  reasons: string[];
  /** Fields the visitor left empty that the follow-up automation should chase. */
  missing: string[];
};

const AREA_POINTS: Record<ServiceAreaVerdict, number> = {
  inside: 22,
  border: 12,
  outside: 0,
  unknown: 6
};

const SIZE_POINTS: Record<ProjectSize, number> = {
  klein: 6,
  mittel: 14,
  gross: 20
};

const BUDGET_POINTS: Record<BudgetMatch, number> = {
  passend: 20,
  darueber: 16,
  unbekannt: 6,
  unter: 0
};

const ZEIT_POINTS: Record<Zeitrahmen, number> = {
  sofort: 14,
  "1-3-monate": 12,
  "dieses-jahr": 7,
  orientierung: 2
};

const PLANUNG_POINTS: Record<Planungsstand, number> = {
  konkret: 10,
  idee: 6,
  beratung: 4
};

/**
 * Im Pflegemodus ersetzt der Turnus die Budget- und Planungsfrage: ein fester
 * Rhythmus ist über die Saison mehr wert als ein einmaliger Einsatz, auch
 * wenn die Einzelsumme kleiner ist.
 */
const TURNUS_POINTS: Record<Turnus, number> = {
  woechentlich: 30,
  zweiwoechentlich: 28,
  monatlich: 22,
  saisonal: 16,
  einmalig: 8
};

/**
 * Section 7: Einsatzgebiet, Leistung passt, Projektgröße, Budget-Match, Fotos
 * vorhanden, gewünschter Zeitraum, Entscheidungsreife, Privat/Gewerbe,
 * wiederkehrendes Potenzial.
 */
export function scoreLead(input: LeadScoreInput): LeadScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  let value = 0;

  value += AREA_POINTS[input.serviceArea];
  if (input.serviceArea === "inside") reasons.push("Im Einsatzgebiet");
  if (input.serviceArea === "border") reasons.push("Grenzfall Einsatzgebiet");
  if (input.serviceArea === "outside") reasons.push("Außerhalb des Einsatzgebiets");
  if (input.serviceArea === "unknown") missing.push("Postleitzahl");

  if (input.servicesMatch) {
    value += 10;
  } else {
    reasons.push("Leistung nicht im Portfolio");
  }

  value += SIZE_POINTS[input.size];

  if (input.modus === "bau") {
    value += BUDGET_POINTS[input.budgetMatch];
    if (input.budgetMatch === "unter") reasons.push("Budget unter dem Orientierungsrahmen");
    if (input.budgetMatch === "passend") reasons.push("Budget passt zum Rahmen");
    if (input.budgetMatch === "unbekannt") missing.push("Budgetrahmen");
  } else if (input.turnus) {
    value += TURNUS_POINTS[input.turnus];
    if (input.turnus !== "einmalig") reasons.push(`Fester Turnus: ${input.turnus}`);
  } else {
    missing.push("Turnus");
  }

  if (input.photoCount > 0) {
    value += Math.min(10, 4 + input.photoCount * 2);
    reasons.push(`${input.photoCount} Foto(s) mitgeschickt`);
  } else {
    missing.push("Fotos");
  }

  if (input.zeitrahmen) {
    value += ZEIT_POINTS[input.zeitrahmen];
  } else {
    missing.push("Zeitrahmen");
  }

  // Der Planungsstand wird nur im Bau-Funnel erhoben. Bei Pflege gibt es
  // nichts zu planen, deshalb taucht er dort auch nicht als Lücke auf.
  if (input.modus === "bau") {
    if (input.planungsstand) {
      value += PLANUNG_POINTS[input.planungsstand];
      if (input.planungsstand === "beratung") reasons.push("Beratungsbedarf");
    } else {
      missing.push("Planungsstand");
    }
  }

  if (input.kundentyp === "gewerblich") {
    value += 6;
    reasons.push("Gewerblicher Kunde");
  }

  if (input.wiederkehrend) {
    value += 8;
    reasons.push("Wiederkehrendes Potenzial (Pflege/Wartung)");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const label: LeadScore["label"] = clamped >= 65 ? "heiß" : clamped >= 40 ? "warm" : "kalt";

  return { value: clamped, label, reasons, missing };
}

/**
 * Payload the Projekt-Assistent posts to /api/projekt-anfrage.
 *
 * `umfang`, `planung` und `budget` gibt es nur im Bau-Funnel, `pflege` nur im
 * Pflege-Funnel. Bei einer Kombination aus beidem sind beide Blöcke gesetzt.
 */
export type ProjektAnfragePayload = {
  quelle: "website" | "widget";
  stage: LeadStage;
  modus: Anfragemodus;
  projektarten: string[];
  ort: { plz: string; ort: string; einsatzgebiet: ServiceAreaVerdict };
  umfang?: {
    qm?: number;
    lfm?: number;
    bestand: Bestandslage;
    zugang: Zugang;
    hang: Hangstufe;
  };
  pflege?: {
    leistungen: string[];
    rasenQm?: number;
    beetQm?: number;
    heckeLfm?: number;
    heckeSchnitteProJahr?: number;
    zustand: Pflegezustand;
    turnus: Turnus;
    entsorgung: boolean;
    orientierung: { proEinsatzLow: number; proEinsatzHigh: number; jahrLow: number; jahrHigh: number } | null;
  };
  planung?: { stand: Planungsstand; skizzen: boolean };
  zeitrahmen: Zeitrahmen;
  fotos: Array<{ name: string; size: number; type: string; dataUrl?: string }>;
  budget?: { band: string; festigkeit: string; orientierung: { low: number; high: number } | null; match: BudgetMatch };
  kontakt: {
    name: string;
    telefon: string;
    email: string;
    kanal: "telefon" | "whatsapp" | "email";
    kundentyp: Kundentyp;
    nachricht: string;
    einwilligung: boolean;
  };
  score: LeadScore;
  eingegangenAm: string;
};

/** Optionaler Lebenslauf-Upload, als Data-URL im JSON-Payload. */
export type BewerbungAnhang = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

/** Payload the 60-second application posts to /api/bewerbung. */
export type BewerbungPayload = {
  quelle: "website" | "widget";
  taetigkeit: string;
  /** Ausbildung, anderes Gewerk oder Quereinstieg. */
  erfahrung: string;
  /** Jahre Praxis in genau dieser Tätigkeit. */
  berufsjahre: string;
  fuehrerschein: string[];
  wohnort: string;
  startdatum: string;
  geschlecht: string;
  vorname: string;
  nachname: string;
  /** Vor- und Nachname zusammengesetzt, damit Mail und CRM ein Feld haben. */
  name: string;
  telefon: string;
  email: string;
  nachricht: string;
  lebenslauf: BewerbungAnhang | null;
  einwilligung: boolean;
  eingegangenAm: string;
};
