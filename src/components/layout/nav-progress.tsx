"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";

const START = "nav:start";

// For navigations that don't come from a link click, like router.push.
export function startNavProgress() {
  window.dispatchEvent(new Event(START));
}

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const url = `${pathname}?${search}`;
  const [nav, setNav] = useState<{ from: string; value: number } | null>(null);
  const done = nav !== null && nav.from !== url;
  const progress = nav === null ? null : done ? 1 : nav.value;
  const trickle = useRef<ReturnType<typeof setInterval>>(undefined);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = useRef(url);

  useEffect(() => {
    current.current = url;
  }, [url]);

  useEffect(() => {
    const start = () => {
      clearTimeout(hide.current);
      clearInterval(trickle.current);
      setNav({ from: current.current, value: 0.08 });
      // Gives up if the URL never changes (same page, failed request).
      hide.current = setTimeout(() => setNav(null), 15000);
      // Creeps toward 90% and waits there for the page.
      trickle.current = setInterval(() => setNav((n) => n && { ...n, value: n.value + (0.9 - n.value) * 0.08 }), 200);
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };

    // Capture phase: Link calls preventDefault before a bubbling listener would see the click.
    document.addEventListener("click", onClick, true);
    window.addEventListener(START, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START, start);
      clearInterval(trickle.current);
      clearTimeout(hide.current);
    };
  }, []);

  // New URL rendered: finish the bar, then fade it out.
  useEffect(() => {
    if (!done) return;
    clearInterval(trickle.current);
    clearTimeout(hide.current);
    hide.current = setTimeout(() => setNav(null), 350);
  }, [done]);

  if (progress === null) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 print:hidden"
      style={{ opacity: progress === 1 ? 0 : 1, transition: "opacity 300ms 50ms" }}
    >
      <div
        className="relative h-full bg-gradient-to-r from-accent via-amber to-amber shadow-[0_0_8px_var(--color-amber)]"
        style={{ width: `${progress * 100}%`, transition: "width 200ms ease-out" }}
      >
        <span className="absolute -right-2 -top-px [perspective:60px]">
          <LogoMark className="size-4 motion-safe:animate-[prism-turn_0.9s_linear_infinite] drop-shadow-[0_0_4px_var(--color-amber)]" />
        </span>
      </div>
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense>
      <Bar />
    </Suspense>
  );
}
