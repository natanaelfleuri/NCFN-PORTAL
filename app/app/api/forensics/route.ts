import { getSession, getDbUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';



export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const dbUser = await getDbUser(session.user.email);
        if (!dbUser || dbUser.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
        }

        const folderPath = path.join(process.cwd(), '../COFRE_NCFN/_ACESSO_TEMPORARIO');

        if (!fs.existsSync(folderPath)) {
            return NextResponse.json({ records: [] });
        }

        const files = await fs.readdir(folderPath);
        const certidoesFiles = files.filter(f => f.endsWith('_CERTIDAO_ACESSO.txt'));

        const records = [];

        for (const file of certidoesFiles) {
            const filePath = path.join(folderPath, file);
            const content = await fs.readFile(filePath, 'utf-8');

            const arquivoMatch = content.match(/ARQUIVO CONSUMIDO:\s*(.+)/);
            const arquivo = arquivoMatch ? arquivoMatch[1].trim() : 'Desconhecido';

            const ipMatch = content.match(/- IP Registrado:\s*(.+)/);
            const ip = ipMatch ? ipMatch[1].trim() : 'Desconhecido';

            const cartografiaMatch = content.match(/- Cartografia Alvo:\s*([^]+?)(?=- Assinatura)/);
            const cartografiaRaw = cartografiaMatch ? cartografiaMatch[1].trim() : '';

            const latLngMatch = cartografiaRaw.match(/Lat:\s*([-\d.]+),\s*Lng:\s*([-\d.]+)/);
            const lat = latLngMatch ? parseFloat(latLngMatch[1]) : 0;
            const lng = latLngMatch ? parseFloat(latLngMatch[2]) : 0;

            const locationMatch = cartografiaRaw.match(/(.+?)\s+\(Lat:/);
            const locationName = locationMatch ? locationMatch[1].trim() : cartografiaRaw;

            const dataMatch = content.match(/- Interceptado\/Baixado em:\s*(.+)/);
            const dataBaixado = dataMatch ? dataMatch[1].trim() : 'Desconhecido';

            const deviceMatch = content.match(/- Assinatura do Dispositivo \/ Navegador \(User-Agent\):\s*\n\s*(.+)/);
            const device = deviceMatch ? deviceMatch[1].trim() : 'Desconhecido';

            if (lat !== 0 && lng !== 0) {
                records.push({ id: file, arquivo, ip, locationName, lat, lng, dataBaixado, device });
            }
        }

        return NextResponse.json({ records });
    } catch (error) {
        console.error('Erro ao ler certidões forenses:', error);
        return NextResponse.json({ error: 'Erro interno ao processar dados forenses' }, { status: 500 });
    }
}
