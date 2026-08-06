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

function summarize(body: Record<string, unknown>): string {
  const kontakt = (body.kontakt || {}) as Record<string, unknown>;
  const ort = (body.ort || {}) as Record<string, unknown>;
  const budget = (body.budget || {}) as Record<string, unknown>;
  const score = (body.score || {}) as Record<string, unknown>;
  const fotos = Array.isArray(body.fotos) ? (body.fotos as IncomingFoto[]) : [];

  const lines = [
    `Neue Projektanfrage (${String(body.quelle || "website")})`,
    `Projektarten: ${Array.isArray(body.projektarten) ? (body.projektarten as string[]).join(", ") : "-"}`,
    `Ort: ${String(ort.plz || "-")} ${String(ort.ort || "")} (${String(ort.einsatzgebiet || "unknown")})`,
    `Zeitrahmen: ${String(body.zeitrahmen || "-")}`,
    `Budget: ${String(budget.band || "-")} | Match: ${String(budget.match || "-")} | Reaktion: ${String(budget.reaktion || "-")}`,
    `Fotos: ${fotos.length}`,
    `Score: ${String(score.value ?? "-")} (${String(score.label ?? "-")})`,
    `Kontakt: ${String(kontakt.name || "-")} | ${String(kontakt.telefon || "-")} | ${String(kontakt.email || "-")} | Kanal: ${String(kontakt.kanal || "-")}`
  ];
  const missing = Array.isArray(score.missing) ? (score.missing as string[]) : [];
  if (missing.length) {
    lines.push(`Fehlende Angaben: ${missing.join(", ")}`);
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
