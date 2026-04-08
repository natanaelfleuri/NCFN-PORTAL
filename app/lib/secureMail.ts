// @ts-nocheck
/**
 * SecureMail — Portal NCFN
 *
 * Backend de email com suporte a:
 *   1. Mailcow SMTP  (MAILCOW_SMTP_*)  → primário; assina com OpenPGP via pgpSign.ts
 *   2. ProtonMail Bridge (BRIDGE_SMTP_*) → PGP automático pelo Bridge
 *   3. SMTP genérico  (SMTP_HOST, SMTP_USER, SMTP_PASS)
 *   4. Resend API     (RESEND_API_KEY)  → fallback cloud
 *
 * Prioridade: Mailcow → Bridge → SMTP → Resend → log warning
 *
 * Para Mailcow: configurar MAILCOW_SMTP_HOST, MAILCOW_SMTP_PORT,
 *               MAILCOW_SMTP_USER, MAILCOW_SMTP_PASS, MAILCOW_FROM
 * PGP:          configurar PGP_PRIVATE_KEY_ARMOR (e PGP_PASSPHRASE) via generate-pgp.sh
 */
import nodemailer from 'nodemailer';
import {
  pgpSignCleartext,
  pgpSignDetached,
  pgpEmailFooter,
  isPgpConfigured,
} from './pgpSign';

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
  /** Se true, assina o conteúdo HTML com PGP e adiciona rodapé (padrão: true para Mailcow) */
  pgpSign?: boolean;
}

/* ── Transport factories ──────────────────────────────────────────────── */

