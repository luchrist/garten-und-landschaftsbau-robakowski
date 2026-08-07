"use client";

import { useRef, useState } from "react";

import company from "@/config/company";
import { galabau } from "@/lib/galabau";
import { buildWhatsappHref } from "@/lib/service-area";
import type { BewerbungAnhang, BewerbungPayload } from "@/lib/lead-score";

/**
 * 60-Sekunden-Bewerbung aus Abschnitt 10 des Konzepts, als mehrstufiger
 * Ablauf wie der Projekt-Assistent: Tätigkeit, Erfahrung, Führerschein,
 * Verfügbarkeit, Kontakt, Abschluss. Immer nur eine Frage sichtbar, damit
 * die Bewerbung auch vom Handy aus in einer Pause ausgefüllt wird. Der
 * Lebenslauf bleibt optional.
 */

const STEPS = ["Tätigkeit", "Erfahrung", "Führerschein", "Verfügbarkeit", "Kontakt", "Abschluss"] as const;

const INITIATIV_ROLE = "Etwas anderes / Initiativbewerbung";

/**
 * Der Hintergrund sagt, wo jemand herkommt; die Jahre darunter sagen, wie
 * viel Praxis in genau dieser Tätigkeit dahintersteckt. Beides getrennt zu
 * fragen trennt Ausbildung und Erfahrung sauber.
 */
const ERFAHRUNG_OPTIONS = [
  "Ausbildung im GaLaBau",
  "Praxis im GaLaBau, ohne Ausbildung",
  "Handwerklicher Hintergrund, anderes Gewerk",
  "Quereinsteiger ohne Vorerfahrung"
];

const BERUFSJAHRE_OPTIONS = [
  "Noch keine",
  "Unter 1 Jahr",
  "1 bis 3 Jahre",
  "3 bis 5 Jahre",
  "5 bis 10 Jahre",
  "Mehr als 10 Jahre"
];

const FUEHRERSCHEIN_OPTIONS = ["B (PKW)", "BE (Anhänger)", "C1/C (LKW)", "Kein Führerschein"];

const GESCHLECHT_OPTIONS = ["Männlich", "Weiblich", "Divers"];

const CV_MAX_MB = 4;
const CV_ACCEPT = ".pdf,.doc,.docx,image/*";

