import { galabau, type GalabauBudgetBand, type GalabauServiceKey } from "@/lib/galabau";

/**
 * Kostenmodell für GaLaBau-Projekte.
 *
 * Löst den alten `estimator` ab. Der Unterschied: statt einer linearen
 * Preis-pro-Einheit-Spanne mit pauschalen Zuschlägen rechnet dieses Modell
 * mit echten Positionen (Baustelleneinrichtung, Erdarbeiten, Unterbau,
 * Material, Lohn), einer Materialklasse, einer Mengendegression und getrennten
 * Faktoren für Zugang und Gelände. Dadurch wird die Spanne deutlich enger und
 * vor allem nachvollziehbar — der Nutzer sieht, woraus sich die Zahl ergibt.
 *
 * Zwei Modi:
 *   bau    – einmalige Baumaßnahme, Ergebnis ist eine Projektsumme
 *   pflege – wiederkehrende Leistung, Ergebnis ist Preis je Einsatz und Jahr
 *
 * Es bleibt eine Orientierung, kein Angebot. Verbindlich wird der Preis erst
 * nach dem Aufmaß vor Ort.
 */

export type Spanne = { low: number; high: number };

export type ProjectSize = "klein" | "mittel" | "gross";
export type BudgetMatch = "unter" | "passend" | "darueber" | "unbekannt";

export type Zugang = "gut" | "eingeschraenkt" | "handbetrieb" | "unklar";
export type Hangstufe = "eben" | "leicht" | "stark" | "unklar";
export type Bestandslage = "frei" | "gruen-rueckbau" | "belag-rueckbau" | "unklar";

export type Pflegezustand = "gepflegt" | "ueberwachsen" | "verwildert";
export type Turnus =
  | "einmalig"
  | "woechentlich"
  | "zweiwoechentlich"
  | "dreiwoechentlich"
  | "monatlich"
  | "sechswoechentlich"
  | "saisonal";

/* ------------------------------------------------------------------ *
 * Zuordnung Leistung → Modus
 * ------------------------------------------------------------------ */

/** Leistungen, die als wiederkehrende Pflege abgefragt werden. */
export const PFLEGE_SERVICE_KEYS: GalabauServiceKey[] = ["gartenpflege"];

/** Leistungen, die je nach Auftrag Bau *oder* Pflege sein können. */
export const HYBRID_SERVICE_KEYS: GalabauServiceKey[] = ["gewerbeflaechen"];

export function isPflegeService(key: string): boolean {
  return PFLEGE_SERVICE_KEYS.includes(key as GalabauServiceKey);
}

export function isHybridService(key: string): boolean {
  return HYBRID_SERVICE_KEYS.includes(key as GalabauServiceKey);
}

/* ------------------------------------------------------------------ *
 * Faktoren
 * ------------------------------------------------------------------ */

const ZUGANG_FAKTOR: Record<Zugang, number> = {
  gut: 1,
  eingeschraenkt: 1.09,
  handbetrieb: 1.24,
  unklar: 1.05
};

const HANG_FAKTOR: Record<Hangstufe, number> = {
  eben: 1,
  leicht: 1.09,
  stark: 1.22,
  unklar: 1.05
};

export const ZUGANG_OPTIONEN: Array<{ id: Zugang; label: string; hint: string }> = [
  { id: "gut", label: "Gut erreichbar", hint: "Bagger, Radlader und LKW kommen bis an die Fläche." },
  { id: "eingeschraenkt", label: "Eingeschränkt", hint: "Nur Kleingerät, enge Zufahrt oder weite Wege." },
  { id: "handbetrieb", label: "Nur von Hand", hint: "Zugang ausschließlich durchs Haus oder über Treppen." },
  { id: "unklar", label: "Weiß ich nicht", hint: "Klären wir beim Termin vor Ort." }
];

export const HANG_OPTIONEN: Array<{ id: Hangstufe; label: string; hint: string }> = [
  { id: "eben", label: "Eben", hint: "Kaum Höhenunterschied." },
  { id: "leicht", label: "Leicht geneigt", hint: "Spürbares Gefälle, aber befahrbar." },
  { id: "stark", label: "Deutlicher Hang", hint: "Abfangen, Modellieren oder Stützmauern nötig." },
  { id: "unklar", label: "Weiß ich nicht", hint: "Sehen wir uns vor Ort an." }
];

/**
 * Kleine Flächen sind pro Einheit teurer: Rüstzeit, Anfahrt und Maschinen­
 * einsatz verteilen sich auf weniger Quadratmeter. Der Exponent hält die
 * Degression moderat (bei vierfacher Referenzmenge rund minus 13 %).
 */
function degression(menge: number, referenz: number): number {
  if (menge <= 0) return 1;
  const raw = Math.pow(referenz / menge, 0.11);
  return Math.min(1.18, Math.max(0.86, raw));
}

/* ------------------------------------------------------------------ *
 * Bau-Modelle
 * ------------------------------------------------------------------ */

export type Position = {
  id: string;
  label: string;
  /** Preis je Einheit (m² oder lfm). */
  perUnit?: Spanne;
  /** Pauschalbetrag für das Projekt. */
  fixed?: Spanne;
  /** Lohn- und Maschinenanteil: reagiert auf Zugang, Hang und Menge. */
  lohn?: boolean;
  note?: string;
};

export type Variante = {
  id: string;
  label: string;
  hint: string;
  positions: Position[];
};

export type Extra = Position & { hint?: string };

export type BauModell = {
  key: GalabauServiceKey;
  unit: "qm" | "lfm";
  unitLabel: string;
  mengeLabel: string;
  mengeHint: string;
  placeholder: string;
  referenzMenge: number;
  /** Typische Projektgröße für die Preistabelle auf /kosten. */
  beispielMenge: number;
  basis: Position[];
  variantenLabel: string;
  varianten: Variante[];
  rueckbau: {
    label: string;
    gruen: { label: string; perUnit: Spanne };
    belag: { label: string; perUnit: Spanne };
    freiLabel: string;
  };
  extras: Extra[];
  hinweise: string[];
};

