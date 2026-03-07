import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import geoip from 'geoip-lite';
import { getToken } from 'next-auth/jwt';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const folder = searchParams.get('folder');
        const filename = searchParams.get('filename');

        if (!folder || !filename) return new NextResponse('Faltam parâmetros', { status: 400 });

        const filePath = path.join(process.cwd(), '../arquivos', folder, filename);

        // --- ACCESS LOGGING ---
        try {
            const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
            const userEmail = token?.email || 'Public/Guest';
            const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
            const timestamp = new Date().toLocaleString('pt-BR');

            const logEntry = `[${timestamp}] USER: ${userEmail} | IP: ${ip} | FILE: ${filename}\n`;
            const logPath = path.join(process.cwd(), '../arquivos', folder, '_registros_acesso.txt');

            // Ensure folder exists and append
            if (await fs.pathExists(path.join(process.cwd(), '../arquivos', folder))) {
                await fs.appendFile(logPath, logEntry, 'utf8');
            }
        } catch (logErr) {
            console.error('[LOG ERROR]', logErr);
        }

        // === MÓDULO FORENSE: INTERCEPTAÇÃO E GERAÇÃO ===
        if (folder === '9_ACESSO_TEMPORARIO_E_UNICO' && !filename.includes('CERTIDAO_ACESSO')) {
            const certidaoPath = path.join(process.cwd(), '../arquivos', folder, `${filename}_CERTIDAO_ACESSO.txt`);

            // 1. Verificação de Bloqueio (Se a certidão existe, o arquivo original sumiu. Mostra a tela de bloqueio HTML)
            if (fs.existsSync(certidaoPath)) {
                const erroHTML = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Acesso Negado - NCFN Forensics</title>
                    <style>
                        body { background-color: #050510; color: #ff3333; font-family: 'Courier New', Courier, monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                        h1 { font-size: 3rem; text-transform: uppercase; letter-spacing: 5px; text-shadow: 0 0 20px rgba(255, 51, 51, 0.8); margin-bottom: 10px; }
                        p { font-size: 1.2rem; max-width: 600px; line-height: 1.6; color: #ccaaaa; }
                        .box { border: 2px solid #ff3333; padding: 40px; box-shadow: 0 0 40px rgba(255,51,51,0.2) inset, 0 0 40px rgba(255,51,51,0.2); border-radius: 10px; background: rgba(50, 0, 0, 0.3); }
                        .blink { animation: blinker 2s linear infinite; }
                        @keyframes blinker { 50% { opacity: 0.3; } }
                    </style>
                </head>
                <body>
                    <div class="box">
                        <h1 class="blink">ACESSO BLOQUEADO</h1>
                        <p>Esta mídia probatória era classificada como de <b>ACESSO ÚNICO</b> e seu visualizar/download já foi consumido de forma irreversível por um destinatário.</p>
                        <p>O arquivo original foi <b>expurgado</b> dos servidores.</p>
                        <hr style="border-color: #ff3333; margin: 25px 0; opacity: 0.3;">
                        <p style="font-size: 0.9rem;">A "Certidão Cartorária de Acesso" contendo o horário de interceptação e os dados de rede do destinatário foi lavrada e encontra-se na posse da Administração.</p>
                    </div>
                </body>
                </html>
                `;
                return new NextResponse(erroHTML, {
                    status: 200, // Retornar 200 para forçar o navegador a renderizar o HTML de erro ao invés de cair no 404 customizado do Next
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }

            // O arquivo existe e é o primeiro download. Vamos providenciar a certificação.
            if (!fs.existsSync(filePath)) {
                console.error(`[DOWNLOAD API 404] Caminho alvo da certidão não encontrado: ${filePath}`);
                return new NextResponse('Arquivo não encontrado', { status: 404 });
            }

            // 2. Coleta de Informações de Tempo e Recipiente
            const stat = await fs.stat(filePath);
            const dataDisponibilizacao = new Date(stat.mtime);
            const dataAtual = new Date(); // Hora do Download

            const formatter = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const horaDisponibilizado = formatter.format(dataDisponibilizacao);
            const horaBaixado = formatter.format(dataAtual);

            const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
            const userAgent = req.headers.get('user-agent') || 'Dispositivo Desconhecido';

            // Cartografia Forense (Localização Física do IP)
            const geo = geoip.lookup(ip as string);
            const geoData = geo ? `${geo.city} - ${geo.region}, ${geo.country} (Lat: ${geo.ll[0]}, Lng: ${geo.ll[1]})` : 'Localidade Desconhecida / IP Privado';

            // 3. Lavratura da Certidão Cartorária Completa
            const certidaoConteudo = `
=========================================================
# CERTIDÃO CARTORÁRIA DE ACESSO ÚNICO E RESTRITO #
=========================================================

SISTEMA: Cérebro Digital NCFN (Portal Forense)
ARQUIVO CONSUMIDO: ${filename}

TRANSAÇÃO TEMPORAL:
- Disponibilizado (Upload) em: ${horaDisponibilizado}
- Interceptado/Baixado em:     ${horaBaixado}

---------------------------------------------------------
DADOS DO RECIPIENTE E RASTREAMENTO:
- IP Registrado: ${ip}
- Cartografia Alvo: ${geoData}
- Assinatura do Dispositivo / Navegador (User-Agent):
  ${userAgent}
---------------------------------------------------------

DECLARAÇÃO DO SISTEMA:
Atesto para os devidos fins que o arquivo supramencionado, 
disponibilizado na plataforma de Acesso Temporário, foi 
integralmente baixado pelo destinatário rastreado acima.
Após o término desta transação, o sistema engatilhou a 
protocolo de destruição (Unlink) e o arquivo original 
foi permanentemente deletado do servidor local.

=========================================================
`;
            // Escreve a certidão oficial na pasta
            await fs.writeFile(certidaoPath, certidaoConteudo, 'utf8');
        }

        // Caso não seja da pasta 9, verificar existência normalmente
        if (folder !== '9_ACESSO_TEMPORARIO_E_UNICO' || filename.includes('CERTIDAO_ACESSO')) {
            if (!fs.existsSync(filePath)) {
                console.error(`[DOWNLOAD API 404] Caminho TENTADO: ${filePath}`);
                return new NextResponse('Arquivo alvo não encontrado', { status: 404 });
            }
        }


        // ===============================================

        // 4. Carregamento do arquivo na RAM original
        let fileBuffer = await fs.readFile(filePath);

        // --- 4.1 Data-Room Virtual: Anti-Vazamento Watermark (Se for PDF e da pasta Forense) ---
        if (folder === '9_ACESSO_TEMPORARIO_E_UNICO' && filename.toLowerCase().endsWith('.pdf') && !filename.includes('CERTIDAO_ACESSO')) {
            try {
                const ipStr = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
                const dateStr = new Date().toISOString();
                const watermarkText = `ACESSO EXCLUSIVO RASTREADO: IP ${ipStr} | DATA: ${dateStr}`;

                const pdfDoc = await PDFDocument.load(fileBuffer);
                const pages = pdfDoc.getPages();
                for (const page of pages) {
                    const { height } = page.getSize();
                    page.drawText(watermarkText, {
                        x: 50,
                        y: height / 2,
                        size: 24,
                        color: rgb(0.9, 0.2, 0.2), // Vermelho alarme
                        opacity: 0.15, // Marca d'água fantasma
                        rotate: degrees(45),
                    });
                }
                const pdfBytes = await pdfDoc.save();
                fileBuffer = Buffer.from(pdfBytes);
            } catch (err) {
                console.error("Erro ao chapar Watermark no PDF:", err);
            }
        }
        // ----------------------------------------------------------------------------------------

        // 5. Autodestruição (Gatilho de Exclusão do Arquivo Físico caso seja da Pasta 9)
        if (folder === '9_ACESSO_TEMPORARIO_E_UNICO' && !filename.includes('CERTIDAO_ACESSO')) {
            try {
                // Aguardamos gravação da certidão para evitar inconsistências e em seguida deletamos o alvo
                await fs.unlink(filePath);
            } catch (err) {
                console.error("Erro na destruição do arquivo:", err);
            }
        }

        // 6. Entrega final do arquivo (Stream)
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/octet-stream',
            }
        });
    } catch (error) {
        console.error(error);
        return new NextResponse('Erro interno do servidor', { status: 500 });
    }
}
