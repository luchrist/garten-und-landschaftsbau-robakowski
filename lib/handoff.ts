import { galabau } from "@/lib/galabau";
import {
  findBauModell,
  isHybridService,
  isPflegeService,
  HANG_OPTIONEN,
  HECKE_SCHNITTE_MAX,
  PFLEGE_LEISTUNGEN,
  TURNUS_OPTIONEN,
  ZUGANG_OPTIONEN,
  ZUSTAND_OPTIONEN,
  type Bestandslage,
  type Hangstufe,
  type Pflegezustand,
  type Turnus,
  type Zugang
} from "@/lib/kalkulator";

/**
 * Übergabe zwischen Kostenrechner, Leistungsseiten und Projekt-Assistent.
 *
 * Jeder Button, der auf /projekt-anfragen oder /kosten führt, nimmt mit, was an
 * der Stelle schon bekannt ist: die Leistung, grobe Mengen, Material, Zugang,
 * Gelände, den Pflegeumfang. Wer auf einer Terrassen-Seite auf „Terrasse
 * anfragen“ klickt, soll den Assistenten nicht bei Schritt eins mit leerer
 * Leistungsauswahl vorfinden.
 *
 * Die Parameter sind bewusst kurz und sprechend — sie stehen in der Adresszeile
 * und werden von Kunden weitergeschickt.
 */

export type GewerbeArt = "bau" | "pflege" | "beides";
export type Kundenart = "privat" | "gewerblich";

export type Handoff = {
  /** Service-Key aus lib/galabau.ts. */
  leistung?: string;
  /** Nur für Gewerbeflächen: Bau, Pflege oder beides. */
  art?: GewerbeArt;
  qm?: string;
  lfm?: string;
  /** Varianten-ID des Baumodells (Materialklasse). */
  material?: string;
  bestand?: Bestandslage;
  zugang?: Zugang;
  hang?: Hangstufe;
  extras?: string[];
  /** IDs aus PFLEGE_LEISTUNGEN. */
  pflege?: string[];
  rasen?: string;
  beet?: string;
  hecke?: string;
  schnitte?: number;
  zustand?: Pflegezustand;
  turnus?: Turnus;
  entsorgung?: boolean;
  kundentyp?: Kundenart;
};

const ZAHL = /^\d{1,6}$/;

function knownService(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return galabau.services.some((service) => service.key === key) ? key : undefined;
}

