// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSession, getDbUser } from '@/lib/auth';
import os from 'os';
import { execSync } from 'child_process';

export const dynamic = "force-dynamic";

const SUPERADMIN_EMAIL = 'fleuriengenharia@gmail.com';

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (session.user.email !== SUPERADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const user = await getDbUser(session.user.email);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Memory
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        // CPU
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const cpuModel = cpus[0]?.model?.trim() || 'N/A';
        const cpuCount = cpus.length;

        // Uptime
        const uptimeSec = os.uptime();
        const d = Math.floor(uptimeSec / 86400);
        const h = Math.floor((uptimeSec % 86400) / 3600);
        const m = Math.floor((uptimeSec % 3600) / 60);
        const uptime = `${d}d ${h}h ${m}m`;

        // Disk (host / via df)
        let disk = { total: 0, used: 0, free: 0, percent: '0%' };
        try {
            const dfOut = execSync('df -B1 / 2>/dev/null', { timeout: 3000 }).toString();
            const lines = dfOut.trim().split('\n');
            if (lines.length >= 2) {
                const parts = lines[1].trim().split(/\s+/);
                disk.total = parseInt(parts[1]) || 0;
                disk.used  = parseInt(parts[2]) || 0;
                disk.free  = parseInt(parts[3]) || 0;
                disk.percent = parts[4] || '0%';
            }
        } catch {}

        // Hostname / platform
        const hostname = os.hostname();
        const platform = os.platform();
        const arch = os.arch();

        // Network interfaces (resumo)
        const nets = os.networkInterfaces();
        const netList: { name: string; address: string }[] = [];
        for (const [name, addrs] of Object.entries(nets)) {
            const ipv4 = addrs?.find(a => a.family === 'IPv4' && !a.internal);
            if (ipv4) netList.push({ name, address: ipv4.address });
        }

        return NextResponse.json({
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                percentUsed: Math.round((usedMem / totalMem) * 100),
            },
            cpu: {
                model: cpuModel,
                count: cpuCount,
                load1: loadAvg[0].toFixed(2),
                load5: loadAvg[1].toFixed(2),
                load15: loadAvg[2].toFixed(2),
            },
            disk,
            uptime,
            hostname,
            platform,
            arch,
            network: netList,
            timestamp: Date.now(),
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
