# Design

Reference: [dala.craftedbygc.com](https://dala.craftedbygc.com). Black canvas,
big light grotesk type, one violet call to action, amber eyebrows, and a 3D
cloud of small wireframe tetrahedra in five colours that holds a shape, breaks
apart as you scroll, and comes back together.

## The idea we take from it

**Every tetrahedron is a subscription.** Its colour is its plan, its
brightness is its state.

- **Landing hero:** thousands of them hold the shape of a loop (Brightloop:
  recurring revenue going round). Scrolling breaks the loop into a scattered
  mess, which is the brief's "how things run today": spreadsheets, missed
  renewals, hand-typed invoices. Further down, the pieces snap back into the
  loop as each feature is introduced: one place.
- **Dashboard:** a smaller live version made from the real data. One shard per
  active subscription, coloured by plan. Paused shards are dim, overdue ones
  pulse amber, and newly activated ones fly in.
- **Portal:** the customer's own subscriptions as a few large, slowly turning
  shards, one per subscription.

Elsewhere the console stays calm and dense: black surfaces, thin borders, the
same type. The shard motif appears only as a small mark (status dots are tiny
triangles, the logo is a tetrahedron).

## Colour

Dark first. The brand is black. The console and portal also have a light
theme, picked per person with the sun / moon button in the header and kept in
a `theme` cookie so the server renders it with no flash. Landing and auth
pages are always dark.

Light values (`[data-theme="light"]` in `globals.css`): page `#F5F5F7`,
surface `#FFFFFF`, surface-2 `#F0F0F3`, hairlines `rgba(10,10,20,0.09)` /
`0.18`, text `#0B0B10`, muted 66%, faint 50%. Status colours deepen so text
holds 4.5:1 on white: violet `#7444F5`, amber `#A86500`, teal `#0B8A68`, pink
`#D0325C`, blue `#2F5FD6`.

**`ink`** is the overlay colour: white in dark, near-black in light. Hovers,
tracks and tints use `bg-ink/[0.03]` and friends, never `bg-white/…`, so they
work in both themes.

| token | value | use |
|---|---|---|
| `--bg` | `#000000` | page |
| `--surface` | `#0B0B0D` | cards, sidebar |
| `--surface-2` | `#141417` | inputs, table header, hover |
| `--border` | `rgba(255,255,255,0.08)` | hairlines |
| `--border-strong` | `rgba(255,255,255,0.16)` | focused / active edges |
| `--text` | `#FFFFFF` | primary text |
| `--text-muted` | `rgba(255,255,255,0.62)` | secondary text |
| `--text-faint` | `rgba(255,255,255,0.38)` | hints, placeholders |
| `--accent` | `#8052FF` | primary buttons, links, focus ring |
| `--accent-hover` | `#9470FF` | |
| `--amber` | `#FFB829` | eyebrows, highlights, warnings |
| `--teal` | `#2FD3A7` | success, paid, active |
| `--pink` | `#FF7A9C` | danger, overdue |
| `--blue` | `#5B8CFF` | info |

Shard palette (particles, plans, chart series), in this order: amber
`#FFB829`, violet `#8052FF`, teal `#2FD3A7`, white `#EDEBFF`, pink `#FF7A9C`,
blue `#5B8CFF`.

### Status colours (identical everywhere: badge, board column, chart, shard)

| subscription | colour | | invoice | colour |
|---|---|---|---|---|
| draft | white 50% | | draft | white 50% |
| quotation | blue | | confirmed | violet |
| confirmed | violet | | paid | teal |
| active | teal | | cancelled | white 25% |
| paused | amber | | **overdue** (derived) | pink |
| closed | white 25% | | | |

## Type

The reference uses PP Neue Montreal (paid). We use **Geist** (free, already
loaded through `next/font`) at the same sizes and weights, with **Geist Mono**
for numbers in tables.

| role | size | weight | line height | tracking | notes |
|---|---|---|---|---|---|
| display | clamp(56px, 9vw, 130px) | 400 | 1.1 | -0.04em | landing hero only |
| statement | clamp(24px, 3vw, 42px) | 400 | 1.2 | -0.01em | centred scroll statements |
| h1 | 32px | 400 | 1.15 | -0.02em | page titles in the app |
| h2 | 22px | 500 | 1.25 | -0.01em | section titles |
| lead | 20px | 200 | 1.5 | 0 | intro paragraphs |
| body | 14px | 400 | 1.5 | 0 | |
| small | 12.5px | 400 | 1.4 | 0 | |
| eyebrow | 13px | 600 | 1.2 | 0.05em | UPPERCASE, amber |
| button / nav | 13px | 600 | 1 | 0.025em | UPPERCASE |
| kpi number | 36px | 300 | 1 | -0.02em | tabular figures |

Money always uses tabular figures, is right-aligned, and carries `₹`.

## Shape and space

- 4px base. Card padding 20–24px. Page gutters 32px desktop, 16px mobile.
- Radius: buttons and badges are full pills (`9999px`); cards 16px; inputs 10px.
- No shadows. Depth comes from surface steps and hairline borders. The only
  glow is a soft violet one behind the hero shape and on the focus ring.
- Primary button: violet fill, white uppercase label, pill. Secondary: 1px
  `--border-strong` outline, transparent. Ghost: text only.

## Motion

- UI transitions 150–200ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- The shard scene runs only while it is on screen, pauses in background tabs,
  and is replaced by a still frame under `prefers-reduced-motion`.
- Headlines reveal line by line on first view (opacity + 12px rise), once.

## Charts

Series use the shard palette in order. Line and area charts sit on `--bg`
with gridlines at `--border`, and values are labelled directly where possible.
Invoiced vs collected uses violet vs teal.

## Rules that hold everywhere

- A status has the same colour and label wherever it appears.
- Every list has loading, empty and error states.
- Contrast: text 4.5:1, large text and UI 3:1. Muted text never goes below 62%
  white on black.
- Focus is always visible: a 2px violet ring with a 2px offset.
- The 3D scene is decoration. Everything it shows also exists as text.
