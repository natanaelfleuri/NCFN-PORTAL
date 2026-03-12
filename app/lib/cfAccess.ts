// @ts-nocheck
/**
 * Cloudflare Access JWT verification
 * Verifica tokens emitidos pelo Cloudflare Access OTP
 * Team: ncfn.cloudflareaccess.com
 */
import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';

const CF_TEAM_DOMAIN = process.env.CF_ACCESS_TEAM_DOMAIN || 'https://ncfn.cloudflareaccess.com';

// Cache de chaves públicas (10 min TTL)
let certsCache: { keyMap: Map<string, string>; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

async function getPublicKeys(): Promise<Map<string, string>> {
    if (certsCache && Date.now() - certsCache.fetchedAt < CACHE_TTL) {
        return certsCache.keyMap;
    }

    const certsUrl = `${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`;
    const res = await fetch(certsUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Failed to fetch CF certs: ${res.status}`);

    const data = await res.json();
    const rawKeys: any[] = data.keys || data.public_certs || [];

    const keyMap = new Map<string, string>();
    for (const k of rawKeys) {
        try {
            if (k.kty) {
                // JWK format
                const pub = createPublicKey({ key: k, format: 'jwk' });
                keyMap.set(k.kid || 'default', pub.export({ type: 'spki', format: 'pem' }) as string);
            } else if (k.cert) {
                // PEM cert format (older CF Access)
                keyMap.set(k.kid || String(keyMap.size), k.cert);
            }
        } catch (e) {
            console.warn('[CF_ACCESS] Skipping invalid key:', e);
        }
    }

    certsCache = { keyMap, fetchedAt: Date.now() };
    return keyMap;
}

export async function verifyCfJwt(token: string): Promise<{ email: string } | null> {
    try {
        // Decodificar sem verificar para extrair iss e kid
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || typeof decoded.payload === 'string') return null;

        const payload = decoded.payload as any;
        const { iss, email, exp } = payload;

        // Validar issuer
        if (!iss || !iss.includes('cloudflareaccess.com')) {
            console.warn('[CF_ACCESS] Invalid issuer:', iss);
            return null;
        }

        // Validar email
        if (!email || typeof email !== 'string') return null;

        // Validar expiração
        if (exp && Math.floor(Date.now() / 1000) > exp) {
            console.warn('[CF_ACCESS] Token expired');
            return null;
        }

        // Buscar chaves públicas e verificar assinatura
        const keys = await getPublicKeys();
        const kid = decoded.header?.kid as string | undefined;
        const pem = kid ? keys.get(kid) : Array.from(keys.values())[0];

        if (!pem) {
            console.warn('[CF_ACCESS] No matching public key for kid:', kid);
            return null;
        }

        jwt.verify(token, pem, { algorithms: ['RS256'] });

        return { email };
    } catch (e: any) {
        console.error('[CF_ACCESS] JWT verification failed:', e?.message);
        return null;
    }
}
