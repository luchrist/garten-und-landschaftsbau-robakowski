"use client";

import { useEffect, useState } from "react";

import company from "@/config/company";
import { galabau } from "@/lib/galabau";

const SECTION_LINKS = [
  { href: "/#leistungen", label: "Leistungen" },
  { href: "/#referenzen", label: "Referenzen" },
  { href: "/#einsatzgebiet", label: "Einsatzgebiet" },
  { href: "/#stimmen", label: "Bewertungen" }
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = galabau.recruiting.enabled
    ? [...SECTION_LINKS, { href: "/karriere", label: "Karriere" }]
    : SECTION_LINKS;

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid ? "bg-bone/90 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div
        className={`absolute inset-x-0 bottom-0 h-px transition-opacity ${
          solid ? "bg-ink/10 opacity-100" : "opacity-0"
        }`}
      />
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-[2px] md:px-10">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/assets/logo-mark.png"
            alt={`${company.name} Logo`}
            className="h-16 w-16 object-contain transition-all duration-500 md:h-24 md:w-24"
          />
          <span
            className={`hidden max-w-[16ch] font-display text-[16px] leading-tight tracking-tight transition-colors duration-500 sm:block md:text-[19px] ${
              solid ? "text-ink" : "text-bone"
            }`}
          >
            {company.name}
          </span>
        </a>

        <div className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`group relative font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-500 ${
                solid ? "text-ink/65 hover:text-ink" : "text-bone/75 hover:text-bone"
              }`}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-erde-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/projekt-anfragen"
            className={`group relative hidden overflow-hidden rounded-full border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-all duration-500 active:scale-[0.98] sm:inline-flex sm:items-center sm:gap-3 ${
              solid ? "border-ink text-ink" : "border-bone/50 text-bone"
            }`}
          >
            <span className="relative z-10 transition-colors group-hover:text-bone">Projekt anfragen</span>
            <span className="relative z-10 transition-colors group-hover:text-bone">&rarr;</span>
            <span className="absolute inset-0 -z-0 origin-left scale-x-0 bg-laub-500 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
          </a>

          <button
            type="button"
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors lg:hidden ${
              solid ? "border-ink/25 text-ink" : "border-bone/45 text-bone"
            }`}
          >
            <span className="relative block h-[10px] w-[18px]">
              <span
                className={`absolute left-0 block h-[1.5px] w-full bg-current transition-transform duration-300 ${
                  open ? "top-[4px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 block h-[1.5px] w-full bg-current transition-transform duration-300 ${
                  open ? "top-[4px] -rotate-45" : "top-[8px]"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-ink/10 bg-bone/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-[1400px] px-6 py-6 md:px-10">
            <ul className="flex flex-col gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-ink/10 py-3 font-display text-[22px] tracking-tight text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="/projekt-anfragen"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-laub-500 px-6 py-4 text-[14px] font-medium text-bone"
            >
              Projekt anfragen
            </a>
            <a
              href={company.contact.phoneLink || "#"}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-ink/20 px-6 py-4 text-[14px] font-medium text-ink"
            >
              {company.contact.phone || "Anrufen"}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
