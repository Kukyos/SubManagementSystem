import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Gmail through an app password, the same account Supabase Auth sends from.
export function mailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: Transporter | null = null;

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}) {
  if (!mailConfigured()) throw new Error("Email isn't set up on this server (SMTP_USER and SMTP_PASS).");
  const port = Number(process.env.SMTP_PORT || 465);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const from = process.env.EMAIL_FROM || `Brightloop <${process.env.SMTP_USER}>`;
  await transport.sendMail({ from, ...message });
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// One layout for every transactional email: logo, a few lines, one button.
// Table markup and inline styles because that's what mail clients render.
export function emailLayout({ heading, lines, button, footnote }: { heading: string; lines: string[]; button?: { label: string; href: string }; footnote?: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111114">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e6e6ea">
<tr><td style="padding:28px 32px 0;font-size:16px;font-weight:600;letter-spacing:-0.01em">Brightloop</td></tr>
<tr><td style="padding:20px 32px 0;font-size:22px;line-height:1.3">${esc(heading)}</td></tr>
${lines.map((l) => `<tr><td style="padding:12px 32px 0;font-size:14px;line-height:1.55;color:#3a3a40">${esc(l)}</td></tr>`).join("")}
${button ? `<tr><td style="padding:24px 32px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#8052ff;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;padding:12px 22px;border-radius:999px">${esc(button.label)}</a></td></tr>` : ""}
<tr><td style="padding:28px 32px 28px;font-size:12px;line-height:1.5;color:#8a8a90">${esc(footnote ?? "Brightloop Software Pvt. Ltd. · GSTIN 33AAKCB4821L1Z9")}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, "", ...lines, ...(button ? ["", `${button.label}: ${button.href}`] : []), "", footnote ?? "Brightloop Software Pvt. Ltd."].join("\n");
  return { html, text };
}
