"use client";

import { useEffect, useRef, useState } from "react";

import { galabau } from "@/lib/galabau";
import { buildWhatsappHref } from "@/lib/service-area";

/**
 * Hero pattern: a poster image is the base layer, the looping background video
 * crossfades on top once it genuinely plays. That order is deliberate. The
 * drone clip is often delivered after the first build, and a hero that falls
 * back to a still project photo still looks finished.
 *
 * The playback detection is the fiddly part — see the comments inside. In iOS
 * and macOS Low Power Mode autoplay is blocked, and anything less strict than
 * this leaves a paused video with a native play button on screen.
 */
export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // "timeupdate" instead of "playing": some browsers fire "playing" briefly
    // before their autoplay policy kicks in and pause the video again. That
    // false positive is what used to hide the poster and expose the play
    // button. Only a video that is unpaused AND past 0s is really running.
    const onTimeUpdate = () => {
      if (!video.paused && video.currentTime > 0) {
        setVideoReady(true);
        video.removeEventListener("timeupdate", onTimeUpdate);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);

    const attemptPlay = () => {
      void video.play().catch(() => {});
    };

    if (video.readyState >= 2) {
      attemptPlay();
    } else {
      video.addEventListener("loadeddata", attemptPlay, { once: true });
      // Browsers sometimes skip preload="auto" for re-created <video> elements
      // on client-side navigations.
      video.load();
    }

    // Low Power Mode blocks autoplay until the user interacts, and playback
    // also stops on tab switch or screen lock. Retry on every signal that the
    // page is in front of the user again.
    const onVisibilityChange = () => {
      if (!document.hidden) attemptPlay();
    };
    const onPageShow = () => attemptPlay(); // bfcache restore
    const onInteraction = () => {
      attemptPlay();
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("click", onInteraction);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("touchstart", onInteraction);
    document.addEventListener("click", onInteraction);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadeddata", attemptPlay);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("click", onInteraction);
    };
  }, []);

  const whatsappHref = buildWhatsappHref(galabau.serviceArea.centerCity);

  return (
    <section className="relative h-[100dvh] min-h-[560px] overflow-hidden bg-ink">
      {/* The opacity belongs to this wrapper, not to the video itself: Safari
          can paint its native play overlay outside the video's own opacity and
          stacking layer, so hiding the parent is what actually hides it. */}
      <div
        className={`absolute inset-0 z-0 overflow-hidden transition-opacity duration-1000 ${
          videoReady ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ isolation: "isolate", transform: "translateZ(0)" }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          poster="/hero-poster.webp"
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          {...({ "webkit-playsinline": "true", "x-webkit-airplay": "deny" } as Record<string, string>)}
        >
          <source src="/hero-bg.webm" type="video/webm" />
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Poster on top, not underneath: it covers the native play button that
          Low Power Mode draws over a paused video. pointer-events-none so the
          tap still reaches the interaction handler that starts playback. */}
      <img
        src="/hero-poster.webp"
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[3] h-full w-full object-cover transition-opacity duration-500 ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-ink/70 to-transparent" />

      <div className="relative z-20 flex h-full items-end">
        <div className="mx-auto w-full max-w-[1400px] px-6 pb-16 md:px-10 md:pb-24 lg:px-14">
          <div className="max-w-2xl">
            <h1 className="font-display text-[36px] leading-[0.98] tracking-tight text-bone drop-shadow-lg sm:text-[46px] md:text-[62px] lg:text-[74px]">
              {galabau.claim}
            </h1>

            {/* Auf dem Handy bleibt neben Claim und Buttons kein Platz fuer die
                Subline, ohne dass der Hero gedraengt wirkt. */}
            <p className="mt-5 hidden max-w-[46ch] text-[15px] leading-relaxed text-bone/85 drop-shadow-md md:block md:text-[17px]">
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
                  Per WhatsApp fragen
                </a>
              ) : null}
            </div>

            <p className="mt-5 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-bone/60 md:block">
              {galabau.assistant.responsePromise}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
