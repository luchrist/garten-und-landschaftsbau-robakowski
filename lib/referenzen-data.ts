export interface Referenz {
  id: string;
  /** Short project title, e.g. "Hanggarten mit Sitzmauer". */
  title: string;
  /** Real place name. Never invent one. */
  ort: string;
  /** Must match one of the `label` values in lib/galabau.ts services. */
  leistung: string;
  jahr?: string;
  text: string;
  /** Finished state. Required. */
  afterImage: string;
  /**
   * Before state. OPTIONAL and only ever a genuine before shot of the SAME
   * project. Without it the card renders as a single image instead of a
   * before/after slider, which is the honest fallback.
   */
  beforeImage?: string;
  alt: string;
}

export const referenzen: Referenz[] = [
  {
    id: "gartenneuanlage",
    title: "Komplette Gartenneuanlage",
    ort: "Projektbeispiel",
    leistung: "Gartenneugestaltung",
    text: "Aus einer ungestalteten Rasenfläche entstand ein klar gegliederter Garten mit Terrasse, Wegen, Beeten und integrierter Beleuchtung.",
    afterImage: "/assets/referenzen/gartenneuanlage-nachher.webp",
    beforeImage: "/assets/referenzen/gartenneuanlage-vorher.webp",
    alt: "Garten vor und nach der Neugestaltung mit Terrasse und Beleuchtung"
  },
  {
    id: "eingangsbereich",
    title: "Moderner Eingangsbereich",
    ort: "Projektbeispiel",
    leistung: "Pflasterarbeiten",
    text: "Der provisorische Zugang wurde zu einem geradlinigen Eingangsweg mit sauber eingefassten Kies- und Pflanzflächen ausgebaut.",
    afterImage: "/assets/referenzen/eingangsbereich-nachher.webp",
    beforeImage: "/assets/referenzen/eingangsbereich-vorher.webp",
    alt: "Eingangsbereich vor und nach Pflasterung und Bepflanzung"
  },
  {
    id: "terrasse",
    title: "Terrasse und Gartenabschluss",
    ort: "Projektbeispiel",
    leistung: "Terrassenbau",
    text: "Die schlichte Bestandsfläche wurde mit großzügigen Platten, klaren Rasenkanten, Bepflanzung und Licht zu einem wohnlichen Außenraum.",
    afterImage: "/assets/referenzen/terrasse-nachher.webp",
    beforeImage: "/assets/referenzen/terrasse-vorher.webp",
    alt: "Terrasse vor und nach der Neugestaltung mit Platten, Rasen und Beleuchtung"
  }
];
