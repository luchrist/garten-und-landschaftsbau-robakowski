import { NextRequest, NextResponse } from "next/server";

/**
 * Nimmt Projektanfragen aus dem Assistenten (Website und Widget) entgegen.
 *
 * Standardverhalten des Templates: Anfrage strukturiert loggen und optional
 * per Resend-E-Mail an das Büro weiterleiten, sobald die Umgebungsvariablen
 * gesetzt sind. Die Supabase-Anbindung (Kanban-Pipeline, Lead-Detailseite)
 * wird wie beim Restaurant-Template im Post-Sale-Schritt der Factory
 * verdrahtet und ersetzt dann den E-Mail-only-Pfad.
 *
 * Erwartete Umgebungsvariablen für den E-Mail-Versand:
 *   RESEND_API_KEY   – API-Key von resend.com
 *   LEAD_EMAIL_TO    – Zieladresse des Büros (fallback: aus lib/galabau.ts)
 *   LEAD_EMAIL_FROM  – verifizierte Absenderadresse
 */

type IncomingFoto = { name?: string; size?: number; type?: string; dataUrl?: string };

const MAX_BODY_BYTES = 40 * 1024 * 1024;

function eur(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("de-DE").format(n) + " €" : "-";
}

/**
 * Die Zusammenfassung folgt dem Modus der Anfrage: Bauprojekte bringen
 * Umfang, Planung und Budget mit, Pflegeanfragen stattdessen Flächen, Turnus
 * und Leistungen. Ein gemeinsames Schema für beides würde in der Mail nur
 * halbleere Zeilen erzeugen.
 */
function summarize(body: Record<string, unknown>): string {
  const kontakt = (body.kontakt || {}) as Record<string, unknown>;
  const ort = (body.ort || {}) as Record<string, unknown>;
  const score = (body.score || {}) as Record<string, unknown>;
  const fotos = Array.isArray(body.fotos) ? (body.fotos as IncomingFoto[]) : [];
  const modus = String(body.modus || "bau");

  const lines = [
    `Neue Projektanfrage (${String(body.quelle || "website")}) — Modus: ${modus}`,
    `Projektarten: ${Array.isArray(body.projektarten) ? (body.projektarten as string[]).join(", ") : "-"}`,
    `Ort: ${String(ort.plz || "-")} ${String(ort.ort || "")} (${String(ort.einsatzgebiet || "unknown")})`,
    `Zeitrahmen: ${String(body.zeitrahmen || "-")}`
  ];

  if (body.umfang) {
    const umfang = body.umfang as Record<string, unknown>;
    lines.push(
      `Umfang: ${umfang.qm ? `${umfang.qm} m²` : ""}${umfang.lfm ? ` ${umfang.lfm} lfm` : ""}`.trim() +
        ` | Bestand: ${String(umfang.bestand || "-")} | Zugang: ${String(umfang.zugang || "-")} | Gelände: ${String(umfang.hang || "-")}`
    );
  }

  if (body.planung) {
    const planung = body.planung as Record<string, unknown>;
    lines.push(`Planung: ${String(planung.stand || "-")}${planung.skizzen ? " (Skizzen vorhanden)" : ""}`);
  }

  if (body.budget) {
    const budget = body.budget as Record<string, unknown>;
    const orientierung = budget.orientierung as { low?: number; high?: number } | null;
    lines.push(
      `Budget: ${String(budget.bandLabel || budget.band || "-")} | Festigkeit: ${String(budget.festigkeit || "-")} | Match: ${String(budget.match || "-")}`
    );
    if (orientierung) {
      lines.push(`Interne Kalkulation: ${eur(orientierung.low)} – ${eur(orientierung.high)}`);
    }
  }

  if (body.pflege) {
    const pflege = body.pflege as Record<string, unknown>;
    const orientierung = pflege.orientierung as
      | { proEinsatzLow?: number; proEinsatzHigh?: number; jahrLow?: number; jahrHigh?: number }
      | null;
    lines.push(
      `Pflege: Turnus ${String(pflege.turnus || "-")} | Zustand ${String(pflege.zustand || "-")} | Entsorgung ${pflege.entsorgung ? "ja" : "nein"}`
    );
    lines.push(
      `Flächen: ${pflege.rasenQm ? `${pflege.rasenQm} m² Rasen` : "Rasen -"}, ${pflege.heckeLfm ? `${pflege.heckeLfm} lfm Hecke × ${pflege.heckeSchnitteProJahr ?? 1}/Jahr` : "Hecke -"}, ${pflege.beetQm ? `${pflege.beetQm} m² Beete` : "Beete -"}`
    );
    lines.push(
      `Leistungen: ${Array.isArray(pflege.leistungen) ? (pflege.leistungen as string[]).join(", ") : "-"}`
    );
    if (orientierung) {
      lines.push(
        `Interne Kalkulation: ${eur(orientierung.proEinsatzLow)} – ${eur(orientierung.proEinsatzHigh)} je Einsatz, ${eur(orientierung.jahrLow)} – ${eur(orientierung.jahrHigh)} pro Jahr`
      );
    }
  }

  lines.push(
    `Fotos: ${fotos.length}`,
    `Score: ${String(score.value ?? "-")} (${String(score.label ?? "-")})`,
    `Kontakt: ${String(kontakt.name || "-")} | ${String(kontakt.telefon || "-")} | ${String(kontakt.email || "-")} | Kanal: ${String(kontakt.kanal || "-")} | ${String(kontakt.kundentyp || "-")}`
  );

  const reasons = Array.isArray(score.reasons) ? (score.reasons as string[]) : [];
  if (reasons.length) {
    lines.push(`Bewertung: ${reasons.join(", ")}`);
  }
  const missing = Array.isArray(score.missing) ? (score.missing as string[]) : [];
  if (missing.length) {
    lines.push(`Fehlende Angaben: ${missing.join(", ")}`);
  }
  if (String(kontakt.nachricht || "").trim()) {
    lines.push(`Nachricht: ${String(kontakt.nachricht)}`);
  }
  return lines.join("\n");
}

