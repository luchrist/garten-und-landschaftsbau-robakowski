import { InstagramLogo, FacebookLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";

import company from "@/config/company";
import { galabau } from "@/lib/galabau";

const socials = [
  { key: "instagram" as const, label: "Instagram", Icon: InstagramLogo },
  { key: "facebook" as const, label: "Facebook", Icon: FacebookLogo },
  { key: "tiktok" as const, label: "TikTok", Icon: TiktokLogo }
];

export function Footer() {
  return (
    <footer className="relative bg-bone pb-10 pt-16">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col gap-12 border-t border-ink/15 pt-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <img
              src="/assets/logo-mark.png"
              alt={`${company.name} Logo`}
              className="h-20 w-20 object-contain md:h-28 md:w-28"
            />
            <div className="max-w-[14ch] font-display text-[30px] leading-[1.02] tracking-tight text-ink md:text-[44px]">
              {company.shortName || company.name}
              <span className="text-erde-500">.</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:flex md:items-end md:gap-12">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">Telefon</div>
              <a
                href={company.contact.phoneLink || "#"}
                className="mt-3 block font-mono text-[12px] tracking-[0.05em] text-ink hover:text-laub-600"
              >
                {company.contact.phone}
              </a>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">{company.address.city}</div>
              <div className="mt-3 font-mono text-[12px] tracking-[0.05em] text-ink">{company.address.street}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">Projekt</div>
              <a
                href="/projekt-anfragen"
                className="mt-3 block font-mono text-[12px] uppercase tracking-[0.16em] text-laub-600 hover:text-laub-800"
              >
                Projekt anfragen &rarr;
              </a>
              <a
                href="/kosten"
                className="mt-2 block font-mono text-[12px] uppercase tracking-[0.16em] text-ink/60 hover:text-ink"
              >
                Kostenrechner
              </a>
              {galabau.recruiting.enabled ? (
                <a
                  href="/karriere"
                  className="mt-2 block font-mono text-[12px] uppercase tracking-[0.16em] text-ink/60 hover:text-ink"
                >
                  Karriere
                </a>
              ) : null}
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">Sozial</div>
              <ul className="mt-3 flex items-center gap-2">
                {socials
                  .filter(({ key }) => !company.socialMedia.hidden[key])
                  .map(({ key, label, Icon }) => (
                    <li key={key}>
                      <a
                        href={company.socialMedia[key]}
                        aria-label={label}
                        className="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink/60 transition-all duration-300 hover:border-ink hover:bg-ink hover:text-bone active:scale-[0.94]"
                      >
                        <Icon size={14} weight="regular" />
                      </a>
                    </li>
                  ))}
                {socials.every(({ key }) => company.socialMedia.hidden[key]) ? (
                  <li className="font-mono text-[11px] text-ink/40">–</li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-ink/10 pt-6 md:flex-row md:items-center md:justify-between">
          <a
            href="mailto:luca@creatare.de"
            className="group inline-flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.22em] text-ink transition-colors hover:text-laub-600"
          >
            <span className="block h-[6px] w-[6px] rotate-45 bg-laub-500" />
            <span>
              Erstellt von{" "}
              <span className="font-display text-[15px] normal-case tracking-tight text-ink group-hover:text-laub-600">
                Luca Christ
              </span>
              <span className="ml-2 normal-case tracking-normal text-ink/55 group-hover:text-laub-600">
                · luca@creatare.de
              </span>
            </span>
          </a>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/45 md:flex-row md:items-center">
          <span>&copy; {new Date().getFullYear()} {company.name}. Alle Rechte vorbehalten.</span>
          <span className="flex gap-3">
            <a href="/impressum" className="transition-colors hover:text-ink">Impressum</a>
            <span>&middot;</span>
            <a href="/datenschutz" className="transition-colors hover:text-ink">Datenschutz</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
