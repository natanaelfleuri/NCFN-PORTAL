"use client";
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile), { ssr: false });

function LoginContent() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const error = searchParams?.get('error');

    const [turnstilePassed, setTurnstilePassed] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/admin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[#bc13fe] animate-pulse text-2xl">Verificando credenciais...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center">
            <div
                className="glass-panel p-12 rounded-2xl w-full max-w-md text-center"
                style={{ border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(188, 19, 254, 0.3)' }}
            >
                <Shield className={`w-20 h-20 mx-auto mb-6 ${error ? 'text-red-500' : 'text-[#bc13fe]'}`}
                    style={{ filter: error ? 'drop-shadow(0 0 15px rgba(239,68,68,0.7))' : 'drop-shadow(0 0 15px rgba(188,19,254,0.7))' }}
                />

                <h2 className="text-4xl font-bold text-white mb-2" style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>
                    COFRE RESTRITO
                </h2>
                <p className="text-gray-400 mb-8 text-sm">
                    Acesso exclusivo por autenticação segura
                </p>

                {error && (
                    <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm text-left">
                            {error === 'unauthorized'
                                ? 'Acesso negado. Seu email não está autorizado.'
                                : 'Erro na autenticação. Tente novamente.'}
                        </p>
                    </div>
                )}

                <Turnstile
                    siteKey="0x4AAAAAACnGb345DFPYkkYh"
                    onSuccess={() => setTurnstilePassed(true)}
                    options={{
                        size: 'invisible'
                    }}
                />

                <button
                    onClick={() => signIn('google', { callbackUrl: '/admin' })}
                    disabled={!turnstilePassed}
                    className="w-full py-4 flex items-center justify-center gap-3 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, rgba(188,19,254,0.2), rgba(188,19,254,0.05))',
                        border: '1px solid rgba(188, 19, 254, 0.5)',
                        boxShadow: '0 0 20px rgba(188, 19, 254, 0.2)',
                    }}
                    onMouseEnter={e => !(!turnstilePassed) && (e.currentTarget.style.boxShadow = '0 0 30px rgba(188, 19, 254, 0.5)')}
                    onMouseLeave={e => !(!turnstilePassed) && (e.currentTarget.style.boxShadow = '0 0 20px rgba(188, 19, 254, 0.2)')}
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Entrar com Google
                </button>

                <p className="mt-6 text-gray-600 text-xs">
                    Apenas emails autorizados têm acesso ao Cofre
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    );
}
