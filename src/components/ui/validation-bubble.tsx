"use client";

import { useEffect, useState } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Bubble = { el: Field; message: string; detail?: string; top: number; left: number };

const place = (el: Field) => {
  const r = el.getBoundingClientRect();
  return { top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 360)) };
};

// Takes over the browser's form-validation popup (whose icon can't be styled) for every form on the site.
export function ValidationBubble() {
  const [bubble, setBubble] = useState<Bubble | null>(null);

  useEffect(() => {
    let claimed = false;
    const onInvalid = (e: Event) => {
      e.preventDefault();
      // one submit fires `invalid` for every bad field; like the browser, speak for the first only
      if (claimed) return;
      claimed = true;
      setTimeout(() => (claimed = false));
      const el = e.target as Field;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const title = "title" in el && el.validity.patternMismatch ? el.title : "";
      setBubble({ el, message: el.validationMessage, detail: title || undefined, ...place(el) });
    };
    document.addEventListener("invalid", onInvalid, true);
    return () => document.removeEventListener("invalid", onInvalid, true);
  }, []);

  const el = bubble?.el;
  useEffect(() => {
    if (!el) return;
    const hide = () => setBubble(null);
    const follow = () => setBubble((b) => (b ? { ...b, ...place(b.el) } : b));
    el.addEventListener("input", hide);
    el.addEventListener("blur", hide);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    const timer = window.setTimeout(hide, 6000);
    return () => {
      el.removeEventListener("input", hide);
      el.removeEventListener("blur", hide);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
      window.clearTimeout(timer);
    };
  }, [el]);

  if (!bubble) return null;

  return (
    <div
      role="alert"
      style={{ top: bubble.top, left: bubble.left }}
      className="rise fixed z-[90] flex max-w-[min(352px,calc(100vw-16px))] gap-3 rounded-field border border-white/10 bg-neutral-900 px-3.5 py-3 text-white shadow-xl [animation-duration:0.25s]"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="mt-0.5 size-5 shrink-0 fill-red-500 stroke-red-400 stroke-[1.4] [stroke-linejoin:round]">
        <path d="M12.5 2.5 21 16.5 3 19.5Z" />
        <path d="M12.5 2.5 11.5 13 3 19.5M11.5 13 21 16.5" fill="none" className="stroke-black/35" />
      </svg>
      <div className="text-sm leading-snug">
        <p>{bubble.message}</p>
        {bubble.detail && <p className="mt-1 text-white/70">{bubble.detail}</p>}
      </div>
    </div>
  );
}