function ChoiceButton({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="choice" data-selected={selected} onClick={onClick}>
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-laub-500 bg-laub-500" : "border-ink/25 bg-white"
        }`}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-bone" /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

type FormState = {
  taetigkeit: string;
  taetigkeitFrei: string;
  erfahrung: string;
  berufsjahre: string;
  fuehrerschein: string[];
  wohnort: string;
  startdatum: string;
  geschlecht: string;
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  nachricht: string;
  lebenslauf: BewerbungAnhang | null;
  einwilligung: boolean;
};

const INITIAL_STATE: FormState = {
  taetigkeit: "",
  taetigkeitFrei: "",
  erfahrung: "",
  berufsjahre: "",
  fuehrerschein: [],
  wohnort: "",
  startdatum: "",
  geschlecht: "",
  vorname: "",
  nachname: "",
  telefon: "",
  email: "",
  nachricht: "",
  lebenslauf: null,
  einwilligung: false
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

export function RecruitingForm({ variant = "page" }: { variant?: "page" | "widget" }) {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<FormState>) => {
    setState((current) => ({ ...current, ...partial }));
    setStepError("");
  };

  function toggleFuehrerschein(option: string) {
    setState((current) => {
      // „Kein Führerschein“ schließt die Klassen aus und umgekehrt.
      if (option === "Kein Führerschein") {
        return { ...current, fuehrerschein: current.fuehrerschein.includes(option) ? [] : [option] };
      }
      const withoutNone = current.fuehrerschein.filter((entry) => entry !== "Kein Führerschein");
      return {
        ...current,
        fuehrerschein: withoutNone.includes(option)
          ? withoutNone.filter((entry) => entry !== option)
          : [...withoutNone, option]
      };
    });
    setStepError("");
  }

  async function onFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > CV_MAX_MB * 1024 * 1024) {
      setStepError(`Die Datei ist größer als ${CV_MAX_MB} MB. Bitte kleiner speichern oder einfach weglassen.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      patch({
        lebenslauf: { name: file.name, size: file.size, type: file.type || "application/octet-stream", dataUrl }
      });
    } catch {
      setStepError("Die Datei konnte nicht gelesen werden. Sie können die Bewerbung auch ohne Lebenslauf abschicken.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function validateStep(index: number): string {
    switch (index) {
      case 0:
        if (!state.taetigkeit) return "Bitte auswählen, als was Sie arbeiten möchten.";
        if (state.taetigkeit === INITIATIV_ROLE && !state.taetigkeitFrei.trim()) {
          return "Bitte kurz eintragen, welche Tätigkeit Sie suchen.";
        }
        return "";
      case 1:
        if (!state.erfahrung) return "Bitte Ihren Hintergrund auswählen.";
        if (!state.berufsjahre) return "Bitte angeben, wie viel Praxis Sie in dieser Tätigkeit haben.";
        return "";
      case 2:
        return state.fuehrerschein.length ? "" : "Bitte auswählen, welchen Führerschein Sie haben.";
      case 4: {
        if (!state.vorname.trim()) return "Bitte Ihren Vornamen eintragen.";
        if (!state.nachname.trim()) return "Bitte Ihren Nachnamen eintragen.";
        if (!state.telefon.trim()) {
          return "Bitte eine Telefonnummer angeben, wir melden uns per Anruf oder WhatsApp.";
        }
        return "";
      }
      case 5:
        return state.einwilligung ? "" : "Bitte der Kontaktaufnahme zustimmen.";
      default:
        return "";
    }
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setStepError(error);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit() {
    const error = validateStep(STEPS.length - 1);
    if (error) {
      setStepError(error);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const taetigkeit =
      state.taetigkeit === INITIATIV_ROLE
        ? `Initiativbewerbung: ${state.taetigkeitFrei.trim()}`
        : state.taetigkeit;

    const payload: BewerbungPayload = {
      quelle: variant === "widget" ? "widget" : "website",
      taetigkeit,
      erfahrung: state.erfahrung,
      berufsjahre: state.berufsjahre,
      fuehrerschein: state.fuehrerschein,
      wohnort: state.wohnort.trim(),
      startdatum: state.startdatum.trim(),
      geschlecht: state.geschlecht,
      vorname: state.vorname.trim(),
      nachname: state.nachname.trim(),
      name: `${state.vorname.trim()} ${state.nachname.trim()}`.trim(),
      telefon: state.telefon.trim(),
      email: state.email.trim(),
      nachricht: state.nachricht.trim(),
      lebenslauf: state.lebenslauf,
      einwilligung: state.einwilligung,
      eingegangenAm: new Date().toISOString()
    };

    try {
      const response = await fetch("/api/bewerbung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSubmitted(true);
    } catch {
      setSubmitError("Die Bewerbung konnte gerade nicht übertragen werden. Rufen Sie uns gern direkt an.");
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappHref = buildWhatsappHref(company.address.city);

  if (submitted) {
    return (
      <div className="rounded-4xl border border-laub-300 bg-laub-50 p-8 md:p-10">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-laub-700">
          <span className="marker" />
          <span>Bewerbung eingegangen</span>
        </div>
        <h3 className="mt-5 font-display text-[26px] tracking-tight text-ink md:text-[32px]">
          Danke, {state.vorname || "Ihre Bewerbung ist da"}.
        </h3>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink/75">
          Wir melden uns kurzfristig telefonisch bei Ihnen. Wenn es schnell gehen soll: Rufen Sie einfach direkt an
          unter {company.contact.phone}.
        </p>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  // „Quereinsteiger“ ist kein Beruf, sondern ein Hintergrund. Die Frage danach
  // steht in Schritt 2, deshalb fliegt sie hier aus der Berufsliste.
  const roles = [
    ...galabau.recruiting.roles.filter((role) => !/quereinsteiger/i.test(role)),
    INITIATIV_ROLE
  ];

  return (
    <div className="rounded-4xl border border-ink/10 bg-white p-6 shadow-[0_20px_60px_rgba(20,24,26,0.06)] md:p-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
            Schritt {step + 1} von {STEPS.length}
          </span>
          <span className="font-display text-[18px] tracking-tight text-ink md:text-[20px]">{STEPS[step]}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full rounded-full bg-laub-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Schritt 1: Tätigkeit */}
      {step === 0 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Als was möchten Sie bei uns arbeiten?</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {roles.map((role) => (
              <ChoiceButton
                key={role}
                selected={state.taetigkeit === role}
                onClick={() => patch({ taetigkeit: role })}
              >
                {role}
              </ChoiceButton>
            ))}
          </div>
          {state.taetigkeit === INITIATIV_ROLE ? (
            <div className="mt-4">
              <label htmlFor="bewerbung-taetigkeit-frei" className="field-label">
                Welche Tätigkeit suchen Sie?
              </label>
              <input
                id="bewerbung-taetigkeit-frei"
                className="field-input"
                placeholder="z.B. Baggerfahrer, Büro, Kundendienst"
                value={state.taetigkeitFrei}
                onChange={(event) => patch({ taetigkeitFrei: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Schritt 2: Erfahrung */}
      {step === 1 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Wo kommen Sie her?</p>
          <div className="mt-6 grid gap-3">
            {ERFAHRUNG_OPTIONS.map((option) => (
              <ChoiceButton
                key={option}
                selected={state.erfahrung === option}
                onClick={() => patch({ erfahrung: option })}
              >
                {option}
              </ChoiceButton>
            ))}
          </div>

          <div className="mt-8">
            <span className="field-label">Wie viel Praxis haben Sie in genau dieser Tätigkeit?</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {BERUFSJAHRE_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option}
                  selected={state.berufsjahre === option}
                  onClick={() => patch({ berufsjahre: option })}
                >
                  {option}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Schritt 3: Führerschein */}
      {step === 2 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Welchen Führerschein haben Sie? Mehrfachauswahl ist möglich.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FUEHRERSCHEIN_OPTIONS.map((option) => (
              <ChoiceButton
                key={option}
                selected={state.fuehrerschein.includes(option)}
                onClick={() => toggleFuehrerschein(option)}
              >
                {option}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ) : null}

      {/* Schritt 4: Verfügbarkeit */}
      {step === 3 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Wo wohnen Sie und wann könnten Sie anfangen?
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bewerbung-wohnort" className="field-label">
                Wohnort
              </label>
              <input
                id="bewerbung-wohnort"
                className="field-input"
                placeholder={company.address.city}
                value={state.wohnort}
                onChange={(event) => patch({ wohnort: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="bewerbung-start" className="field-label">
                Möglicher Start
              </label>
              <input
                id="bewerbung-start"
                className="field-input"
                placeholder="z.B. sofort, ab März"
                value={state.startdatum}
                onChange={(event) => patch({ startdatum: event.target.value })}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Schritt 5: Kontakt */}
      {step === 4 ? (
        <div>
          <p className="text-[15px] leading-relaxed text-ink/70">Wie erreichen wir Sie?</p>

          <div className="mt-6">
            <span className="field-label">Anrede</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {GESCHLECHT_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option}
                  selected={state.geschlecht === option}
                  onClick={() => patch({ geschlecht: option })}
                >
                  {option}
                </ChoiceButton>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bewerbung-vorname" className="field-label">
                Vorname
              </label>
              <input
                id="bewerbung-vorname"
                className="field-input"
                autoComplete="given-name"
                value={state.vorname}
                onChange={(event) => patch({ vorname: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="bewerbung-nachname" className="field-label">
                Nachname
              </label>
              <input
                id="bewerbung-nachname"
                className="field-input"
                autoComplete="family-name"
                value={state.nachname}
                onChange={(event) => patch({ nachname: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="bewerbung-telefon" className="field-label">
                Telefonnummer
              </label>
              <input
                id="bewerbung-telefon"
                className="field-input"
                inputMode="tel"
                autoComplete="tel"
                value={state.telefon}
                onChange={(event) => patch({ telefon: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="bewerbung-email" className="field-label">
                E-Mail (optional)
              </label>
              <input
                id="bewerbung-email"
                className="field-input"
                inputMode="email"
                autoComplete="email"
                value={state.email}
                onChange={(event) => patch({ email: event.target.value })}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Schritt 6: Abschluss */}
      {step === 5 ? (
        <div>
          <div>
            <label htmlFor="bewerbung-nachricht" className="field-label">
              Kurz zu Ihnen (optional)
            </label>
            <textarea
              id="bewerbung-nachricht"
              rows={4}
              className="field-input resize-y"
              placeholder="Zwei, drei Sätze reichen völlig."
              value={state.nachricht}
              onChange={(event) => patch({ nachricht: event.target.value })}
            />
          </div>

          <div className="mt-6">
            <span className="field-label">Lebenslauf (optional)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={CV_ACCEPT}
              className="hidden"
              onChange={(event) => void onFileSelected(event.target.files)}
            />
            {state.lebenslauf ? (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink/15 bg-bone px-5 py-4">
                <span className="truncate text-[14px] text-ink/75">
                  {state.lebenslauf.name}
                  <span className="ml-2 font-mono text-[11px] text-ink/45">
                    {Math.max(1, Math.round(state.lebenslauf.size / 1024))} KB
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => patch({ lebenslauf: null })}
                  className="shrink-0 text-[13px] font-medium text-ink/55 underline underline-offset-4 hover:text-ink"
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/25 bg-bone px-6 py-8 text-center transition-colors hover:border-laub-400"
              >
                <span className="font-display text-[18px] tracking-tight text-ink">Lebenslauf anhängen</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
                  PDF, Word oder Foto, max. {CV_MAX_MB} MB
                </span>
              </button>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
              Kein Muss. Ohne Lebenslauf geht die Bewerbung genauso raus.
            </p>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink/70">
            <input
              type="checkbox"
              checked={state.einwilligung}
              onChange={(event) => patch({ einwilligung: event.target.checked })}
              className="mt-1 h-4 w-4 accent-laub-600"
            />
            <span>
              Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Bewerbung gespeichert und
              verarbeitet werden.
            </span>
          </label>
        </div>
      ) : null}

      {stepError ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {stepError}
        </p>
      ) : null}
      {submitError ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="rounded-full border border-ink/20 px-6 py-3 text-[13px] font-medium text-ink transition-opacity disabled:opacity-0"
        >
          Zurück
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-full bg-laub-500 px-7 py-3 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600"
          >
            Weiter
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-laub-500 px-7 py-3 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600 disabled:opacity-60"
          >
            {submitting ? "Wird gesendet …" : "Bewerbung abschicken"}
          </button>
        )}
      </div>

      {whatsappHref ? (
        <p className="mt-5 text-center text-[13px] text-ink/55">
          Lieber ohne Formular?{" "}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-laub-700 underline underline-offset-4 hover:text-laub-800"
          >
            Direkt per WhatsApp melden
          </a>
        </p>
      ) : null}
    </div>
  );
}
