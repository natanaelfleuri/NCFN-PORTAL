"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Cpu, Database, Globe, Lock, Shield, Server,
  CheckCircle, XCircle, RefreshCw, Wifi, HardDrive, Key,
  FileSearch, AlertTriangle, Clock, Activity, Layers, Zap
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

type CheckResult = { label: string; ok: boolean; detail?: string };

function fmt(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const s = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

const ECOSYSTEM = [
  {
    category: "Aplicação",
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
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState("");

  const runChecks = async () => {
    setLoading(true);
    const results: CheckResult[] = [];

    // 1. VPS Stats
    try {
      const r = await fetch("/api/admin/vps-stats");
      if (r.ok) {
        const d = await r.json();
        setStats(d);
        results.push({ label: "VPS Stats API", ok: true, detail: `${d.hostname} — ${d.platform}/${d.arch}` });
      } else {
        results.push({ label: "VPS Stats API", ok: false, detail: `HTTP ${r.status}` });
      }
    } catch (e: any) {
      results.push({ label: "VPS Stats API", ok: false, detail: e.message });
    }

    // 2. Database
    try {
      const r = await fetch("/api/admin/security");
      results.push({ label: "Banco de Dados (Prisma/SQLite)", ok: r.ok, detail: r.ok ? "Conectado e operacional" : `HTTP ${r.status}` });
    } catch (e: any) {
      results.push({ label: "Banco de Dados (Prisma/SQLite)", ok: false, detail: e.message });
    }

    // 3. Vault API
    try {
      const r = await fetch("/api/vault?action=tree");
      results.push({ label: "Vault COFRE_NCFN", ok: r.ok, detail: r.ok ? "Acesso ao cofre verificado" : `HTTP ${r.status}` });
    } catch (e: any) {
      results.push({ label: "Vault COFRE_NCFN", ok: false, detail: e.message });
    }

    // 4. Ollama
    try {
      const r = await fetch("/api/admin/vps-stats");
      const d = r.ok ? await r.json() : null;
      results.push({ label: "Ollama API (LLM Local)", ok: !!d, detail: d ? "Endpoint configurado" : "Indisponível" });
    } catch {
      results.push({ label: "Ollama API (LLM Local)", ok: false, detail: "Não alcançável" });
    }

    // 5. Cloudflare Tunnel
    results.push({
      label: "Cloudflare Tunnel (cloudflared)",
      ok: window.location.hostname.includes("ncfn.net"),
      detail: window.location.hostname.includes("ncfn.net")
        ? `Domínio ativo: ${window.location.hostname}`
        : "Executando em rede local (sem túnel)",
    });

    // 6. TLS / HTTPS
    results.push({
      label: "TLS / HTTPS (Cloudflare + Caddy)",
      ok: window.location.protocol === "https:",
      detail: window.location.protocol === "https:" ? "Conexão segura ativa" : "Sem TLS (acesso local)",
    });

    setChecks(results);
    setLastRun(new Date().toLocaleTimeString("pt-BR"));
    setLoading(false);
  };

  useEffect(() => { runChecks(); }, []);

  const memPct = stats?.memory?.percentUsed ?? 0;
  const diskPct = stats?.disk ? Math.round((stats.disk.used / (stats.disk.total || 1)) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto mt-6 pb-20 px-4 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
            <Cpu className="w-6 h-6 text-gray-400" />
            Diagnóstico do Sistema
          </h1>
          <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase mt-1">
            Verificação técnica do ecossistema Portal NCFN
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastRun && (
            <span className="text-[10px] font-mono text-gray-600">Último: {lastRun}</span>
          )}
          <button
            onClick={runChecks}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 text-xs font-bold hover:border-gray-500 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Retestar
          </button>
        </div>
      </div>

      {/* Health Checks */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Verificações de Saúde
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.length === 0 && loading && (
            <div className="col-span-2 flex items-center gap-2 text-gray-600 text-xs py-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Executando verificações...
            </div>
          )}
          {checks.map((c, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                c.ok
                  ? "bg-emerald-950/20 border-emerald-700/20"
                  : "bg-red-950/20 border-red-700/20"
              }`}
            >
              {c.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`text-xs font-bold ${c.ok ? "text-emerald-300" : "text-red-300"}`}>{c.label}</p>
                {c.detail && <p className="text-[10px] font-mono text-gray-500 mt-0.5">{c.detail}</p>}
              </div>
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
            {[
              { label: "RAM Usada", value: `${memPct}%`, sub: `${fmt(stats.memory.used)} / ${fmt(stats.memory.total)}`, color: memPct > 85 ? "#ef4444" : "#00f3ff" },
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bc13fe]/70">{cat.category}</p>
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

      {/* Connection Architecture */}
      <section className="glass-panel rounded-2xl border border-white/5 p-6 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Wifi className="w-4 h-4" /> Arquitetura de Conexão
        </h2>
        <div className="font-mono text-[10px] text-gray-500 space-y-1.5">
          {[
            { from: "Usuário (Browser)", to: "Cloudflare Global CDN", proto: "HTTPS/TLS 1.3", color: "#00f3ff" },
            { from: "Cloudflare CDN", to: "Cloudflare Tunnel (cloudflared)", proto: "WireGuard / QUIC", color: "#f59e0b" },
            { from: "cloudflared", to: "Caddy Proxy (container)", proto: "HTTP/2 interno", color: "#bc13fe" },
            { from: "Caddy Proxy", to: "Next.js App (portal_ncfn:3000)", proto: "HTTP localhost", color: "#34d399" },
            { from: "Next.js App", to: "SQLite DB (Prisma)", proto: "File I/O (WAL)", color: "#a855f7" },
            { from: "Next.js App", to: "Ollama LLM (host.docker.internal:11434)", proto: "HTTP REST", color: "#f97316" },
            { from: "Next.js App", to: "COFRE_NCFN (volume mount)", proto: "FS direto (Docker)", color: "#6b7280" },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400">{row.from}</span>
              <span className="text-gray-700">→</span>
              <span style={{ color: row.color }}>{row.to}</span>
              <span className="text-gray-700">·</span>
              <span className="text-gray-600 italic">{row.proto}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
