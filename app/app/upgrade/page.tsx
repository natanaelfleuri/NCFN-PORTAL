"use client";

import { useSession } from "next-auth/react";
import { Shield, Zap, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function UpgradePage() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = async () => {
        setIsLoading(true);
        // TODO: Integração real com Checkout Stripe / Asaas / Pagar.me
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            // call backend api to generate checkout session url
            console.log("Integração de checkout a ser implementada");
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 py-8 animate-fade-in">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-[#00f3ff]/10 rounded-full mb-4 ring-1 ring-[#00f3ff]/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                    <Shield className="w-8 h-8 text-[#00f3ff]" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic font-cyber">
                    Acreditação <span className="text-[#00f3ff]">Pericial</span>
                </h1>
                <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
                    Sua credencial atual é <span className="text-white font-bold">Nível 0 — Observador Digital</span>. A <span className="text-[#00f3ff] font-bold">Acreditação Pericial PRO</span> remove todas as restrições operacionais, habilitando custódia irrestrita, armazenamento ilimitado e suporte técnico prioritário. Padrão utilizado por peritos, delegacias digitais e escritórios de advocacia especializada.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mt-12">
                {/* Trial Box */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-8 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute top-0 w-full h-1 bg-gray-600 shadow-[0_0_10px_rgba(156,163,175,0.2)]"></div>
                    <h3 className="text-xl font-bold font-cyber tracking-widest text-gray-400 mb-2 uppercase">NÍVEL 0</h3>
                    <div className="text-gray-500 mb-6 text-sm">Observador Digital · Trial</div>
                    
                    <div className="text-4xl font-black text-white mb-8">
                        R$ 0<span className="text-lg text-gray-500 font-normal">/mês</span>
                    </div>

                    <ul className="space-y-4 text-sm text-left w-full mb-8 text-gray-400 flex-1">
                        <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-gray-600 shrink-0" />
                            <span>Custódia de até 10 ativos forenses</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-gray-600 shrink-0" />
                            <span>1 GB de alocação cifrada</span>
                        </li>
                        <li className="flex items-start gap-3 text-gray-600">
                            <Check className="w-5 h-5 shrink-0" />
                            <span>Hash SHA-256 + verificação de integridade</span>
                        </li>
                        <li className="flex items-start gap-3 text-gray-600">
                            <Check className="w-5 h-5 shrink-0" />
                            <span>Acesso à Vitrine Pública</span>
                        </li>
                    </ul>

                    <div className="w-full py-3 px-4 rounded-lg border border-gray-800 text-gray-500 font-bold tracking-widest uppercase text-sm cursor-not-allowed">
                        Plano Atual
                    </div>
                </div>

                {/* Pro Box */}
                <div className="bg-[#00f3ff]/5 border border-[#00f3ff]/30 rounded-xl p-8 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-sm shadow-[0_0_30px_rgba(0,243,255,0.05)] transform md:-translate-y-4">
                    <div className="absolute top-0 w-full h-1 bg-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.8)]"></div>
                    <div className="absolute top-4 right-4 animate-pulse">
                        <Zap className="w-5 h-5 text-[#00f3ff]" fill="#00f3ff" />
                    </div>
                    
                    <h3 className="text-xl font-bold font-cyber tracking-widest text-[#00f3ff] mb-2 uppercase">NÍVEL 1 — PRO</h3>
                    <div className="text-[#00f3ff]/70 mb-6 text-sm">Operador Pericial Certificado</div>
                    
                    <div className="text-4xl font-black text-white mb-8 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                        R$ 29<span className="text-lg text-gray-400 font-normal">,90/mês</span>
                    </div>

                    <ul className="space-y-4 text-sm text-left w-full mb-8 text-gray-200 flex-1">
                        <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-[#00f3ff] shrink-0 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" />
                            <span className="text-white font-medium">Ativos custodiados ilimitados</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-[#00f3ff] shrink-0 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" />
                            <span className="text-white font-medium">Armazenamento cifrado sem limite</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-[#00f3ff] shrink-0 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" />
                            <span>Suporte técnico pericial prioritário</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-[#00f3ff] shrink-0 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" />
                            <span>Credencial PRO + acesso a todos os módulos avançados</span>
                        </li>
                    </ul>

                    <button 
                        onClick={handleUpgrade}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-lg bg-[#00f3ff] text-black font-black tracking-widest uppercase text-sm hover:bg-[#00c3cc] hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                SOLICITAR ACREDITAÇÃO
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            <div className="flex justify-center mt-8">
                <Link href="/" className="text-xs text-gray-500 hover:text-white uppercase tracking-wider underline-offset-4 hover:underline transition-colors">
                    Retornar ao Hub
                </Link>
            </div>
        </div>
    );
}