export const BAU_MODELLE: BauModell[] = [
  {
    key: "pflasterarbeiten",
    unit: "qm",
    unitLabel: "m²",
    mengeLabel: "Zu pflasternde Fläche",
    mengeHint: "Länge × Breite genügt. Einfahrt, Weg und Hof zusammenzählen.",
    placeholder: "z.B. 60",
    referenzMenge: 60,
    beispielMenge: 60,
    basis: [
      { id: "einrichtung", label: "Baustelleneinrichtung, An- und Abtransport der Maschinen", fixed: { low: 450, high: 900 } },
      { id: "aushub", label: "Aushub, Abfuhr und Entsorgung", perUnit: { low: 22, high: 38 }, lohn: true },
      { id: "tragschicht", label: "Frostschutz- und Tragschicht, verdichtet", perUnit: { low: 24, high: 40 }, lohn: true },
      { id: "einbau", label: "Bettung, Verlegung, Abrütteln und Verfugen", perUnit: { low: 38, high: 62 }, lohn: true },
      { id: "einfassung", label: "Randeinfassung und Anschlüsse", perUnit: { low: 9, high: 18 } }
    ],
    variantenLabel: "Welcher Belag?",
    varianten: [
      {
        id: "beton-einfach",
        label: "Betonstein, einfaches Format",
        hint: "Rechteck- oder Verbundpflaster, grau oder anthrazit.",
        positions: [{ id: "material", label: "Material Betonstein", perUnit: { low: 24, high: 38 } }]
      },
      {
        id: "beton-hochwertig",
        label: "Betonstein, hochwertig",
        hint: "Vorgesäuberte Oberflächen, Mehrformat, Farbnuancen.",
        positions: [{ id: "material", label: "Material Betonstein hochwertig", perUnit: { low: 40, high: 68 } }]
      },
      {
        id: "naturstein",
        label: "Naturstein",
        hint: "Granit, Basalt oder Sandstein, oft im Reihenverband.",
        positions: [{ id: "material", label: "Material Naturstein", perUnit: { low: 72, high: 150 } }]
      }
    ],
    rueckbau: {
      label: "Was liegt aktuell auf der Fläche?",
      freiLabel: "Nichts, die Fläche ist frei oder Rohbau",
      gruen: { label: "Rasen, Erde oder Bepflanzung", perUnit: { low: 8, high: 18 } },
      belag: { label: "Alter Belag (Pflaster, Platten, Asphalt, Beton)", perUnit: { low: 22, high: 45 } }
    },
    extras: [
      {
        id: "schwerlast",
        label: "Befahrbar für LKW oder Wohnmobil",
        hint: "Stärkerer Aufbau und höhere Verdichtung.",
        perUnit: { low: 12, high: 28 },
        lohn: true
      },
      { id: "entwaesserung", label: "Entwässerungsrinne oder Hofablauf", fixed: { low: 450, high: 1600 } },
      { id: "treppe", label: "Treppenstufen oder Höhenversprung", fixed: { low: 600, high: 2800 } }
    ],
    hinweise: [
      "Der Aufbau richtet sich nach der tatsächlichen Belastung. Eine Terrassenfläche braucht weniger Tragschicht als eine LKW-Zufahrt.",
      "Ein neuer Belag auf altem, gesetztem Unterbau bekommt Spurrillen. Wir prüfen den Bestand, bevor wir kalkulieren."
    ]
  },
  {
    key: "terrassenbau",
    unit: "qm",
    unitLabel: "m²",
    mengeLabel: "Terrassenfläche",
    mengeHint: "Fertige Belagsfläche, ohne Beete drumherum.",
    placeholder: "z.B. 30",
    referenzMenge: 30,
    beispielMenge: 30,
    basis: [
      { id: "einrichtung", label: "Baustelleneinrichtung und Anfahrt", fixed: { low: 400, high: 800 } },
      { id: "unterbau", label: "Aushub, Unterbau, Bettung oder Punktfundamente", perUnit: { low: 45, high: 80 }, lohn: true },
      { id: "einbau", label: "Verlegung bzw. Montage inklusive Zuschnitt", perUnit: { low: 45, high: 85 }, lohn: true },
      { id: "abschluss", label: "Randabschluss, Anschluss ans Haus, Entwässerung", perUnit: { low: 10, high: 20 } }
    ],
    variantenLabel: "Welcher Belag?",
    varianten: [
      {
        id: "beton",
        label: "Betonplatten",
        hint: "Robust, günstig, große Formatauswahl.",
        positions: [{ id: "material", label: "Material Betonplatten", perUnit: { low: 32, high: 58 } }]
      },
      {
        id: "keramik",
        label: "Keramik / Feinsteinzeug",
        hint: "Pflegeleicht, farbstabil, 2 cm Stärke.",
        positions: [{ id: "material", label: "Material Keramik", perUnit: { low: 55, high: 110 } }]
      },
      {
        id: "holz",
        label: "Holz oder WPC",
        hint: "Warme Optik, Unterkonstruktion nötig, Holz braucht Pflege.",
        positions: [{ id: "material", label: "Material Holz/WPC inkl. Unterkonstruktion", perUnit: { low: 55, high: 120 } }]
      },
      {
        id: "naturstein",
        label: "Naturstein",
        hint: "Granit, Quarzit oder Sandstein, jede Platte ein Unikat.",
        positions: [{ id: "material", label: "Material Naturstein", perUnit: { low: 70, high: 150 } }]
      }
    ],
    rueckbau: {
      label: "Was ist heute an der Stelle?",
      freiLabel: "Freie Fläche oder Neubau",
      gruen: { label: "Rasen oder Beet", perUnit: { low: 6, high: 15 } },
      belag: { label: "Alte Terrasse muss raus", perUnit: { low: 20, high: 42 } }
    },
    extras: [
      { id: "beleuchtung", label: "Beleuchtung und Stromleitung", hint: "Vor dem Belag verlegt.", fixed: { low: 450, high: 1400 } },
      { id: "stufe", label: "Stufe, Podest oder Höhenversprung", fixed: { low: 400, high: 1800 } },
      {
        id: "stelzlager",
        label: "Aufbau auf Stelzlagern",
        hint: "Auf einer bestehenden Betonplatte oder Abdichtung.",
        perUnit: { low: 10, high: 25 }
      }
    ],
    hinweise: [
      "Entscheidend ist die Aufbauhöhe an der Tür. Ist sie zu gering, kommen Stelzlager oder eine Rinne dazu.",
      "Rund zwei Prozent Gefälle vom Haus weg sind Pflicht, sonst steht Wasser auf der Fläche."
    ]
  },
  {
    key: "gartenneugestaltung",
    unit: "qm",
    unitLabel: "m²",
    mengeLabel: "Gartenfläche insgesamt",
    mengeHint: "Die gesamte Fläche, die umgestaltet werden soll.",
    placeholder: "z.B. 250",
    referenzMenge: 250,
    beispielMenge: 250,
    basis: [
      { id: "einrichtung", label: "Baustelleneinrichtung, Maschinentransport, Schuttmulden", fixed: { low: 800, high: 1800 } }
    ],
    variantenLabel: "Wie umfangreich soll der Garten werden?",
    varianten: [
      {
        id: "einfach",
        label: "Einfach",
        hint: "Boden herrichten, Rasen, Beete, schmaler Weg.",
        positions: [
          { id: "erdarbeiten", label: "Erdarbeiten und Entsorgung", perUnit: { low: 12, high: 25 }, lohn: true },
          { id: "rasen", label: "Bodenaufbereitung und Rasen", perUnit: { low: 14, high: 26 }, lohn: true },
          { id: "beete", label: "Beete, Boden und Pflanzen", perUnit: { low: 16, high: 34 } },
          { id: "wege", label: "Wege und Kanten", perUnit: { low: 13, high: 20 } }
        ]
      },
      {
        id: "standard",
        label: "Standard",
        hint: "Terrasse, Wege, Beete, Rasen, Technik vorbereitet.",
        positions: [
          { id: "erdarbeiten", label: "Erdarbeiten, Modellierung und Entsorgung", perUnit: { low: 18, high: 35 }, lohn: true },
          { id: "belag", label: "Befestigte Flächen: Terrasse und Wege", perUnit: { low: 45, high: 90 }, lohn: true },
          { id: "vegetation", label: "Boden, Rasen und Bepflanzung", perUnit: { low: 28, high: 52 } },
          { id: "technik", label: "Technik: Leerrohre, Licht, Wasseranschluss", perUnit: { low: 10, high: 22 } },
          { id: "neben", label: "Planung und Nebenkosten", perUnit: { low: 9, high: 18 } }
        ]
      },
      {
        id: "gehoben",
        label: "Gehoben",
        hint: "Viel Belag, Mauern, Großgehölze, Licht und Wasser.",
        positions: [
          { id: "erdarbeiten", label: "Erdarbeiten, Geländemodellierung, Entsorgung", perUnit: { low: 30, high: 60 }, lohn: true },
          { id: "belag", label: "Befestigte Flächen, Mauern und Treppen", perUnit: { low: 85, high: 180 }, lohn: true },
          { id: "vegetation", label: "Vegetation inklusive Großgehölzen", perUnit: { low: 45, high: 90 } },
          { id: "technik", label: "Technik: Licht, Wasser, Bewässerung", perUnit: { low: 22, high: 45 } },
          { id: "neben", label: "Planung und Nebenkosten", perUnit: { low: 18, high: 35 } }
        ]
      }
    ],
    rueckbau: {
      label: "Wie ist der Bestand?",
      freiLabel: "Neubau, Rohbaugelände oder leere Fläche",
      gruen: { label: "Alter Garten, Bewuchs muss weg", perUnit: { low: 6, high: 14 } },
      belag: { label: "Befestigte Flächen müssen zurückgebaut werden", perUnit: { low: 15, high: 32 } }
    },
    extras: [
      {
        id: "bewaesserung",
        label: "Automatische Bewässerung mitplanen",
        fixed: { low: 850, high: 1900 },
        perUnit: { low: 8, high: 18 }
      },
      { id: "mauer", label: "Mauern, Hochbeete oder Sitzstufen", fixed: { low: 1200, high: 6500 } },
      { id: "drainage", label: "Drainage oder Versickerung", perUnit: { low: 8, high: 20 }, lohn: true },
      { id: "beleuchtung", label: "Gartenbeleuchtung", fixed: { low: 600, high: 2400 } }
    ],
    hinweise: [
      "Der größte Kostentreiber ist der Anteil befestigter Flächen. Ein Quadratmeter Rasen kostet einen Bruchteil eines Quadratmeters Terrasse.",
      "Große Bäume, schlechter Boden und Bauschutt im Untergrund treiben die Erdarbeiten nach oben, das sieht man erst vor Ort."
    ]
  },
  {
    key: "zaun-sichtschutz",
    unit: "lfm",
    unitLabel: "lfm",
    mengeLabel: "Länge",
    mengeHint: "Laufende Meter entlang der Grenze, Tore separat.",
    placeholder: "z.B. 30",
    referenzMenge: 30,
    beispielMenge: 30,
    basis: [
      { id: "einrichtung", label: "Anfahrt, Aufmaß und Absteckung", fixed: { low: 250, high: 550 } },
      { id: "fundament", label: "Pfostenfundamente bzw. Einschlaghülsen", perUnit: { low: 22, high: 48 }, lohn: true },
      { id: "montage", label: "Montage und Ausrichten", perUnit: { low: 28, high: 55 }, lohn: true }
    ],
    variantenLabel: "Welches System?",
    varianten: [
      {
        id: "doppelstab",
        label: "Doppelstabmatten",
        hint: "Robust, günstig, verzinkt oder beschichtet.",
        positions: [{ id: "material", label: "Material Doppelstabmatten inkl. Pfosten", perUnit: { low: 38, high: 70 } }]
      },
      {
        id: "holz",
        label: "Holz",
        hint: "Lamellen, Flechtzaun oder Rhombus, natürliche Optik.",
        positions: [{ id: "material", label: "Material Holz inkl. Pfosten", perUnit: { low: 65, high: 130 } }]
      },
      {
        id: "wpc-alu",
        label: "WPC oder Aluminium",
        hint: "Pflegefrei und formstabil, höherer Materialpreis.",
        positions: [{ id: "material", label: "Material WPC/Aluminium", perUnit: { low: 95, high: 190 } }]
      },
      {
        id: "gabione",
        label: "Gabionen",
        hint: "Steinkörbe, schwer, brauchen ein Streifenfundament.",
        positions: [{ id: "material", label: "Material Gabionen inkl. Füllung", perUnit: { low: 110, high: 230 } }]
      }
    ],
    rueckbau: {
      label: "Steht dort schon etwas?",
      freiLabel: "Nein, die Grenze ist frei",
      gruen: { label: "Hecke oder Bewuchs muss weg", perUnit: { low: 10, high: 25 } },
      belag: { label: "Alter Zaun oder alte Mauer muss weg", perUnit: { low: 12, high: 30 } }
    },
    extras: [
      { id: "tor", label: "Tor oder Gartentür", hint: "Pro Element inklusive Beschlag.", fixed: { low: 650, high: 2400 } },
      { id: "hoehe", label: "Höher als 1,80 m", perUnit: { low: 12, high: 32 } },
      { id: "hang", label: "Abtreppung im Hang", perUnit: { low: 8, high: 22 }, lohn: true }
    ],
    hinweise: [
      "Höhe und Grenzabstand regeln Landesrecht und örtliche Satzung. Wir prüfen das vor der Montage.",
      "Sichtschutzwände und Tore brauchen Betonfundamente, leichte Zäune kommen oft mit Einschlaghülsen aus."
    ]
  },
  {
    key: "bewaesserung",
    unit: "qm",
    unitLabel: "m²",
    mengeLabel: "Zu bewässernde Fläche",
    mengeHint: "Rasen und Beete zusammen, ohne Terrasse und Wege.",
    placeholder: "z.B. 300",
    referenzMenge: 300,
    beispielMenge: 300,
    basis: [
      {
        id: "steuerung",
        label: "Anschluss, Ventilbox, Steuerung und Programmierung",
        fixed: { low: 850, high: 1900 }
      }
    ],
    variantenLabel: "Was soll bewässert werden?",
    varianten: [
      {
        id: "rasen",
        label: "Nur Rasen",
        hint: "Versenkregner in Kreisen ausgelegt.",
        positions: [{ id: "technik", label: "Regner, Rohrleitungen und Verlegung", perUnit: { low: 9, high: 20 }, lohn: true }]
      },
      {
        id: "gemischt",
        label: "Rasen und Beete",
        hint: "Getrennte Kreise für Regner und Tropflinien.",
        positions: [{ id: "technik", label: "Regner, Tropflinien, Rohre und Verlegung", perUnit: { low: 10, high: 24 }, lohn: true }]
      },
      {
        id: "beet",
        label: "Nur Beete",
        hint: "Tropfbewässerung, sparsam und zielgenau.",
        positions: [{ id: "technik", label: "Tropflinien, Verteiler und Verlegung", perUnit: { low: 7, high: 16 }, lohn: true }]
      }
    ],
    rueckbau: {
      label: "Neuanlage oder Nachrüstung?",
      freiLabel: "Garten wird ohnehin neu angelegt",
      gruen: { label: "Nachrüstung im bestehenden Garten", perUnit: { low: 2, high: 6 } },
      belag: { label: "Leitungen müssen unter befestigte Flächen", perUnit: { low: 5, high: 14 } }
    },
    extras: [
      { id: "sensor", label: "Regensensor oder App-Steuerung", fixed: { low: 180, high: 480 } },
      { id: "zisterne", label: "Zisterne oder Pumpe anbinden", fixed: { low: 900, high: 2400 } },
      {
        id: "wartung",
        label: "Wartungspaket im ersten Jahr",
        hint: "Inbetriebnahme im Frühjahr, Einwintern im Herbst.",
        fixed: { low: 180, high: 380 }
      }
    ],
    hinweise: [
      "Druck und Durchfluss am Hausanschluss entscheiden, wie viele Kreise nötig sind. Das messen wir vor der Auslegung.",
      "Nachrüsten geht mit dem Verlegepflug, der Rasen wächst in wenigen Wochen wieder zu."
    ]
  },
  {
    key: "gewerbeflaechen",
    unit: "qm",
    unitLabel: "m²",
    mengeLabel: "Fläche der Außenanlage",
    mengeHint: "Verkehrsflächen und Grünflächen zusammen.",
    placeholder: "z.B. 800",
    referenzMenge: 500,
    beispielMenge: 800,
    basis: [
      { id: "einrichtung", label: "Baustelleneinrichtung, Verkehrssicherung, Dokumentation", fixed: { low: 1200, high: 2800 } }
    ],
    variantenLabel: "Wie setzt sich die Fläche zusammen?",
    varianten: [
      {
        id: "gruen",
        label: "Überwiegend Grünflächen",
        hint: "Rasen, Rabatten, Gehölzflächen.",
        positions: [
          { id: "erd", label: "Bodenaufbereitung und Modellierung", perUnit: { low: 8, high: 20 }, lohn: true },
          { id: "vegetation", label: "Rasen, Pflanzen und Substrate", perUnit: { low: 17, high: 50 } }
        ]
      },
      {
        id: "misch",
        label: "Gemischt",
        hint: "Wege, Stellplätze und Grünstreifen.",
        positions: [
          { id: "erd", label: "Erdarbeiten, Aushub und Entsorgung", perUnit: { low: 15, high: 32 }, lohn: true },
          { id: "belag", label: "Befestigte Flächen mit Unterbau", perUnit: { low: 30, high: 78 }, lohn: true },
          { id: "vegetation", label: "Grünflächen und Bepflanzung", perUnit: { low: 15, high: 40 } }
        ]
      },
      {
        id: "verkehr",
        label: "Überwiegend Verkehrsflächen",
        hint: "Stellplätze, Zufahrten, Hofflächen.",
        positions: [
          { id: "erd", label: "Erdarbeiten, Aushub und Entsorgung", perUnit: { low: 22, high: 42 }, lohn: true },
          { id: "belag", label: "Tragschicht, Belag und Einfassung", perUnit: { low: 62, high: 140 }, lohn: true },
          { id: "rest", label: "Grünstreifen und Randbereiche", perUnit: { low: 11, high: 28 } }
        ]
      }
    ],
    rueckbau: {
      label: "Wie ist der Bestand?",
      freiLabel: "Neubau oder freie Fläche",
      gruen: { label: "Bestandsgrün muss weichen", perUnit: { low: 5, high: 12 } },
      belag: { label: "Bestehende Befestigung muss zurückgebaut werden", perUnit: { low: 18, high: 40 } }
    },
    extras: [
      { id: "entwaesserung", label: "Entwässerung, Rinnen und Schächte", perUnit: { low: 10, high: 30 }, lohn: true },
      { id: "beleuchtung", label: "Außenbeleuchtung und Leerrohre", fixed: { low: 800, high: 3500 } }
    ],
    hinweise: [
      "Bei Ausschreibungen kalkulieren wir nach Leistungsverzeichnis, damit Sie Angebote sauber vergleichen können.",
      "Verkehrsflächen brauchen einen belastungsgerechten Aufbau. Der Unterschied zu einer PKW-Fläche liegt schnell bei 30 Prozent."
    ]
  }
];

