export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export default async function LoginPage() {
    // Se já tem sessão NextAuth → manda direto para /admin
    const session = await getServerSession(authOptions);
    if (session) redirect('/admin');

    // Lê o JWT do CF Access direto no servidor (sempre presente quando CF Access está ativo)
    const headersList = await headers();
    const cfToken = headersList.get('cf-access-jwt-assertion') ?? '';

    return <LoginClient cfToken={cfToken} />;
}
