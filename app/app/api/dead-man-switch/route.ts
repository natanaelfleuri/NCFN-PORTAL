import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to a lockout state file. When this file exists, the service is locked.
const LOCK_FILE = path.join(process.env.VAULT_DIR || '/data/ncfn-vault', '_SYSTEM_LOCKOUT');

/**
 * GET /api/dead-man-switch
 * Returns current lock status
 */
export async function GET() {
    const isLocked = fs.existsSync(LOCK_FILE);
    return NextResponse.json({ locked: isLocked });
}

/**
 * POST /api/dead-man-switch
 * Body: { action: 'lock' | 'unlock', masterKey: string }
 */
export async function POST(req: NextRequest) {
    const MASTER_KEY = process.env.MASTER_UNLOCK_KEY || 'NCFN_MASTER_2026';

    let body: { action?: string; masterKey?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { action, masterKey } = body;

    if (masterKey !== MASTER_KEY) {
        // Log intrusion attempt
        const logFile = path.join(process.env.VAULT_DIR || '/data/ncfn-vault', '_registros_acesso.txt');
        const logEntry = `[INTRUSION] Dead Man's Switch attempt failed: ${new Date().toISOString()} IP: (server-side)\n`;
        fs.appendFileSync(logFile, logEntry);
        return NextResponse.json({ error: 'Chave mestra inválida. Tentativa registrada.' }, { status: 403 });
    }

    if (action === 'lock') {
        fs.writeFileSync(LOCK_FILE, `SISTEMA TRAVADO EM: ${new Date().toISOString()}\nProtocolo NCFN Dead Man's Switch Ativado.\nApenas a chave mestra pode restaurar o acesso.\n`);
        return NextResponse.json({ message: '⚠️ Sistema bloqueado. Protocolo Dead Man\'s Switch ativado.' });
    }

    if (action === 'unlock') {
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
        return NextResponse.json({ message: '✅ Sistema desbloqueado. Acesso restaurado com chave mestra.' });
    }

    return NextResponse.json({ error: 'Ação inválida. Use "lock" ou "unlock".' }, { status: 400 });
}
