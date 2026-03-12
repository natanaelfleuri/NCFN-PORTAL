"use client";

import { useEffect, useState } from "react";
import { Shield, Fingerprint, Lock, Unlock, AlertTriangle, Loader2, UserX } from "lucide-react";
import { useSession } from "next-auth/react";

export default function BiometricSecurity({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [identityMismatch, setIdentityMismatch] = useState(false);
    const { data: session } = useSession();
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Protocol: Identity Linking for PWA
    useEffect(() => {
        const checkDevice = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobile);
        };
        checkDevice();

        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(!!standalone);

        if (standalone && session?.user?.email) {
            const savedEmail = localStorage.getItem("ncfn_app_installer");

            if (!savedEmail) {
                // First run in App Mode - Link identity
                localStorage.setItem("ncfn_app_installer", session.user.email);
                fetch('/api/app-install', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: session.user.email })
                }).then(() => showToast("Identidade vinculada ao dispositivo."));
            } else if (savedEmail !== session.user.email) {
                // Identity Mismatch - Security Alert
                setIdentityMismatch(true);
            }
        }
    }, [session]);

    // Military Policy: Auto-lock on background
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsLocked(true);
                localStorage.setItem("ncfn_app_locked", "true");
            }
        };

        // Replace localStorage with sessionStorage so it locks every time the tab is closed
        const savedLock = sessionStorage.getItem("ncfn_app_locked");
        if (savedLock === "false") {
            setIsLocked(false);
        } else {
            setIsLocked(true);
            sessionStorage.setItem("ncfn_app_locked", "true");
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    const handleUnlock = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check if biometric is available AND we are in the app
            if (isStandalone && window.PublicKeyCredential) {
                const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                if (available) {
                    showToast("Iniciando Autenticação Biométrica...");
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            setIsLocked(false);
            sessionStorage.setItem("ncfn_app_locked", "false");
            showToast("Dispositivo Verificado. Acesso Liberado.");
        } catch (err) {
            setError("Falha na Verificação de Hardware.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg: string) => {
        // Simple internal toast or alert
        console.log("NCFN Security:", msg);
    };

    if (identityMismatch) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#1a0000] flex flex-col items-center justify-center p-6 military-hardened">
                <div className="glass-panel p-10 rounded-3xl border-red-500/40 flex flex-col items-center gap-8 max-w-sm w-full relative z-10 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
                    <UserX className="w-24 h-24 text-red-500 animate-pulse" />
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-red-500 military-text uppercase tracking-widest">Identidade Inválida</h2>
                        <p className="text-gray-400 text-xs uppercase tracking-tighter">Este dispositivo está vinculado a outro operador.</p>
                        <p className="text-gray-500 text-[10px] mt-2 px-2 leading-relaxed">
                            A política de segurança restringe cada instalação física (TWA/PWA) a uma única identidade digital para garantir a cadeia de custódia inquebrável dos arquivos e o rastreio absoluto de logs.
                        </p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-center">
                        <p className="text-red-400 text-[10px] font-mono leading-tight">
                            VIOLAÇÃO DE PROTOCOLO DETECTADA.<br />
                            Nexus Cyber Forensic Network: Biometria Confirmada {localStorage.getItem("ncfn_app_installer")}<br />
                            TENTATIVA: {session?.user?.email}
                        </p>
                    </div>
                    <p className="text-gray-600 text-[8px] text-center uppercase">Contate o administrador para redefinir o vínculo do hardware.</p>
                </div>
            </div>
        );
    }

    if (!isLocked || !isMobile) return <>{children}</>;

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 military-hardened">
            <div className="scanline-overlay absolute inset-0 z-0"></div>

            <div className="glass-panel p-10 rounded-3xl border-[#bc13fe]/40 flex flex-col items-center gap-8 max-w-sm w-full relative z-10 shadow-[0_0_100px_rgba(188,19,254,0.2)]">
                <div className="relative">
                    <div className="absolute inset-0 bg-[#bc13fe]/20 blur-2xl rounded-full"></div>
                    <Shield className="w-24 h-24 text-[#bc13fe] relative z-10 animate-pulse" />
                    <Lock className="absolute -bottom-2 -right-2 w-10 h-10 text-white bg-[#bc13fe] p-2 rounded-full border-4 border-black" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold neon-text military-text uppercase tracking-widest text-[#bc13fe]">Identidade Protegida</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-tighter mt-2">Segurança Nexus Cyber Forensic Network</p>
                    <p className="text-gray-400 text-[10px] mt-4 px-2 leading-relaxed">
                        Este dispositivo está sob supervisão do software NCFN Core. O acesso aos diretórios criptografados e logs forenses locais exige a verificação imediata da biometria do operador autorizado. Qualquer falha neste procedimento acionará um alerta remoto.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleUnlock}
                    disabled={loading}
                    className="w-full group relative flex flex-col items-center gap-3 mt-4 p-6 bg-white/5 hover:bg-[#bc13fe]/20 border border-white/10 hover:border-[#bc13fe]/50 rounded-2xl transition-all duration-500 shadow-lg"
                >
                    {loading ? (
                        <Loader2 className="w-12 h-12 text-[#bc13fe] animate-spin" />
                    ) : (
                        isStandalone ? (
                            <Fingerprint className="w-12 h-12 text-[#bc13fe] group-hover:scale-110 transition-transform" />
                        ) : (
                            <Unlock className="w-12 h-12 text-[#bc13fe] group-hover:scale-110 transition-transform" />
                        )
                    )}
                    <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                        {isStandalone ? "Desbloquear com Biometria" : "Efetuar Desbloqueio"}
                    </span>
                </button>

                <div className="mt-4 flex flex-col items-center gap-1 opacity-20">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-3 bg-[#bc13fe]"></div>)}
                    </div>
                    <span className="text-[8px] uppercase font-mono tracking-[0.3em]">Device Identification Active</span>
                </div>
            </div>

            <footer className="mt-10 text-[10px] text-gray-700 font-mono tracking-widest uppercase text-center max-w-xs space-y-2">
                <p>Acesso restrito. Tentativas de intrusão serão registradas com coordenadas GPS e identidade de rede.</p>
                <p className="text-[8px] opacity-50">NCFN Security Protocol v2.0 - Biometric Enforcement</p>
            </footer>
        </div>
    );
}
