// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stampAndSave } from '@/lib/timestamp';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

// POST /api/capture/browserless/save
// body: { url, files: [{ name, base64?, data? }] }
// Saves all collected artefacts to pasta 7 and creates a WebCapture DB record
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  const { url, files } = await req.json();
  if (!url || !files?.length) {
    return NextResponse.json({ error: 'URL e arquivos são obrigatórios' }, { status: 400 });
  }

  // Create DB record
  const capture = await prisma.webCapture.create({
    data: {
      url,
      profile: 'browserless',
      operatorEmail: admin.email!,
      status: 'processing',
    },
  });

  const captureDir = path.join(
    process.cwd(),
    '../COFRE_NCFN/7_NCFN-CAPTURAS-WEB_OSINT',
    capture.id
  );
  await fs.ensureDir(captureDir);

  try {
    const hashes: Record<string, string> = {};
    let screenshotFile: string | null = null;
    let pdfFile: string | null = null;
    let htmlFile: string | null = null;

    for (const file of files) {
      let buf: Buffer;

      if (file.base64) {
        buf = Buffer.from(file.base64, 'base64');
      } else if (file.data !== undefined) {
        buf = Buffer.from(JSON.stringify(file.data, null, 2), 'utf-8');
      } else {
        continue;
      }

      const filePath = path.join(captureDir, file.name);
      await fs.writeFile(filePath, buf);
      hashes[file.name] = crypto.createHash('sha256').update(buf).digest('hex');

      const relPath = `7_NCFN-CAPTURAS-WEB_OSINT/${capture.id}/${file.name}`;
      if (/\.(png|jpg|jpeg|webp)$/i.test(file.name)) screenshotFile = relPath;
      else if (file.name === 'pagina.pdf') pdfFile = relPath;
      else if (file.name.endsWith('.html')) htmlFile = relPath;
    }

    // Combined SHA-256 of all files → RFC 3161 timestamp
    const combinedHash = crypto
      .createHash('sha256')
      .update(Object.values(hashes).sort().join(''))
      .digest('hex');

    await stampAndSave(combinedHash, { captureId: capture.id }).catch(() => {});

    // Quick server info (HEAD request)
    let siteStatus: number | null = null;
    let pingMs: number | null = null;
    let serverIp = 'N/A';
    let serverLocation = 'N/A';

    try {
      const start = Date.now();
      const r = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      pingMs = Date.now() - start;
      siteStatus = r.status;
    } catch {}

    // DNS resolution + GeoIP
    try {
      const hostname = new URL(url).hostname;
      const { stdout } = await execAsync(
        `nslookup ${hostname} 2>/dev/null | grep -A1 'Name:' | tail -1 | awk '{print $2}'`
      );
      serverIp = stdout.trim() || 'N/A';
      if (serverIp !== 'N/A') {
        const geo = await fetch(`https://ipinfo.io/${serverIp}/json`, {
          signal: AbortSignal.timeout(4000),
        });
        if (geo.ok) {
          const g = await geo.json();
          serverLocation =
            `${g.city || ''}, ${g.region || ''}, ${g.country || ''} (${g.org || 'N/A'})`.trim();
        }
      }
    } catch {}

    // Wayback Machine archive (fire and forget — don't block response)
    fetch(`https://web.archive.org/save/${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(30000),
    }).catch(() => {});

    const updated = await prisma.webCapture.update({
      where: { id: capture.id },
      data: {
        serverIp,
        serverLocation,
        screenshotFile,
        pdfFile,
        htmlFile,
        hashScreenshot: hashes['screenshot.png'] || null,
        hashPdf: hashes['pagina.pdf'] || null,
        hashHtml: hashes['dom.html'] || null,
        pingMs,
        siteStatus,
        status: 'done',
      },
    });

    return NextResponse.json({ ok: true, capture: updated, hashes });
  } catch (err: any) {
    await prisma.webCapture
      .update({
        where: { id: capture.id },
        data: { status: 'error', errorMessage: err.message?.slice(0, 500) },
      })
      .catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
