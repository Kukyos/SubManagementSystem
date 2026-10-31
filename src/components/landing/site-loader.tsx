"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { INTRO_KEY } from "./intro";

const MIN_MS = 1700;

/*
  Intro screen in the reference's style: a turning mark, a two-line statement
  that wipes up into view, LOADING at the bottom left and a percentage at the
  bottom right. It holds until fonts are ready, then says Completed and fades,
  and the hero's own entrance plays after it.
*/
export function SiteLoader() {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done" | "gone">("loading");

  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const timers: number[] = [];

    if (root.dataset.intro !== "playing") {
      raf = requestAnimationFrame(() => setPhase("gone"));
      return () => cancelAnimationFrame(raf);
    }

    let fontsReady = false;
    document.fonts.ready.then(() => {
      fontsReady = true;
    });
    const start = performance.now();
    const tick = () => {
      let p = Math.min(1, (performance.now() - start) / MIN_MS);
      if (!fontsReady) p = Math.min(p, 0.9);
      setPct(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      setPhase("done");
      timers.push(
        window.setTimeout(() => {
          root.dataset.intro = "done";
          try {
            sessionStorage.setItem(INTRO_KEY, "1");
          } catch {}
        }, 650),
        window.setTimeout(() => setPhase("gone"), 1600),
      );
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className="site-loader fixed inset-0 z-[100] hidden flex-col items-center justify-center bg-black px-5 transition-opacity duration-700 ease-out-soft"
    >
      <LogoMark className="size-20 animate-[loader-spin_3s_ease-in-out_infinite] md:size-24" />
      <div className="mt-12 text-center text-[clamp(1.5rem,4.2vw,3.5rem)] leading-[1.2] font-normal tracking-[-0.04em]">
        <span className="block overflow-hidden pb-1">
          <span className="wipe [animation-duration:1s]">Your recurring revenue has a rhythm.</span>
        </span>
        <span className="block overflow-hidden pb-1">
          <span className="wipe [animation-duration:1.5s]">Brightloop keeps it.</span>
        </span>
      </div>
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-xl font-semibold uppercase md:inset-x-12 md:bottom-9">
        <span className="block overflow-hidden">
          {phase === "loading" ? (
            <span className="wipe [animation-duration:1.2s]">
              Loading<span className="animate-pulse">...</span>
            </span>
          ) : (
            <span className="wipe [animation-duration:0.6s]">Completed</span>
          )}
        </span>
        <span className="tabular text-[2rem] leading-none font-normal">{pct}</span>
      </div>
    </div>
  );
}
