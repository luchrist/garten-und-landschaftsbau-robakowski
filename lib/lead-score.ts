import type { BudgetMatch, ProjectSize } from "@/lib/estimator";
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

export type LeadScoreInput = {
  serviceArea: ServiceAreaVerdict;
  /** Whether every selected Projektart maps to a service the company offers. */
  servicesMatch: boolean;
  size: ProjectSize;
  budgetMatch: BudgetMatch;
  photoCount: number;
  zeitrahmen?: Zeitrahmen;
  planungsstand?: Planungsstand;
  kundentyp?: Kundentyp;
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
  value += BUDGET_POINTS[input.budgetMatch];
  if (input.budgetMatch === "unter") reasons.push("Budget unter dem Orientierungsrahmen");
  if (input.budgetMatch === "passend") reasons.push("Budget passt zum Rahmen");
  if (input.budgetMatch === "unbekannt") missing.push("Budgetrahmen");

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

  if (input.planungsstand) {
    value += PLANUNG_POINTS[input.planungsstand];
    if (input.planungsstand === "beratung") reasons.push("Beratungsbedarf");
  } else {
    missing.push("Planungsstand");
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

/** Payload the Projekt-Assistent posts to /api/projekt-anfrage. */
export type ProjektAnfragePayload = {
  quelle: "website" | "widget";
  stage: LeadStage;
  projektarten: string[];
  ort: { plz: string; ort: string; einsatzgebiet: ServiceAreaVerdict };
  umfang: {
    qm?: number;
    lfm?: number;
    bestand: "neubau" | "bestand" | "unklar";
    zugang: "gut" | "eng" | "unklar";
    hanglage: boolean;
  };
  planung: { stand: Planungsstand; skizzen: boolean };
  zeitrahmen: Zeitrahmen;
  fotos: Array<{ name: string; size: number; type: string; dataUrl?: string }>;
  budget: { band: string; reaktion: string; orientierung: { low: number; high: number } | null; match: BudgetMatch };
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

/** Payload the 60-second application posts to /api/bewerbung. */
export type BewerbungPayload = {
  quelle: "website" | "widget";
  taetigkeit: string;
  erfahrung: string;
  fuehrerschein: string[];
  wohnort: string;
  startdatum: string;
  name: string;
  telefon: string;
  email: string;
  nachricht: string;
  einwilligung: boolean;
  eingegangenAm: string;
};
