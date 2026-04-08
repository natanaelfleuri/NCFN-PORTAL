// @ts-nocheck
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDbUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

const BL_BASE = 'https://production-sfo.browserless.io';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const dbUser = await getDbUser(session.user.email);
  if (!dbUser || dbUser.role !== 'admin') return null;
  return dbUser;
}

// POST /api/capture/browserless
// body: { url, action: 'screenshot'|'pdf'|'content'|'scrape'|'performance', selector?, selectors? }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

  if (!checkRateLimit(`browserless:${admin.email}`, 10, 3_600_000)) {
    return NextResponse.json({ error: 'Limite de capturas browserless atingido (10/hora). Aguarde.' }, { status: 429 });
  }

  const { url, action, selector = 'body', selectors } = await req.json();

  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 });
  if (!['screenshot', 'pdf', 'content', 'scrape', 'performance'].includes(action)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) return NextResponse.json({ error: 'BROWSERLESS_API_KEY não configurada' }, { status: 500 });

  const endpoint = `${BL_BASE}/${action}?token=${token}`;

  let body: object;
  switch (action) {
    case 'screenshot':
      body = {
        url,
        options: { fullPage: true, type: 'png' },
      };
      break;
    case 'pdf':
      body = {
        url,
        options: {
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
        },
      };
      break;
    case 'content':
      body = { url };
      break;
    case 'scrape': {
      // Accept multiple selectors separated by comma, or a single one
      const selectorList = selectors
        ? selectors.map((s: string) => ({ selector: s.trim() })).filter((s: any) => s.selector)
        : [{ selector }];
      body = { url, elements: selectorList };
      break;
    }
    case 'performance':
      body = { url };
      break;
    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Browserless retornou ${res.status}`, detail: text.slice(0, 500) },
        { status: res.status }
      );
    }

    // JSON responses (scrape, performance)
    if (action === 'scrape' || action === 'performance') {
      const data = await res.json();
      return NextResponse.json({ ok: true, data });
    }

    // Binary responses (screenshot → PNG, pdf → PDF, content → HTML text)
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString('base64');
    return NextResponse.json({ ok: true, base64, sizeBytes: buf.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Timeout ou erro de rede' }, { status: 500 });
  }
}
