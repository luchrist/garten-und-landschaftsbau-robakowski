"use client";

import { useEffect, useRef, useState } from "react";

import { galabau } from "@/lib/galabau";
import { buildWhatsappHref } from "@/lib/service-area";

/**
 * Hero pattern: a poster image is the base layer, the looping background video
 * crossfades on top once it can actually play. That order is deliberate. The
 * drone clip is often delivered after the first build, and a hero that falls
 * back to a still project photo still looks finished.
 */
export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const show = () => setVideoReady(true);
    video.addEventListener("playing", show, { once: true });
    if (video.readyState >= 3) show();

    video.play().catch(() => {});

    // iPad/Safari can refuse muted autoplay; retry on the first interaction.
    const tryPlay = () => {
      video.play().catch(() => {});
    };
    document.addEventListener("touchstart", tryPlay, { once: true });
    document.addEventListener("click", tryPlay, { once: true });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      video.removeEventListener("playing", show);
      document.removeEventListener("touchstart", tryPlay);
      document.removeEventListener("click", tryPlay);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const whatsappHref = buildWhatsappHref(galabau.serviceArea.centerCity);

  return (
    <section className="relative h-[100dvh] min-h-[560px] overflow-hidden bg-ink">
      <img
        src="/hero-poster.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        poster="/hero-poster.webp"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disableRemotePlayback
        {...({ "webkit-playsinline": "true", "x5-playsinline": "true" } as Record<string, string>)}
      >
        <source src="/hero-bg.webm" type="video/webm" />
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/25" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/70 to-transparent" />

      <div className="relative z-20 flex h-full items-end">
        <div className="mx-auto w-full max-w-[1400px] px-6 pb-16 md:px-10 md:pb-24 lg:px-14">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/75">
              <span className="marker" />
              <span>
                Einsatzgebiet {galabau.serviceArea.centerCity} und rund {galabau.serviceArea.radiusKm} km Umkreis
              </span>
            </div>

            <h1 className="mt-5 font-display text-[36px] leading-[0.98] tracking-tight text-bone drop-shadow-lg sm:text-[46px] md:text-[62px] lg:text-[74px]">
              {galabau.claim}
            </h1>

            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-bone/85 drop-shadow-md md:text-[17px]">
              {galabau.heroSubline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <a
                href="/projekt-anfragen"
                className="inline-flex items-center justify-center rounded-full bg-laub-500 px-7 py-4 text-[14px] font-medium tracking-wide text-bone transition-colors hover:bg-laub-600 active:scale-[0.98]"
              >
                Projekt anfragen
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-bone/45 bg-bone/5 px-7 py-4 text-[14px] font-medium tracking-wide text-bone backdrop-blur-sm transition-colors hover:bg-bone/15 active:scale-[0.98]"
                >
                  Kurze Frage per WhatsApp
                </a>
              ) : null}
            </div>

            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-bone/60">
              {galabau.assistant.responsePromise}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
