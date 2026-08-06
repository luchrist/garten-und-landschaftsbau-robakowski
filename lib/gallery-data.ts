export interface GalleryItem {
  src: string;
  alt: string;
}

// Curated for the gallery layout: a finished showcase first, followed by a
// varied mix of work in progress, detail work and specialist services.
export const galleryItems: GalleryItem[] = [
  {
    src: "/assets/leistungen/gartenneugestaltung-mit-beleuchtung.png",
    alt: "Fertig gestalteter Garten mit Wegen, Beeten und stimmungsvoller Beleuchtung"
  },
  {
    src: "/assets/leistungen/pflasterarbeiten-terrasse.png",
    alt: "Landschaftsgärtner beim Verlegen großformatiger Terrassenplatten"
  },
  {
    src: "/assets/leistungen/bewaesserung-rasen-und-beete.png",
    alt: "Automatische Bewässerung von Rasen und bepflanzten Beeten"
  },
  {
    src: "/assets/leistungen/zaun-und-sichtschutz.png",
    alt: "Sichtschutzwand mit Pfostenfundament am Grundstücksrand"
  },
  {
    src: "/assets/leistungen/gewerbliche-aussenanlagen.png",
    alt: "Gepflegte Außenanlage eines modernen Gewerbegebäudes"
  }
];
