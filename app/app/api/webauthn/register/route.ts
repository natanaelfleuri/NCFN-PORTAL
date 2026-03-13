// @ts-nocheck
import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

export const dynamic = 'force-dynamic';

const RP_ID   = process.env.WEBAUTHN_RP_ID   || 'ncfn.net';
const RP_NAME = process.env.WEBAUTHN_RP_NAME  || 'NCFN Portal';
const ORIGIN  = process.env.NEXTAUTH_URL       || 'https://ncfn.net';

// GET — gera opções de registro
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: token.email },
    include: { webAuthnCredentials: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.id,
    userName: user.email || user.id,
    attestationType: 'none',
    excludeCredentials: user.webAuthnCredentials.map(c => ({
      id: Buffer.from(c.credentialId, 'base64url'),
      type: 'public-key',
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
  });

  // Armazena challenge (limpa o anterior)
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

// POST — finaliza registro
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: token.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const challengeRecord = await prisma.webAuthnChallenge.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });
  if (!challengeRecord) return NextResponse.json({ error: 'Challenge expirado' }, { status: 400 });

  const { deviceName, ...registrationResponse } = await req.json();

  try {
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verificação falhou' }, { status: 400 });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    await prisma.webAuthnCredential.create({
      data: {
        userId: user.id,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        deviceName: deviceName || 'Dispositivo',
        transports: JSON.stringify(registrationResponse.response?.transports || []),
      },
    });

    await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error('[webauthn/register]', err);
    return NextResponse.json({ error: 'Registro falhou' }, { status: 500 });
  }
}