async function forwardViaResend(subject: string, text: string, attachments: IncomingFoto[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  if (!apiKey || !to || !from) {
    return false;
  }

  const mailAttachments = attachments
    .filter((foto) => typeof foto.dataUrl === "string" && foto.dataUrl.startsWith("data:"))
    .slice(0, 6)
    .map((foto, index) => ({
      filename: foto.name || `foto-${index + 1}.jpg`,
      content: String(foto.dataUrl).replace(/^data:[^;]+;base64,/, "")
    }));

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      attachments: mailAttachments
    })
  });
  return response.ok;
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload zu groß." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }

  const kontakt = (body.kontakt || {}) as Record<string, unknown>;
  if (!String(kontakt.name || "").trim()) {
    return NextResponse.json({ ok: false, error: "Name fehlt." }, { status: 400 });
  }
  if (!String(kontakt.telefon || "").trim() && !String(kontakt.email || "").trim()) {
    return NextResponse.json({ ok: false, error: "Telefon oder E-Mail wird benötigt." }, { status: 400 });
  }
  if (kontakt.einwilligung !== true) {
    return NextResponse.json({ ok: false, error: "Einwilligung fehlt." }, { status: 400 });
  }

  const summary = summarize(body);
  // Fotos nicht in die Logs kippen — nur die Metadaten.
  console.log("[projekt-anfrage]\n" + summary);

  let forwarded = false;
  try {
    forwarded = await forwardViaResend(
      `Neue Projektanfrage: ${String(kontakt.name)}`,
      summary,
      Array.isArray(body.fotos) ? (body.fotos as IncomingFoto[]) : []
    );
  } catch (error) {
    console.warn("[projekt-anfrage] E-Mail-Weiterleitung fehlgeschlagen:", error);
  }

  return NextResponse.json({ ok: true, forwarded });
}
