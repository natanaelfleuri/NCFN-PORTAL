"use client";
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

function LoginContent() {
    const { status } = useSession();
    const router = useRouter();

    const [errorMsg, setErrorMsg] = useState('');
    const [passEmail, setPassEmail] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [passLoading, setPassLoading] = useState(false);
    const [cfChecking, setCfChecking] = useState(true);

    // Redireciona se já autenticado
    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/admin');
        }
    }, [status, router]);

    // Tenta auto-login via Cloudflare Access JWT
    useEffect(() => {
        if (status !== 'unauthenticated') return;

        async function tryCfLogin() {
            try {
                const res = await fetch('/api/auth/cf-check');
                const data = await res.json();

                if (data.valid && data.token) {
                    const result = await signIn('cloudflare-access', {
                        cfToken: data.token,
                        redirect: false,
                        callbackUrl: '/admin',
                    });
                    if (result?.ok) {
                        router.push('/admin');
                        return;
                    }
                    // Token CF válido mas email não autorizado no app
                    setErrorMsg(`Acesso não autorizado para ${data.email}.`);
                }
            } catch (e) {
                // Sem CF Access — mostra formulário normalmente
            } finally {
                setCfChecking(false);
            }
        }

        tryCfLogin();
    }, [status, router]);

    async function handlePassphraseLogin(e: React.FormEvent) {
        e.preventDefault();
        setPassLoading(true);
        setErrorMsg('');
        try {
            const result = await signIn('admin-passphrase', {
                email: passEmail,
                passphrase,
                redirect: false,
                callbackUrl: '/admin',
            });
            if (result?.ok) {
                router.push('/admin');
            } else {
                setErrorMsg('Credenciais inválidas.');
            }
        } catch (e: any) {
            setErrorMsg(e?.message ?? 'Erro inesperado.');
        } finally {
            setPassLoading(false);
        }
    }

    if (status === 'loading' || status === 'authenticated' || cfChecking) {
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
                style={{ border: errorMsg ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(188, 19, 254, 0.3)' }}
            >
                {errorMsg
                    ? <AlertTriangle className="w-20 h-20 mx-auto mb-6 text-red-500"
                        style={{ filter: 'drop-shadow(0 0 15px rgba(239,68,68,0.7))' }} />
                    : <Shield className="w-20 h-20 mx-auto mb-6 text-[#bc13fe]"
                        style={{ filter: 'drop-shadow(0 0 15px rgba(188,19,254,0.7))' }} />
                }

                <h2 className="text-4xl font-bold text-white mb-6"
                    style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>
                    ACESSO RESTRITO
                </h2>

                {errorMsg && (
                    <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm text-left">{errorMsg}</p>
                    </div>
                )}

                <form onSubmit={handlePassphraseLogin} className="space-y-3 text-left">
                    <input
                        type="email"
                        placeholder="Email"
                        value={passEmail}
                        onChange={e => setPassEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#bc13fe]/50"
                    />
                    <input
                        type="password"
                        placeholder="Passphrase"
                        value={passphrase}
                        onChange={e => setPassphrase(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#bc13fe]/50"
                    />
                    <button
                        type="submit"
                        disabled={passLoading}
                        className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                        style={{ background: 'rgba(188,19,254,0.15)', border: '1px solid rgba(188,19,254,0.4)' }}
                    >
                        {passLoading ? 'Verificando...' : 'Entrar'}
                    </button>
                </form>

                <p className="mt-6 text-gray-600 text-xs font-mono">
                    Acesso restrito · TLS 1.3 Ativo
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