export function findBauModell(key: string): BauModell | undefined {
  return BAU_MODELLE.find((modell) => modell.key === key);
}

function modelleFor(serviceKeys: string[]): BauModell[] {
  return serviceKeys.map((key) => findBauModell(key)).filter((modell): modell is BauModell => Boolean(modell));
}

/**
 * Fragetext und Antworten zum Bestand hängen an der Leistung: bei einer
 * Terrasse geht es um die alte Terrasse, beim Zaun um den alten Zaun, bei der
 * Bewässerung um Neuanlage gegen Nachrüstung. Nur wenn mehrere Leistungen
 * gewählt sind, fällt der Text auf eine neutrale Formulierung zurück.
 */
export function bestandFrage(serviceKeys: string[]): string {
  const modelle = modelleFor(serviceKeys);
  return modelle.length === 1 ? modelle[0].rueckbau.label : "Wie sieht die Fläche heute aus?";
}

export function bestandOptionen(serviceKeys: string[]): Array<{ id: Bestandslage; label: string }> {
  const modelle = modelleFor(serviceKeys);
  const einziges = modelle.length === 1 ? modelle[0] : null;
  return [
    { id: "frei", label: einziges ? einziges.rueckbau.freiLabel : "Freie Fläche oder Neubau" },
    {
      id: "gruen-rueckbau",
      label: einziges ? einziges.rueckbau.gruen.label : "Rasen, Bewuchs oder Bepflanzung muss weg"
    },
    {
      id: "belag-rueckbau",
      label: einziges ? einziges.rueckbau.belag.label : "Belag, Zaun oder Bauwerk muss zurückgebaut werden"
    },
    { id: "unklar", label: "Noch unklar" }
  ];
}

