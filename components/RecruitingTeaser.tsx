import { galabau } from "@/lib/galabau";

/**
 * Konzept, Startseite: Recruiting-Teaser "Landschaftsgärtner, Helfer oder
 * Quereinsteiger? In 60 Sekunden bewerben." Renders nothing when recruiting
 * is disabled for the build.
 */
export function RecruitingTeaser() {
  if (!galabau.recruiting.enabled) return null;

  return (
    <section className="relative bg-laub-700 py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-12 md:col-span-8">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/60">
              <span className="inline-block h-[0.4rem] w-[0.4rem] rounded-full bg-erde-300" />
              <span>Karriere</span>
            </div>
            <h2 className="mt-5 font-display text-[28px] leading-[1.08] tracking-tight text-bone sm:text-[36px] md:text-[46px]">
              {galabau.recruiting.headline}
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-bone/80">{galabau.recruiting.teaser}</p>
          </div>
          <div className="col-span-12 md:col-span-4 md:text-right">
            <a
              href="/karriere"
              className="inline-flex items-center gap-3 rounded-full bg-bone px-8 py-4 text-[14px] font-medium text-laub-800 transition-colors hover:bg-creme"
            >
              In 60 Sekunden bewerben
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