function ersteZeichenkette(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function listeAus(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Referenzen und Preistabelle führen Leistungen als Klartext-Label. Damit auch
 * dort der richtige Service vorausgewählt werden kann, wird zurückgemappt.
 */
export function serviceKeyFromLabel(label: string): string | undefined {
  const normalisiert = label.trim().toLowerCase();
  return galabau.services.find(
    (service) =>
      service.label.toLowerCase() === normalisiert ||
      service.navLabel.toLowerCase() === normalisiert ||
      service.slug === normalisiert
  )?.key;
}

/**
 * Was sich allein aus der Leistung ergibt: Gewerbeflächen sind per Definition
 * kein Privatauftrag, Gartenpflege startet mit dem üblichen Rasen-Umfang.
 */
export function presetFuerLeistung(serviceKey: string | undefined): Handoff {
  const key = knownService(serviceKey);
  if (!key) return {};
  const preset: Handoff = { leistung: key };
  if (key === "gewerbeflaechen") preset.kundentyp = "gewerblich";
  if (isPflegeService(key)) preset.pflege = ["rasen"];
  return preset;
}

export function handoffToParams(handoff: Handoff): URLSearchParams {
  const params = new URLSearchParams();
  const setze = (name: string, value: string | undefined) => {
    if (value) params.set(name, value);
  };

  setze("leistung", handoff.leistung);
  setze("art", handoff.art);
  setze("qm", handoff.qm);
  setze("lfm", handoff.lfm);
  setze("material", handoff.material);
  setze("bestand", handoff.bestand);
  setze("zugang", handoff.zugang);
  setze("hang", handoff.hang);
  if (handoff.extras?.length) params.set("extras", handoff.extras.join(","));
  if (handoff.pflege?.length) params.set("pflege", handoff.pflege.join(","));
  setze("rasen", handoff.rasen);
  setze("beet", handoff.beet);
  setze("hecke", handoff.hecke);
  if (handoff.schnitte) params.set("schnitte", String(handoff.schnitte));
  setze("zustand", handoff.zustand);
  setze("turnus", handoff.turnus);
  if (handoff.entsorgung !== undefined) params.set("entsorgung", handoff.entsorgung ? "1" : "0");
  setze("kundentyp", handoff.kundentyp);

  return params;
}

function href(pfad: string, handoff: Handoff): string {
  const query = handoffToParams(handoff).toString();
  return query ? `${pfad}?${query}` : pfad;
}

/** Link auf den Projekt-Assistenten mit allem, was hier schon bekannt ist. */
export function buildAnfrageHref(handoff: Handoff = {}): string {
  return href("/projekt-anfragen", handoff);
}

/** Link auf den Kostenrechner mit allem, was hier schon bekannt ist. */
export function buildKostenHref(handoff: Handoff = {}): string {
  return href("/kosten", handoff);
}

/**
 * Liest die Übergabe aus der Adresszeile und verwirft alles, was nicht zu den
 * bekannten Optionen passt. Ein manipulierter Parameter darf nie einen
 * ungültigen Formularzustand erzeugen.
 */
export function parseHandoff(raw: Record<string, string | string[] | undefined>): Handoff {
  const wert = (name: string) => ersteZeichenkette(raw[name]).trim();

  const handoff: Handoff = {};

  const leistung = knownService(wert("leistung"));
  if (leistung) handoff.leistung = leistung;

  const art = wert("art");
  if (leistung && isHybridService(leistung) && (art === "bau" || art === "pflege" || art === "beides")) {
    handoff.art = art;
  }

  const qm = wert("qm");
  if (ZAHL.test(qm)) handoff.qm = qm;
  const lfm = wert("lfm");
  if (ZAHL.test(lfm)) handoff.lfm = lfm;

  const modell = leistung ? findBauModell(leistung) : undefined;

  const material = wert("material");
  if (modell?.varianten.some((variante) => variante.id === material)) handoff.material = material;

  const extras = listeAus(wert("extras")).filter((id) => modell?.extras.some((extra) => extra.id === id));
  if (extras.length) handoff.extras = extras;

  const bestand = wert("bestand");
  if (["frei", "gruen-rueckbau", "belag-rueckbau", "unklar"].includes(bestand)) {
    handoff.bestand = bestand as Bestandslage;
  }

  const zugang = wert("zugang");
  if (ZUGANG_OPTIONEN.some((option) => option.id === zugang)) handoff.zugang = zugang as Zugang;

  const hang = wert("hang");
  if (HANG_OPTIONEN.some((option) => option.id === hang)) handoff.hang = hang as Hangstufe;

  const pflege = listeAus(wert("pflege")).filter((id) =>
    PFLEGE_LEISTUNGEN.some((leistungsEintrag) => leistungsEintrag.id === id)
  );
  if (pflege.length) handoff.pflege = pflege;

  const rasen = wert("rasen");
  if (ZAHL.test(rasen)) handoff.rasen = rasen;
  const beet = wert("beet");
  if (ZAHL.test(beet)) handoff.beet = beet;
  const hecke = wert("hecke");
  if (ZAHL.test(hecke)) handoff.hecke = hecke;

  const schnitte = Number(wert("schnitte"));
  if (Number.isInteger(schnitte) && schnitte >= 1 && schnitte <= HECKE_SCHNITTE_MAX) handoff.schnitte = schnitte;

  const zustand = wert("zustand");
  if (ZUSTAND_OPTIONEN.some((option) => option.id === zustand)) handoff.zustand = zustand as Pflegezustand;

  const turnus = wert("turnus");
  if (TURNUS_OPTIONEN.some((option) => option.id === turnus)) handoff.turnus = turnus as Turnus;

  const entsorgung = wert("entsorgung");
  if (entsorgung === "1" || entsorgung === "0") handoff.entsorgung = entsorgung === "1";

  const kundentyp = wert("kundentyp");
  if (kundentyp === "privat" || kundentyp === "gewerblich") handoff.kundentyp = kundentyp;

  // Eine Pflegeanfrage ohne genannte Leistungen startet mit dem Regelfall,
  // sonst stünde der erste Pflegeschritt leer da.
  if (!handoff.pflege && handoff.leistung && isPflegeService(handoff.leistung)) {
    handoff.pflege = ["rasen"];
  }

  return handoff;
}
