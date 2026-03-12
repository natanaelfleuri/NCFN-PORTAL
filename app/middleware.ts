import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// DEV_BYPASS=true → desativa auth para visualização local
// Para reativar: remova ou defina DEV_BYPASS=false no .env
const DEV_BYPASS = process.env.DEV_BYPASS === 'true';

/** Extrai /24 subnet de um IPv4 ou retorna null para IPv6 */
function getSubnet24(ip: string): string | null {
    const parts = ip.replace(/^::ffff:/, '').split('.');
    if (parts.length === 4) return parts.slice(0, 3).join('.');
    return null; // IPv6 — não comparar
}

/** Extrai IP real da requisição */
function getRequestIp(req: any): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip') || '0.0.0.0';
}

export default withAuth(
    function middleware(req) {
        if (DEV_BYPASS) return NextResponse.next();

        const { nextUrl, nextauth } = req;
        const token = nextauth.token as any;
        const role = token?.role;

        if (nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
            return NextResponse.redirect(new URL('/login?error=unauthorized', nextUrl));
        }

        // ── Session Binding: IP /24 check ──────────────────────────────────────
        // Armazena IP na primeira requisição via cookie, compara nas subsequentes
        const currentIp = getRequestIp(req);
        const sessionIpCookie = req.cookies.get('_ncfn_sip')?.value;

        if (!sessionIpCookie) {
            // Primeira requisição: armazenar IP
            const response = NextResponse.next();
            response.cookies.set('_ncfn_sip', currentIp, {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24, // 24h
            });
            return response;
        }

        // Verificar mudança de subnet (apenas IPv4)
        const storedSubnet = getSubnet24(sessionIpCookie);
        const currentSubnet = getSubnet24(currentIp);
        if (storedSubnet && currentSubnet && storedSubnet !== currentSubnet) {
            console.warn(`[SESSION_BINDING] IP subnet mismatch: ${storedSubnet} → ${currentSubnet} | user: ${token?.email}`);
            // Redirecionar para reautenticação com aviso
            const url = new URL('/login', nextUrl);
            url.searchParams.set('error', 'session_ip_mismatch');
            const response = NextResponse.redirect(url);
            response.cookies.delete('_ncfn_sip');
            return response;
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => DEV_BYPASS ? true : !!token,
        },
        pages: {
            signIn: '/login',
        },
    }
);

export const config = {
    matcher: ['/admin/:path*'],
};