function mailcowTransport() {
  const port = parseInt(process.env.MAILCOW_SMTP_PORT ?? '587');
  return nodemailer.createTransport({
    host:   process.env.MAILCOW_SMTP_HOST ?? 'mail.ncfn.net',
    port,
    secure: port === 465,
    auth: {
      user: process.env.MAILCOW_SMTP_USER!,
      pass: process.env.MAILCOW_SMTP_PASS!,
    },
    tls: {
      // mail.ncfn.net usa cert Let's Encrypt via Mailcow
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
}

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

function getBackend(): 'mailcow' | 'bridge' | 'smtp' | 'resend' | 'none' {
  if (process.env.MAILCOW_SMTP_USER && process.env.MAILCOW_SMTP_PASS) return 'mailcow';
  if (process.env.BRIDGE_SMTP_USER  && process.env.BRIDGE_SMTP_PASS)  return 'bridge';
  if (process.env.SMTP_USER         && process.env.SMTP_PASS)         return 'smtp';
  if (process.env.RESEND_API_KEY)                                       return 'resend';
  return 'none';
}

/* ── PGP signing helpers ─────────────────────────────────────────────── */

/**
 * Assina o corpo do email e adiciona rodapé HTML com assinatura PGP.
 * Retorna { html, extraHeaders, extraAttachments }
 */
async function applyPgpToPayload(payload: MailPayload): Promise<{
  html: string;
  extraHeaders: Record<string, string>;
  extraAttachments: MailPayload['attachments'];
}> {
  if (!isPgpConfigured()) {
    return { html: payload.html, extraHeaders: {}, extraAttachments: [] };
  }

  // Assina o assunto + texto simples como cleartext PGP
  const plainBody  = payload.text ?? payload.subject;
  const signedText = await pgpSignCleartext(plainBody);
  const footer     = pgpEmailFooter(signedText ?? undefined);

  // Injeta rodapé PGP antes do </body> ou no final do HTML
  const html = payload.html.replace('</body>', `${footer}</body>`) || payload.html + footer;

  // Assinatura detachada do HTML para clientes que suportam
  const extraAttachments: MailPayload['attachments'] = [];
  const htmlSig = await pgpSignDetached(Buffer.from(html));
  if (htmlSig) {
    extraAttachments.push({
      filename:    'email.html.asc',
      content:     htmlSig,
      contentType: 'application/pgp-signature',
    });
  }

  // Assinaturas detachadas para cada anexo binário (ex: PDF)
  for (const att of payload.attachments ?? []) {
    if (Buffer.isBuffer(att.content)) {
      const sig = await pgpSignDetached(att.content);
      if (sig) {
        extraAttachments.push({
          filename:    `${att.filename}.asc`,
          content:     sig,
          contentType: 'application/pgp-signature',
        });
      }
    }
  }

  const extraHeaders: Record<string, string> = {
    'X-PGP-Signed': 'true',
    'X-OpenPGP-Fingerprint': process.env.PGP_KEY_FINGERPRINT ?? '',
  };

  return { html, extraHeaders, extraAttachments };
}

/* ── Main send function ───────────────────────────────────────────────── */

export async function sendSecureMail(payload: MailPayload): Promise<{
  ok: boolean; backend: string; messageId?: string; error?: string; pgpSigned?: boolean;
}> {
  const backend = getBackend();
  const from = process.env.MAILCOW_FROM
    ?? process.env.BRIDGE_FROM
    ?? process.env.SMTP_FROM
    ?? process.env.SMTP_USER
    ?? `"NCFN Portal" <noreply@ncfn.net>`;

  if (backend === 'none') {
    console.warn('[MAIL] Nenhum backend de email configurado. Email não enviado.');
    return { ok: false, backend: 'none', error: 'Sem backend configurado' };
  }

  // PGP signing: ativo para Mailcow e SMTP; Bridge já assina sozinho
  const shouldSign = (payload.pgpSign !== false) && (backend === 'mailcow' || backend === 'smtp');
  let pgpSigned    = false;
  let finalPayload = { ...payload };

  if (shouldSign) {
    try {
      const { html, extraHeaders, extraAttachments } = await applyPgpToPayload(payload);
      finalPayload = {
        ...payload,
        html,
        headers: { ...(payload.headers ?? {}), ...extraHeaders },
        attachments: [...(payload.attachments ?? []), ...(extraAttachments ?? [])],
      };
      pgpSigned = isPgpConfigured();
    } catch (pgpErr) {
      console.error('[MAIL] PGP signing failed (continuing without):', pgpErr);
    }
  }

  try {
    if (backend === 'resend') {
      const result = await resendSend(finalPayload, from);
      return { ok: true, backend: 'resend', messageId: result.id };
    }

    const transport = backend === 'mailcow' ? mailcowTransport()
      : backend === 'bridge'               ? bridgeTransport()
      :                                      smtpTransport();

    const info = await transport.sendMail({
      from,
      to: Array.isArray(finalPayload.to) ? finalPayload.to.join(', ') : finalPayload.to,
      subject: finalPayload.subject,
      html:    finalPayload.html,
      text:    finalPayload.text,
      attachments: finalPayload.attachments,
      replyTo: finalPayload.replyTo,
      headers: {
        'X-NCFN-Portal': '1',
        'X-Mailer': `NCFN-SecureMail/${backend}`,
        ...(finalPayload.headers ?? {}),
      },
    });

    console.log(`[MAIL] Sent via ${backend}${pgpSigned ? ' + PGP' : ''}:`, info.messageId);
    return { ok: true, backend, messageId: info.messageId, pgpSigned };
  } catch (err: any) {
    console.error(`[MAIL] Send failed via ${backend}:`, err?.message ?? err);
    return { ok: false, backend, error: err?.message ?? String(err) };
  }
}

/* ── Ping test ────────────────────────────────────────────────────────── */

export async function pingMailBackend(): Promise<{
  ok: boolean; backend: string; detail?: string; pgp?: boolean;
}> {
  const backend = getBackend();
  const pgp     = isPgpConfigured();

  if (backend === 'none')   return { ok: false, backend: 'none', detail: 'Sem variáveis de ambiente configuradas', pgp };
  if (backend === 'resend') return { ok: true,  backend: 'resend', detail: 'Resend API (sem SMTP)', pgp };

  try {
    const t = backend === 'mailcow' ? mailcowTransport()
      : backend === 'bridge'       ? bridgeTransport()
      :                              smtpTransport();
    await t.verify();

    const detail = backend === 'mailcow' ? `Mailcow SMTP (${process.env.MAILCOW_SMTP_HOST ?? 'mail.ncfn.net'}:${process.env.MAILCOW_SMTP_PORT ?? '587'}) online`
      : backend === 'bridge'             ? 'ProtonMail Bridge SMTP online'
      :                                    'SMTP autenticado';

    return { ok: true, backend, detail, pgp };
  } catch (err: any) {
    return { ok: false, backend, detail: err?.message ?? 'Erro de conexão', pgp };
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

  const backend = getBackend();
  const pgp     = isPgpConfigured();

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
      Backend: <strong style="color:#666">${backend}</strong>
      ${pgp ? '— <span style="color:#4a8a4a">✓ Assinatura OpenPGP ativa</span>' : ''}
      <br>Timestamp: ${new Date().toISOString()}
    </p>
  </div>

</div>
</body>
</html>`;
}
