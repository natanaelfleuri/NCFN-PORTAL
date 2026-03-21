"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Server, X, RefreshCw, Cpu, HardDrive, MemoryStick,
  Clock, Network, ChevronUp, Activity, GitBranch
} from "lucide-react";

const SUPERADMIN = "fleuriengenharia@gmail.com";

function fmt(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

export default function VpsMonitor() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [minimized, setMinimized] = useState(false);

  const email = (session?.user as any)?.email;
  const isSuperAdmin = email === SUPERADMIN;

  const fetchStats = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vps-stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
      }
    } catch {}
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (open && isSuperAdmin) {
      fetchStats();
      const id = setInterval(fetchStats, 15000);
      return () => clearInterval(id);
    }
  }, [open, isSuperAdmin, fetchStats]);

  const pathname = usePathname();
  const isAdminHub = pathname === "/admin";
  const [graphOpen, setGraphOpen] = useState(false);

  useEffect(() => {
    const onClosed = () => setGraphOpen(false);
    window.addEventListener("ncfn:graph-closed", onClosed);
    return () => window.removeEventListener("ncfn:graph-closed", onClosed);
  }, []);

  const toggleGraph = () => {
    const next = !graphOpen;
    setGraphOpen(next);
    window.dispatchEvent(new CustomEvent("ncfn:toggle-graph", { detail: { open: next } }));
  };

  if (!isSuperAdmin) return null;

  const memPct = data?.memory?.percentUsed ?? 0;
  const diskPct = data?.disk
    ? Math.round((data.disk.used / (data.disk.total || 1)) * 100)
    : 0;

  const memColor = memPct > 85 ? "#ef4444" : memPct > 65 ? "#f59e0b" : "#00f3ff";
  const diskColor = diskPct > 85 ? "#ef4444" : diskPct > 65 ? "#f59e0b" : "#34d399";

  return (
    <>
      {/* Floating buttons row */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-2">
          {/* Ver Grafo — só em /admin */}
          {isAdminHub && (
            <button
              onClick={toggleGraph}
              title="Grafo de Custódia Digital"
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold
                backdrop-blur-xl transition-all
                ${graphOpen
                  ? "bg-[#00f3ff]/10 border border-[#00f3ff]/50 text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.25)]"
                  : "bg-black/90 border border-[#00f3ff]/20 text-[#00f3ff]/70 shadow-[0_0_12px_rgba(0,243,255,0.08)] hover:border-[#00f3ff]/50 hover:text-[#00f3ff]"
                }`}
            >
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Grafo</span>
            </button>
          )}

          {/* VPS Monitor */}
          <button
            onClick={() => setOpen(true)}
            title="Monitor VPS"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl
              bg-black/90 border border-[#00f3ff]/30 text-[#00f3ff] text-xs font-bold
              shadow-[0_0_20px_rgba(0,243,255,0.15)] hover:shadow-[0_0_30px_rgba(0,243,255,0.3)]
              hover:border-[#00f3ff]/60 transition-all backdrop-blur-xl"
          >
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">VPS</span>
            <Activity className="w-3 h-3 opacity-60 animate-pulse" />
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[300] w-[340px] bg-black/95 backdrop-blur-xl
            border border-[#00f3ff]/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(0,243,255,0.08)]
            overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#00f3ff]/5">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#00f3ff]" />
              <span className="text-xs font-black uppercase tracking-widest text-white">Monitor VPS</span>
              {data?.hostname && (
                <span className="text-[10px] text-[#00f3ff]/50 font-mono">{data.hostname}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-1.5 rounded-lg text-gray-500 hover:text-[#00f3ff] hover:bg-white/5 transition"
                title="Atualizar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setMinimized(!minimized)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition"
                title={minimized ? "Expandir" : "Minimizar"}
              >
                <ChevronUp className={`w-3.5 h-3.5 transition-transform ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <div className="p-4 space-y-4">
              {/* Loading state */}
              {!data && loading && (
                <div className="text-center py-6">
                  <RefreshCw className="w-6 h-6 text-[#00f3ff]/40 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Carregando métricas...</p>
                </div>
              )}

              {data && (
                <>
                  {/* System info row */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 flex-wrap">
                    <span className="text-[#00f3ff]/60">{data.platform}/{data.arch}</span>
                    <span className="opacity-30">|</span>
                    <Clock className="w-3 h-3" />
                    <span>{data.uptime}</span>
                  </div>

                  {/* Memory */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                        <MemoryStick className="w-3.5 h-3.5" style={{ color: memColor }} />
                        RAM
                      </div>
                      <span className="text-xs font-mono" style={{ color: memColor }}>{memPct}%</span>
                    </div>
                    <Bar value={memPct} color={memColor} />
                    <div className="flex justify-between text-[10px] font-mono text-gray-600">
                      <span>Usado: {fmt(data.memory.used)}</span>
                      <span>Total: {fmt(data.memory.total)}</span>
                    </div>
                  </div>

                  {/* Disk */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                        <HardDrive className="w-3.5 h-3.5" style={{ color: diskColor }} />
                        Disco (/)
                      </div>
                      <span className="text-xs font-mono" style={{ color: diskColor }}>{data.disk.percent}</span>
                    </div>
                    <Bar value={diskPct} color={diskColor} />
                    <div className="flex justify-between text-[10px] font-mono text-gray-600">
                      <span>Usado: {fmt(data.disk.used)}</span>
                      <span>Total: {fmt(data.disk.total)}</span>
                    </div>
                  </div>

                  {/* CPU */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-[#bc13fe]" />
                      CPU
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 truncate">{data.cpu.model} × {data.cpu.count}</p>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { label: "1m", val: data.cpu.load1 },
                        { label: "5m", val: data.cpu.load5 },
                        { label: "15m", val: data.cpu.load15 },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-white/5 rounded-lg px-2 py-1.5 text-center border border-white/5">
                          <div className="text-[9px] text-gray-600 uppercase">{label}</div>
                          <div className="text-sm font-black text-[#bc13fe] font-mono">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Network */}
                  {data.network?.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                        <Network className="w-3.5 h-3.5 text-[#34d399]" />
                        Rede
                      </div>
                      {data.network.map((n: any) => (
                        <div key={n.name} className="flex justify-between text-[10px] font-mono">
                          <span className="text-gray-600">{n.name}</span>
                          <span className="text-[#34d399]/80">{n.address}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Server Location */}
                  <div className="pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#00f3ff]/50 uppercase tracking-widest">
                      <span>🌎</span>
                      <span>SERVIDORES FÍSICOS DEDICADOS — EUA &amp; BRASIL</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-1 border-t border-white/5 text-[9px] text-gray-700 font-mono flex justify-between">
                    <span>Atualiza a cada 15s</span>
                    {lastUpdate && <span>Último: {lastUpdate}</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