/** Beschriftung des Mengenfeldes, ebenfalls leistungsabhängig. */
export function mengeFrage(
  serviceKeys: string[],
  unit: "qm" | "lfm"
): { label: string; hint: string; placeholder: string } {
  const modelle = modelleFor(serviceKeys).filter((modell) => modell.unit === unit);
  if (modelle.length === 1) {
    return { label: modelle[0].mengeLabel, hint: modelle[0].mengeHint, placeholder: modelle[0].placeholder };
  }
  return unit === "lfm"
    ? { label: "Länge in laufenden Metern", hint: "Grob geschätzt genügt.", placeholder: "z.B. 30" }
    : { label: "Fläche in m²", hint: "Länge × Breite, grob geschätzt genügt.", placeholder: "z.B. 120" };
}

/* ------------------------------------------------------------------ *
 * Bau-Berechnung
 * ------------------------------------------------------------------ */

export type BauInput = {
  serviceKey: string;
  menge?: number;
  varianteId?: string;
  bestand?: Bestandslage;
  zugang?: Zugang;
  hang?: Hangstufe;
  extras?: string[];
  /**
   * True, wenn die Materialklasse nicht abgefragt wurde (Projekt-Assistent).
   * Die Spanne wird dann bewusst geweitet, statt eine Genauigkeit
   * vorzutäuschen, die die Angaben nicht hergeben.
   */
  unsicher?: boolean;
};

export type Kostenposition = { id: string; label: string; low: number; high: number; note?: string };

export type BauErgebnis = {
  modus: "bau";
  low: number;
  high: number;
  /** Preis je m² bzw. lfm, gerundet. */
  proEinheitLow: number;
  proEinheitHigh: number;
  unitLabel: string;
  positionen: Kostenposition[];
  /** True, wenn keine Menge angegeben wurde und mit der Referenzgröße gerechnet wurde. */
  roughOnly: boolean;
  size: ProjectSize;
  hinweise: string[];
};

/**
 * Rundungsschritt wächst mit der Größenordnung. Bei einem Pflegeeinsatz von
 * 130 € würde ein 500er-Schritt aus einer engen Spanne wieder eine
 * nichtssagende machen, bei einem 90.000-€-Projekt wären 10-€-Schritte
 * unseriös genau.
 */
function schrittFor(high: number): number {
  if (high < 400) return 10;
  if (high < 1500) return 25;
  if (high < 6000) return 50;
  if (high < 25000) return 100;
  return 250;
}

/**
 * `step` wird übergeben, wenn alle Positionen einer Kalkulation im selben
 * Raster liegen sollen — nur dann ergibt die Summe der angezeigten Positionen
 * exakt die angezeigte Gesamtsumme.
 */
function rundeSpanne(low: number, high: number, step?: number): Spanne {
  if (high <= 0) return { low: 0, high: 0 };
  const raster = step ?? schrittFor(high);
  return {
    low: Math.max(raster, Math.floor(low / raster) * raster),
    high: Math.max(raster * 2, Math.ceil(high / raster) * raster)
  };
}

function sizeFor(low: number, high: number): ProjectSize {
  const mitte = (low + high) / 2;
  const { klein, mittel } = galabau.estimator.sizeThresholds;
  return mitte < klein ? "klein" : mitte < mittel ? "mittel" : "gross";
}

export function berechneBau(input: BauInput): BauErgebnis | null {
  const modell = findBauModell(input.serviceKey);
  if (!modell) return null;

  const roughOnly = !input.menge || input.menge <= 0;
  const menge = roughOnly ? modell.referenzMenge : Number(input.menge);

  const variante =
    modell.varianten.find((entry) => entry.id === input.varianteId) ??
    modell.varianten[Math.min(1, modell.varianten.length - 1)];

  const zugang = input.zugang ?? "unklar";
  const hang = input.hang ?? "unklar";
  const bestand = input.bestand ?? "unklar";

  const lohnFaktor = ZUGANG_FAKTOR[zugang] * HANG_FAKTOR[hang] * degression(menge, modell.referenzMenge);

  // Erst alle Positionen ungerundet sammeln: das Raster für die Rundung ergibt
  // sich aus der Gesamtgröße und muss für jede Position dasselbe sein.
  const roh: Array<{ id: string; label: string; low: number; high: number; note?: string }> = [];
  let rohLow = 0;
  let rohHigh = 0;

  const addPosition = (position: Position) => {
    const faktor = position.lohn ? lohnFaktor : 1;
    let posLow = 0;
    let posHigh = 0;
    if (position.fixed) {
      posLow += position.fixed.low;
      posHigh += position.fixed.high;
    }
    if (position.perUnit) {
      posLow += position.perUnit.low * menge * faktor;
      posHigh += position.perUnit.high * menge * faktor;
    }
    if (posLow <= 0 && posHigh <= 0) return;
    rohLow += posLow;
    rohHigh += posHigh;
    roh.push({ id: position.id, label: position.label, low: posLow, high: posHigh, note: position.note });
  };

  modell.basis.forEach(addPosition);
  variante.positions.forEach(addPosition);

  if (bestand === "gruen-rueckbau") {
    addPosition({
      id: "rueckbau",
      label: `Rückbau: ${modell.rueckbau.gruen.label}`,
      perUnit: modell.rueckbau.gruen.perUnit,
      lohn: true
    });
  } else if (bestand === "belag-rueckbau") {
    addPosition({
      id: "rueckbau",
      label: `Rückbau: ${modell.rueckbau.belag.label}`,
      perUnit: modell.rueckbau.belag.perUnit,
      lohn: true
    });
  }

  for (const extraId of input.extras ?? []) {
    const extra = modell.extras.find((entry) => entry.id === extraId);
    if (extra) addPosition(extra);
  }

  // Alle Positionen im selben Raster runden, damit die angezeigte Liste exakt
  // auf die Gesamtsumme darüber aufgeht.
  const raster = schrittFor(rohHigh);
  const positionen: Kostenposition[] = roh.map((eintrag) => {
    const gerundet = rundeSpanne(eintrag.low, eintrag.high, raster);
    return { id: eintrag.id, label: eintrag.label, low: gerundet.low, high: gerundet.high, note: eintrag.note };
  });

  // Ohne Materialklasse oder ohne Menge ist die Aussage schwächer. Das wird
  // durch eine breitere Spanne abgebildet statt durch eine schöne, falsche Zahl.
  const geweitet = Boolean(input.unsicher) || roughOnly;
  let low = rohLow;
  let high = rohHigh;
  if (input.unsicher) {
    low *= 0.88;
    high *= 1.25;
  }
  if (roughOnly) {
    low *= 0.5;
    high *= 1.8;
  }

  let gesamt = geweitet
    ? rundeSpanne(low, high)
    : {
        low: positionen.reduce((summe, position) => summe + position.low, 0),
        high: positionen.reduce((summe, position) => summe + position.high, 0)
      };

  const mindest = galabau.estimator.minProjectEur * 0.4;
  if (gesamt.low < mindest || gesamt.high < gesamt.low * 1.35) {
    gesamt = rundeSpanne(Math.max(mindest, gesamt.low), Math.max(Math.max(mindest, gesamt.low) * 1.35, gesamt.high));
  }
  const proEinheitLow = Math.round(gesamt.low / menge);
  const proEinheitHigh = Math.round(gesamt.high / menge);

  const hinweise = [...modell.hinweise];
  if (zugang === "handbetrieb") {
    hinweise.unshift("Wenn alles von Hand transportiert werden muss, steigt der Lohnanteil deutlich. Das ist im Ergebnis bereits berücksichtigt.");
  }
  if (hang === "stark") {
    hinweise.unshift("Bei deutlichem Hang kommen häufig Stützmauern oder Abfangungen dazu, die hier noch nicht enthalten sind.");
  }

  // Ohne Mengenangabe ist die Spanne so breit, dass ihr Mittelwert fast jedes
  // Projekt als "groß" einstufen würde. Das würde den Lead-Score verzerren,
  // deshalb bleibt es dann bei höchstens "mittel".
  const gemessen = sizeFor(gesamt.low, gesamt.high);
  const size: ProjectSize = roughOnly && gemessen === "gross" ? "mittel" : gemessen;

  return {
    modus: "bau",
    low: gesamt.low,
    high: gesamt.high,
    proEinheitLow,
    proEinheitHigh,
    unitLabel: modell.unitLabel,
    positionen,
    roughOnly,
    size,
    hinweise
  };
}

