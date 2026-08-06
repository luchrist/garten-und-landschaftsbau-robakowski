import { NextRequest, NextResponse } from "next/server";

/**
 * Nimmt 60-Sekunden-Bewerbungen entgegen (Website und Widget). Gleiche
 * Versandlogik wie /api/projekt-anfrage: loggen, optional per Resend an das
 * Büro mailen; die CRM-Anbindung übernimmt der Post-Sale-Schritt der Factory.
 */

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }

  if (!String(body.name || "").trim()) {
    return NextResponse.json({ ok: false, error: "Name fehlt." }, { status: 400 });
  }
  if (!String(body.telefon || "").trim()) {
    return NextResponse.json({ ok: false, error: "Telefonnummer fehlt." }, { status: 400 });
  }
  if (body.einwilligung !== true) {
    return NextResponse.json({ ok: false, error: "Einwilligung fehlt." }, { status: 400 });
  }

  const summary = [
    `Neue Bewerbung (${String(body.quelle || "website")})`,
    `Tätigkeit: ${String(body.taetigkeit || "-")}`,
    `Erfahrung: ${String(body.erfahrung || "-")}`,
    `Führerschein: ${Array.isArray(body.fuehrerschein) ? (body.fuehrerschein as string[]).join(", ") : "-"}`,
    `Wohnort: ${String(body.wohnort || "-")}`,
    `Start: ${String(body.startdatum || "-")}`,
    `Kontakt: ${String(body.name)} | ${String(body.telefon)} | ${String(body.email || "-")}`,
    `Nachricht: ${String(body.nachricht || "-")}`
  ].join("\n");

  console.log("[bewerbung]\n" + summary);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  let forwarded = false;
  if (apiKey && to && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Neue Bewerbung: ${String(body.name)}`,
          text: summary
        })
      });
      forwarded = response.ok;
    } catch (error) {
      console.warn("[bewerbung] E-Mail-Weiterleitung fehlgeschlagen:", error);
    }
  }

  return NextResponse.json({ ok: true, forwarded });
}
