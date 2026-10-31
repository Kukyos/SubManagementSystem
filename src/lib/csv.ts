// RFC 4180: quote every field that needs it, double inner quotes, CRLF rows.
// Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas.
function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  // The BOM makes Excel read UTF-8 (₹, names in other scripts) correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