/* ------------------------------------------------------------------ *
 * Pflege-Modell
 * ------------------------------------------------------------------ */

export const PFLEGE_LEISTUNGEN = [
  { id: "rasen", label: "Rasen mähen und pflegen" },
  { id: "hecke", label: "Hecken- und Formschnitt" },
  { id: "beet", label: "Beetpflege: jäten, hacken, mulchen" },
  { id: "gehoelz", label: "Sträucher und Gehölze schneiden" },
  { id: "laub", label: "Laub entfernen im Herbst" },
  { id: "vertikutieren", label: "Vertikutieren, Düngen, Nachsaat" },
  { id: "wildkraut", label: "Wildkraut auf Wegen und Flächen" },
  { id: "winter", label: "Winterdienst" }
] as const;

export type PflegeLeistungId = (typeof PFLEGE_LEISTUNGEN)[number]["id"];

// Der Abstand zwischen den Stufen bleibt bewusst gleichmäßig: zwischen "alle
// zwei Wochen" und "monatlich" liegt ein ganzer Rhythmus, und wer nur alle paar
// Monate jemanden im Garten haben will, findet zwischen monatlich und "ein paar
// Mal im Jahr" sonst nichts Passendes.
export const TURNUS_OPTIONEN: Array<{ id: Turnus; label: string; hint: string; einsaetze: number }> = [
  { id: "einmalig", label: "Einmaliger Einsatz", hint: "Der Garten soll einmal auf Stand gebracht werden.", einsaetze: 1 },
  { id: "woechentlich", label: "Wöchentlich", hint: "Rasen immer kurz, in der Saison rund 26 Einsätze.", einsaetze: 26 },
  { id: "zweiwoechentlich", label: "Alle zwei Wochen", hint: "Der übliche Rhythmus für Hausgärten, rund 14 Einsätze.", einsaetze: 14 },
  { id: "dreiwoechentlich", label: "Alle drei Wochen", hint: "Etwas ruhiger, rund 10 Einsätze in der Saison.", einsaetze: 10 },
  { id: "monatlich", label: "Monatlich", hint: "Rund 8 Einsätze von März bis Oktober.", einsaetze: 8 },
  { id: "sechswoechentlich", label: "Alle sechs Wochen", hint: "Nur das Nötigste, rund 6 Einsätze im Jahr.", einsaetze: 6 },
  { id: "saisonal", label: "Ein paar Mal im Jahr", hint: "Frühjahr, Sommer, Herbst — rund 4 Einsätze.", einsaetze: 4 }
];

export const ZUSTAND_OPTIONEN: Array<{ id: Pflegezustand; label: string; hint: string; faktor: number }> = [
  { id: "gepflegt", label: "Gepflegt", hint: "Wird regelmäßig gemacht, soll nur weiterlaufen.", faktor: 1 },
  { id: "ueberwachsen", label: "Etwas aus dem Ruder", hint: "Ein paar Monate nichts gemacht.", faktor: 1.8 },
  { id: "verwildert", label: "Stark verwildert", hint: "Seit über einem Jahr nichts passiert.", faktor: 3 }
];

const PFLEGE_SAETZE = {
  grundpauschale: { low: 55, high: 95 },
  rasenProQm: { low: 0.1, high: 0.22 },
  beetProQm: { low: 0.9, high: 1.9 },
  heckeProLfm: { low: 5.5, high: 11 },
  gehoelzProEinsatz: { low: 45, high: 130 },
  laubProJahr: { low: 90, high: 320 },
  vertikutierenProQm: { low: 0.5, high: 1.2 },
  wildkrautProEinsatz: { low: 25, high: 70 },
  winterProJahr: { low: 240, high: 900 },
  entsorgungProEinsatz: { low: 12, high: 30 }
};

export const HECKE_SCHNITTE_MAX = 4;

// Zwei Schnitte sind der Normalfall, drei und vier gehören zur akkurat
// gehaltenen Formhecke — die gibt es oft genug, um sie anbieten zu müssen.
export const HECKE_SCHNITT_OPTIONEN: Array<{ anzahl: number; label: string; hint: string }> = [
  { anzahl: 1, label: "Einmal im Jahr", hint: "Ein Schnitt reicht, die Hecke darf wachsen." },
  { anzahl: 2, label: "Zweimal im Jahr", hint: "Der Normalfall: Juni und Spätsommer." },
  { anzahl: 3, label: "Dreimal im Jahr", hint: "Für Hecken, die immer in Form sein sollen." },
  { anzahl: 4, label: "Viermal im Jahr", hint: "Akkurate Formhecke, durchgehend auf Kante." }
];

/**
 * Der zweite und jeder weitere Heckenschnitt kostet weniger als der erste: die
 * Hecke steht dann schon in Form, es wächst weniger nach und es fällt weniger
 * Schnittgut an. Wer die Hecke wirklich akkurat mag, zahlt für vier Schnitte
 * deshalb nicht das Vierfache.
 */
const HECKE_SCHNITT_FAKTOR: Record<number, number> = { 1: 1, 2: 1.9, 3: 2.7, 4: 3.4 };

/**
 * Anteil der Abfuhr an den saisonalen Grünschnitt-Positionen. Die Sätze für
 * Hecke, Gehölz und Laub enthalten die Entsorgung; wer das Schnittgut selbst
 * behält, zahlt sie nicht.
 */
const ENTSORGUNG_ANTEIL_SAISONAL = 0.15;

export type PflegeInput = {
  leistungen: string[];
  rasenQm?: number;
  beetQm?: number;
  heckeLfm?: number;
  heckeSchnitteProJahr?: number;
  zustand?: Pflegezustand;
  turnus?: Turnus;
  entsorgung?: boolean;
  gewerblich?: boolean;
};

export type PflegeErgebnis = {
  modus: "pflege";
  einsaetzeProJahr: number;
  turnusLabel: string;
  ersteinsatz: Spanne;
  regelEinsatz: Spanne;
  jahrLow: number;
  jahrHigh: number;
  positionen: Kostenposition[];
  size: ProjectSize;
  hinweise: string[];
};

