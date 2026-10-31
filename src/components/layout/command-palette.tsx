"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import type { NavItem } from "@/components/layout/nav-config";
import { cn } from "@/lib/format";
import type { SearchHit } from "@/services/reports";
import { quickSearch } from "@/services/search-actions";

type Item = { key: string; group: string; title: string; detail?: string; status?: string; href: string };

const groupLabel: Record<SearchHit["kind"], string> = { customer: "Customers", subscription: "Subscriptions", invoice: "Invoices" };

// ⌘K / Ctrl+K from anywhere in the console: jump to a page, or find a
// customer, subscription or invoice by name or number.
export function CommandPalette({ pages }: { pages: NavItem[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef("");
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<{ term: string; hits: SearchHit[] }>({ term: "", hits: [] });
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const mac = useSyncExternalStore(noop, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced, and only the newest answer is kept, so fast typing can't show stale rows.
  useEffect(() => {
    const t = term.trim();
    latest.current = t;
    if (t.length < 2) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await quickSearch(t).catch(() => []);
        if (latest.current === t) {
          setResult({ term: t, hits });
          setActive(0);
        }
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [term]);

  function open() {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    input.current?.select();
  }

  function close() {
    dialog.current?.close();
  }

  const q = term.trim().toLowerCase();
  const answered = q.length >= 2 && result.term === term.trim();
  const found = q.length >= 2 ? result.hits : [];
  const items: Item[] = [
    ...pages
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .slice(0, q ? 4 : pages.length)
      .map((p) => ({ key: `page:${p.href}`, group: "Go to", title: p.label, href: p.href })),
    ...found.map((h) => ({ key: `${h.kind}:${h.id}`, group: groupLabel[h.kind], title: h.title, detail: h.detail, status: h.status, href: h.href })),
  ];
  const current = Math.min(active, Math.max(0, items.length - 1));

  function go(item: Item | undefined) {
    if (!item) return;
    close();
    setTerm("");
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = items.length || 1;
      setActive((current + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[current]);
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: "nearest" });
  }, [current, listId]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted"
      >
        <SearchIcon />
        <span className="flex-1 text-left">Search customers, invoices…</span>
        <kbd className="hidden rounded border border-line px-1.5 font-sans text-[11px] sm:inline">{mac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      <dialog
        ref={dialog}
        aria-label="Search"
        onClick={(e) => e.target === dialog.current && close()}
        className="m-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-card border border-line-strong bg-surface p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon />
          <input
            ref={input}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-activedescendant={items.length ? `${listId}-${current}` : undefined}
            aria-autocomplete="list"
            placeholder="Name, email, SUB-00042 or INV/2026/00042"
            className="h-14 flex-1 bg-transparent text-[15px] placeholder:text-faint"
            // The global focus ring is unlayered and beats utilities; the open dialog already shows where focus is.
            style={{ outline: "none" }}
          />
          {pending && <span className="size-3 animate-spin rounded-full border border-faint border-t-transparent" aria-hidden />}
        </div>

        <ul id={listId} role="listbox" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
          {items.map((item, i) => (
            <li key={item.key} role="presentation">
              {(i === 0 || items[i - 1].group !== item.group) && (
                <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint first:pt-1">{item.group}</p>
              )}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === current}
                onMouseMove={() => setActive(i)}
                onClick={() => go(item)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm", i === current && "bg-ink/[0.06]")}
              >
                <span className="min-w-0 flex-1">
                  <span className="tabular block truncate">{item.title}</span>
                  {item.detail && <span className="block truncate text-xs text-faint">{item.detail}</span>}
                </span>
                {item.status && <span className="shrink-0 text-xs text-muted">{item.status}</span>}
              </div>
            </li>
          ))}
        </ul>
        {answered && !pending && found.length === 0 && (
          <p className="border-t border-line px-5 py-4 text-sm text-muted">No customers, subscriptions or invoices match “{term.trim()}”. Try part of a name or the number&apos;s last digits.</p>
        )}
        <p className="flex gap-4 border-t border-line px-5 py-2.5 text-[11px] text-faint">
          <span>↑↓ to move</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
        </p>
      </dialog>
    </>
  );
}

const noop = () => () => {};

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="7" cy="7" r="4.75" />
      <path d="m10.5 10.5 3.25 3.25" strokeLinecap="round" />
    </svg>
  );
}
