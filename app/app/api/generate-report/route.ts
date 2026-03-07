import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const VAULT_DIR = process.env.VAULT_DIR || '/data/ncfn-vault';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');

    if (!folder || folder.includes('..')) {
        return NextResponse.json({ error: 'Pasta inválida.' }, { status: 400 });
    }

    const folderPath = path.join(VAULT_DIR, folder);
    if (!fs.existsSync(folderPath)) {
        return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }

    try {
        const files = fs.readdirSync(folderPath).filter(f => f !== 'vazio.txt');
        const now = new Date().toISOString();
        const nodeId = process.env.VPS_IP || '163.245.218.241';

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

        let page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();
        let y = height - 50;

        // --- Header Section ---
        page.drawRectangle({
            x: 0,
            y: height - 100,
            width: width,
            height: 100,
            color: rgb(0.02, 0.02, 0.02),
        });

        page.drawText('NCFN FORENSIC AUDIT SYSTEM', { x: 50, y: height - 40, size: 20, font: fontBold, color: rgb(0.74, 0.07, 1) }); // #bc13fe
        page.drawText('Neural Computing & Future Networks | Official Record', { x: 50, y: height - 60, size: 10, font: font, color: rgb(0.5, 0.5, 0.5) });

        y = height - 140;

        // --- Meta Information ---
        const drawField = (label: string, value: string, currentY: number) => {
            page.drawText(label, { x: 50, y: currentY, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
            page.drawText(value, { x: 150, y: currentY, size: 10, font: fontMono, color: rgb(0, 0, 0) });
            return currentY - 18;
        };

        y = drawField('SETOR/PASTA:', folder, y);
        y = drawField('DATA GERAÇÃO:', now, y);
        y = drawField('NÓ ORIGEM:', nodeId, y);
        y = drawField('PROTOCOLO:', 'ZERO-TRUST ARCHITECTURE / AES-256-GCM', y);

        y -= 20;
        page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
        y -= 30;

        page.drawText(`INVENTÁRIO DE ATIVOS (${files.length} itens)`, { x: 50, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
        y -= 30;

        // --- File List ---
        for (const filename of files) {
            if (y < 100) {
                page = pdfDoc.addPage([595.28, 841.89]);
                y = height - 50;
            }

            const filePath = path.join(folderPath, filename);
            const stat = fs.statSync(filePath);
            const sizeKb = (stat.size / 1024).toFixed(2);
            const mtime = stat.mtime.toISOString();
            let hash = 'N/A';

            const hashLogPath = path.join(folderPath, '_hashes_vps.txt');
            if (fs.existsSync(hashLogPath)) {
                const logContent = fs.readFileSync(hashLogPath, 'utf-8');
                const match = logContent.match(new RegExp(`${filename}.*?([a-f0-9]{64})`, 'i'));
                if (match) hash = match[1];
            }

            page.drawRectangle({ x: 50, y: y - 75, width: width - 100, height: 70, color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 1 });

            page.drawText(`ARQUIVO: ${filename}`, { x: 60, y: y - 15, size: 10, font: fontBold });
            page.drawText(`TAMANHO: ${sizeKb} KB`, { x: 60, y: y - 30, size: 9, font });
            page.drawText(`M-TIME:  ${mtime}`, { x: 60, y: y - 45, size: 9, font });
            page.drawText(`SHA-256: ${hash}`, { x: 60, y: y - 60, size: 8, font: fontMono, color: rgb(0, 0.6, 0.8) });

            y -= 85;
        }

        // --- Footer Seal ---
        if (y < 150) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - 50;
        }

        y -= 40;
        page.drawRectangle({ x: width - 200, y: y - 80, width: 150, height: 80, color: rgb(1, 1, 1), borderColor: rgb(0.74, 0.07, 1), borderWidth: 2 });
        page.drawText('NCFN SEAL', { x: width - 180, y: y - 25, size: 14, font: fontBold, color: rgb(0.74, 0.07, 1) });
        page.drawText('VERIFIED ASSET', { x: width - 180, y: y - 45, size: 10, font: fontBold, color: rgb(0, 0, 0) });
        page.drawText(`TIMESTAMP: ${Date.now()}`, { x: width - 180, y: y - 65, size: 7, font: fontMono, color: rgb(0.5, 0.5, 0.5) });

        const pdfBytes = await pdfDoc.save();

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="NCFN_Audit_${folder}_${Date.now()}.pdf"`,
            },
        });
    } catch (err) {
        console.error('PDF Generation Error:', err);
        return NextResponse.json({ error: 'Falha ao gerar relatório PDF.' }, { status: 500 });
    }
}
