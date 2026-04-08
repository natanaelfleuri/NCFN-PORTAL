"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, AlertTriangle, KeyRound } from "lucide-react";

function VerifyTotpContent() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/admin";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Se já verificado ou TOTP não está ativo, redireciona
    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
            return;
        }
        if (status === "authenticated") {
            const user = session?.user as any;
            if (!user?.totpEnabled || user?.totpVerified === true) {
                router.replace(callbackUrl);
            }
        }
    }, [status, session, router, callbackUrl]);

    async function handleVerify() {
        if (code.length !== 6) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/totp/verify-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();

            if (!data.ok) {
                setError(data.error || "Código incorreto.");
                setLoading(false);
                return;
            }

            // Atualiza o JWT com totpVerified = true
            await update({ totpVerified: true });
            router.replace(callbackUrl);
        } catch {
            setError("Erro de conexão. Tente novamente.");
            setLoading(false);
        }
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#bc13fe] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-sm text-center space-y-6"
                style={{ border: "1px solid rgba(188,19,254,0.25)" }}>

                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <ShieldCheck className="w-16 h-16 text-[#bc13fe]"
                            style={{ filter: "drop-shadow(0 0 12px rgba(188,19,254,0.6))" }} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
                        Verificação 2FA
                    </h2>
                    <p className="text-xs text-gray-500 font-mono">
                        Insira o código TOTP do seu autenticador
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={code}
                            onChange={e => {
                                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                                setError("");
                            }}
                            onKeyDown={e => e.key === "Enter" && handleVerify()}
                            placeholder="000000"
                            autoFocus
                            className="w-full bg-black border border-gray-700 text-white text-2xl font-mono text-center tracking-[0.5em] px-4 py-3 rounded-xl focus:outline-none focus:border-[#bc13fe] transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-xs">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleVerify}
                        disabled={loading || code.length !== 6}
                        className="w-full py-3 bg-[#bc13fe] text-white font-black uppercase text-sm rounded-xl hover:bg-[#bc13fe]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {loading ? "Verificando..." : "Confirmar Acesso"}
                    </button>
                </div>

                <p className="text-[10px] text-gray-700 font-mono">
                    TLS 1.3 · TOTP RFC 6238 · NCFN
                </p>
            </div>
        </div>
    );
}

export default function VerifyTotpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#bc13fe] animate-spin" />
            </div>
        }>
            <VerifyTotpContent />
        </Suspense>
    );
}