/**
 * Pflege wird nicht als Projektsumme gerechnet, sondern als Preis je Einsatz
 * mal Turnus. Der Ersteinsatz wird je nach Zustand mit einem Faktor belegt,
 * weil "ein Jahr nichts gemacht" den ersten Termin vervielfacht, danach aber
 * wieder normal wird.
 */
export function berechnePflege(input: PflegeInput): PflegeErgebnis {
  const leistungen = new Set(input.leistungen);
  const turnusEintrag = TURNUS_OPTIONEN.find((entry) => entry.id === input.turnus) ?? TURNUS_OPTIONEN[2];
  const zustandEintrag = ZUSTAND_OPTIONEN.find((entry) => entry.id === input.zustand) ?? ZUSTAND_OPTIONEN[0];
  const gewerbeFaktor = input.gewerblich ? 1.08 : 1;

  const rasenQm = Number(input.rasenQm) > 0 ? Number(input.rasenQm) : 0;
  const beetQm = Number(input.beetQm) > 0 ? Number(input.beetQm) : 0;
  const heckeLfm = Number(input.heckeLfm) > 0 ? Number(input.heckeLfm) : 0;
  const heckeSchnitte = Math.max(1, Math.min(HECKE_SCHNITTE_MAX, Math.round(input.heckeSchnitteProJahr ?? 1)));
  const entsorgungAktiv = input.entsorgung !== false;
  // Ohne Abfuhr bleibt das Schnittgut vor Ort, die Entsorgung fällt aus dem Satz.
  const entsorgungFaktor = entsorgungAktiv ? 1 : 1 - ENTSORGUNG_ANTEIL_SAISONAL;

  // Nur Rasen, Beete und Wildkraut laufen im Turnus mit. Wer ausschließlich
  // Heckenschnitt, Laub oder Winterdienst bestellt, hat keine regelmäßigen
  // Einsätze — und darf dafür auch keine Grundpauschale je Turnus zahlen.
  const hatTurnusLeistung = ["rasen", "beet", "wildkraut"].some((id) => leistungen.has(id));

  let einsatzLow = hatTurnusLeistung ? PFLEGE_SAETZE.grundpauschale.low : 0;
  let einsatzHigh = hatTurnusLeistung ? PFLEGE_SAETZE.grundpauschale.high : 0;

  if (leistungen.has("rasen") && rasenQm > 0) {
    einsatzLow += rasenQm * PFLEGE_SAETZE.rasenProQm.low;
    einsatzHigh += rasenQm * PFLEGE_SAETZE.rasenProQm.high;
  }
  if (leistungen.has("beet") && beetQm > 0) {
    einsatzLow += beetQm * PFLEGE_SAETZE.beetProQm.low;
    einsatzHigh += beetQm * PFLEGE_SAETZE.beetProQm.high;
  }
  if (leistungen.has("wildkraut")) {
    einsatzLow += PFLEGE_SAETZE.wildkrautProEinsatz.low;
    einsatzHigh += PFLEGE_SAETZE.wildkrautProEinsatz.high;
  }
  if (hatTurnusLeistung && entsorgungAktiv) {
    einsatzLow += PFLEGE_SAETZE.entsorgungProEinsatz.low;
    einsatzHigh += PFLEGE_SAETZE.entsorgungProEinsatz.high;
  }

  if (hatTurnusLeistung) {
    einsatzLow = Math.max(75, einsatzLow * gewerbeFaktor);
    einsatzHigh = Math.max(120, einsatzHigh * gewerbeFaktor);
  }

  const ersteinsatzLow = einsatzLow * zustandEintrag.faktor;
  const ersteinsatzHigh = einsatzHigh * zustandEintrag.faktor;

  const einsaetze = hatTurnusLeistung ? turnusEintrag.einsaetze : 0;
  const folgeEinsaetze = Math.max(0, einsaetze - 1);

  let jahrLow = ersteinsatzLow + folgeEinsaetze * einsatzLow;
  let jahrHigh = ersteinsatzHigh + folgeEinsaetze * einsatzHigh;

  const positionen: Kostenposition[] = [];
  // Pflegepositionen liegen alle im selben, feinen Raster: der Ersteinsatz
  // bewegt sich im dreistelligen Bereich, die Jahressumme im vierstelligen.
  // Ein gröberes Raster würde den Einsatzpreis unbrauchbar verwaschen.
  const PFLEGE_RASTER = 10;
  const pushPosition = (id: string, label: string, low: number, high: number, note?: string) => {
    if (high <= 0) return;
    const gerundet = rundeSpanne(low, high, PFLEGE_RASTER);
    positionen.push({ id, label, low: gerundet.low, high: gerundet.high, note });
  };

  if (hatTurnusLeistung) {
    pushPosition(
      "ersteinsatz",
      zustandEintrag.faktor > 1 ? "Ersteinsatz inklusive Aufholen des Rückstands" : "Erster Einsatz",
      ersteinsatzLow,
      ersteinsatzHigh
    );
  }
  if (folgeEinsaetze > 0) {
    pushPosition(
      "regel",
      `${folgeEinsaetze} weitere Einsätze im Jahr`,
      folgeEinsaetze * einsatzLow,
      folgeEinsaetze * einsatzHigh
    );
  }

  // Saisonale Positionen laufen nicht im Turnus mit, sondern ein- bis zweimal im Jahr.
  const entsorgungHinweis = entsorgungAktiv ? "inkl. Entsorgung" : "ohne Abfuhr";
  if (leistungen.has("hecke") && heckeLfm > 0) {
    const schnittFaktor = HECKE_SCHNITT_FAKTOR[heckeSchnitte] ?? heckeSchnitte;
    const low = heckeLfm * PFLEGE_SAETZE.heckeProLfm.low * schnittFaktor * gewerbeFaktor * entsorgungFaktor;
    const high = heckeLfm * PFLEGE_SAETZE.heckeProLfm.high * schnittFaktor * gewerbeFaktor * entsorgungFaktor;
    jahrLow += low;
    jahrHigh += high;
    pushPosition("hecke", `Heckenschnitt, ${heckeLfm} lfm × ${heckeSchnitte}/Jahr, ${entsorgungHinweis}`, low, high);
  }
  if (leistungen.has("gehoelz")) {
    const low = PFLEGE_SAETZE.gehoelzProEinsatz.low * gewerbeFaktor * entsorgungFaktor;
    const high = PFLEGE_SAETZE.gehoelzProEinsatz.high * 2 * gewerbeFaktor * entsorgungFaktor;
    jahrLow += low;
    jahrHigh += high;
    pushPosition("gehoelz", `Strauch- und Gehölzschnitt, ${entsorgungHinweis}`, low, high);
  }
  if (leistungen.has("laub")) {
    const low = PFLEGE_SAETZE.laubProJahr.low * gewerbeFaktor * entsorgungFaktor;
    const high = PFLEGE_SAETZE.laubProJahr.high * gewerbeFaktor * entsorgungFaktor;
    jahrLow += low;
    jahrHigh += high;
    pushPosition("laub", `Laubentfernung im Herbst, ${entsorgungHinweis}`, low, high);
  }
  if (leistungen.has("vertikutieren") && rasenQm > 0) {
    const low = rasenQm * PFLEGE_SAETZE.vertikutierenProQm.low * gewerbeFaktor;
    const high = rasenQm * PFLEGE_SAETZE.vertikutierenProQm.high * gewerbeFaktor;
    jahrLow += low;
    jahrHigh += high;
    pushPosition("vertikutieren", "Vertikutieren, Düngen und Nachsaat", low, high);
  }
  if (leistungen.has("winter")) {
    const low = PFLEGE_SAETZE.winterProJahr.low * gewerbeFaktor;
    const high = PFLEGE_SAETZE.winterProJahr.high * gewerbeFaktor;
    jahrLow += low;
    jahrHigh += high;
    pushPosition("winter", "Winterdienst über die Saison", low, high, "Abhängig von Einsatztagen und Fläche.");
  }

  // Die Jahressumme ist die Summe der angezeigten Positionen, nicht die separat
  // gerundete Rohsumme — sonst geht die Aufschlüsselung sichtbar nicht auf.
  const jahr = {
    low: positionen.reduce((summe, position) => summe + position.low, 0),
    high: positionen.reduce((summe, position) => summe + position.high, 0)
  };
  const ersteinsatz = rundeSpanne(ersteinsatzLow, ersteinsatzHigh, PFLEGE_RASTER);
  const regelEinsatz = rundeSpanne(einsatzLow, einsatzHigh, PFLEGE_RASTER);

  const hinweise: string[] = [
    "Pflege wird nach Aufwand kalkuliert. Nach dem ersten Einsatz wissen wir sehr genau, wie lange die Fläche braucht, und schreiben den Preis fest."
  ];
  if (leistungen.has("hecke")) {
    hinweise.push("Radikale Heckenrückschnitte sind vom 1. März bis 30. September gesetzlich nicht zulässig, Formschnitt dagegen schon.");
    if (heckeSchnitte >= 3) {
      hinweise.push("Ab dem dritten Schnitt geht es um Formschnitt an einer Hecke, die bereits in Form steht. Die zusätzlichen Termine sind deshalb günstiger als der erste.");
    }
  }
  if (!entsorgungAktiv) {
    hinweise.push("Ohne Abfuhr bleibt das Schnittgut vor Ort, auf dem Kompost oder in einem Container, den Sie stellen. Das ist in den Preisen bereits berücksichtigt.");
  }
  if (hatTurnusLeistung && zustandEintrag.faktor > 1) {
    hinweise.unshift("Der Ersteinsatz ist teurer als die Folgetermine, weil der Rückstand aufgeholt und mehr Material abgefahren wird.");
  }
  if (hatTurnusLeistung && turnusEintrag.id !== "einmalig") {
    hinweise.push("Bei festem Turnus nennen wir auf Wunsch einen Jahresbetrag in gleichen monatlichen Raten.");
  }
  if (!hatTurnusLeistung) {
    hinweise.push("Ihre Auswahl enthält nur saisonale Arbeiten. Die haben ihre eigenen Termine im Jahreslauf, deshalb entfällt hier der Turnus.");
  }

  const mitte = (jahr.low + jahr.high) / 2;
  const size: ProjectSize = mitte < 900 ? "klein" : mitte < 3000 ? "mittel" : "gross";

  return {
    modus: "pflege",
    einsaetzeProJahr: einsaetze,
    turnusLabel: hatTurnusLeistung ? turnusEintrag.label : "Saisonale Arbeiten",
    ersteinsatz,
    regelEinsatz,
    jahrLow: jahr.low,
    jahrHigh: jahr.high,
    positionen,
    size,
    hinweise
  };
}

