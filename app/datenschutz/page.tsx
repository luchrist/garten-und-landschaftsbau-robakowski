import company from "@/config/company";
import { LegalLayout } from "@/components/LegalLayout";

export default function DatenschutzPage() {
  return (
    <LegalLayout label="Datenschutz" title="Datenschutz">
      <Section title="1. Verantwortlicher">
        <p>
          {company.name}
          <br />
          {company.address.street}
          <br />
          {company.address.cityLine}
          <br />
          E-Mail: {company.contact.email}
          <br />
          Telefon: {company.contact.phone}
        </p>
      </Section>

      <Section title="2. Erhebung und Speicherung personenbezogener Daten">
        <p>
          Beim Besuch unserer Website werden automatisch Informationen durch den Browser übermittelt und in
          Server-Logfiles gespeichert. Dies umfasst Browsertyp und -version, verwendetes Betriebssystem,
          Referrer-URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse. Eine
          Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
        </p>
      </Section>

      <Section title="3. Projekt-Anfrageformular">
        <p>
          Wenn Sie über unseren Projekt-Assistenten eine Anfrage stellen, erheben wir die von Ihnen angegebenen
          Daten: Projektart, Postleitzahl und Ort, Flächenangaben, Planungsstand, Zeitrahmen, Budgetrahmen,
          hochgeladene Fotos sowie Ihre Kontaktdaten (Name, Telefonnummer, E-Mail-Adresse, bevorzugter Kanal und ggf.
          eine Nachricht). Diese Daten verwenden wir ausschließlich zur Bearbeitung und Beantwortung Ihrer
          Projektanfrage sowie zur Vorbereitung eines Angebots. Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
          (Vertragsanbahnung). Kommt kein Auftrag zustande, werden die Daten spätestens nach zwölf Monaten gelöscht,
          sofern keine gesetzlichen Aufbewahrungspflichten bestehen.
        </p>
      </Section>

      <Section title="4. Foto-Uploads">
        <p>
          Von Ihnen hochgeladene Fotos (z.B. vom Garten, der Zufahrt oder von Skizzen) werden ausschließlich zur
          Einschätzung Ihres Projekts verwendet und nicht veröffentlicht. Bitte laden Sie keine Bilder hoch, auf
          denen dritte Personen erkennbar sind.
        </p>
      </Section>

      <Section title="5. Bewerbungen">
        <p>
          Wenn Sie sich über unser Bewerbungsformular bewerben, verarbeiten wir die von Ihnen angegebenen Daten
          (gewünschte Tätigkeit, Erfahrung, Führerscheinklassen, Wohnort, möglicher Starttermin, Name,
          Telefonnummer, ggf. E-Mail-Adresse und Nachricht) ausschließlich zur Durchführung des Bewerbungsverfahrens.
          Rechtsgrundlage ist § 26 BDSG i.V.m. Art. 6 Abs. 1 lit. b DSGVO. Bewerbungsdaten werden spätestens sechs
          Monate nach Abschluss des Verfahrens gelöscht, sofern Sie nicht in eine längere Speicherung einwilligen.
        </p>
      </Section>

      <Section title="6. Kontaktaufnahme per WhatsApp">
        <p>
          Wenn Sie mit uns über WhatsApp kommunizieren, gelten ergänzend die Datenschutzbestimmungen von WhatsApp
          (Meta Platforms Ireland Ltd.). Die Nutzung des WhatsApp-Kanals ist freiwillig; alle Anliegen können auch
          telefonisch oder per E-Mail an uns gerichtet werden.
        </p>
      </Section>

      <Section title="7. Kontaktaufnahme">
        <p>
          Bei der Kontaktaufnahme per E-Mail oder Telefon werden die von Ihnen mitgeteilten Daten (Name, Anfrage,
          ggf. Telefonnummer und E-Mail-Adresse) zur Bearbeitung Ihres Anliegens gespeichert. Diese Daten werden
          gelöscht, sobald sie für die Erreichung des Zweckes ihrer Erhebung nicht mehr erforderlich sind.
        </p>
      </Section>

      <Section title="8. Ihre Rechte">
        <p>Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p>
          Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer
          personenbezogenen Daten durch uns zu beschweren.
        </p>
      </Section>

      <Section title="9. Hosting">
        <p>
          Diese Website wird bei einem externen Dienstleister gehostet. Die beim Besuch der Website erfassten Daten
          werden auf den Servern des Hosters verarbeitet. Der Einsatz des Hosters erfolgt zum Zwecke der sicheren,
          schnellen und effizienten Bereitstellung unseres Online-Angebots (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </Section>

      <Section title="10. Kartendarstellung (OpenStreetMap)">
        <p>
          Zur Darstellung unseres Einsatzgebiets binden wir Kartenmaterial von OpenStreetMap ein. Anbieter ist die
          OpenStreetMap Foundation, St John&rsquo;s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Vereinigtes
          Königreich.
        </p>
        <p>
          Beim Aufruf der Seite lädt Ihr Browser die Kartenkacheln direkt von den Servern von OpenStreetMap. Dabei wird
          Ihre IP-Adresse an OpenStreetMap übertragen. Auf die Verarbeitung dieser Daten haben wir keinen Einfluss. Die
          Einbindung erfolgt im Interesse einer ansprechenden Darstellung unseres Einsatzgebiets und einer leichten
          Auffindbarkeit der von uns angegebenen Orte (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p>
          Weitere Informationen finden Sie in der Datenschutzerklärung von OpenStreetMap:{" "}
          <a
            href="https://osmfoundation.org/wiki/Privacy_Policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            osmfoundation.org/wiki/Privacy_Policy
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-[22px] tracking-tight text-ink md:text-[26px]">{title}</h3>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/70">{children}</div>
    </div>
  );
}
