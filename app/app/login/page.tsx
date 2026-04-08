"use client";
import { signIn, useSession } from 'next-auth/react';
import { useRouter }          from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
    const { status } = useSession();
    const router     = useRouter();

    const [phase,    setPhase]    = useState<'checking' | 'failed'>('checking');
    const [errorMsg, setErrorMsg] = useState('');
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPw,   setShowPw]   = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [loginErr, setLoginErr] = useState('');

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
            setPhase('failed');
        }

        tryCfLogin();
    }, [status, router]);

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
                    Verificando acesso Cloudflare…
                </p>
            </div>
        );
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setLoginErr('');
        const result = await signIn('credentials', {
            email,
            passphrase: password,
            redirect: false,
            callbackUrl: '/admin',
        });
        setLoading(false);
        if (result?.ok) {
            router.push('/admin');
        } else {
            setLoginErr('Email ou senha inválidos.');
        }
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-sm text-center space-y-5"
                style={{ border: '1px solid rgba(188,19,254,0.25)' }}>

                <Shield className="w-14 h-14 mx-auto text-[#bc13fe]"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(188,19,254,0.6))' }} />

                <h2 className="text-2xl font-black text-white tracking-tighter">NCFN</h2>

                {errorMsg && (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-left">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-xs">{errorMsg}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3 text-left">
                    <div>
                        <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest">Email</label>
                        <input
                            type="text"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60"
                            placeholder="seu@email.com"
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest">Senha</label>
                        <div className="relative mt-1">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 pr-10"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {loginErr && (
                        <p className="text-xs text-red-400 font-mono">{loginErr}</p>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 rounded-lg font-bold text-sm tracking-widest uppercase transition-all"
                        style={{ background: 'rgba(188,19,254,0.15)', border: '1px solid rgba(188,19,254,0.4)', color: '#bc13fe' }}>
                        {loading ? 'Verificando…' : 'Entrar'}
                    </button>
                </form>

                <p className="text-gray-700 text-[10px] font-mono pt-1">
                    TLS 1.3 · Cloudflare Access · NCFN
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
