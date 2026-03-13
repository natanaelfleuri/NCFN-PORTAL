"use client";

import { useSession } from "next-auth/react";
import { Shield, Zap, Check, ArrowRight, Star, Lock, Building2, Server, HardDrive } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PLANS = [
  {
    level: "PRO",
    subtitle: "Essencial",
    desc: "A porta de entrada para validação e preservação de dados.",
    price: "75",
    storage: "25 GB",
    color: "#00f3ff",
    border: "border-[#00f3ff]/40",
    bg: "bg-[#00f3ff]/5",
    glow: "shadow-[0_0_30px_rgba(0,243,255,0.07)]",
    barColor: "bg-[#00f3ff]",
    barGlow: "shadow-[0_0_15px_rgba(0,243,255,0.8)]",
    icon: <Zap className="w-5 h-5" />,
    tag: null,
    gatilho: "Segurança e validação acessíveis para suas primeiras auditorias.",
    features: [
      "25 GB de arquivos tratados e cifrados",
      "Custódia forense com hash SHA-256 + RFC 3161",
      "Painel de evidências digital",
      "Laudo pericial automatizado com IA",
      "Suporte técnico pericial",
    ],
  },
  {
    level: "ULTRA",
    subtitle: "Nível 2",
    desc: "Mais capacidade para investigações, acusações ou defesas constantes.",
    price: "165",
    storage: "100 GB",
    color: "#bc13fe",
    border: "border-[#bc13fe]/40",
    bg: "bg-[#bc13fe]/5",
    glow: "shadow-[0_0_30px_rgba(188,19,254,0.07)]",
    barColor: "bg-[#bc13fe]",
    barGlow: "shadow-[0_0_15px_rgba(188,19,254,0.8)]",
    icon: <Shield className="w-5 h-5" />,
    tag: null,
    gatilho: "Quatro vezes mais espaço por uma fração do preço.",
    features: [
      "100 GB de arquivos tratados e cifrados",
      "Tudo do plano PRO",
      "Captura forense web completa (screenshot + HAR + SSL)",
      "Acesso à auditoria de IA — Perito Sansão",
      "Relatórios OSINT avançados",
    ],
  },
  {
    level: "FULL",
    subtitle: "Nível 3",
    desc: "O ecossistema completo para a cadeia de custódia.",
    price: "230",
    storage: "300 GB",
    color: "#f59e0b",
    border: "border-amber-400/50",
    bg: "bg-amber-500/5",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.10)]",
    barColor: "bg-amber-400",
    barGlow: "shadow-[0_0_15px_rgba(245,158,11,0.8)]",
    icon: <Star className="w-5 h-5 fill-amber-400" />,
    tag: "⭐ Mais Popular",
    gatilho: "A escolha definitiva para quem não pode comprometer espaço na hora de preservar provas.",
    features: [
      "300 GB de arquivos tratados e cifrados",
      "Tudo do plano ULTRA",
      "Redundância física em BUNKER dedicado",
      "Acesso a múltiplos módulos simultâneos",
      "Suporte pericial prioritário 24 h",
    ],
    bunker: true,
  },
  {
    level: "MESTRE FULL",
    subtitle: "Avançado",
    desc: "Poder de processamento e armazenamento em nível pericial.",
    price: "720",
    storage: "2 TB",
    color: "#ef4444",
    border: "border-red-500/40",
    bg: "bg-red-500/5",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.07)]",
    barColor: "bg-red-500",
    barGlow: "shadow-[0_0_15px_rgba(239,68,68,0.8)]",
    icon: <HardDrive className="w-5 h-5" />,
    tag: null,
    gatilho: "Infraestrutura massiva para auditorias complexas e ininterruptas.",
    features: [
      "2 TB (2.000 GB) de arquivos tratados",
      "Tudo do plano FULL",
      "Redundância física em BUNKER dedicado",
      "Processamento de imagens e vídeos em alta resolução",
      "API de integração com sistemas externos",
    ],
    bunker: true,
  },
  {
    level: "CORPORATIVO",
    subtitle: "Enterprise",
    desc: "Isolamento e escala máxima para operações críticas.",
    price: "1.450",
    storage: "5 TB",
    color: "#6366f1",
    border: "border-indigo-500/40",
    bg: "bg-indigo-500/5",
    glow: "shadow-[0_0_30px_rgba(99,102,241,0.07)]",
    barColor: "bg-indigo-500",
    barGlow: "shadow-[0_0_15px_rgba(99,102,241,0.8)]",
    icon: <Building2 className="w-5 h-5" />,
    tag: null,
    gatilho: "Escalabilidade e custódia de dados sem restrições para operações de grande impacto.",
    features: [
      "5 TB de arquivos tratados",
      "Tudo do plano MESTRE FULL",
      "BUNKER dedicado exclusivo com espelhamento contínuo",
      "SLA garantido + gerente técnico dedicado",
      "Compliance e auditoria para grandes corporações",
    ],
    bunker: true,
  },
];

