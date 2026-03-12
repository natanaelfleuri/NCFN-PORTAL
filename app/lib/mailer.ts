import nodemailer from "nodemailer";

/**
 * Envia o relatório forense por e-mail para a central NCFN
 */
export async function sendForensicReport(target: string, tool: string, aiReport: string, sha256: string) {
    // Configurações via ENV
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || "fleuriengenharia@gmail.com";

    if (!smtpUser || !smtpPass) {
        console.warn("[MAILER] SMTP_USER ou SMTP_PASS não configurados. E-mail não enviado.");
        return { skipped: true };
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true para 465, false para outros
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    const mailOptions = {
        from: `"Agente Forense NCFN" <${smtpUser}>`,
        to: adminEmail,
        subject: `[NCFN-FORENSIC] Relatório: ${target} (${tool})`,
        text: `Relatório de Investigação Forense 360º\n\nAlvo: ${target}\nFerramenta: ${tool}\nSHA-256 (Cadeia de Custódia): ${sha256}\n\nANÁLISE IA:\n${aiReport}\n\n--- Gerado automaticamente pelo Portal NCFN`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #333; padding: 20px; background-color: #f9f9f9;">
                <h1 style="color: #bc13fe; border-bottom: 2px solid #bc13fe; padding-bottom: 10px;">NCFN Forensic Intelligence</h1>
                <p><strong>Alvo Primário:</strong> ${target}</p>
                <p><strong>Ferramenta Utilizada:</strong> <span style="background: #eee; padding: 2px 5px; border-radius: 4px;">${tool}</span></p>
                <p><strong>Hash de Integridade (SHA-256):</strong> <code style="font-size: 0.8em; color: #666;">${sha256}</code></p>
                
                <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 8px; border-left: 4px solid #00f3ff;">
                    <h2 style="font-size: 1.1em; margin-top: 0;">Análise Materializada pela IA:</h2>
                    <div style="white-space: pre-wrap; font-size: 0.9em; color: #333;">${aiReport}</div>
                </div>
                
                <p style="font-size: 0.7em; color: #999; margin-top: 30px; text-align: center;">
                    Este é um relatório assinado digitalmente para fins de preservação de evidências.<br/>
                    Portal NCFN © 2026 - Forensic AI Operations.
                </p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("[MAILER] Relatório enviado:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("[MAILER] Falha no envio do e-mail:", error);
        return { success: false, error };
    }
}
