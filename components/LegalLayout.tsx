import company from "@/config/company";

export function LegalLayout({
  label,
  title,
  children
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bone [overflow-x:clip]">
      <header className="border-b border-ink/10">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-[2px] md:px-10">
          <a href="/" className="group flex items-center gap-3">
            <img
              src="/assets/logo-mark.png"
              alt={`${company.name} Logo`}
              className="h-20 w-20 object-contain md:h-28 md:w-28"
            />
            <span className="hidden max-w-[18ch] font-display text-[17px] leading-tight tracking-tight text-ink sm:block md:text-[20px]">
              {company.name}
            </span>
          </a>
          <a
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55 transition-colors hover:text-ink"
          >
            &larr; Zurück
          </a>
        </nav>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-32">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/55">
              <span className="block h-[6px] w-[6px] rotate-45 bg-laub-500" />
              <span>{label}</span>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h1 className="break-words font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px] md:text-[64px] lg:text-[78px]">
              {title}
              <span className="text-erde-500">.</span>
            </h1>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-12 md:col-span-9 md:col-start-4">{children}</div>
        </div>
      </div>
    </main>
  );
}
