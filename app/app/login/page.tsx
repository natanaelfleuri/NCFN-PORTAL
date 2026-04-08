"use client";
import { signIn, useSession } from 'next-auth/react';
import { useRouter }          from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, Loader2, AlertTriangle, Lock } from 'lucide-react';

function LoginContent() {
    const { status } = useSession();
    const router     = useRouter();

    const [phase,      setPhase]      = useState<'checking' | 'form'>('checking');
    const [errorMsg,   setErrorMsg]   = useState('');
    const [email,      setEmail]      = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [loading,    setLoading]    = useState(false);

    // Redireciona se já autenticado
    useEffect(() => {
        if (status === 'authenticated') router.push('/admin');
    }, [status, router]);

    // Tenta auto-login via Cloudflare Access JWT
    useEffect(() => {
        if (status !== 'unauthenticated') return;

        async function tryCfLogin() {
            try {
                const res  = await fetch('/api/cf-check');
                const data = await res.json().catch(() => ({}));

                if (data.valid && data.token) {
                    const result = await signIn('cloudflare-access', {
                        cfToken:     data.token,
                        redirect:    false,
                        callbackUrl: '/admin',
                    });
                    if (result?.ok) { router.push('/admin'); return; }
                    setErrorMsg(`Token CF válido mas email não autorizado: ${data.email}`);
                }
            } catch (_) {
                // Sem CF Access header
            }
            setPhase('form');
        }

        tryCfLogin();
    }, [status, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        const result = await signIn('credentials', {
            email,
            passphrase,
            redirect: false,
            callbackUrl: '/admin',
        });
        setLoading(false);
        if (result?.ok) {
            window.location.href = '/admin';
        } else {
            setErrorMsg('Credenciais inválidas.');
        }
    }

    if (status === 'loading' || status === 'authenticated' || phase === 'checking') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/50 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-[#bc13fe]" />
                    </div>
                </div>
                <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest animate-pulse">
                    Verificando acesso…
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-sm text-center space-y-5"
                style={{ border: '1px solid rgba(188,19,254,0.25)' }}>

                <Shield className="w-16 h-16 mx-auto text-[#bc13fe]"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(188,19,254,0.6))' }} />

                <h2 className="text-3xl font-black text-white tracking-tighter">
                    NCFN
                </h2>

                {errorMsg && (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-left">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-xs">{errorMsg}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-left">
                    <div>
                        <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">
                            Usuário
                        </label>
                        <input
                            type="text"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                            className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors"
                            placeholder="ncfn"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">
                            Senha
                        </label>
                        <input
                            type="password"
                            value={passphrase}
                            onChange={e => setPassphrase(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#bc13fe] hover:bg-[#bc13fe]/80 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : 'Entrar'
                        }
                    </button>
                </form>

                <p className="text-gray-700 text-[10px] font-mono pt-2">
                    TLS 1.3 · NCFN Portal
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
