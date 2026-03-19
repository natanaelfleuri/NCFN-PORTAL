// @ts-nocheck
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const COFRE_BASE    = path.resolve(process.cwd(), '../COFRE_NCFN');
const IGNORE_DIRS   = new Set(['.obsidian', '.trash', '.smart-env', '.git', 'RELATORIOS', 'RELATÓRIOS', 'COMANDOS - PERITO SANSÃO', '.pericias']);

async function adminGuard() {
    const session = await getSession();
    if (!session?.user?.email) return null;
    const dbUser = await getDbUser(session.user.email);
    return dbUser?.role === 'admin' ? dbUser : null;
}

// Count .enc and .aes files recursively
function countEncrypted(dir: string): number {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (IGNORE_DIRS.has(entry.name)) continue;
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                count += countEncrypted(abs);
            } else if (entry.name.endsWith('.enc') || entry.name.endsWith('.aes')) {
                count++;
            }
        }
    } catch (_) {}
    return count;
}

// Count unique files that have at least one saved pericia version
function countFilesWithPericias(dir: string): number {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory() || IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
            const periciaDir = path.join(dir, entry.name, '.pericias');
            if (!fs.existsSync(periciaDir)) continue;
            const jsonFiles = (fs.readdirSync(periciaDir) as string[]).filter(f => f.endsWith('.json'));
            // Each unique base filename (strip _v0001.json suffix) is one file with pericias
            const baseNames = new Set(jsonFiles.map(f => f.replace(/_v\d+\.json$/, '')));
            count += baseNames.size;
        }
    } catch (_) {}
    return count;
}

function getDiskFreeBytes(targetPath: string): number {
    try {
        const safeTarget = fs.existsSync(targetPath) ? targetPath : '/';
        const out = execSync(`df -B1 "${safeTarget}" 2>/dev/null | tail -1`).toString().trim();
        const parts = out.split(/\s+/);
        return parseInt(parts[3] ?? '0', 10);
    } catch {
        return 0;
    }
}

export async function GET() {
    const user = await adminGuard();
    if (!user) return new NextResponse('Não autorizado', { status: 401 });

    // Files with pericias (saved pericia JSONs)
    const filesWithPericias = countFilesWithPericias(COFRE_BASE);

    // Encrypted files count
    const encryptedCount = countEncrypted(COFRE_BASE);

    // Disk free bytes
    const diskFree = getDiskFreeBytes(COFRE_BASE);

    // Total vault access log entries (all-time monitored events)
    let monitoredEvents = 0;
    try {
        monitoredEvents = await prisma.vaultAccessLog.count();
    } catch (_) {}

    // Today's vault access log count
    let todayLogs = 0;
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        todayLogs = await prisma.vaultAccessLog.count({
            where: { createdAt: { gte: todayStart } },
        });
    } catch (_) {}

    // Active guest sessions in the last 15 minutes
    let activeSessions = 0;
    try {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000);
        activeSessions = await prisma.guestAccessLog.count({
            where: { lastSeenAt: { gte: cutoff } },
        });
    } catch (_) {}

    return NextResponse.json({
        filesWithPericias,
        encryptedCount,
        diskFree,
        monitoredEvents,
        todayLogs,
        activeSessions,
    });
}
