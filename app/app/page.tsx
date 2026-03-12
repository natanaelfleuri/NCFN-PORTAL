"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Smartphone, BookOpen, Lock, Terminal, Cpu, Zap, Globe, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

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
      window.alert("Para instalar o aplicativo NCFN Forense, acesse o menu do seu navegador (três pontinhos) e selecione 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden py-10 px-4">
      {/* Background Decor */}
      <div className="scanline"></div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyber-purple/5 blur-[120px] rounded-full animate-float"></div>
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-cyber-blue/5 blur-[120px] rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-6xl flex flex-col items-center text-center space-y-12"
      >
        {/* Badge Superior */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl shadow-[0_0_30px_rgba(0,243,255,0.05)]"
        >
          <div className="w-2 h-2 rounded-full bg-cyber-blue animate-ping"></div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,1)]">
            Perícia Digital de Elite · Custódia Certificada
          </span>
        </motion.div>

        {/* Hero Section */}
        <motion.div variants={itemVariants} className="space-y-6">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black italic tracking-tighter leading-[0.9] text-white select-none">
            <span className="block opacity-20 text-4xl sm:text-6xl mb-2 font-mono not-italic uppercase tracking-widest">Nexus Cyber</span>
            NCFN <span className="text-cyber-blue glitch-text" data-text="PORTAL">PORTAL</span>
          </h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-sm sm:text-base lg:text-lg font-medium leading-relaxed tracking-wide opacity-80 uppercase">
            Plataforma de Custódia Forense Certificada · Criptografia AES-256 · Cadeia de Evidências ISO/IEC-27037
          </p>
        </motion.div>

        {/* Action Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full pt-8">
          
          <Link href="/vitrine" className="group h-full">
            <div className="premium-card h-full p-10 flex flex-col items-start text-left border-l-cyber-blue shadow-[0_0_50px_rgba(0,243,255,0.02)] transition-all group-hover:shadow-[0_0_50px_rgba(0,243,255,0.08)]">
              <div className="w-14 h-14 rounded-2xl bg-cyber-blue/5 border border-cyber-blue/20 flex items-center justify-center mb-8 group-hover:bg-cyber-blue/10 transition-colors">
                <Globe className="w-7 h-7 text-cyber-blue animate-pulse-slow" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tight">Vitrine Pública</h3>
              <p className="text-xs text-gray-500 mb-8 leading-relaxed font-medium">Canal oficial de divulgação de ativos forenses autorizados. Cada arquivo exibido carrega cadeia de custódia verificável, hash SHA-256 e registro de acesso permanente conforme protocolo NCFN.</p>
              <div className="mt-auto flex items-center gap-3 text-[10px] font-black uppercase text-cyber-blue tracking-[0.2em] group-hover:gap-5 transition-all">
                Acessar Vitrine <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          <Link href="/vault" className="group h-full">
            <div className="premium-card h-full p-10 flex flex-col items-start text-left border-l-cyber-purple shadow-[0_0_50px_rgba(188,19,254,0.02)] transition-all group-hover:shadow-[0_0_50px_rgba(188,19,254,0.08)]">
              <div className="w-14 h-14 rounded-2xl bg-cyber-purple/5 border border-cyber-purple/20 flex items-center justify-center mb-8 group-hover:bg-cyber-purple/10 transition-colors">
                <Shield className="w-7 h-7 text-cyber-purple" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tight">Vault Forense</h3>
              <p className="text-xs text-gray-500 mb-8 leading-relaxed font-medium">Cofre digital de alta segurança com imutabilidade criptográfica garantida. Cada arquivo custodiado recebe carimbo temporal RFC 3161, assinatura SHA-256 e log de acesso juridicamente válido — preservação de provas técnicas em padrão pericial avançado.</p>
              <div className="mt-auto flex items-center gap-3 text-[10px] font-black uppercase text-cyber-purple tracking-[0.2em] group-hover:gap-5 transition-all">
                Autenticar Acesso <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          <Link href="/doc" className="group h-full">
            <div className="premium-card h-full p-10 flex flex-col items-start text-left border-l-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.02)] transition-all group-hover:shadow-[0_0_50px_rgba(249,115,22,0.08)]">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-center mb-8 group-hover:bg-orange-500/10 transition-colors">
                <BookOpen className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tight">Base de Conhecimento</h3>
              <p className="text-xs text-gray-500 mb-8 leading-relaxed font-medium">Repositório técnico centralizado: manuais de operação forense, diretrizes de cadeia de custódia, procedimentos de criptografia e normativas de segurança aplicadas à perícia digital avançada.</p>
              <div className="mt-auto flex items-center gap-3 text-[10px] font-black uppercase text-orange-500 tracking-[0.2em] group-hover:gap-5 transition-all">
                Consultar Protocolos <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

        </motion.div>

        {/* Device Sync Callout */}
        <motion.div variants={itemVariants} className="w-full pt-12">
          <div className="premium-card p-1 bg-gradient-to-br from-cyber-blue/20 via-transparent to-cyber-purple/20 rounded-[2.5rem] group border-none">
            <div className="bg-black/95 p-10 lg:p-14 rounded-[2.4rem] flex flex-col lg:flex-row items-center justify-between gap-10 overflow-hidden relative">
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Smartphone className="w-64 h-64 rotate-12" />
              </div>

              <div className="text-left space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyber-blue/10 rounded-xl border border-cyber-blue/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-cyber-blue" />
                  </div>
                  <h4 className="text-4xl font-black text-white italic tracking-tighter uppercase">NCFN Mobile Sync</h4>
                </div>
                <p className="text-gray-400 text-base max-w-lg leading-relaxed">
                  Instale o portal como aplicativo nativo (PWA/TWA) com criptografia de hardware AES-256, autenticação biométrica por impressão digital e sincronização em tempo real com a infraestrutura forense NCFN — acesso seguro em qualquer dispositivo, em qualquer jurisdição.
                </p>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-4">
                <AnimatePresence mode="wait">
                  {isPwaInstalled ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="flex items-center gap-3 px-8 py-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-black uppercase text-green-500 tracking-[0.2em]">Hardware Linked</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleInstallClick}
                      className="px-12 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-cyber-blue hover:text-white transition-all shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center gap-3"
                    >
                      <Terminal className="w-4 h-4" /> Instalar Aplicativo
                    </motion.button>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 opacity-30 mt-2">
                  <Shield className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase tracking-[0.3em]">TWA Security Protocol v4.0</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hardware Footer */}
        <motion.div variants={itemVariants} className="pt-20 grid grid-cols-2 md:grid-cols-4 gap-12 opacity-20 w-full">
          {[
            { Icon: Cpu, Label: "SHA-256 Engine" },
            { Icon: Terminal, Label: "Forensic Core" },
            { Icon: Lock, Label: "AES-256 Vault" },
            { Icon: Globe, Label: "Zero-Trust Net" }
          ].map((item, id) => (
            <div key={id} className="flex flex-col items-center gap-3 group transition-opacity hover:opacity-100">
              <item.Icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-center leading-tight">
                {item.Label.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