/* ------------------------------------------------------------------ *
 * Mehrere Leistungen zusammen (Projekt-Assistent)
 * ------------------------------------------------------------------ */

export type ProjektKalkulation = {
  low: number;
  high: number;
  size: ProjectSize;
  roughOnly: boolean;
  teile: Array<{ serviceKey: string; label: string; low: number; high: number }>;
};

/**
 * Interne Einschätzung für den Projekt-Assistenten. Der Besucher sieht diese
 * Zahl bewusst nicht — sie dient der Priorisierung im Büro und dem Abgleich
 * mit dem angegebenen Budgetrahmen.
 */
export function berechneProjekt(input: {
  serviceKeys: string[];
  qm?: number;
  lfm?: number;
  bestand?: Bestandslage;
  zugang?: Zugang;
  hang?: Hangstufe;
}): ProjektKalkulation | null {
  let bauKeys = input.serviceKeys.filter((key) => findBauModell(key));
  if (!bauKeys.length) return null;

  // Der Assistent kennt nur *eine* Flächenangabe für alle m²-Leistungen. Wer
  // "Gartenneugestaltung + Pflaster + Bewässerung" wählt und 100 m² einträgt,
  // meint dieselben 100 m² — und die Neugestaltung enthält Beläge und Technik
  // bereits. Ohne diese Bereinigung würde dieselbe Fläche mehrfach berechnet.
  if (bauKeys.includes("gartenneugestaltung")) {
    bauKeys = bauKeys.filter((key) => findBauModell(key)?.unit !== "qm" || key === "gartenneugestaltung");
  }

  let low = 0;
  let high = 0;
  let roughOnly = false;
  const teile: ProjektKalkulation["teile"] = [];

  for (const key of bauKeys) {
    const modell = findBauModell(key);
    if (!modell) continue;
    const menge = modell.unit === "lfm" ? input.lfm : input.qm;
    const ergebnis = berechneBau({
      serviceKey: key,
      menge,
      bestand: input.bestand,
      zugang: input.zugang,
      hang: input.hang,
      unsicher: true
    });
    if (!ergebnis) continue;
    low += ergebnis.low;
    high += ergebnis.high;
    if (ergebnis.roughOnly) roughOnly = true;
    const service = galabau.services.find((entry) => entry.key === key);
    teile.push({ serviceKey: key, label: service?.label ?? key, low: ergebnis.low, high: ergebnis.high });
  }

  if (!teile.length) return null;

  // Gemeinsame Baustelleneinrichtung fällt nur einmal an.
  if (teile.length > 1) {
    low *= 0.92;
    high *= 0.95;
  }

  const gesamt = rundeSpanne(low, high);
  const gemessen = sizeFor(gesamt.low, gesamt.high);
  return {
    low: gesamt.low,
    high: gesamt.high,
    // Wie in berechneBau: ohne Mengenangabe darf die breite Spanne den
    // Lead-Score nicht nach oben ziehen.
    size: roughOnly && gemessen === "gross" ? "mittel" : gemessen,
    roughOnly,
    teile
  };
}

/* ------------------------------------------------------------------ *
 * Budgetrahmen je Leistung
 * ------------------------------------------------------------------ */

/**
 * Obergrenzen der Budgetstufen, je Leistung — der Rückfallwert, solange keine
 * Menge bekannt ist.
 *
 * Eine gemeinsame Leiter in Zehntausenderschritten macht die Frage für die
 * kleinen Gewerke wertlos: Ein Zaun über 30 lfm liegt bei rund 3.000 bis
 * 6.000 €, landet also fast immer in „bis 5.000 €“ — und wir erfahren nichts.
 * Umgekehrt ist „bis 5.000 €“ bei einer Gartenneugestaltung selten eine
 * sinnvolle Antwort. Die Stufen orientieren sich deshalb an der Kalkulation
 * des jeweiligen Modells bei Referenzmenge und reichen nach unten weit genug,
 * dass auch der kleine Auftrag eine eigene Stufe hat.
 *
 * Ohne Eintrag (etwa bei reinem „Sonstiges“) gilt die Leiter aus der Config.
 */
const BUDGET_STUFEN: Partial<Record<GalabauServiceKey, number[]>> = {
  "zaun-sichtschutz": [1000, 2500, 5000, 10000, 20000],
  baumpflege: [500, 1000, 2500, 5000, 10000],
  bewaesserung: [1500, 3000, 6000, 10000, 20000],
  terrassenbau: [2500, 5000, 10000, 20000, 35000],
  pflasterarbeiten: [2500, 5000, 10000, 20000, 40000],
  gartenneugestaltung: [5000, 10000, 25000, 50000, 100000],
  gewerbeflaechen: [5000, 15000, 40000, 80000, 150000]
};

/** Stufen sollen wie Preisschilder aussehen, nicht wie Rechenergebnisse. */
const RUNDE_MANTISSEN = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10];

const BUDGET_MIN_STUFE = 500;

/** Nächster „glatter“ Wert (1.500, 2.000, 2.500, 3.000, 4.000, 5.000, 7.500 …). */
function rundeAufStufe(value: number): number {
  if (value <= BUDGET_MIN_STUFE) return BUDGET_MIN_STUFE;
  const dekade = Math.pow(10, Math.floor(Math.log10(value)));
  const mantisse = value / dekade;
  const beste = RUNDE_MANTISSEN.reduce((treffer, kandidat) =>
    Math.abs(Math.log(kandidat / mantisse)) < Math.abs(Math.log(treffer / mantisse)) ? kandidat : treffer
  );
  return Math.round(beste * dekade);
}

/** Nächsthöherer glatter Wert, damit zwei Stufen nie zusammenfallen. */
function naechsteStufe(value: number): number {
  const dekade = Math.pow(10, Math.floor(Math.log10(value)));
  for (const mantisse of RUNDE_MANTISSEN) {
    const kandidat = Math.round(mantisse * dekade);
    if (kandidat > value) return kandidat;
  }
  return value * 2;
}

