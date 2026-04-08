// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  if (!checkRateLimit(`preview:${session.user.email}`, 20, 3_600_000)) {
    return NextResponse.json({ error: 'Limite de preview atingido (20/hora).' }, { status: 429 });
  }

  const { url } = await req.json();
  if (!url || !/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Screenshot apenas do viewport (mais rápido)
    const buffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 80 });
    // Screenshot completa para o relatório
    const bufferFull = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
    await browser.close();

    return NextResponse.json({
      ok: true,
      preview: buffer.toString('base64'),
      previewFull: bufferFull.toString('base64'),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Falha ao capturar preview' }, { status: 500 });
  }
}
