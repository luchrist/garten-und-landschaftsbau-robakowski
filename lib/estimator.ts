import { galabau, type GalabauService } from "@/lib/galabau";

export type ProjectSize = "klein" | "mittel" | "gross";

export type EstimatorInput = {
  /** Service keys the visitor selected in step 1. */
  serviceKeys: string[];
  /** Quadratmeter for area-based services. */
  qm?: number;
  /** Laufende Meter for fence/screen work. */
  lfm?: number;
  hanglage?: boolean;
  schwererZugang?: boolean;
  rueckbauBestand?: boolean;
};

export type EstimatorResult = {
  /** Lower end of the orientation range, in EUR. */
  low: number;
  /** Upper end of the orientation range, in EUR. */
  high: number;
  size: ProjectSize;
  /**
   * True when no usable size input was given, so the range is derived from the
   * services' base minimums only. The UI must label this clearly.
   */
  roughOnly: boolean;
  /** Services that actually contributed to the number. */
  usedServices: GalabauService[];
  disclaimer: string;
};

export type BudgetMatch = "unter" | "passend" | "darueber" | "unbekannt";

function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

function servicesFor(keys: string[]): GalabauService[] {
  return galabau.services.filter((service) => keys.includes(service.key));
}

function quantityFor(service: GalabauService, input: EstimatorInput): number {
  if (service.unit === "lfm") {
    return input.lfm && input.lfm > 0 ? input.lfm : 0;
  }
  if (service.unit === "qm") {
    return input.qm && input.qm > 0 ? input.qm : 0;
  }
  // Piece- and lump-sum services (Baumpflege) are not sized by the form.
  return 0;
}

/**
 * Section 5 of the concept: a real GaLaBau price calculator is not possible
 * online, because soil, sub-base, access, drainage, material, machines, region
 * and execution vary too much. So this deliberately produces a WIDE
 * orientation range and never a binding price. Its actual job is to qualify
 * the lead (klein/mittel/gross, Beratungsbedarf, Budget-Match), not to quote.
 */
export function estimateProject(input: EstimatorInput): EstimatorResult {
  const config = galabau.estimator;
  const usedServices = servicesFor(input.serviceKeys);

  let low = 0;
  let high = 0;
  let sizedAny = false;

  for (const service of usedServices) {
    const quantity = quantityFor(service, input);
    if (quantity > 0) {
      sizedAny = true;
      low += Math.max(service.estimate.baseMin, quantity * service.estimate.minPerUnit);
      high += Math.max(service.estimate.baseMin * 1.6, quantity * service.estimate.maxPerUnit);
    } else {
      low += service.estimate.baseMin;
      high += service.estimate.baseMin * 3;
    }
  }

  if (usedServices.length === 0) {
    low = config.minProjectEur;
    high = config.minProjectEur * 4;
  }

  let factor = 1;
  if (input.hanglage) factor += config.surcharges.hanglage;
  if (input.schwererZugang) factor += config.surcharges.schwererZugang;
  if (input.rueckbauBestand) factor += config.surcharges.rueckbauBestand;

  low *= factor;
  high *= factor;

  // Honest uncertainty band on top of the per-unit ranges.
  low *= 0.85;
  high *= 1.2;

  low = Math.max(config.minProjectEur, low);
  high = Math.max(low * 1.5, high);

  const roundedLow = roundTo(low, config.roundingStep);
  const roundedHigh = roundTo(high, config.roundingStep);
  const midpoint = (roundedLow + roundedHigh) / 2;

  const size: ProjectSize =
    midpoint < config.sizeThresholds.klein
      ? "klein"
      : midpoint < config.sizeThresholds.mittel
        ? "mittel"
        : "gross";

  return {
    low: roundedLow,
    high: roundedHigh,
    size,
    roughOnly: !sizedAny,
    usedServices,
    disclaimer: config.disclaimer
  };
}

/** Compares the visitor's selected budget band against the orientation range. */
export function matchBudget(budgetBandId: string, result: EstimatorResult): BudgetMatch {
  const band = galabau.estimator.budgetBands.find((entry) => entry.id === budgetBandId);
  if (!band || band.id === "unklar") {
    return "unbekannt";
  }
  const bandMax = band.max ?? Number.POSITIVE_INFINITY;
  if (bandMax < result.low) {
    return "unter";
  }
  if (band.min > result.high) {
    return "darueber";
  }
  return "passend";
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: galabau.estimator.currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatRange(result: EstimatorResult): string {
  return `${formatEur(result.low)} bis ${formatEur(result.high)}`;
}

export const SIZE_LABELS: Record<ProjectSize, string> = {
  klein: "kleines Projekt",
  mittel: "mittleres Projekt",
  gross: "größeres Projekt"
};
