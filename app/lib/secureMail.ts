// @ts-nocheck
/**
 * SecureMail — NCFN Portal
 *
 * Suporta múltiplos backends de email (configurados via ENV):
 *   - ProtonMail Bridge (BRIDGE_SMTP_*)  → PGP assinado automaticamente
 *   - SMTP padrão        (SMTP_HOST, SMTP_USER, SMTP_PASS)
 *   - Resend API         (RESEND_API_KEY)  → fallback moderno
 *
 * Prioridade: Bridge → SMTP → Resend → log warning
 */
import nodemailer from 'nodemailer';

export interface MailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
    encoding?: string;
  }[];
  replyTo?: string;
  headers?: Record<string, string>;
}

/* ── Transport factories ──────────────────────────────────────────────── */

function bridgeTransport() {
  return nodemailer.createTransport({
    host:   process.env.BRIDGE_SMTP_HOST ?? 'protonmail-bridge',
    port:   parseInt(process.env.BRIDGE_SMTP_PORT ?? '1025'),
    secure: false,
    auth: {
      user: process.env.BRIDGE_SMTP_USER!,
      pass: process.env.BRIDGE_SMTP_PASS!,
    },
    tls: { rejectUnauthorized: false }, // Bridge usa cert self-signed
  });
}

function smtpTransport() {
  const port = parseInt(process.env.SMTP_PORT ?? '587');
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

async function resendSend(payload: MailPayload, from: string) {
  const apiKey = process.env.RESEND_API_KEY!;
  const body: any = {
    from,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
  };
  if (payload.text) body.text = payload.text;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
  return await res.json();
}

/* ── Determine available backend ─────────────────────────────────────── */

function getBackend(): 'bridge' | 'smtp' | 'resend' | 'none' {
  if (process.env.BRIDGE_SMTP_USER && process.env.BRIDGE_SMTP_PASS) return 'bridge';
  if (process.env.SMTP_USER && process.env.SMTP_PASS)               return 'smtp';
  if (process.env.RESEND_API_KEY)                                    return 'resend';
  return 'none';
}

/* ── Main send function ───────────────────────────────────────────────── */

export async function sendSecureMail(payload: MailPayload): Promise<{
  ok: boolean; backend: string; messageId?: string; error?: string;
}> {
  const backend = getBackend();
  const from = process.env.BRIDGE_FROM
    ?? process.env.SMTP_FROM
    ?? process.env.SMTP_USER
    ?? `"NCFN Portal" <noreply@ncfn.net>`;

  if (backend === 'none') {
    console.warn('[MAIL] Nenhum backend de email configurado. Email não enviado.');
    return { ok: false, backend: 'none', error: 'Sem backend configurado' };
  }

  try {
    if (backend === 'resend') {
      const result = await resendSend(payload, from);
      return { ok: true, backend: 'resend', messageId: result.id };
    }

    const transport = backend === 'bridge' ? bridgeTransport() : smtpTransport();
    const info = await transport.sendMail({
      from,
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
      replyTo: payload.replyTo,
      headers: {
        'X-NCFN-Portal': '1',
        'X-Mailer': `NCFN-SecureMail/${backend}`,
        ...(payload.headers ?? {}),
      },
    });

    console.log(`[MAIL] Sent via ${backend}:`, info.messageId);
    return { ok: true, backend, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[MAIL] Send failed via ${backend}:`, err?.message ?? err);
    return { ok: false, backend, error: err?.message ?? String(err) };
  }
}

/* ── Ping test ────────────────────────────────────────────────────────── */

export async function pingMailBackend(): Promise<{ ok: boolean; backend: string; detail?: string }> {
  const backend = getBackend();
  if (backend === 'none') return { ok: false, backend: 'none', detail: 'Sem variáveis de ambiente configuradas' };
  if (backend === 'resend') return { ok: true, backend: 'resend', detail: 'Resend API (sem SMTP)' };

  try {
    const t = backend === 'bridge' ? bridgeTransport() : smtpTransport();
    await t.verify();
    return { ok: true, backend, detail: backend === 'bridge' ? 'ProtonMail Bridge SMTP online' : 'SMTP autenticado' };
  } catch (err: any) {
    return { ok: false, backend, detail: err?.message ?? 'Erro de conexão' };
  }
}

/* ── Email templates ────────────────────────────────────────────────────── */

export function reportEmailHtml(opts: {
  title: string;
  id: string;
  metadata: Record<string, string>;
  ncPath?: string;
  ncUrl?: string;
}) {
  const rows = Object.entries(opts.metadata).map(([k, v]) => `
    <tr>
      <td style="padding:6px 14px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;white-space:nowrap">${k}</td>
      <td style="padding:6px 14px;border-bottom:1px solid #1e1e1e;color:#ccc;font-size:12px">${v}</td>
    </tr>`).join('');

  const ncRow = opts.ncPath ? `
    <tr>
      <td style="padding:6px 14px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px">Nextcloud</td>
      <td style="padding:6px 14px;border-bottom:1px solid #1e1e1e;font-size:12px">
        ${opts.ncUrl
          ? `<a href="${opts.ncUrl}" style="color:#4ade80;text-decoration:none">${opts.ncPath}</a>`
          : `<code style="color:#4ade80;font-size:11px">${opts.ncPath}</code>`}
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,system-ui,sans-serif">
<div style="max-width:620px;margin:32px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:#0d0d0d;border-bottom:2px solid #bc13fe;padding:20px 28px">
    <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">
      NCFN — Nexus Cyber Forensic Network
    </div>
    <h1 style="margin:0;font-size:18px;font-weight:700;color:#a78bfa">${opts.title}</h1>
    <p style="margin:6px 0 0;font-size:11px;color:#555;font-family:monospace">ID: ${opts.id}</p>
  </div>

  <!-- Metadata table -->
  <table style="width:100%;border-collapse:collapse;margin:0">
    ${rows}
    ${ncRow}
  </table>

  <!-- Footer -->
  <div style="padding:16px 28px;border-top:1px solid #1e1e1e;background:#0d0d0d">
    <p style="margin:0;font-size:10px;color:#444;font-family:monospace;line-height:1.6">
      Este email foi gerado automaticamente pelo Portal NCFN.<br>
      ${opts.ncPath ? `O arquivo foi armazenado de forma segura no Nextcloud.<br>` : ''}
      Backend: ${getBackend()} ${getBackend() === 'bridge' ? '— Assinatura PGP: ativa (ProtonMail Bridge)' : ''}
      <br>Timestamp: ${new Date().toISOString()}
    </p>
  </div>

</div>
</body>
</html>`;
}
