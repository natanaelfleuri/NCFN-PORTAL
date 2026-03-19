// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import geoip from 'geoip-lite';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEV_BYPASS = process.env.DEV_BYPASS === 'true';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email || (DEV_BYPASS ? (process.env.ADMIN_EMAIL || 'dev@ncfn.local') : null);

  if (!email) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const ua = req.headers.get('user-agent') || 'Desconhecido';

  // GeoIP lookup
  const geo = geoip.lookup(ip);
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');

  const location = isLocal
    ? { city: 'Localhost', region: 'Desenvolvimento', country: 'BR', ll: [-15.7801, -47.9292] as [number, number], timezone: 'America/Sao_Paulo' }
    : geo
    ? { city: geo.city || '—', region: geo.region || '—', country: geo.country || '—', ll: geo.ll as [number, number], timezone: geo.timezone || '—' }
    : null;

  // User info from DB
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        role: true,
        planType: true,
        lastSeenAt: true,
        uploadedFilesCount: true,
        totalBytesUsed: true,
        proAccessUntil: true,
      },
    });
  } catch {}

  // Parse UA for browser/OS
  const browser = (() => {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Outro';
  })();
  const os = (() => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Outro';
  })();

  return NextResponse.json({
    email,
    role: token?.role || dbUser?.role || 'user',
    plan: dbUser?.planType || 'TRIAL',
    proAccessUntil: dbUser?.proAccessUntil || null,
    uploadedFilesCount: dbUser?.uploadedFilesCount || 0,
    totalBytesUsed: dbUser?.totalBytesUsed || 0,
    joinedAt: dbUser?.lastSeenAt || null,
    ip,
    isLocal,
    location,
    userAgent: ua,
    browser,
    os,
    sessionTime: new Date().toISOString(),
  });
}
