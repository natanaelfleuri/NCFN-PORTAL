"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, RefreshCw, Terminal, Shield,
  Copy, Check, Clock, Hash, ChevronDown, ChevronUp,
  Power, PowerOff, Loader2,
} from "lucide-react";

const TOOLS = [
  { value: "sherlock", label: "Sherlock — presença em redes sociais" },
  { value: "theharvester", label: "theHarvester — e-mails, IPs, subdomínios" },
  { value: "nmap", label: "Nmap — varredura de portas e serviços" },
];

interface Investigation {
  id: string;
  target: string;
  tool: string;
  sha256Hash: string;
  operatorEmail: string;
  createdAt: string;
}

interface Result {
  id: string;
  target: string;
  tool: string;
  rawOutput: string;
  aiReport: string;
  sha256Hash: string;
  timestamp: string;
  durationSecs: string;
}

export default function InvestigarPage() {
  const [target, setTarget] = useState("");
  const [tool, setTool] = useState("sherlock");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Investigation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Tool status
  const [toolReady, setToolReady] = useState<boolean | null>(null);
  const [toolBuilding, setToolBuilding] = useState(false);
  const [toolMsg, setToolMsg] = useState("");

  const checkToolStatus = async () => {
    try {
      const res = await fetch("/api/admin/investigar/status");
      const data = await res.json();
      setToolReady(data.ready);
    } catch {
      setToolReady(false);
    }
  };

  const toggleTool = async () => {
    if (toolReady) {
      // Desligar — remove imagem
      setToolBuilding(true);
      setToolMsg("Removendo imagem...");
      try {
        await fetch("/api/admin/investigar/status", { method: "DELETE" });
        setToolReady(false);
        setToolMsg("Ferramenta desligada.");
      } catch {
        setToolMsg("Erro ao desligar.");
      } finally {
        setToolBuilding(false);
        setTimeout(() => setToolMsg(""), 3000);
      }
    } else {
      // Ligar — build imagem
      setToolBuilding(true);
      setToolMsg("Build iniciado (~2 min). Aguarde...");
      try {
        await fetch("/api/admin/investigar/status", { method: "POST" });
        // Poll até ficar pronto
        const poll = setInterval(async () => {
          const res = await fetch("/api/admin/investigar/status");
          const data = await res.json();
          if (data.ready) {
            setToolReady(true);
            setToolBuilding(false);
            setToolMsg("Ferramentas prontas!");
            clearInterval(poll);
            setTimeout(() => setToolMsg(""), 3000);
          }
        }, 10000);
        // Timeout após 5 min
        setTimeout(() => {
          clearInterval(poll);
          setToolBuilding(false);
          setToolMsg("Build demorou demais. Verifique a VPS.");
        }, 300000);
      } catch {
        setToolBuilding(false);
        setToolMsg("Erro ao iniciar build.");
      }
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/admin/investigar");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.investigations || []);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    checkToolStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowRaw(false);

    try {
      const res = await fetch("/api/admin/investigar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), tool }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro desconhecido.");
      } else {
        setResult(data);
        loadHistory();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-gray-300 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-600 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Shield className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-bold text-white">Investigação OSINT</h1>
          <span className="text-xs text-gray-600 font-mono ml-2">Sherlock · theHarvester · Nmap</span>

          {/* LIGAR/DESLIGAR FERRAMENTA */}
          <div className="ml-auto flex items-center gap-2">
            {toolMsg && (
              <span className="text-xs font-mono text-yellow-400">{toolMsg}</span>
            )}
            <button
              onClick={toggleTool}
              disabled={toolBuilding || toolReady === null}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-50 ${
                toolReady
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-red-950/40 hover:border-red-500/40 hover:text-red-400"
                  : "bg-red-950/40 border-red-500/40 text-red-400 hover:bg-emerald-950/40 hover:border-emerald-500/40 hover:text-emerald-400"
              }`}
            >
              {toolBuilding
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguarde...</>
                : toolReady
                  ? <><Power className="w-3.5 h-3.5" /> FERRAMENTA ATIVA</>
                  : <><PowerOff className="w-3.5 h-3.5" /> LIGAR FERRAMENTA</>
              }
            </button>
            <button onClick={checkToolStatus} className="text-gray-600 hover:text-cyan-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Aviso se não pronto */}
        {toolReady === false && !toolBuilding && (
          <div className="mb-4 px-4 py-3 bg-yellow-950/30 border border-yellow-700/40 rounded-lg text-yellow-400 text-sm">
            ⚠️ Imagem <code className="font-mono">ncfn-osint-cli</code> não encontrada. Clique em <strong>LIGAR FERRAMENTA</strong> para construir (~2 min).
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-black/40 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Alvo: username, domínio, IP ou e-mail..."
              className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              disabled={loading}
            />
            <select
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              className="bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              disabled={loading}
            >
              {TOOLS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading || !target.trim() || !toolReady}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-950/50 border border-cyan-500/40 rounded-lg text-cyan-400 font-bold text-sm hover:bg-cyan-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Executando...</>
                : <><Search className="w-4 h-4" /> Investigar</>
              }
            </button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-xs text-yellow-400/70">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Executando {tool} contra &quot;{target}&quot; — aguarde até 2 minutos...
            </div>
          )}
        </form>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-950/30 border border-red-700/40 rounded-lg text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4 mb-8">
            <div className="bg-black/40 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4 text-xs font-mono">
              <span className="text-gray-500">Alvo: <span className="text-cyan-300">{result.target}</span></span>
              <span className="text-gray-500">Ferramenta: <span className="text-purple-300">{result.tool}</span></span>
              <span className="text-gray-500">Duração: <span className="text-white">{result.durationSecs}s</span></span>
              <span className="text-gray-500">
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(result.timestamp).toLocaleString("pt-BR")}
              </span>
              <button
                onClick={() => copyHash(result.sha256Hash)}
                className="flex items-center gap-1.5 text-gray-600 hover:text-cyan-400 transition-colors"
              >
                <Hash className="w-3 h-3" />
                {result.sha256Hash.slice(0, 16)}...
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="bg-black/40 border border-purple-900/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-purple-300">Relatório de Materialidade (IA)</span>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                {result.aiReport}
              </div>
            </div>

            <div className="bg-black/40 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" /> Output bruto
                </span>
                {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showRaw && (
                <pre className="px-5 pb-5 text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {result.rawOutput || "(sem output)"}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-black/40 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
            <span className="text-sm font-bold text-white">Histórico de Investigações</span>
            <button onClick={loadHistory} className="text-gray-600 hover:text-cyan-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {historyLoading ? (
            <div className="p-6 flex justify-center">
              <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-600">Nenhuma investigação registrada.</div>
          ) : (
            <div className="divide-y divide-gray-900">
              {history.map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono hover:bg-white/[0.02] transition-colors">
                  <span className="text-cyan-300">{inv.target}</span>
                  <span className="text-purple-400">{inv.tool}</span>
                  <span className="text-gray-600">{new Date(inv.createdAt).toLocaleString("pt-BR")}</span>
                  <span className="text-gray-700">{inv.sha256Hash.slice(0, 12)}…</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
