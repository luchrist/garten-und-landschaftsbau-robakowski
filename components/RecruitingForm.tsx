"use client";

import { useState } from "react";

import company from "@/config/company";
import { galabau } from "@/lib/galabau";
import { buildWhatsappHref } from "@/lib/service-area";
import type { BewerbungPayload } from "@/lib/lead-score";

/**
 * 60-Sekunden-Bewerbung aus Abschnitt 10 des Konzepts: Erfahrung,
 * Führerschein, Tätigkeit, Wohnort, Startdatum, Telefonnummer. Kein
 * Lebenslauf, kein Anschreiben. WhatsApp als Direktkanal daneben.
 */

const ERFAHRUNG_OPTIONS = [
  "Ausbildung im GaLaBau",
  "Mehrjährige Praxis ohne Ausbildung",
  "Handwerklicher Hintergrund, anderes Gewerk",
  "Quereinsteiger ohne Vorerfahrung"
];

const FUEHRERSCHEIN_OPTIONS = ["B (PKW)", "BE (Anhänger)", "C1/C (LKW)", "Kein Führerschein"];

export function RecruitingForm({ variant = "page" }: { variant?: "page" | "widget" }) {
  const [taetigkeit, setTaetigkeit] = useState("");
  const [erfahrung, setErfahrung] = useState("");
  const [fuehrerschein, setFuehrerschein] = useState<string[]>([]);
  const [wohnort, setWohnort] = useState("");
  const [startdatum, setStartdatum] = useState("");
  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [einwilligung, setEinwilligung] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleFuehrerschein(option: string) {
    setFuehrerschein((current) =>
      current.includes(option) ? current.filter((entry) => entry !== option) : [...current, option]
    );
    setError("");
  }

  async function submit() {
    if (!taetigkeit) return setError("Bitte auswählen, als was Sie arbeiten möchten.");
    if (!erfahrung) return setError("Bitte Ihre Erfahrung auswählen.");
    if (!name.trim()) return setError("Bitte Ihren Namen eintragen.");
    if (!telefon.trim()) return setError("Bitte eine Telefonnummer angeben, wir melden uns per Anruf oder WhatsApp.");
    if (!einwilligung) return setError("Bitte der Kontaktaufnahme zustimmen.");

    setSubmitting(true);
    setError("");

    const payload: BewerbungPayload = {
      quelle: variant === "widget" ? "widget" : "website",
      taetigkeit,
      erfahrung,
      fuehrerschein,
      wohnort: wohnort.trim(),
      startdatum: startdatum.trim(),
      name: name.trim(),
      telefon: telefon.trim(),
      email: email.trim(),
      nachricht: nachricht.trim(),
      einwilligung,
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
      setError("Die Bewerbung konnte gerade nicht übertragen werden. Rufen Sie uns gern direkt an.");
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappHref = buildWhatsappHref(company.address.city);

  if (submitted) {
    return (
      <div className="rounded-4xl border border-laub-300 bg-laub-50 p-8 md:p-10">
        <h3 className="font-display text-[26px] tracking-tight text-ink md:text-[32px]">
          Danke, {name.split(" ")[0] || "Ihre Bewerbung ist da"}.
        </h3>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink/75">
          Wir melden uns kurzfristig telefonisch bei Ihnen. Wenn es schnell gehen soll: Rufen Sie einfach direkt an
          unter {company.contact.phone}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-ink/10 bg-white p-6 shadow-[0_20px_60px_rgba(20,24,26,0.06)] md:p-10">
      <div>
        <span className="field-label">Als was möchten Sie arbeiten?</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {galabau.recruiting.roles.map((role) => (
            <button
              key={role}
              type="button"
              className="choice"
              data-selected={taetigkeit === role}
              onClick={() => {
                setTaetigkeit(role);
                setError("");
              }}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <span className="field-label">Ihre Erfahrung</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {ERFAHRUNG_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="choice"
              data-selected={erfahrung === option}
              onClick={() => {
                setErfahrung(option);
                setError("");
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <span className="field-label">Führerschein (Mehrfachauswahl)</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {FUEHRERSCHEIN_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="choice"
              data-selected={fuehrerschein.includes(option)}
              onClick={() => toggleFuehrerschein(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bewerbung-wohnort" className="field-label">
            Wohnort
          </label>
          <input
            id="bewerbung-wohnort"
            className="field-input"
            placeholder={company.address.city}
            value={wohnort}
            onChange={(event) => setWohnort(event.target.value)}
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
            value={startdatum}
            onChange={(event) => setStartdatum(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="bewerbung-name" className="field-label">
            Name
          </label>
          <input
            id="bewerbung-name"
            className="field-input"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
            value={telefon}
            onChange={(event) => setTelefon(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bewerbung-email" className="field-label">
            E-Mail (optional)
          </label>
          <input
            id="bewerbung-email"
            className="field-input"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bewerbung-nachricht" className="field-label">
            Kurz zu Ihnen (optional)
          </label>
          <textarea
            id="bewerbung-nachricht"
            rows={3}
            className="field-input resize-y"
            placeholder="Zwei, drei Sätze reichen völlig."
            value={nachricht}
            onChange={(event) => setNachricht(event.target.value)}
          />
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink/70">
        <input
          type="checkbox"
          checked={einwilligung}
          onChange={(event) => {
            setEinwilligung(event.target.checked);
            setError("");
          }}
          className="mt-1 h-4 w-4 accent-laub-600"
        />
        <span>
          Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung meiner Bewerbung gespeichert und
          verarbeitet werden.
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-laub-500 px-7 py-3.5 text-[13px] font-medium text-bone transition-colors hover:bg-laub-600 disabled:opacity-60"
        >
          {submitting ? "Wird gesendet …" : "Bewerbung abschicken"}
        </button>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-7 py-3.5 text-[13px] font-medium text-ink transition-colors hover:border-laub-500 hover:text-laub-700"
          >
            Lieber direkt per WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
