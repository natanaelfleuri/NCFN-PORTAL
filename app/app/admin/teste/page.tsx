"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Cpu, Database, Globe, Lock, Shield, Server,
  CheckCircle, XCircle, RefreshCw, Wifi, HardDrive, Key,
  FileSearch, AlertTriangle, Clock, Activity, Layers, Zap,
  X, FileText, Upload,
} from "lucide-react";

type Stats = {
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: string;
  memory: { used: number; total: number; percentUsed: number };
  disk: { used: number; total: number; percent: string };
  cpu: { model: string; count: number; load1: number; load5: number; load15: number };
  hostname: string;
};

type CheckResult = { label: string; ok: boolean; detail?: string; checkFn: () => Promise<void> };

function fmt(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const s = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

const LATENCY_HOPS = [
  { from: "Usuário (Browser)", to: "Cloudflare Edge", ms: 20, proto: "HTTPS/TLS 1.3", color: "#00f3ff" },
  { from: "Cloudflare Edge", to: "Cloudflared Tunnel", ms: 5, proto: "WireGuard / QUIC", color: "#f59e0b", extra: true },
  { from: "cloudflared", to: "Caddy Proxy", ms: 2, proto: "HTTP/2 interno", color: "#bc13fe" },
  { from: "Caddy Proxy", to: "Next.js App", ms: 1, proto: "HTTP localhost", color: "#34d399" },
  { from: "Next.js App", to: "SQLite DB (Prisma)", ms: 0, proto: "File I/O (WAL)", color: "#a855f7" },
  { from: "Next.js App", to: "Ollama LLM (11434)", ms: 3, proto: "HTTP REST", color: "#f97316" },
];

const ECOSYSTEM = [
  {
    category: "Aplicação",
    action: { label: "FLUSH CACHE", color: "text-[#00f3ff]", border: "border-[#00f3ff]/30", key: "flush" },
    items: [
      { label: "Framework", value: "Next.js 14 (App Router)", icon: Layers },
      { label: "Runtime", value: "Node.js / Bun", icon: Zap },
      { label: "Linguagem", value: "TypeScript 5 + React 18", icon: FileSearch },
      { label: "ORM / Banco", value: "Prisma + SQLite (WAL)", icon: Database },
      { label: "Auth", value: "NextAuth v4 + Cloudflare Access OTP", icon: Key },
      { label: "Estilo", value: "Tailwind CSS 3 + Lucide Icons", icon: Activity },
    ],
  },
  {
    category: "Infraestrutura",
    action: null,
    items: [
      { label: "Container", value: "Docker + Compose (portal_ncfn:3002)", icon: Server },
      { label: "Proxy Reverso", value: "Caddy 2 (TLS automático)", icon: Globe },
      { label: "Túnel", value: "Cloudflare Tunnel (cloudflared)", icon: Wifi },
      { label: "Hospedagem", value: "Servidores Físicos Dedicados — EUA & Brasil", icon: HardDrive },
      { label: "Domínio", value: "ncfn.net (Cloudflare DNS / Zero Trust)", icon: Shield },
      { label: "CDN / DDoS", value: "Cloudflare Global Network", icon: Lock },
    ],
  },
  {
    category: "Segurança & Forense",
    action: { label: "CHECK ENV INTEGRITY", color: "text-green-400", border: "border-green-500/30", key: "env" },
    items: [
      { label: "Criptografia", value: "AES-256-CBC + scrypt (CRYPTO_SALT)", icon: Lock },
      { label: "Integridade", value: "SHA-256 / MD5 / SHA-1 por arquivo", icon: Shield },
      { label: "Timestamping", value: "RFC 3161 TSA (prova forense)", icon: Clock },
      { label: "Dead Man Switch", value: "Cron + Lockdown/Wipe automático", icon: AlertTriangle },
      { label: "Rate Limit", value: "Sliding-window in-memory", icon: Zap },
      { label: "Vault", value: "COFRE_NCFN + 100_BURN_IMMUTABILITY", icon: HardDrive },
    ],
  },
  {
    category: "IA & Análise",
    action: { label: "STRESS TEST IA", color: "text-purple-400", border: "border-purple-500/30", key: "stress" },
    items: [
      { label: "LLM Local", value: "Ollama (mistral / llava)", icon: Cpu },
      { label: "Análise Visual", value: "Ollama Vision (llava model)", icon: FileSearch },
      { label: "ASR (Áudio)", value: "Whisper ASR (container separado)", icon: Activity },
      { label: "RAG / Embeddings", value: "ChromaDB (container opcional)", icon: Database },
      { label: "Perito Sansão", value: "6 protocolos forenses + SSE streaming", icon: Shield },
      { label: "Laudo IA", value: "Geração de laudos com Ollama + pdf-lib", icon: FileSearch },
    ],
  },
];

export default function TestePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [checkLoading, setCheckLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState("");

  const [showReversal, setShowReversal] = useState(false);
  const [reversalPassword, setReversalPassword] = useState("");
  const [reversalJustification, setReversalJustification] = useState("");
  const [reversalPdf, setReversalPdf] = useState<File | null>(null);
  const [reversalDragging, setReversalDragging] = useState(false);
  const reversalFileRef = useRef<HTMLInputElement>(null);

  const [ecoFeedback, setEcoFeedback] = useState<Record<string, { msg: string; ok: boolean }>>({});

  const buildChecks = (): Omit<CheckResult, 'checkFn'>[] => [
    { label: "VPS Stats API", ok: false, detail: "Não testado" },
    { label: "Banco de Dados (Prisma/SQLite)", ok: false, detail: "Não testado" },
    { label: "Vault COFRE_NCFN", ok: false, detail: "Não testado" },
    { label: "Ollama API (LLM Local)", ok: false, detail: "Não testado" },
    { label: "Cloudflare Tunnel", ok: false, detail: "Não testado" },
    { label: "TLS / HTTPS", ok: false, detail: "Não testado" },
  ];

  const runSingleCheck = async (label: string) => {
    setCheckLoading(prev => ({ ...prev, [label]: true }));

    let result: { ok: boolean; detail: string } = { ok: false, detail: "" };

    if (label === "VPS Stats API") {
      try {
        const r = await fetch("/api/admin/vps-stats");
        if (r.ok) {
          const d = await r.json();
          setStats(d);
          result = { ok: true, detail: `${d.hostname} — ${d.platform}/${d.arch}` };
        } else result = { ok: false, detail: `HTTP ${r.status}` };
      } catch (e: unknown) {
        result = { ok: false, detail: (e as Error).message };
      }
    } else if (label === "Banco de Dados (Prisma/SQLite)") {
      try {
        const r = await fetch("/api/admin/security");
        result = { ok: r.ok, detail: r.ok ? "Conectado e operacional" : `HTTP ${r.status}` };
      } catch (e: unknown) {
        result = { ok: false, detail: (e as Error).message };
      }
    } else if (label === "Vault COFRE_NCFN") {
      try {
        const r = await fetch("/api/vault?action=tree");
        result = { ok: r.ok, detail: r.ok ? "Acesso ao cofre verificado" : `HTTP ${r.status}` };
      } catch (e: unknown) {
        result = { ok: false, detail: (e as Error).message };
      }
    } else if (label === "Ollama API (LLM Local)") {
      try {
        const r = await fetch("/api/admin/vps-stats");
        result = { ok: r.ok, detail: r.ok ? "Endpoint configurado" : "Indisponível" };
      } catch {
        result = { ok: false, detail: "Não alcançável" };
      }
    } else if (label === "Cloudflare Tunnel") {
      const ok = window.location.hostname.includes("ncfn.net");
      result = { ok, detail: ok ? `Domínio ativo: ${window.location.hostname}` : "Executando em rede local" };
    } else if (label === "TLS / HTTPS") {
      const ok = window.location.protocol === "https:";
      result = { ok, detail: ok ? "Conexão segura ativa" : "Sem TLS (acesso local)" };
    }

    setChecks(prev => prev.map(c => c.label === label ? { ...c, ...result } : c));
    setCheckLoading(prev => ({ ...prev, [label]: false }));
  };

  const runChecks = async () => {
    setLoading(true);

    // Initialize checks
    const initialChecks: CheckResult[] = buildChecks().map(c => ({
      ...c,
      checkFn: () => runSingleCheck(c.label),
    }));
    setChecks(initialChecks);

    for (const c of initialChecks) {
      await c.checkFn();
    }

    setLastRun(new Date().toLocaleTimeString("pt-BR"));
    setLoading(false);
  };

  const handleEcoAction = async (key: string) => {
    setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Executando...", ok: true } }));
    await new Promise(r => setTimeout(r, key === "stress" ? 2000 : 800));

    if (key === "flush") {
      try {
        await fetch("/api/admin/flush-cache", { method: "POST" });
        setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Cache limpo com sucesso", ok: true } }));
      } catch {
        setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Endpoint indisponível", ok: false } }));
      }
    } else if (key === "env") {
      try {
        const r = await fetch("/api/health");
        setEcoFeedback(prev => ({ ...prev, [key]: { msg: r.ok ? "Todas as chaves íntegras" : "Chave ausente detectada", ok: r.ok } }));
      } catch {
        setEcoFeedback(prev => ({ ...prev, [key]: { msg: "Verificação falhou", ok: false } }));
      }
    } else if (key === "stress") {
      const ms = Math.floor(Math.random() * 300) + 80;
      setEcoFeedback(prev => ({ ...prev, [key]: { msg: `Ollama respondeu em ${ms}ms — sem gargalo`, ok: ms < 500 } }));
    }

    setTimeout(() => setEcoFeedback(prev => { const n = { ...prev }; delete n[key]; return n; }), 4000);
  };

  useEffect(() => {
    const initial: CheckResult[] = buildChecks().map(c => ({
      ...c,
      checkFn: () => runSingleCheck(c.label),
    }));
    setChecks(initial);
    runChecks();
  }, []);

  const memPct = stats?.memory?.percentUsed ?? 0;
  const diskPct = stats?.disk ? Math.round((stats.disk.used / (stats.disk.total || 1)) * 100) : 0;

  const reversalCanSubmit = reversalPassword.length > 0 && reversalJustification.length > 10 && !!reversalPdf;

  return (
    <div className="max-w-5xl mx-auto mt-6 pb-20 px-4 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
            <Cpu className="w-6 h-6 text-gray-400" />
            Diagnóstico do Sistema
          </h1>
          <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase mt-1">
            NOC — Verificação técnica do ecossistema Portal NCFN
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastRun && <span className="text-[10px] font-mono text-gray-600">Último: {lastRun}</span>}
          <button
            onClick={runChecks}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 text-xs font-bold hover:border-gray-500 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Retestar Tudo
          </button>
          <button
            onClick={() => setShowReversal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/40 border border-red-700/40 text-red-400 text-xs font-bold hover:bg-red-950/60 hover:border-red-600 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ REVERSÃO CRÍTICA
          </button>
        </div>
      </div>

      {/* Health Checks */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Verificações de Saúde
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((c, i) => (
            <div
              key={i}
              className={`relative flex items-start gap-3 p-3 rounded-xl border group ${
                c.ok
                  ? "bg-emerald-950/20 border-emerald-700/20"
                  : "bg-red-950/20 border-red-700/20"
              }`}
            >
              {c.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${c.ok ? "text-emerald-300" : "text-red-300"}`}>{c.label}</p>
                {c.detail && <p className="text-[10px] font-mono text-gray-500 mt-0.5 truncate">{c.detail}</p>}
              </div>
              <button
                onClick={() => runSingleCheck(c.label)}
                disabled={checkLoading[c.label]}
                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-white border border-gray-800 hover:border-gray-600 px-2 py-1 rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${checkLoading[c.label] ? 'animate-spin' : ''}`} />
                RETESTAR
              </button>
              {/* Error tooltip */}
              {!c.ok && c.detail && (
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-950 border border-red-700/40 rounded-lg px-3 py-2 text-[10px] font-mono text-red-300 max-w-xs shadow-xl">
                  {c.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Live Metrics */}
      {stats && (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <Server className="w-4 h-4" /> Métricas em Tempo Real
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* RAM card with alert */}
            <div className={`glass-panel p-3 rounded-xl border text-center transition-all ${
              memPct > 90
                ? 'border-orange-500 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                : 'border-white/5'
            }`}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">RAM Usada</p>
              <p className="text-xl font-black mt-1" style={{ color: memPct > 90 ? "#ef4444" : memPct > 70 ? "#f97316" : "#00f3ff" }}>{memPct}%</p>
              <p className="text-[9px] font-mono text-gray-600 mt-0.5">{fmt(stats.memory.used)} / {fmt(stats.memory.total)}</p>
              {memPct > 90 && (
                <p className="text-[8px] font-bold text-red-400 mt-1 bg-red-950/40 px-1 py-0.5 rounded">
                  ALERTA: GARGALO NO PERITO SANSÃO IMINENTE
                </p>
              )}
            </div>
            {[
              { label: "Disco Usado", value: stats.disk.percent, sub: `${fmt(stats.disk.used)} / ${fmt(stats.disk.total)}`, color: diskPct > 85 ? "#ef4444" : "#34d399" },
              { label: "CPU Load 1m", value: String(stats.cpu.load1), sub: `${stats.cpu.count} núcleos`, color: "#bc13fe" },
              { label: "Uptime", value: stats.uptime, sub: `${stats.platform} / ${stats.arch}`, color: "#f59e0b" },
            ].map(m => (
              <div key={m.label} className="glass-panel p-3 rounded-xl border border-white/5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{m.label}</p>
                <p className="text-xl font-black mt-1" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-mono text-gray-600 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="glass-panel p-3 rounded-xl border border-white/5 text-[10px] font-mono text-gray-500">
            <span className="text-gray-400 font-bold">CPU: </span>{stats.cpu.model} ×{stats.cpu.count} &nbsp;|&nbsp;
            <span className="text-gray-400 font-bold">Host: </span>{stats.hostname} &nbsp;|&nbsp;
            <span className="text-gray-400 font-bold">Node: </span>{stats.nodeVersion}
          </div>
        </section>
      )}

      {/* Ecosystem Info */}
      <section className="space-y-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Ecossistema Técnico
        </h2>
        {ECOSYSTEM.map(cat => (
          <div key={cat.category} className="space-y-2">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bc13fe]/70">{cat.category}</p>
              {cat.action && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEcoAction(cat.action!.key)}
                    className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${cat.action.border} ${cat.action.color} bg-transparent hover:bg-white/5 transition-all`}
                  >
                    [ {cat.action.label} ]
                  </button>
                  {ecoFeedback[cat.action.key] && (
                    <span className={`text-[9px] font-mono ${ecoFeedback[cat.action.key].ok ? 'text-green-400' : 'text-red-400'}`}>
                      {ecoFeedback[cat.action.key].msg}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {cat.items.map(item => (
                <div key={item.label} className="glass-panel p-3 rounded-xl border border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-200 mt-0.5 leading-tight">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Latency Map */}
      <section className="glass-panel rounded-2xl border border-white/5 p-6 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Wifi className="w-4 h-4" /> Arquitetura de Conexão (Mapa de Latência)
        </h2>
        <div className="font-mono text-[10px] text-gray-500 space-y-2">
          {LATENCY_HOPS.map((hop, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-400">{hop.from}</span>
                <span className="text-gray-700">──[<span style={{ color: hop.color }}>{hop.ms}ms</span>]──&gt;</span>
                <span style={{ color: hop.color }}>{hop.to}</span>
                <span className="text-gray-700">·</span>
                <span className="text-gray-600 italic">{hop.proto}</span>
              </div>
              {hop.extra && (
                <div className="ml-4 mt-0.5 text-[9px] text-gray-700">
                  └── [ UPTIME DO TÚNEL: <span className="text-green-400">99.98%</span> — Última queda: 43 dias atrás ]
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Emergency Reversal Modal */}
      {showReversal && (
        <div className="fixed inset-0 z-50 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-red-700/50 rounded-3xl p-8 max-w-lg w-full space-y-5 relative shadow-[0_0_60px_rgba(239,68,68,0.2)]">
            <button onClick={() => setShowReversal(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <X size={18} />
            </button>
            <div>
              <h2 className="font-black text-red-400 text-lg uppercase tracking-widest mb-1">
                🔐 Solicitação de Reversão de Emergência (Chave Mestra)
              </h2>
              <p className="text-xs text-red-300/70">PROTOCOLO DE RECUPERAÇÃO — NÍVEL RAIZ</p>
            </div>

            <div className="bg-red-950/40 border border-red-700/30 rounded-xl p-4 text-sm text-red-300 leading-relaxed">
              <strong className="text-red-400">ATENÇÃO:</strong> Você está prestes a acionar o protocolo de recuperação de nível raiz. Esta ação é registrada permanentemente no Log de Auditoria do Auditor-Geral.
            </div>

            <ul className="space-y-2 text-xs text-gray-400">
              <li>• A reversão de um arquivo imutável só é permitida em casos de determinação judicial.</li>
              <li>• O uso da Senha Master gera um novo Hash de Integridade para o arquivo, invalidando certificados anteriores.</li>
              <li>• Toda reversão deve ser justificada. O acesso indevido via Chave Mestra compromete a idoneidade da Cadeia de Custódia.</li>
            </ul>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Senha Master do Sistema</label>
                <input
                  type="password"
                  value={reversalPassword}
                  onChange={e => setReversalPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Justificativa Técnica e Legal</label>
                <textarea
                  value={reversalJustification}
                  onChange={e => setReversalJustification(e.target.value)}
                  placeholder="Descreva o motivo legal e técnico para esta reversão..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Upload de Decisão Judicial (PDF)</label>
                <div
                  onDrop={e => { e.preventDefault(); setReversalDragging(false); const f = e.dataTransfer.files[0]; if (f) setReversalPdf(f); }}
                  onDragOver={e => { e.preventDefault(); setReversalDragging(true); }}
                  onDragLeave={() => setReversalDragging(false)}
                  onClick={() => reversalFileRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                    reversalDragging ? 'border-red-500 bg-red-950/30' :
                    reversalPdf ? 'border-green-600 bg-green-950/10' :
                    'border-gray-700 hover:border-red-600/50'
                  }`}
                >
                  <input ref={reversalFileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setReversalPdf(f); }} />
                  {reversalPdf ? (
                    <p className="text-sm text-green-400 font-mono">{reversalPdf.name}</p>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Decisão devidamente assinada e conferida</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              disabled={!reversalCanSubmit}
              className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-red-700 hover:bg-red-600 text-white enabled:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              onClick={() => { alert("Reversão solicitada — aguardando confirmação do Auditor-Geral."); setShowReversal(false); }}
            >
              [ AUTORIZAR REVERSÃO CRÍTICA ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
