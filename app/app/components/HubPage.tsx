"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Shield, Lock, Cpu, Globe, Terminal, Activity,
  Apple, Smartphone, ShieldCheck, ShieldAlert, Zap, X
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';

/* ─────────────────────────────────────────────
   Animated counter hook
───────────────────────────────────────────── */
function useCounter(target: number, duration = 2) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.floor(v)),
    });
    return controls.stop;
  }, [target, duration]);
  return value;
}

/* ─────────────────────────────────────────────
   EKG / Sparkline SVG
───────────────────────────────────────────── */
function EkgLine() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-12" preserveAspectRatio="none">
      <polyline
        points="0,30 20,30 30,30 40,10 50,50 60,30 80,30 90,5 100,55 110,30 130,30 140,15 150,45 160,30 200,30"
        fill="none"
        stroke="rgb(6 182 212)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: 'ekgDraw 3s ease-in-out infinite' }}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Access Denied Modal
───────────────────────────────────────────── */
function AccessDeniedModal({ onClose }: { onClose: () => void }) {
  const [cursorVisible, setCursorVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-full max-w-lg bg-black border border-lime-500/40 rounded-lg shadow-[0_0_60px_rgba(132,204,22,0.15)] overflow-hidden"
      >
        {/* Terminal title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-lime-500/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-[10px] font-mono text-lime-500/60 tracking-widest uppercase">
            ncfn-sec :: /auth/restricted
          </span>
          <button
            onClick={onClose}
            className="text-lime-500/40 hover:text-lime-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Terminal body */}
        <div className="p-6 font-mono text-sm text-lime-400 space-y-4">
          <div className="text-xs text-lime-500/50 tracking-widest">
            &gt; NCFN SECURITY GATEWAY v4.1
          </div>
          <div className="text-xs text-lime-500/50">
            &gt; Verificando credenciais de acesso...
          </div>
          <div className="border-l-2 border-red-500 pl-4 py-2 mt-4">
            <p className="text-red-400 text-xs font-bold tracking-wider uppercase mb-1">
              [ERRO 403] ACESSO NEGADO
            </p>
            <p className="text-lime-300 text-xs leading-relaxed">
              CREDENCIAMENTO DE SEGURANÇA NECESSÁRIO.{' '}
              REALIZE O LOGIN PARA ELEVAR SEUS PRIVILÉGIOS.
              <span
                className="ml-1 inline-block"
                style={{ opacity: cursorVisible ? 1 : 0 }}
              >
                _
              </span>
            </p>
          </div>
          <div className="text-[10px] text-lime-500/40 mt-4 space-y-1">
            <div>&gt; Nível de ameaça: ALTO</div>
            <div>&gt; Tentativa registrada em log de auditoria</div>
            <div>&gt; IP: [CLASSIFICADO]</div>
          </div>
          <div className="flex gap-3 pt-4">
            <Link
              href="/login"
              className="flex-1 text-center py-2 px-4 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-mono tracking-widest uppercase hover:bg-lime-500/20 hover:border-lime-400 transition-all rounded"
            >
              [ AUTENTICAR VIA PWA ]
            </Link>
            <button
              onClick={onClose}
              className="py-2 px-4 bg-slate-950 border border-lime-500/20 text-lime-500/50 text-xs font-mono tracking-widest uppercase hover:border-lime-500/40 transition-all rounded"
            >
              [ ABORTAR ]
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Metric Card
───────────────────────────────────────────── */
function MetricCard({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl p-5 flex flex-col gap-3"
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
        {title}
      </span>
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Access Level Card
───────────────────────────────────────────── */
interface LevelCardProps {
  nivel: number;
  borderColor: string;
  glowColor: string;
  iconColor: string;
  badgeColor: string;
  features: string[];
  para: string;
  porQue: string;
  locked: boolean;
  lockRed?: boolean;
  glitch?: boolean;
  onLockClick: () => void;
}

function LevelCard({
  nivel,
  borderColor,
  glowColor,
  iconColor,
  badgeColor,
  features,
  para,
  porQue,
  locked,
  lockRed,
  glitch,
  onLockClick,
}: LevelCardProps) {
  const lockIconColor = lockRed ? 'text-red-500' : 'text-slate-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={locked ? onLockClick : undefined}
      className={`relative bg-slate-900/60 backdrop-blur-xl border ${borderColor} rounded-xl p-5 flex flex-col gap-3
        ${locked ? 'cursor-pointer hover:brightness-110' : ''}
        ${glitch ? 'glitch-border' : ''}
        ${glowColor}
        transition-all duration-300`}
    >
      {/* Level badge */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${badgeColor} px-2 py-0.5 rounded border ${borderColor}`}>
          NÍVEL {nivel}
        </span>
        {locked && <Lock className={`w-4 h-4 ${lockIconColor}`} />}
      </div>

      {/* Features */}
      <ul
        className={`space-y-1 ${locked ? '' : ''}`}
        style={locked ? { filter: 'blur(4px)', userSelect: 'none' } : {}}
      >
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-300 font-mono">
            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${badgeColor.replace('text-', 'bg-')}`} />
            {f}
          </li>
        ))}
      </ul>

      {/* Para / Por quê */}
      <div
        className="space-y-1 mt-1"
        style={locked ? { filter: 'blur(4px)', userSelect: 'none' } : {}}
      >
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Para:</p>
        <p className="text-[11px] text-slate-400">{para}</p>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">Por quê:</p>
        <p className="text-[11px] text-slate-400">{porQue}</p>
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
          <div className="bg-black/30 rounded-full p-2">
            <Lock className={`w-6 h-6 ${lockIconColor} drop-shadow-[0_0_8px_currentColor]`} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function MasterHub() {
  const { data: _session } = useSession();
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const threatsCount = useCounter(1247, 2.5);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    setIsPwaInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      window.alert(
        "Para instalar o aplicativo NCFN Forense, acesse o menu do seu navegador e selecione 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'."
      );
    }
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
  };

  /* Nav cards config */
  const navCards = [
    { label: 'Vitrine Pública', icon: Globe, href: '/vitrine', locked: false, color: 'text-cyan-400' },
    { label: 'Auditoria', icon: ShieldCheck, href: '/auditor', locked: false, color: 'text-blue-400' },
    { label: 'Configurações de IA', icon: Cpu, href: '#', locked: true, color: 'text-yellow-400' },
    { label: 'Gestão do Vault', icon: Shield, href: '#', locked: true, color: 'text-orange-400' },
    { label: 'Logs de Acesso', icon: Activity, href: '#', locked: true, color: 'text-red-400' },
    { label: 'Lockdown do Servidor', icon: ShieldAlert, href: '#', locked: true, color: 'text-red-600' },
  ];

  /* Access levels config */
  const levels = [
    {
      nivel: 0,
      borderColor: 'border-cyan-500/40',
      glowColor: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]',
      iconColor: 'text-cyan-400',
      badgeColor: 'text-cyan-400',
      features: ['Captura Web Padrão', 'Testemunha Wayback Machine'],
      para: 'Cidadãos, vítimas de crimes cibernéticos comuns e jornalistas',
      porQue: 'Ideal para preservar provas rápidas de redes sociais e sites',
      locked: false,
    },
    {
      nivel: 1,
      borderColor: 'border-emerald-500/40',
      glowColor: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]',
      iconColor: 'text-emerald-400',
      badgeColor: 'text-emerald-400',
      features: ['Carimbo Blockchain (.ots)', 'Análise de Metadados (ExifTool)'],
      para: 'Detetives particulares, pesquisadores OSINT e pequenos escritórios',
      porQue: 'Garante imutabilidade criptográfica via Blockchain',
      locked: false,
    },
    {
      nivel: 2,
      borderColor: 'border-yellow-500/40',
      glowColor: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.1)]',
      iconColor: 'text-yellow-400',
      badgeColor: 'text-yellow-400',
      features: ['IA Local (Perito Sansão - Mistral)', 'Assinatura RFC 3161'],
      para: 'Advogados criminalistas, peritos judiciais independentes',
      porQue: 'Oferece análise profunda com IA isolada e carimbo de tempo oficial',
      locked: false,
    },
    {
      nivel: 3,
      borderColor: 'border-orange-500/40',
      glowColor: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]',
      iconColor: 'text-orange-400',
      badgeColor: 'text-orange-400',
      features: ['Infraestrutura Policial', 'VPS Isolada', 'Destruição Automática de Cache'],
      para: 'Forças policiais, delegacias de crimes cibernéticos',
      porQue: 'Requer sigilo absoluto e infraestrutura isolada',
      locked: true,
    },
    {
      nivel: 4,
      borderColor: 'border-red-500/40',
      glowColor: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]',
      iconColor: 'text-red-400',
      badgeColor: 'text-red-400',
      features: ['Processamento GPU Dedicado', 'Llama 3 Local', 'Detecção de Deepfake (ELA)'],
      para: 'Agências de inteligência, peritos criminais federais',
      porQue: 'Altíssimo poder computacional para detectar manipulações',
      locked: true,
      lockRed: true,
    },
    {
      nivel: 5,
      borderColor: 'border-purple-500/40',
      glowColor: 'hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]',
      iconColor: 'text-purple-400',
      badgeColor: 'text-purple-400',
      features: ['Controle Absoluto de Instância', 'Lockdown de Servidor', 'Chaves Zero-Knowledge'],
      para: 'Arquitetos do sistema e Operadores Root da plataforma NCFN',
      porQue: 'Acesso aos protocolos de emergência e gestão de criptografia mestre',
      locked: true,
      lockRed: true,
      glitch: true,
    },
  ];

  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

        .hub-title {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 900;
          letter-spacing: 0.18em;
          line-height: 1.15;
        }
        .hub-title-main {
          font-size: clamp(1.6rem, 5vw, 3.2rem);
        }
        .hub-title-sub {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 700;
          font-size: clamp(0.7rem, 1.8vw, 1rem);
          letter-spacing: 0.3em;
        }

        @keyframes hexRain {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.035; }
          90%  { opacity: 0.035; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes ekgDraw {
          0%   { stroke-dashoffset: 600; }
          60%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes laserSweep {
          0%   { transform: translateX(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(200%); opacity: 0; }
        }
        @keyframes glitchBorder {
          0%,100% { border-color: rgba(168,85,247,0.4); box-shadow: 0 0 0px rgba(168,85,247,0); }
          20%     { border-color: rgba(239,68,68,0.9); box-shadow: 0 0 20px rgba(239,68,68,0.4); }
          40%     { border-color: rgba(168,85,247,0.4); box-shadow: 0 0 0px rgba(168,85,247,0); }
          60%     { border-color: rgba(0,255,255,0.8); box-shadow: 0 0 15px rgba(0,255,255,0.3); }
          80%     { border-color: rgba(168,85,247,0.4); box-shadow: 0 0 0px rgba(168,85,247,0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          70%  { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
        .glitch-border {
          animation: glitchBorder 2.5s ease-in-out infinite;
        }
        polyline {
          stroke-dasharray: 600;
          animation: ekgDraw 3s ease-in-out infinite;
        }
      `}</style>

      <div className="relative min-h-screen bg-transparent overflow-x-hidden">

        {/* ── Hex data rain background ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 font-mono text-cyan-400 text-[10px] whitespace-nowrap select-none"
              style={{
                left: `${(i * 5.8) % 100}%`,
                animationName: 'hexRain',
                animationDuration: `${8 + (i * 1.3) % 6}s`,
                animationDelay: `${(i * 0.9) % 5}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                opacity: 0.03,
              }}
            >
              {Array.from({ length: 40 }).map((_, j) => (
                <div key={j}>{Math.random().toString(16).slice(2, 6).toUpperCase()}</div>
              ))}
            </div>
          ))}
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-12 space-y-8 sm:space-y-16"
        >

          {/* ══════════════ A. HEADER ══════════════ */}
          <motion.div variants={itemVariants} className="text-center space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500/30" />
              <span className="text-[9px] font-mono text-cyan-500/60 tracking-[0.4em] uppercase px-4">
                SYS :: ONLINE
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-500/30" />
            </div>

            <h1 className="hub-title hub-title-main text-white uppercase">
              <span className="text-cyan-400 drop-shadow-[0_0_24px_rgba(6,182,212,0.9)]">
                NEXUS CYBER
              </span>
              <br />
              <span className="text-white/90 drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                FORENSIC NETWORK
              </span>
            </h1>

            <p className="hub-title-sub text-cyan-300/60 uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] max-w-2xl mx-auto">
              CADEIA DE CUSTÓDIA E TRATAMENTO FORENSE EM DOCUMENTOS DIGITAIS PROBATÓRIOS
            </p>
          </motion.div>

          {/* ══════════════ B. SYSTEM DASHBOARD ══════════════ */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Card 1 — Tunnel Status */}
              <MetricCard title="Status do Túnel" delay={0.2}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center flex-shrink-0"
                    style={{ animation: 'pulseRing 2s ease-out infinite' }}
                  >
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xl font-mono font-bold text-emerald-400 tracking-widest">ATIVO</div>
                    <div className="text-[9px] font-mono text-slate-500 tracking-widest">CLOUDFLARE TUNNEL</div>
                  </div>
                </div>
              </MetricCard>

              {/* Card 2 — Threats blocked */}
              <MetricCard title="Ameaças Bloqueadas (24h)" delay={0.3}>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-mono font-bold text-red-400 tabular-nums">
                    {threatsCount.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-mono text-slate-500 mb-1">eventos</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 2.5, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </MetricCard>

              {/* Card 3 — Network Latency */}
              <MetricCard title="Latência da Rede" delay={0.4}>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-cyan-400">12ms</span>
                  <span className="text-[9px] font-mono text-emerald-400 tracking-widest">NOMINAL</span>
                </div>
                <EkgLine />
              </MetricCard>
            </div>
          </motion.div>

          {/* ══════════════ C. NAVIGATION GRID ══════════════ */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
                Módulos do Sistema
              </span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {navCards.map((card) => {
                const Icon = card.icon;
                const inner = (
                  <div
                    className={`group bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3 text-center
                      hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-300
                      ${card.locked ? 'cursor-pointer opacity-60 hover:opacity-80' : 'cursor-pointer hover:shadow-[0_0_20px_rgba(6,182,212,0.05)]'}`}
                  >
                    <div className="relative">
                      <Icon className={`w-6 h-6 ${card.color}`} />
                      {card.locked && (
                        <Lock className="w-3 h-3 text-slate-400 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-300 leading-tight">{card.label}</span>
                  </div>
                );

                if (card.locked) {
                  return (
                    <div key={card.label} onClick={openModal}>
                      {inner}
                    </div>
                  );
                }
                return (
                  <Link key={card.label} href={card.href}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* ══════════════ D. ACCESS LEVELS ══════════════ */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
                Níveis de Acesso
              </span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levels.map((lvl) => (
                <LevelCard
                  key={lvl.nivel}
                  {...lvl}
                  onLockClick={openModal}
                />
              ))}
            </div>
          </motion.div>

          {/* ══════════════ D2. ANÁLISE FORENSE CTA ══════════════ */}
          <motion.div variants={itemVariants}>
            <Link
              href="/analise"
              className="group relative flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 hover:border-cyan-400/40 hover:from-cyan-950/60 hover:to-blue-950/60 transition-all duration-300 overflow-hidden"
            >
              {/* Glow sweep */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.04), transparent)' }} />
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-all">
                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-cyan-400" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              {/* Text */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-[10px] text-cyan-500/60 font-mono tracking-widest uppercase">Novo Serviço</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-500/20 border border-green-500/30 text-green-400 font-bold">BETA</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Análise Forense por Créditos</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Envie qualquer arquivo — calculamos SHA-256, detectamos Magic Bytes e geramos laudo com cadeia de custódia certificada.
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                  {['SHA-256 Client-Side', 'Magic Bytes', 'Chain of Custody', 'Privacy Mode'].map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{t}</span>
                  ))}
                </div>
              </div>
              {/* Arrow */}
              <div className="shrink-0 w-8 h-8 rounded-full border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400/40 group-hover:bg-cyan-500/10 transition-all">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-cyan-400" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          </motion.div>

          {/* ══════════════ E. INSTALL BUTTON ══════════════ */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 pb-8">
            <div className="relative overflow-hidden rounded-xl">
              <button
                onClick={handleInstallClick}
                className="relative z-10 group flex items-center gap-3 px-8 py-4 bg-slate-900/80 border border-cyan-500/30 text-cyan-400 font-mono text-sm tracking-[0.25em] uppercase rounded-xl
                  hover:border-cyan-400/60 hover:bg-slate-900 transition-all duration-300
                  hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
              >
                <Terminal className="w-4 h-4" />
                {isPwaInstalled
                  ? '[ >_ APLICATIVO INSTALADO ]'
                  : '[ >_ INSTALAR APLICATIVO NCFN SYNC ]'}
              </button>
              {/* Laser sweep */}
              {!isPwaInstalled && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                  aria-hidden
                >
                  <div
                    className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent"
                    style={{
                      animation: 'laserSweep 4s ease-in-out infinite',
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 opacity-40">
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">iOS / macOS</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Android / PWA</span>
              </div>
            </div>

            {/* Footer metadata strip */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 opacity-20">
              {[
                { Icon: Cpu, label: 'SHA-256 Engine' },
                { Icon: Terminal, label: 'Forensic Core' },
                { Icon: Lock, label: 'AES-256 Vault' },
                { Icon: Globe, label: 'Zero-Trust Net' },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* ══════════════ F. SECURITY MODAL ══════════════ */}
      <AnimatePresence>
        {modalOpen && <AccessDeniedModal onClose={closeModal} />}
      </AnimatePresence>
    </>
  );
}
