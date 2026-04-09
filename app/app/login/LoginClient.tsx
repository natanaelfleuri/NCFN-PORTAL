"use client";
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

export default function LoginClient({ cfToken }: { cfToken: string }) {
    const router = useRouter();
    const [phase, setPhase] = useState<'checking' | 'failed'>('checking');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!cfToken) {
            setPhase('failed');
            return;
        }

        signIn('cloudflare-access', {
            cfToken,
            redirect: false,
            callbackUrl: '/admin',
        }).then(result => {
            if (result?.ok) {
                router.push('/admin');
            } else {
                setErrorMsg('Token CF válido mas acesso não autorizado para este email.');
                setPhase('failed');
            }
        }).catch(() => {
            setPhase('failed');
        });
    }, [cfToken, router]);

    if (phase === 'checking') {
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
                    Autenticando via Cloudflare…
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-sm text-center space-y-5"
                style={{ border: '1px solid rgba(188,19,254,0.25)' }}>

                {errorMsg
                    ? <AlertTriangle className="w-16 h-16 mx-auto text-red-500"
                        style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.6))' }} />
                    : <Shield className="w-16 h-16 mx-auto text-[#bc13fe]"
                        style={{ filter: 'drop-shadow(0 0 12px rgba(188,19,254,0.6))' }} />
                }

                <h2 className="text-3xl font-black text-white tracking-tighter">
                    ACESSO RESTRITO
                </h2>

                {errorMsg ? (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-left">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-xs">{errorMsg}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-400">
                            Autenticação via <span className="text-[#bc13fe] font-semibold">Cloudflare Zero Trust</span> necessária.
                        </p>
                        <p className="text-[11px] text-gray-600 font-mono">
                            Certifique-se de acessar via ncfn.net com Zero Trust ativo.
                        </p>
                    </div>
                )}

                <p className="text-gray-700 text-[10px] font-mono pt-2">
                    TLS 1.3 · Cloudflare Access · NCFN
                </p>
            </div>
        </div>
    );
}
