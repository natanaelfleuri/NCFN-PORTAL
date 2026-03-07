"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Smartphone, BookOpen, Lock, Terminal, Cpu, Zap, Globe, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function MasterHub() {
  const { data: _session } = useSession();
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPwaInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      window.alert("Para instalar o aplicativo Secure Hub, acesse o menu do seu navegador (três pontinhos) e selecione 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'.");
    }
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden py-10 px-4">

      {/* Background Animation Hub */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#bc13fe]/10 blur-[150px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#00f3ff]/10 blur-[150px] rounded-full animate-pulse-slow delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center text-center space-y-12">

        {/* Badge Superior */}
        <div className="flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-full shadow-[0_0_20px_rgba(0,243,255,0.1)] backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-[#00f3ff] animate-ping"></div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#00f3ff]">ALTA DISPONIBILIDADE | CUSTO ZERO</span>
        </div>

        {/* Hero Section */}
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black italic tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/80 to-gray-800 drop-shadow-2xl">
            A ELITE DA <br /><span className="text-3xl sm:text-5xl text-[#00f3ff]">SOBERANIA DIGITAL</span>
          </h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-sm sm:text-base lg:text-xl font-medium leading-relaxed tracking-wide">
            A melhor solução forense do mercado, agora ao seu alcance. <br className="hidden sm:block" />
            <span className="text-white italic">Poder de Auditoria Governamental, Totalmente Gratuito.</span>
          </p>
        </div>

        {/* CTAs Master */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl pt-8">

          {/* Botão Vitrine */}
          <Link href="/vitrine" className="group">
            <div className="glass-panel h-full p-8 rounded-[2rem] border border-white/5 hover:border-[#00f3ff]/40 transition-all duration-500 hover:bg-[#00f3ff]/5 relative overflow-hidden text-left bg-black/60 shadow-xl group-hover:shadow-[#00f3ff]/10">
              <Globe className="w-10 h-10 text-[#00f3ff] mb-6 transform group-hover:rotate-12 transition-transform duration-500" />
              <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tight">Vitrine Global</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">Broadcast de projetos e ativos autorizados para consumo público.</p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#00f3ff] tracking-widest">
                Acessar Portal <ArrowRight className="w-3 h-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Botão Admin / Cofre */}
          <Link href="/admin" className="group">
            <div className="glass-panel h-full p-8 rounded-[2rem] border border-white/5 hover:border-[#bc13fe]/40 transition-all duration-500 hover:bg-[#bc13fe]/5 relative overflow-hidden text-left bg-black/60 shadow-xl group-hover:shadow-[#bc13fe]/10">
              <Shield className="w-10 h-10 text-[#bc13fe] mb-6 transform group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tight">Cofre de Ativos</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">Célula administrativa para custódia e auditoria forense de dados.</p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#bc13fe] tracking-widest">
                Gerenciar Hub <ArrowRight className="w-3 h-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Botão Documentação */}
          <Link href="/doc" className="group">
            <div className="glass-panel h-full p-8 rounded-[2rem] border border-white/5 hover:border-orange-500/40 transition-all duration-500 hover:bg-orange-500/5 relative overflow-hidden text-left bg-black/60 shadow-xl group-hover:shadow-orange-500/10">
              <BookOpen className="w-10 h-10 text-orange-500 mb-6 transform group-hover:-rotate-12 transition-transform duration-500" />
              <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tight">Cérebro Digital</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">Conhecimento técnico e protocolos de operação sênior.</p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-orange-500 tracking-widest">
                Ler Manuais <ArrowRight className="w-3 h-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* App Version Callout - Google Play Optimized */}
        <div className="w-full max-w-3xl bg-gradient-to-br from-[#1a1a1a] to-black p-[1px] rounded-[2.5rem] mt-12 group overflow-hidden border border-white/10 shadow-2xl">
          <div className="bg-[#050505] p-10 lg:p-14 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 relative">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <Smartphone className="w-40 h-40" />
            </div>

            <div className="text-left space-y-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#00f3ff]/10 rounded-2xl border border-[#00f3ff]/20">
                  <Smartphone className="w-7 h-7 text-[#00f3ff]" />
                </div>
                <h4 className="text-3xl font-black uppercase italic text-white tracking-tighter">APP MOBILE NCFN</h4>
              </div>
              <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                Segurança biométrica integrada, criptografia de hardware e <br className="hidden sm:block" />
                <span className="text-[#00f3ff]">acesso unificado em tempo real.</span>
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              {isPwaInstalled ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3 px-8 py-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-black uppercase text-green-500 tracking-widest">Identidade Vinculada</span>
                  </div>
                  <span className="text-[8px] font-mono text-gray-600 uppercase">Hardware ID: Verified</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-4 px-10 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-[#00f3ff] transition-all hover:scale-105 shadow-[0_10px_40px_rgba(255,255,255,0.1)]"
                  >
                    <Zap className="w-5 h-5 fill-current" /> Baixar App Neural
                  </button>
                  <div className="flex items-center gap-2 opacity-30">
                    <Shield className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Certified TWA Protocol</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hardware Grid Aesthetic */}
        <div className="pt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 opacity-30 w-full max-w-3xl">
          <div className="flex flex-col items-center gap-2">
            <Cpu className="w-5 h-5" />
            <span className="text-[8px] font-mono uppercase tracking-widest leading-tight text-center">Neural Multi-Layer<br />Processing</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Terminal className="w-5 h-5" />
            <span className="text-[8px] font-mono uppercase tracking-widest leading-tight text-center">Forensic Log<br />Integration</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-[8px] font-mono uppercase tracking-widest leading-tight text-center">AES-256<br />Encapsulation</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Lock className="w-5 h-5" />
            <span className="text-[8px] font-mono uppercase tracking-widest leading-tight text-center">Hardware-Locked<br />Vault</span>
          </div>
        </div>
      </div>

      {/* Decor Layer */}
      <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#bc13fe] to-transparent opacity-20"></div>
    </div>
  );
}
