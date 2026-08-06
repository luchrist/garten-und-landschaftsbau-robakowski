export interface GalleryItem {
  src: string;
  alt: string;
}

// Curated for the gallery layout: a finished showcase first, followed by a
// varied mix of work in progress, detail work and specialist services.
export const galleryItems: GalleryItem[] = [
  {
    src: "/assets/leistungen/gartenneugestaltung-mit-beleuchtung.webp",
    alt: "Fertig gestalteter Garten mit Wegen, Beeten und stimmungsvoller Beleuchtung"
  },
  {
    src: "/assets/leistungen/pflasterarbeiten-terrasse.webp",
    alt: "Landschaftsgärtner beim Verlegen großformatiger Terrassenplatten"
  },
  {
    src: "/assets/leistungen/bewaesserung-rasen-und-beete.webp",
    alt: "Automatische Bewässerung von Rasen und bepflanzten Beeten"
  },
  {
    src: "/assets/leistungen/baumpflege-klettertechnik.webp",
    alt: "Fachgerechte Baumpflege mit Seilklettertechnik"
  },
  {
    src: "/assets/leistungen/gewerbliche-aussenanlagen.webp",
    alt: "Gepflegte Außenanlage eines modernen Gewerbegebäudes"
  }
];
