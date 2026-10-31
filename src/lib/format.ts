const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  // Explicit, because Node's ICU otherwise pads to "₹25.0L" while browsers print "₹25L" (a hydration mismatch).
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export const money = (n: number | null | undefined) => inr.format(Number(n ?? 0));
export const moneyCompact = (n: number | null | undefined) => inrCompact.format(Number(n ?? 0));

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Dates from Postgres come as "YYYY-MM-DD"; parse as local, not UTC midnight.
export function date(value: string | null | undefined) {
  if (!value) return "—";
  const d = value.length === 10 ? new Date(value + "T00:00:00") : new Date(value);
  return dateFmt.format(d);
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const periodWord = { daily: "day", weekly: "week", monthly: "month", yearly: "year" } as const;

// "Monthly", "Every 3 months", "Yearly"
export function cycle(period: keyof typeof periodWord, interval = 1) {
  if (interval === 1) return period[0].toUpperCase() + period.slice(1);
  return `Every ${interval} ${periodWord[period]}s`;
}