export default function UpgradePage() {
  const { data: session } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (level: string) => {
    setLoadingPlan(level);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      console.log(`Checkout para plano ${level} — integração Stripe/Asaas pendente`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 py-8 px-4 animate-fade-in">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-[#00f3ff]/10 rounded-full mb-4 ring-1 ring-[#00f3ff]/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
          <Shield className="w-8 h-8 text-[#00f3ff]" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic font-cyber">
          Planos de <span className="text-[#00f3ff]">Custódia</span>
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
          Escolha o plano que melhor atende ao volume e criticidade das suas operações forenses. Todos os planos incluem criptografia AES-256, hash SHA-256 e carimbo temporal RFC 3161.
        </p>
      </div>

      {/* Trial card */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">NÍVEL 0 — TRIAL</span>
          <p className="text-white font-bold mt-1">Observador Digital <span className="text-gray-500 font-normal text-sm">· Gratuito</span></p>
          <p className="text-gray-600 text-xs mt-1">Até 10 ativos · 1 GB · Hash SHA-256 · Vitrine Pública</p>
        </div>
        <div className="px-5 py-2.5 border border-gray-700 rounded-lg text-gray-500 font-bold tracking-widest uppercase text-xs cursor-not-allowed whitespace-nowrap">
          Plano Atual (gratuito)
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.level}
            className={`relative ${plan.bg} ${plan.border} border rounded-2xl p-6 flex flex-col ${plan.glow} backdrop-blur-sm transition-transform hover:-translate-y-1 duration-200 ${plan.tag ? 'ring-1 ring-amber-400/30' : ''}`}
          >
            {/* Top bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${plan.barColor} ${plan.barGlow}`} />

            {/* Tag */}
            {plan.tag && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-black text-[10px] font-black rounded-full uppercase tracking-widest whitespace-nowrap">
                {plan.tag}
              </div>
            )}

            {/* Plan name */}
            <div className="flex items-center gap-2 mt-2 mb-1" style={{ color: plan.color }}>
              {plan.icon}
              <span className="font-black text-sm uppercase tracking-widest">{plan.level}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">{plan.subtitle}</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">{plan.desc}</p>

            {/* Price */}
            <div className="mb-2">
              <span className="text-3xl font-black text-white">R$ {plan.price}</span>
              <span className="text-gray-500 text-sm">/mês</span>
            </div>
            <div className="text-xs font-bold mb-5" style={{ color: plan.color }}>
              {plan.storage} de arquivos tratados
            </div>

            {/* Features */}
            <ul className="space-y-2 text-xs text-gray-300 flex-1 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: plan.color }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Gatilho */}
            <p className="text-[10px] text-gray-600 italic mb-4 border-t border-white/5 pt-3">"{plan.gatilho}"</p>

            {/* CTA */}
            <button
              onClick={() => handleUpgrade(plan.level)}
              disabled={loadingPlan === plan.level}
              className="w-full py-3 px-4 rounded-xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2 group transition-all disabled:opacity-60"
              style={{
                backgroundColor: `${plan.color}20`,
                border: `1px solid ${plan.color}60`,
                color: plan.color,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${plan.color}35`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${plan.color}20`; }}
            >
              {loadingPlan === plan.level ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Solicitar Acreditação
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Bunker Section — #02 */}
      <div className="bg-gray-950/80 border border-[#bc13fe]/20 rounded-2xl p-8 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#bc13fe]/10 rounded-xl border border-[#bc13fe]/30">
            <Server className="w-5 h-5 text-[#bc13fe]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Redundância em BUNKER Físico Dedicado</h2>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Planos FULL · MESTRE FULL · CORPORATIVO</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Nos planos <span className="text-white font-bold">FULL, MESTRE FULL e CORPORATIVO</span>, cópias dos arquivos tratados são armazenadas automaticamente em <span className="text-[#bc13fe] font-bold">bunkers físicos dedicados</span> em locais não divulgados por razões de segurança operacional. Esses repositórios físicos são protegidos contra agentes externos, falhas de rede, desastres naturais e ações judiciais unilaterais.
        </p>
        <p className="text-sm text-gray-400 leading-relaxed">
          A ativação da redundância física é <span className="text-white font-bold">automática</span> para todos os assinantes qualificados, ou pode ser configurada sob demanda conforme o nível de acesso ou a necessidade específica do gerente/cliente. Os locais dos bunkers são mantidos em sigilo absoluto e só são revelados em situações de contingência devidamente autorizadas.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[
            { label: "FULL", storage: "300 GB", note: "Bunker compartilhado — zona segura dedicada" },
            { label: "MESTRE FULL", storage: "2 TB", note: "Bunker dedicado — isolamento total" },
            { label: "CORPORATIVO", storage: "5 TB", note: "Bunker exclusivo + espelhamento contínuo" },
          ].map(b => (
            <div key={b.label} className="bg-black/40 border border-[#bc13fe]/15 rounded-xl p-4">
              <p className="text-xs font-black text-[#bc13fe] uppercase tracking-widest mb-1">{b.label}</p>
              <p className="text-white font-bold text-sm">{b.storage}</p>
              <p className="text-[10px] text-gray-600 mt-1">{b.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <p className="text-xs text-gray-600 text-center max-w-lg">
          Todos os planos pagos são ativados via acreditação manual. Entre em contato com nossa equipe operacional para iniciar o processo de upgrade.
        </p>
        <Link href="/" className="text-xs text-gray-500 hover:text-white uppercase tracking-wider underline-offset-4 hover:underline transition-colors">
          Retornar ao Hub
        </Link>
      </div>
    </div>
  );
}
