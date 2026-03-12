"use client";
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

const CF_ACCESS_URL = 'https://ncfn.cloudflareaccess.com';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

function LoginContent() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const error = searchParams?.get('error');

    const [phase, setPhase] = useState<'checking' | 'signing' | 'error' | 'no_token'>('checking');
    const [errorMsg, setErrorMsg] = useState('');

    // Redirecionar se já autenticado
    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/admin');
        }
    }, [status, router]);

    // Tentar auto sign-in via CF Access JWT
    useEffect(() => {
        if (status !== 'unauthenticated') return;

        async function tryCfSignIn() {
            // 1. Tentar ler CF_Authorization do cookie
            const cfToken = getCookie('CF_Authorization');

            if (!cfToken) {
                // Sem token CF — redirecionar para o fluxo OTP da Cloudflare
                setPhase('no_token');
                return;
            }

            setPhase('signing');
            try {
                const result = await signIn('cloudflare-access', {
                    cfToken,
                    redirect: false,
                    callbackUrl: '/admin',
                });

                if (result?.error) {
                    setErrorMsg(result.error === 'unauthorized'
                        ? 'Email não autorizado no portal NCFN.'
                        : 'Falha na verificação do token Cloudflare.');
                    setPhase('error');
                } else if (result?.ok) {
                    router.push('/admin');
                }
            } catch (e: any) {
                setErrorMsg(e?.message ?? 'Erro inesperado.');
                setPhase('error');
            }
        }

        tryCfSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    if (status === 'loading' || status === 'authenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#bc13fe] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center">
            <div
                className="glass-panel p-12 rounded-2xl w-full max-w-md text-center"
                style={{
                    border: phase === 'error'
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(188, 19, 254, 0.3)',
                }}
            >
                {/* Ícone */}
                {phase === 'error'
                    ? <AlertTriangle className="w-20 h-20 mx-auto mb-6 text-red-500"
                        style={{ filter: 'drop-shadow(0 0 15px rgba(239,68,68,0.7))' }} />
                    : phase === 'signing' || phase === 'checking'
                        ? <Loader2 className="w-20 h-20 mx-auto mb-6 text-[#bc13fe] animate-spin"
                            style={{ filter: 'drop-shadow(0 0 15px rgba(188,19,254,0.7))' }} />
                        : <Shield className="w-20 h-20 mx-auto mb-6 text-[#bc13fe]"
                            style={{ filter: 'drop-shadow(0 0 15px rgba(188,19,254,0.7))' }} />
                }

                <h2 className="text-4xl font-bold text-white mb-2"
                    style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>
                    ACESSO RESTRITO
                </h2>

                {/* Estados */}
                {(phase === 'checking' || phase === 'signing') && (
                    <>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            {phase === 'checking'
                                ? 'Verificando credenciais Cloudflare Access...'
                                : 'Autenticando sessão forense...'}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-[#bc13fe]/60 uppercase tracking-widest animate-pulse">
                            <span>◈</span>
                            <span>Protocolo OTP ativo</span>
                            <span>◈</span>
                        </div>
                    </>
                )}

                {phase === 'no_token' && (
                    <>
                        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                            Autenticação via Cloudflare Access requerida.<br />
                            <span className="text-[10px] text-gray-600 font-mono">
                                Um código OTP será enviado ao seu email autorizado.
                            </span>
                        </p>
                        <a
                            href={`${CF_ACCESS_URL}/`}
                            className="w-full py-4 flex items-center justify-center gap-3 rounded-xl font-bold text-white text-lg transition-all"
                            style={{
                                background: 'linear-gradient(135deg, rgba(188,19,254,0.2), rgba(188,19,254,0.05))',
                                border: '1px solid rgba(188, 19, 254, 0.5)',
                                boxShadow: '0 0 20px rgba(188, 19, 254, 0.2)',
                            }}
                        >
                            {/* Cloudflare icon */}
                            <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none">
                                <path d="M68.4 55.6c.5-1.7.3-3.3-.5-4.5-.7-1.1-1.9-1.8-3.4-2l-.4-.1-28.3-.1c-.3 0-.6-.2-.7-.4-.1-.3 0-.6.2-.8l.3-.3 28.2-.1c3.3-.2 6.9-2.9 8.2-6.1.1-.3.3-.7.4-1-.8-9.1-8.5-16.2-17.9-16.2-8 0-14.9 5.2-17.4 12.4-1.6-1.1-3.6-1.8-5.7-1.8-5.3 0-9.6 4.3-9.6 9.6 0 .6.1 1.2.2 1.7C17.2 47.5 13 52.3 13 58c0 6.1 4.9 11 11 11h43.5c4.8 0 8.8-3.4 9.5-8-4.1-1.2-8-3.8-8.6-5.4z" fill="#F6821F"/>
                                <path d="M74.6 44c-.5 0-1 0-1.5.1l-.8.1-.3-.8c-1.8-5-6.5-8.6-12.1-8.6-2.1 0-4.1.5-5.8 1.5l-1.2.7-.4-1.3C50.2 28.3 43.9 24 36.6 24c-11.4 0-20.6 9.3-20.6 20.6 0 1.1.1 2.2.3 3.3l.3 1.6-1.6.1C10 50.3 6 54.7 6 60c0 5.5 4.5 10 10 10h58.6c5.2 0 9.4-4.2 9.4-9.4 0-4.9-3.7-8.9-8.4-9.4l-1 .8z" fill="#FBAD41"/>
                            </svg>
                            Autenticar com Cloudflare
                        </a>
                        <p className="mt-6 text-gray-600 text-xs font-mono">
                            Acesso restrito · OTP por email · TLS 1.3 Ativo
                        </p>
                    </>
                )}

                {phase === 'error' && (
                    <>
                        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-sm text-left">{errorMsg || 'Falha na autenticação.'}</p>
                        </div>
                        <button
                            onClick={() => { setPhase('checking'); window.location.reload(); }}
                            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all"
                            style={{
                                background: 'rgba(188,19,254,0.1)',
                                border: '1px solid rgba(188, 19, 254, 0.4)',
                            }}
                        >
                            Tentar novamente
                        </button>
                    </>
                )}
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
