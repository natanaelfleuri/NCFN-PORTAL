import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function GET() {
    try {
        const folderPath = path.join(process.cwd(), '../arquivos/9_ACESSO_TEMPORARIO_E_UNICO');

        if (!fs.existsSync(folderPath)) {
            return NextResponse.json({ records: [] });
        }

        const files = await fs.readdir(folderPath);
        const certidoesFiles = files.filter(f => f.endsWith('_CERTIDAO_ACESSO.txt'));

        const records = [];

        for (const file of certidoesFiles) {
            const filePath = path.join(folderPath, file);
            const content = await fs.readFile(filePath, 'utf-8');

            // Extrair Arquivo Consumido
            const arquivoMatch = content.match(/ARQUIVO CONSUMIDO:\s*(.+)/);
            const arquivo = arquivoMatch ? arquivoMatch[1].trim() : 'Desconhecido';

            // Extrair IPs e Localização
            const ipMatch = content.match(/- IP Registrado:\s*(.+)/);
            const ip = ipMatch ? ipMatch[1].trim() : 'Desconhecido';

            const cartografiaMatch = content.match(/- Cartografia Alvo:\s*([^]+?)(?=- Assinatura)/);
            const cartografiaRaw = cartografiaMatch ? cartografiaMatch[1].trim() : '';

            // Extrair Lat e Lng
            const latLngMatch = cartografiaRaw.match(/Lat:\s*([-\d.]+),\s*Lng:\s*([-\d.]+)/);
            const lat = latLngMatch ? parseFloat(latLngMatch[1]) : 0;
            const lng = latLngMatch ? parseFloat(latLngMatch[2]) : 0;

            // Extrair Cidade/País
            const locationMatch = cartografiaRaw.match(/(.+?)\s+\(Lat:/);
            const locationName = locationMatch ? locationMatch[1].trim() : cartografiaRaw;

            // Extrair Data de Interceptação
            const dataMatch = content.match(/- Interceptado\/Baixado em:\s*(.+)/);
            const dataBaixado = dataMatch ? dataMatch[1].trim() : 'Desconhecido';

            // Extrair Dispositivo
            const deviceMatch = content.match(/- Assinatura do Dispositivo \/ Navegador \(User-Agent\):\s*\n\s*(.+)/);
            const device = deviceMatch ? deviceMatch[1].trim() : 'Desconhecido';

            if (lat !== 0 && lng !== 0) {
                records.push({
                    id: file,
                    arquivo,
                    ip,
                    locationName,
                    lat,
                    lng,
                    dataBaixado,
                    device
                });
            }
        }

        return NextResponse.json({ records });
    } catch (error) {
        console.error('Erro ao ler certidões forenses:', error);
        return NextResponse.json({ error: 'Erro interno ao processar dados forenses' }, { status: 500 });
    }
}
