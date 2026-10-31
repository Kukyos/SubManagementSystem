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
    pool: true,
    maxConnections: 3,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const from = process.env.EMAIL_FROM || `Brightloop <${process.env.SMTP_USER}>`;
  await transport.sendMail({ from, ...message });
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Absolute so it loads in mail clients even when the mail is sent from a dev machine.
export const emailLogo = "https://managesubs.vercel.app/email/logo.png";

// One layout for every email, in the site's dark theme: logo, a few lines, one
// button. Table markup, bgcolor and inline styles because that's what mail
// clients render. supabase/templates/ copies this by hand for the auth emails.
export function emailLayout({ eyebrow, heading, lines, button, footnote }: { eyebrow?: string; heading: string; lines: string[]; button?: { label: string; href: string }; footnote?: string }) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;background:#000000;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background:#000000;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b0b0d" style="max-width:520px;background:#0b0b0d;border-radius:16px;border:1px solid #1f1f23">
<tr><td style="padding:28px 32px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${emailLogo}" width="32" height="32" alt="" style="display:block;border:0"></td><td style="vertical-align:middle;padding-left:10px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#ffffff">Brightloop</td></tr></table></td></tr>
${eyebrow ? `<tr><td style="padding:32px 32px 0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#ffb829">${esc(eyebrow)}</td></tr>` : ""}
<tr><td style="padding:${eyebrow ? "10px" : "32px"} 32px 0;font-size:26px;line-height:1.2;font-weight:400;letter-spacing:-0.02em;color:#ffffff">${esc(heading)}</td></tr>
${lines.map((l) => `<tr><td style="padding:14px 32px 0;font-size:14px;line-height:1.6;color:#9e9ea4">${esc(l)}</td></tr>`).join("")}
${button ? `<tr><td style="padding:28px 32px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#8052ff;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;padding:13px 24px;border-radius:999px">${esc(button.label)}</a></td></tr>
<tr><td style="padding:16px 32px 0;font-size:12px;line-height:1.5;color:#626268">Button not working? Paste this into your browser:<br><a href="${esc(button.href)}" style="color:#9470ff;word-break:break-all">${esc(button.href)}</a></td></tr>` : ""}
<tr><td style="padding:32px 32px 0"><div style="height:1px;background:#1f1f23;line-height:1px;font-size:0">&nbsp;</div></td></tr>
<tr><td style="padding:16px 32px 28px;font-size:12px;line-height:1.5;color:#626268">${esc(footnote ?? "Brightloop Software Pvt. Ltd. · GSTIN 33AAKCB4821L1Z9")}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [...(eyebrow ? [eyebrow.toUpperCase()] : []), heading, "", ...lines, ...(button ? ["", `${button.label}: ${button.href}`] : []), "", footnote ?? "Brightloop Software Pvt. Ltd."].join("\n");
  return { html, text };
}
