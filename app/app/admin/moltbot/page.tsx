"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bot, Shield, Play, Loader2, ArrowLeft, Activity, 
  Database, Image as ImageIcon, Hash, CreditCard, 
  AlertCircle, CheckCircle2, History, Zap, Settings
} from "lucide-react";
import Link from "next/link";

const IS_ADMIN_ROLE = "admin";

type MoltbotLog = {
  id: string;
  taskName: string;
  status: string;
  logText: string;
  screenshotPath: string | null;
  sha256Hash: string;
  costBRL: number;
  createdAt: string;
};

type MoltbotConfig = {
  dailyQuotaBRL: number;
  currentUsageBRL: number;
  activeMode: string;
  lastScanAt: string | null;
};

export default function MoltbotAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<MoltbotConfig | null>(null);
  const [logs, setLogs] = useState<MoltbotLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerUrl, setTriggerUrl] = useState("https://google.com");
  const [triggerTask, setTriggerTask] = useState("Investigação Forense de Rotina");
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== IS_ADMIN_ROLE) {
      router.replace("/admin");
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/moltbot");
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await fetch("/api/admin/moltbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "triggerScan", 
          url: triggerUrl, 
          task: triggerTask 
        }),
      });
      alert("Moltbot acionado com sucesso!");
    } finally {
      setTriggering(false);
      fetchData();
    }
  };

  const updateConfig = async (quota: number, mode: string) => {
    await fetch("/api/admin/moltbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateConfig", quota, mode }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#bc13fe] animate-spin" />
      </div>
    );
  }

  const usagePercent = config ? (config.currentUsageBRL / config.dailyQuotaBRL) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto mt-8 pb-20 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-[#bc13fe] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-xl shadow-[0_0_15px_rgba(188,19,254,0.2)]">
            <Bot className="w-6 h-6 text-[#bc13fe]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Moltbot Forensic Agent</h1>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Agente Autônomo com Hashing Forense</p>
          </div>
        </div>
      </div>

      {/* Quota & Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#bc13fe]" />
              <span className="font-bold text-sm text-white">Consumo Diário</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">BRL</span>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-black text-white">R$ {config?.currentUsageBRL.toFixed(2)}</span>
            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 ${usagePercent > 80 ? 'bg-red-500' : 'bg-[#bc13fe]'}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500">Limite configurado: R$ {config?.dailyQuotaBRL.toFixed(2)}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-sm text-white">Modo de Roteamento</span>
          </div>
          <div className="flex gap-2">
            {['HYBRID', 'GEMINI_ONLY', 'OLLAMA_ONLY'].map(m => (
              <button
                key={m}
                onClick={() => updateConfig(config?.dailyQuotaBRL || 10, m)}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition ${
                  config?.activeMode === m 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                    : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500">
            {config?.activeMode === 'HYBRID' ? 'Gemini para visão, Ollama para lógica.' : 
             config?.activeMode === 'GEMINI_ONLY' ? 'Sempre utiliza Gemini Flash.' : 'Processamento 100% local.'}
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-sm text-white">Última Atividade</span>
          </div>
          <span className="text-xl font-black text-gray-300">
            {config?.lastScanAt ? new Date(config.lastScanAt).toLocaleTimeString() : 'Inativo'}
          </span>
          <span className="text-[10px] text-gray-500">NCFN Node: moltbot_ncfn</span>
        </div>
      </div>

      {/* Manual Trigger */}
      <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#bc13fe] flex items-center gap-2">
          <Shield className="w-4 h-4" /> Intel Deep Investigation (Manual)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Alvo da Investigação (URL)</label>
            <input 
              value={triggerUrl}
              onChange={e => setTriggerUrl(e.target.value)}
              className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#bc13fe]/50"
              placeholder="https://ncfn.org.br"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Contexto da Materialidade</label>
            <input 
              value={triggerTask}
              onChange={e => setTriggerTask(e.target.value)}
              className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#bc13fe]/50"
              placeholder="Ex: Varredura de integridade e inteligência..."
            />
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleTrigger}
            disabled={triggering}
            className="flex-1 py-4 bg-[#bc13fe] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#a011d1] transition shadow-[0_4px_20px_rgba(188,19,254,0.3)] flex items-center justify-center gap-3"
          >
            {triggering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Iniciar Varredura Imediata
          </button>
        </div>
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
          <p className="text-[11px] text-blue-300/80 leading-relaxed">
            <strong>Intel Mode Ativo:</strong> Varreduras profundas agendadas para todos os Sábados às 02:00 BRT.
            Relatórios de Materialidade (SHA-256) serão gerados automaticamente.
          </p>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Forensic Log Feed
        </h2>
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="glass-panel p-5 rounded-xl border border-white/5 hover:border-white/10 transition group">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className={`p-2 rounded-lg ${log.status === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {log.status === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-white truncate">{log.taskName}</span>
                    <span className="text-[9px] font-mono text-gray-600 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{log.createdAt}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2 italic">"{log.logText}"</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                      <Hash className="w-3 h-3" />
                      {log.sha256Hash.slice(0, 12)}...
                    </div>
                    <div className="text-[9px] text-[#bc13fe] font-bold">COST: R$ {log.costBRL.toFixed(4)}</div>
                  </div>
                  {log.screenshotPath && (
                    <button className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition">
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
              <Database className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Nenhum log forense encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
