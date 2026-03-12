export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import geoip from 'geoip-lite';
import { getToken } from 'next-auth/jwt';

const ARQUIVOS_DIR = path.join(process.cwd(), '../arquivos');
const SYSTEM_FOLDER = '_SISTEMA_NCFN';
const LOG_FILE = '_registros_instalacao.txt';

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email) {
            return NextResponse.json({ error: 'Identidade necessária para registro' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
        const userAgent = req.headers.get('user-agent') || 'NCFN App / Desconhecido';
        const geo = geoip.lookup(ip as string);
        const geoData = geo ? `${geo.city} - ${geo.region}, ${geo.country}` : 'Localidade Privada';
        const timestamp = new Date().toLocaleString('pt-BR');

        const systemPath = path.join(ARQUIVOS_DIR, SYSTEM_FOLDER);
        const logPath = path.join(systemPath, LOG_FILE);

        // Ensure system folder exists
        if (!(await fs.pathExists(systemPath))) {
            await fs.mkdirp(systemPath);
        }

        // Check if log file exists, if not create with header
        if (!(await fs.pathExists(logPath))) {
            const header = `=========================================================\nNCFN APP INSTALLATION REGISTRY - FORENSIC MODE\n=========================================================\n\n`;
            await fs.writeFile(logPath, header, 'utf8');
        }

        const logEntry = `[${timestamp}] INSTALLER: ${token.email} | IP: ${ip} | GEO: ${geoData} | DEVICE: ${userAgent}\n`;
        await fs.appendFile(logPath, logEntry, 'utf8');

        // Create a fixed empty file to ensure the folder is scanned by /api/files
        const emptyFile = path.join(systemPath, 'vazio.txt');
        if (!(await fs.pathExists(emptyFile))) {
            await fs.writeFile(emptyFile, '', 'utf8');
        }

        return NextResponse.json({ success: true, message: 'Instalação vinculada e registrada com sucesso.' });
    } catch (error) {
        console.error('[INSTALL LOG ERROR]', error);
        return NextResponse.json({ error: 'Falha no protocolo de registro' }, { status: 500 });
    }
}