/**
 * Lage der Stufen zur internen Kalkulation.
 *
 * Die Rechnung selbst bekommt der Nutzer nicht zu sehen, sie legt aber die
 * Schwellen fest. Bei einer Kalkulation von 5.000 bis 10.800 € entsteht so
 * „bis 2.500 / 2.500–5.000 / 5.000–7.500 / 7.500–10.000 / 10.000–15.000 /
 * mehr“ — die Spanne selbst wird zweigeteilt, statt in einer einzigen Stufe
 * zu verschwinden:
 *
 *   halbe Untergrenze  klar darunter. Wer hier klickt, sucht etwas anderes;
 *                      der Lead-Score wertet das als „unter“ und die Absage
 *                      geht ohne Telefonat raus.
 *   Untergrenze        knapp, aber denkbar.
 *   Mitte              die untere Hälfte der Kalkulation.
 *   Obergrenze         die obere Hälfte, das erwartete Ende.
 *   Obergrenze × 1,5   Luft nach oben für Extras und Sonderwünsche.
 */
const BUDGET_FAKTOREN: Array<(spanne: { low: number; high: number }) => number> = [
  ({ low }) => low * 0.5,
  ({ low }) => low,
  ({ low, high }) => (low + high) / 2,
  ({ high }) => high,
  ({ high }) => high * 1.5
];

function stufenAusKalkulation(spanne: { low: number; high: number }): number[] {
  const stufen: number[] = [];
  for (const faktor of BUDGET_FAKTOREN) {
    let wert = rundeAufStufe(faktor(spanne));
    const vorherige = stufen[stufen.length - 1];
    if (vorherige !== undefined && wert <= vorherige) wert = naechsteStufe(vorherige);
    stufen.push(wert);
  }
  return stufen;
}

function formatZahl(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

/** Wenn nicht einmal die Leistung feststeht (reines „Sonstiges“). */
const BUDGET_STUFEN_ALLGEMEIN = [2500, 5000, 10000, 25000, 50000];

function budgetStufenFor(serviceKeys: string[]): number[] {
  const leitern = serviceKeys
    .map((key) => BUDGET_STUFEN[key as GalabauServiceKey])
    .filter((stufen): stufen is number[] => Boolean(stufen));

  if (!leitern.length) return BUDGET_STUFEN_ALLGEMEIN;

  // Bei mehreren Leistungen gewinnt die teuerste Leiter: Terrasse plus Zaun
  // kostet mehr als der Zaun allein, und die Stufen sind breit genug, dass die
  // Summe darin Platz hat.
  return leitern.reduce((weiteste, kandidat) =>
    kandidat[kandidat.length - 1] > weiteste[weiteste.length - 1] ? kandidat : weiteste
  );
}

/**
 * Budgetstufen für die Anfrage.
 *
 * Sobald eine Menge eingetragen ist, kommen die Stufen aus der internen
 * Kalkulation — dann passt die Leiter zum konkreten Projekt und nicht nur zur
 * Leistung. Eine Gartenneugestaltung über 60 m² bekommt so andere Stufen als
 * eine über 600 m², obwohl beide dieselbe Leistung sind. Fehlt die Menge
 * (`roughOnly`), ist die Spanne zu breit, um daraus Stufen zu bilden; dann
 * gilt die Leiter der Leistung.
 *
 * `galabau.estimator.budgetBands` aus der Config ist damit nicht mehr die
 * Quelle der Stufen — die Leiter dort ist für jede einzelne Leistung entweder
 * zu grob oder zu hoch angesetzt.
 */
export function budgetBandsFor(
  serviceKeys: string[],
  kalkulation?: { low: number; high: number; roughOnly?: boolean } | null
): GalabauBudgetBand[] {
  const rechenbar = Boolean(kalkulation && !kalkulation.roughOnly && kalkulation.high > 0);
  const stufen = rechenbar ? stufenAusKalkulation(kalkulation!) : budgetStufenFor(serviceKeys);

  const bands: GalabauBudgetBand[] = [];
  let untergrenze = 0;
  for (const grenze of stufen) {
    bands.push({
      id: untergrenze === 0 ? `bis-${grenze}` : `${untergrenze}-${grenze}`,
      label: untergrenze === 0 ? `bis ${formatEur(grenze)}` : `${formatZahl(untergrenze)} – ${formatEur(grenze)}`,
      min: untergrenze,
      max: grenze
    });
    untergrenze = grenze;
  }
  bands.push({ id: `ab-${untergrenze}`, label: `mehr als ${formatEur(untergrenze)}`, min: untergrenze, max: null });
  bands.push({ id: "unklar", label: "Noch unklar", min: 0, max: null });
  return bands;
}

/* ------------------------------------------------------------------ *
 * Budget-Abgleich und Formatierung
 * ------------------------------------------------------------------ */

export function matchBudget(
  budgetBandId: string,
  spanne: { low: number; high: number; roughOnly?: boolean } | null,
  serviceKeys: string[] = []
): BudgetMatch {
  if (!spanne) return "unbekannt";
  // Dieselbe Leiter wie im Formular, sonst findet die ID keine Stufe.
  const band = budgetBandsFor(serviceKeys, spanne).find((entry) => entry.id === budgetBandId);
  if (!band || band.id === "unklar") return "unbekannt";
  const bandMax = band.max ?? Number.POSITIVE_INFINITY;
  // Die Stufen sind auf glatte Beträge gerundet, die Untergrenze der
  // Kalkulation ist es nicht. Ohne die kleine Toleranz gilt ein Deckel, der
  // exakt auf der Untergrenze liegt, als passend — obwohl der Auftrag dort
  // nur im günstigsten Fall hinkommt.
  if (bandMax <= spanne.low * 1.02) return "unter";
  if (band.min > spanne.high) return "darueber";
  return "passend";
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: galabau.estimator.currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatSpanne(low: number, high: number): string {
  return `${formatEur(low)} bis ${formatEur(high)}`;
}

/* ------------------------------------------------------------------ *
 * Preistabelle für die Kostenseite
 * ------------------------------------------------------------------ */

export type PreisZeile = {
  key: string;
  label: string;
  slug: string;
  beispiel: string;
  proEinheit: string;
  gesamt: string;
};

/**
 * Typische Spannen für die SEO-Seite. Bewusst aus demselben Modell wie der
 * Rechner erzeugt, damit Tabelle und Rechner nie auseinanderlaufen.
 */
export function preisTabelle(): PreisZeile[] {
  const zeilen: PreisZeile[] = [];

  for (const modell of BAU_MODELLE) {
    const service = galabau.services.find((entry) => entry.key === modell.key);
    if (!service) continue;
    const ergebnis = berechneBau({
      serviceKey: modell.key,
      menge: modell.beispielMenge,
      varianteId: modell.varianten[Math.min(1, modell.varianten.length - 1)].id,
      bestand: "frei",
      zugang: "gut",
      hang: "eben"
    });
    if (!ergebnis) continue;
    zeilen.push({
      key: modell.key,
      label: service.label,
      slug: service.slug,
      beispiel: `${modell.beispielMenge} ${modell.unitLabel}`,
      proEinheit: `${formatEur(ergebnis.proEinheitLow)} – ${formatEur(ergebnis.proEinheitHigh)} / ${modell.unitLabel}`,
      gesamt: formatSpanne(ergebnis.low, ergebnis.high)
    });
  }

  const pflege = berechnePflege({
    leistungen: ["rasen", "hecke", "beet", "laub"],
    rasenQm: 250,
    beetQm: 40,
    heckeLfm: 30,
    heckeSchnitteProJahr: 2,
    zustand: "gepflegt",
    turnus: "zweiwoechentlich",
    entsorgung: true
  });
  const pflegeService = galabau.services.find((entry) => entry.key === "gartenpflege");
  if (pflegeService) {
    zeilen.push({
      key: "gartenpflege",
      label: pflegeService.label,
      slug: pflegeService.slug,
      beispiel: "250 m² Rasen, 30 lfm Hecke, alle 2 Wochen",
      proEinheit: `${formatEur(pflege.regelEinsatz.low)} – ${formatEur(pflege.regelEinsatz.high)} / Einsatz`,
      gesamt: `${formatSpanne(pflege.jahrLow, pflege.jahrHigh)} / Jahr`
    });
  }

  return zeilen;
}
