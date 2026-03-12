"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Monitor, RefreshCw, ArrowLeft, Wifi, WifiOff,
  AlertTriangle, Terminal, Maximize2, ExternalLink,
  Shield, Power, PowerOff,
} from "lucide-react";

interface OsintState {
  configured: boolean;
  online: boolean;
  containerStatus: 'running' | 'stopped' | 'missing';
  desktopUrl?: string;
  message?: string;
}

export default function InvestigarPage() {
  const [state, setState] = useState<OsintState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/kasm");
      const data = await res.json();
      setState(data);
      return data as OsintState;
    } catch {
      setState({ configured: false, online: false, containerStatus: 'missing' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Polling after start: wait up to 60s for container to come online
  const startPolling = useCallback(() => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const data = await fetchStatus();
      if (data?.online || attempts >= 20) {
        clearInterval(pollRef.current!);
        setActionLoading(null);
      }
    }, 3000);
  }, [fetchStatus]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleStart = async () => {
    setActionLoading('start');
    setError(null);
    try {
      const res = await fetch("/api/admin/kasm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setActionLoading(null);
        return;
      }
      // Start polling until container is online
      startPolling();
    } catch (e: any) {
      setError(e.message);
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    setError(null);
    try {
      await fetch("/api/admin/kasm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      await fetchStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      iframeRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // ─── Container missing (não configurado) ─────────────────────────────────
  if (!state?.configured || state?.containerStatus === 'missing') {
    return (
      <div className="min-h-screen bg-[#06070a] text-gray-300 p-6">
        <div className="max-w-2xl mx-auto mt-12">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-400 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Admin
          </Link>
          <div className="bg-black/40 border border-yellow-700/40 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-950/50 border border-yellow-600/40 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Estação OSINT não provisionada</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Execute o comando abaixo <strong>uma vez</strong> no terminal do servidor para provisionar o container.
              A partir daí, o ciclo liga/desliga é controlado inteiramente pelo portal.
            </p>

            <div className="text-left bg-black/50 border border-gray-800 rounded-lg p-4 font-mono text-xs space-y-2 mb-6">
              <p className="text-gray-600"># 1. Provisionar o container OSINT (execução única)</p>
              <p className="text-cyan-400">docker compose --profile osint up -d</p>
              <p className="text-gray-600 mt-2"># 2. Declarar endpoint no .env e reiniciar o portal</p>
              <p><span className="text-cyan-500">OSINT_DESKTOP_URL</span>=<span className="text-gray-400">http://localhost:3003</span></p>
            </div>

            <div className="bg-black/40 border border-gray-800 rounded-lg p-4 text-left space-y-2 text-sm">
              <p className="font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" /> Desktop OSINT gerenciado pelo portal · Zero terminal
              </p>
              <div className="text-xs font-mono text-gray-500 space-y-1 mt-2">
                <p>• Desktop Ubuntu/XFCE via noVNC integrado no browser</p>
                <p>• Stack OSINT nativa: Sherlock · theHarvester · Nmap · Recon-ng</p>
                <p>• Controle total pelo portal — nenhum acesso direto ao servidor</p>
                <p>• Footprint reduzido: ~2-4 GB RAM (vs. 16 GB de alternativas)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Container exists but stopped ────────────────────────────────────────
  if (!state?.online) {
    const isStarting = actionLoading === 'start';
    return (
      <div className="min-h-screen bg-[#06070a] text-gray-300 p-6">
        <div className="max-w-2xl mx-auto mt-12">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-400 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Admin
          </Link>
          <div className="bg-black/40 border border-gray-800 rounded-xl p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 transition-all ${
              isStarting
                ? "bg-yellow-950/50 border border-yellow-600/40 animate-pulse"
                : "bg-gray-900/50 border border-gray-700/40"
            }`}>
              {isStarting
                ? <RefreshCw className="w-10 h-10 text-yellow-400 animate-spin" />
                : <WifiOff className="w-10 h-10 text-gray-600" />
              }
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {isStarting ? "Provisionando estação OSINT..." : "Estação OSINT inativa"}
            </h2>

            {isStarting ? (
              <p className="text-sm text-yellow-400/70 mb-6">
                Inicializando ambiente seguro · Desktop Ubuntu/XFCE (~20-30 segundos)...
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-2 font-mono">{state.desktopUrl}</p>
            )}

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-950/30 border border-red-700/40 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {!isStarting && (
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-3 px-8 py-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-400 font-bold text-sm hover:bg-emerald-900/30 transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                <Power className="w-4 h-4" /> Ativar Estação OSINT
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Online — show desktop ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#06070a] text-gray-300 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-sm">Estação OSINT · NCFN</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Wifi className="w-3 h-3" /> Operacional
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-700">
            <Shield className="w-3 h-3" /> Sherlock · theHarvester · Nmap · Recon-ng
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={state.desktopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors px-3 py-1.5 border border-gray-800 rounded"
          >
            <ExternalLink className="w-3 h-3" /> Nova aba
          </a>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-400 transition-colors px-3 py-1.5 border border-gray-800 rounded"
          >
            <Maximize2 className="w-3 h-3" /> Tela Cheia
          </button>
          <button
            onClick={handleStop}
            disabled={actionLoading === 'stop'}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 border border-red-900/50 rounded disabled:opacity-50"
          >
            {actionLoading === 'stop'
              ? <><RefreshCw className="w-3 h-3 animate-spin" /> Desligando...</>
              : <><PowerOff className="w-3 h-3" /> Desligar</>
            }
          </button>
        </div>
      </div>

      {/* Desktop viewer */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={state.desktopUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="clipboard-read; clipboard-write; fullscreen; pointer-lock"
          title="Ambiente OSINT"
        />
      </div>
    </div>
  );
}
