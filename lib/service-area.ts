import { galabau } from "@/lib/galabau";

export type ServiceAreaVerdict = "inside" | "border" | "outside" | "unknown";

export type ServiceAreaResult = {
  verdict: ServiceAreaVerdict;
  headline: string;
  detail: string;
};

const PLZ_PATTERN = /^\d{5}$/;

/**
 * Section 4.2 of the concept: the assistant must tell the visitor immediately
 * whether their location is inside the Einsatzgebiet, a borderline case, or
 * outside. The check runs on the two-digit postal prefix configured per build
 * and never rejects anyone outright, since an outside project can still be
 * worth a call above a certain size.
 */
export function checkServiceArea(postalCode: string): ServiceAreaResult {
  const trimmed = (postalCode || "").trim();
  const area = galabau.serviceArea;

  if (!PLZ_PATTERN.test(trimmed)) {
    return {
      verdict: "unknown",
      headline: "Postleitzahl noch unvollständig",
      detail: "Bitte eine fünfstellige Postleitzahl eingeben, dann prüfen wir das Einsatzgebiet direkt."
    };
  }

  const prefix = trimmed.slice(0, 2);

  if (area.plzPrefixes.includes(prefix)) {
    return {
      verdict: "inside",
      headline: "Im Einsatzgebiet",
      detail: `Ihr Ort liegt im regulären Einsatzgebiet rund um ${area.centerCity}.`
    };
  }

  if (area.borderPlzPrefixes.includes(prefix)) {
    return {
      verdict: "border",
      headline: "Grenzfall",
      detail: `Das ist am Rand unseres Gebiets rund um ${area.centerCity}. Machbar, wir prüfen es im Einzelfall.`
    };
  }

  return {
    verdict: "outside",
    headline: "Außerhalb des Einsatzgebiets",
    detail: area.note
  };
}

/** Prefix used to prefill the WhatsApp draft with the visitor's location. */
export function buildWhatsappHref(place: string): string {
  const base = galabau.contact.whatsappLink;
  if (!base) return "";
  const text = `${galabau.contact.whatsappPrefill}${place || galabau.serviceArea.centerCity}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}
