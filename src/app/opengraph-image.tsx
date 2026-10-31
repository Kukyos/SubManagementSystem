import { ImageResponse } from "next/og";

export const alt = "Brightloop: plans, subscriptions and recurring billing in one place";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const shards = [
  { x: 820, y: 90, s: 70, c: "#ffb829", r: 12 },
  { x: 990, y: 210, s: 110, c: "#8052ff", r: -18 },
  { x: 860, y: 380, s: 56, c: "#2fd3a7", r: 30 },
  { x: 1060, y: 450, s: 80, c: "#ff7a9c", r: 8 },
  { x: 900, y: 520, s: 44, c: "#5b8cff", r: -24 },
];

const Mark = ({ size, colour }: { size: number; colour?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <g fill="none" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 22 29 22" stroke={colour ?? "#edebff"} strokeOpacity=".35" />
      <path d="M16 3 3 22M3 22 18 29" stroke={colour ?? "#ffb829"} />
      <path d="M16 3 29 22M29 22 18 29" stroke={colour ?? "#8052ff"} />
      <path d="M16 3 18 29" stroke={colour ?? "#2fd3a7"} />
    </g>
  </svg>
);

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#000", color: "#fff", position: "relative", padding: 80 }}>
        {shards.map((s) => (
          <div key={s.x} style={{ position: "absolute", left: s.x, top: s.y, display: "flex", transform: `rotate(${s.r}deg)` }}>
            <Mark size={s.s} colour={s.c} />
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Mark size={56} />
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.01em" }}>Brightloop</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.06em", color: "#ffb829" }}>SUBSCRIPTION MANAGEMENT</span>
            <span style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: "-0.03em" }}>Plans, subscriptions and billing in one loop.</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
