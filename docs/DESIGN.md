# Design

**Not filled yet.** The visual direction is being chosen; tokens go here
first, then into `src/app/globals.css` (`@theme`), and are checked in a real
browser before any page is styled against them.

## To fill

- **Direction:** one paragraph on the feel, plus reference links or screenshots.
- **Colour:** background, surface, border, text (primary / muted), accent,
  accent-foreground, success, warning, danger, info. Light and dark.
- **Status colours:** one per subscription status and invoice status, used
  identically everywhere (badges, pipeline, charts).
- **Type:** display and body families, weights, the scale (xs → 4xl),
  numeric figures (tabular for money columns).
- **Spacing and radius:** base unit, card padding, radius scale.
- **Elevation:** borders vs shadows, and when each is used.
- **Motion:** durations and easing; everything respects
  `prefers-reduced-motion`.
- **Charts:** series colours (sequential if the palette has one accent).

## Rules that hold regardless of theme

- Money is right-aligned in tabular figures, always with the currency symbol.
- A status always has the same colour and label wherever it appears.
- Every list has loading, empty and error states.
- Contrast: text 4.5:1, large text and UI 3:1.
- Focus is always visible.
