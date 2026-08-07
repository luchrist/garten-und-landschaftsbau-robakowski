"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { buildAnfrageHref, buildKostenHref, type Handoff } from "@/lib/handoff";

/**
 * Die Buttons neben dem Rechner beziehungsweise neben dem Assistenten stehen im
 * Seitenlayout, nicht im Formular. Ohne gemeinsamen Zustand würden sie den
 * Besucher auf ein leeres Zielformular schicken, obwohl er direkt daneben
 * gerade Leistung, Fläche und Material eingetragen hat.
 *
 * Deshalb meldet das jeweils aktive Widget seinen Stand hier an, und die
 * Seitenleisten-Buttons hängen ihn an ihren Link. Ohne Provider bleibt es beim
 * neutralen Link — die Komponenten funktionieren also auch allein.
 */

type HandoffContextValue = {
  handoff: Handoff;
  publish: (handoff: Handoff) => void;
};

const HandoffContext = createContext<HandoffContextValue | null>(null);

export function HandoffProvider({ children, initial = {} }: { children: React.ReactNode; initial?: Handoff }) {
  const [handoff, setHandoff] = useState<Handoff>(initial);

  // Das Widget meldet bei jeder Eingabe. Gleiche Übergabe darf keinen weiteren
  // Render auslösen, sonst dreht sich Effekt und Render im Kreis.
  const publish = useCallback((next: Handoff) => {
    setHandoff((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  }, []);

  const value = useMemo(() => ({ handoff, publish }), [handoff, publish]);

  return <HandoffContext.Provider value={value}>{children}</HandoffContext.Provider>;
}

/** Gibt den aktuellen Stand des Formulars an die Seite weiter. Kein Provider: kein Effekt. */
export function useHandoffPublisher(): (handoff: Handoff) => void {
  const context = useContext(HandoffContext);
  return context?.publish ?? noop;
}

function noop() {}

export function useHandoff(): Handoff {
  return useContext(HandoffContext)?.handoff ?? {};
}

type LinkProps = {
  className?: string;
  children: React.ReactNode;
  /** Feste Werte, die immer mitgehen — z.B. die Leistung einer Unterseite. */
  handoff?: Handoff;
};

/** Link auf den Projekt-Assistenten, vorbelegt mit dem Stand der Seite. */
export function AnfrageLink({ className, children, handoff }: LinkProps) {
  const live = useHandoff();
  return (
    <a href={buildAnfrageHref({ ...live, ...handoff })} className={className}>
      {children}
    </a>
  );
}

/** Link auf den Kostenrechner, vorbelegt mit dem Stand der Seite. */
export function KostenLink({ className, children, handoff }: LinkProps) {
  const live = useHandoff();
  return (
    <a href={buildKostenHref({ ...live, ...handoff })} className={className}>
      {children}
    </a>
  );
}
