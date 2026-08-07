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

  const lebenslauf = (body.lebenslauf ?? null) as { name?: string; type?: string; dataUrl?: string } | null;

  const summary = [
    `Neue Bewerbung (${String(body.quelle || "website")})`,
    `Tätigkeit: ${String(body.taetigkeit || "-")}`,
    `Hintergrund: ${String(body.erfahrung || "-")}`,
    `Praxis in dieser Tätigkeit: ${String(body.berufsjahre || "-")}`,
    `Führerschein: ${Array.isArray(body.fuehrerschein) ? (body.fuehrerschein as string[]).join(", ") : "-"}`,
    `Wohnort: ${String(body.wohnort || "-")}`,
    `Start: ${String(body.startdatum || "-")}`,
    `Anrede: ${String(body.geschlecht || "-")}`,
    `Kontakt: ${String(body.name)} | ${String(body.telefon)} | ${String(body.email || "-")}`,
    `Nachricht: ${String(body.nachricht || "-")}`,
    `Lebenslauf: ${lebenslauf?.name ? lebenslauf.name : "nicht hochgeladen"}`
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
          text: summary,
          // Der Lebenslauf kommt als Data-URL an; Resend will reines Base64.
          ...(lebenslauf?.dataUrl
            ? {
                attachments: [
                  {
                    filename: lebenslauf.name || "lebenslauf",
                    content: lebenslauf.dataUrl.split(",")[1] ?? ""
                  }
                ]
              }
            : {})
        })
      });
      forwarded = response.ok;
    } catch (error) {
      console.warn("[bewerbung] E-Mail-Weiterleitung fehlgeschlagen:", error);
    }
  }

  return NextResponse.json({ ok: true, forwarded });
}
