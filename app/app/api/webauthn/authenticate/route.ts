// @ts-nocheck
import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

const RP_ID  = process.env.WEBAUTHN_RP_ID  || 'ncfn.net';
const ORIGIN = process.env.NEXTAUTH_URL    || 'https://ncfn.net';

// GET — gera challenge de autenticação
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: token.email },
    include: { webAuthnCredentials: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.webAuthnCredentials.length === 0) {
    return NextResponse.json({ error: 'Nenhum dispositivo registrado' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: user.webAuthnCredentials.map(c => ({
      id: Buffer.from(c.credentialId, 'base64url'),
      type: 'public-key',
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    userVerification: 'required',
  });

  await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });
  await prisma.webAuthnChallenge.create({
    data: {
      userId: user.id,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return NextResponse.json(options);
}

// POST — verifica autenticação
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: token.email },
    include: { webAuthnCredentials: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const challengeRecord = await prisma.webAuthnChallenge.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });
  if (!challengeRecord) return NextResponse.json({ error: 'Challenge expirado' }, { status: 400 });

  const authResponse = await req.json();

  // Encontra a credencial pelo ID
  const credentialId = authResponse.id;
  const credential = user.webAuthnCredentials.find(c => c.credentialId === credentialId);
  if (!credential) return NextResponse.json({ error: 'Credencial não encontrada' }, { status: 400 });

  try {
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(credential.credentialId, 'base64url'),
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verificação falhou' }, { status: 400 });
    }

    // Atualiza counter e lastUsedAt
    await prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error('[webauthn/authenticate]', err);
    return NextResponse.json({ error: 'Autenticação falhou' }, { status: 500 });
  }
}
