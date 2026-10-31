"use client";

import { useState } from "react";
import { moneyCompact } from "@/lib/format";

export type Series = { key: string; label: string; color: string; values: number[] };

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short" });
const longMonthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const asDate = (ym: string) => new Date(`${ym}-01T00:00:00`);

// Grouped bars by month, one shared axis. Hover a month for both values.
export function MonthlyBars({
  months,
  series,
  format = "money",
  title,
}: {
  months: string[];
  series: Series[];
  format?: "money" | "count";
  title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (n: number) => (format === "money" ? moneyCompact(n) : n.toLocaleString("en-IN"));

  const W = 720;
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const ticks = [0, max / 2, max];
  const slot = plotW / months.length;
  const gap = 2;
  const barW = Math.min(14, (slot * 0.62 - gap * (series.length - 1)) / series.length);
  const groupW = barW * series.length + gap * (series.length - 1);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  return (
    <figure className="relative">
      <figcaption className="sr-only">{title}</figcaption>
      <ul className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.08)" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[rgb(255_255_255/0.38)] text-[10px]">
              {fmt(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const x0 = pad.left + i * slot + (slot - groupW) / 2;
          return (
            <g key={m}>
              {hover === i && <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="rgb(255 255 255 / 0.04)" />}
              {series.map((s, j) => {
                const v = s.values[i] ?? 0;
                const h = Math.max(0, pad.top + plotH - y(v));
                return h > 0 ? <BarUp key={s.key} x={x0 + j * (barW + gap)} y={y(v)} w={barW} h={h} fill={s.color} /> : null;
              })}
              <text x={pad.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-[rgb(255_255_255/0.38)] text-[10px]">
                {monthFmt.format(asDate(m))}
              </text>
              {/* Hit target: the whole month column, not just the bars. */}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${longMonthFmt.format(asDate(m))}: ${series.map((s) => `${s.label} ${fmt(s.values[i] ?? 0)}`).join(", ")}`}
              />
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-40 rounded-field border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${((pad.left + (hover + 0.5) * slot) / W) * 100}%`,
            transform: `translateX(${hover > months.length / 2 ? "-105%" : "5%"})`,
          }}
        >
          <p className="mb-1 font-medium">{longMonthFmt.format(asDate(months[hover]))}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-[2px]" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular text-fg">{fmt(s.values[hover] ?? 0)}</span>
            </p>
          ))}
        </div>
      )}

      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer text-faint hover:text-muted">Show as table</summary>
        <table className="mt-2 w-full">
          <thead className="text-left text-faint">
            <tr>
              <th className="py-1 font-medium">Month</th>
              {series.map((s) => (
                <th key={s.key} className="py-1 text-right font-medium">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => (
              <tr key={m} className="border-t border-line">
                <td className="py-1">{longMonthFmt.format(asDate(m))}</td>
                {series.map((s) => (
                  <td key={s.key} className="tabular py-1 text-right text-fg">
                    {fmt(s.values[i] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// A bar with 4px rounded top corners, square on the baseline.
function BarUp({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  const r = Math.min(4, w / 2, h);
  return (
    <path
      d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`}
      fill={fill}
    />
  );
}

// Round the axis top up to 1, 2 or 5 × a power of ten.
function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}
