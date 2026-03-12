import nodemailer from 'nodemailer';

/**
 * Sends a canary file access alert email.
 * Called when a monitored file is accessed in the vault.
 */
export async function triggerCanaryAlert(params: {
    filename: string;
    folder: string;
    alertEmail: string;
    accessorEmail: string;
    ip: string;
    accessCount: number;
}): Promise<void> {
    const { filename, folder, alertEmail, accessorEmail, ip, accessCount } = params;
    const timestamp = new Date().toISOString();
    const timestampBRT = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0a;color:#e0e0e0;font-family:monospace;padding:24px;">
  <div style="max-width:600px;margin:0 auto;border:1px solid #bc13fe;border-radius:8px;overflow:hidden;">
    <div style="background:#bc13fe;padding:16px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;letter-spacing:2px;">⚠️ ALERTA — CANARY FILE ACESSADO</h1>
    </div>
    <div style="padding:24px;background:#111;">
      <p style="color:#ff4444;font-size:14px;font-weight:bold;border:1px solid #ff4444;padding:8px 16px;border-radius:4px;">
        ARQUIVO ARMADILHA FOI ACESSADO — POSSÍVEL INTRUSÃO DETECTADA
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
        <tr><td style="color:#888;padding:6px 0;width:40%;">Arquivo:</td><td style="color:#00f3ff;">${filename}</td></tr>
        <tr><td style="color:#888;padding:6px 0;">Pasta:</td><td style="color:#00f3ff;">${folder}</td></tr>
        <tr><td style="color:#888;padding:6px 0;">Operador:</td><td style="color:#fff;">${accessorEmail}</td></tr>
        <tr><td style="color:#888;padding:6px 0;">IP do Acesso:</td><td style="color:#ff9900;">${ip}</td></tr>
        <tr><td style="color:#888;padding:6px 0;">Hora (UTC):</td><td style="color:#fff;">${timestamp}</td></tr>
        <tr><td style="color:#888;padding:6px 0;">Hora (BRT):</td><td style="color:#fff;">${timestampBRT}</td></tr>
        <tr><td style="color:#888;padding:6px 0;">Total de Acessos:</td><td style="color:#ff4444;font-weight:bold;">${accessCount}</td></tr>
      </table>
      <p style="color:#555;font-size:11px;margin-top:24px;border-top:1px solid #222;padding-top:12px;">
        Portal NCFN — Nexus Cyber Forensic Network | Sistema de Canary Files
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Portal NCFN — ALERTA" <${process.env.SMTP_USER}>`,
            to: alertEmail,
            subject: `⚠️ CANARY ACESSADO: ${filename} [${folder}] — IP: ${ip}`,
            html,
        });
    } catch (err) {
        // Log but don't throw — serving the file should not fail due to email issues
        console.error('[CANARY] Falha ao enviar alerta:', err);
    }
}
