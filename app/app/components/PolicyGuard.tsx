"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PolicyGuard({ children }: { children: React.ReactNode }) {
    const { data: session, update } = useSession();
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Logged in, loaded, but no policy accepted date
    const mustAccept = session?.user && !(session.user as any).policyAcceptedAt && !accepted;

    const handleAccept = async () => {
        setLoading(true);
        // Instant visual feedback for the user
        try {
            const res = await fetch('/api/policy-accept', { method: 'POST' });
            if (res.ok) {
                setAccepted(true); // Immediate hide even before session update
                await update(); // trigger JWT update to refresh session in background
            } else {
                alert("Erro ao salvar aceite. Tente novamente.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão. Verifique sua internet.");
        } finally {
            setLoading(false);
        }
    };

    if (mustAccept) {
        return (
            <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
                <div className="glass-panel max-w-2xl w-full p-8 rounded-[2rem] border border-red-500/30 bg-gray-900/80 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 mx-auto mb-6">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white text-center uppercase tracking-tighter mb-4">
                        Termo de Responsabilidade Nexus Cyber Forensic Network
                    </h2>

                    <div className="text-gray-300 text-sm leading-relaxed space-y-4 mb-8 bg-black/50 p-6 rounded-2xl border border-gray-800 h-64 overflow-y-auto custom-scrollbar">
                        <p>
                            Você está acessando a infraestrutura de Segurança de Dados Nexus Cyber Forensic Network. Antes de prosseguir, é obrigatório manifestar sua concordância irrestrita com os termos operativos:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-gray-400">
                            <li>O uso desta plataforma impõe <strong>exclusiva e intransferível responsabilidade</strong> sobre o conteúdo criptografado em seu nó.</li>
                            <li>É <strong className="text-red-400">estritamente proibido</strong> armazenar qualquer variação de material ilícito, abrangendo CSAM, terrorismo, fraudes ou arquivos maliciosos ativamente distribuídos.</li>
                            <li>Os administradores do protocolo não têm formas teóricas ou práticas de acessar os dados da sua base e isentam-se sobre ações advindas da hospedagem individual que você está operando.</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic mt-4">
                            Lendo os termos de forma integral na <Link href="/politica" target="_blank" className="text-[#00f3ff] hover:underline">Política de Uso</Link>.
                        </p>
                    </div>

                    <button
                        onClick={handleAccept}
                        disabled={loading}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Eu li, compreendi e aceito os termos
                    </button>
                    <p className="text-[10px] text-center text-gray-600 mt-4 uppercase tracking-widest">Seu aceite será registrado criptograficamente.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
