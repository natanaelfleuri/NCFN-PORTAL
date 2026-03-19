"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Radar, Play, Clock, CheckCircle, XCircle, AlertTriangle,
  Zap, RefreshCw, Loader2, Hash, ArrowLeft, Calendar, Tag, HelpCircle, X
} from "lucide-react";
import Link from "next/link";

type ScanItem = {
  id: string; keywordId: string; target: string; tool: string;
  status: string; durationSecs?: number; triggeredBy: string;
  createdAt: string; keyword: { keyword: string; category: string; legalRef?: string };
};

type ConfigData = {
  ollamaOnline: boolean; activeModel: string; keywords: any[];
  recentScans: ScanItem[];
};

const CRON_DAYS = ["Terça", "Sexta", "Domingo"];
const NEXT_RUNS = ["Próxima Terça 03:00", "Próxima Sexta 03:00", "Próximo Domingo 03:00"];

function getNextCronDate(): string {
  const now = new Date();
  const targetDays = [2, 5, 0]; // Tue, Fri, Sun
  let closest: Date | null = null;

  for (const day of targetDays) {
    const d = new Date(now);
    let diff = day - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(3, 0, 0, 0);
    if (!closest || d < closest) closest = d;
  }

  return closest?.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) || "—";
}

export default function VarredurasPage() {
  const { data: session, status } = useSession();
  const router = useRouter(); 
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningManual, setRunningManual] = useState(false);
  const [manualResult, setManualResult] = useState<any>(null);
  const [selected, setSelected] = useState<ScanItem | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const IS_ADMIN_ROLE = "admin";

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== IS_ADMIN_ROLE) {
      router.replace("/admin");
    }
  }, [session, status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, cfgRes] = await Promise.all([
        fetch("/api/admin/custodian?type=auto&limit=50"),
        fetch("/api/admin/ia-config"),
      ]);
      if (custRes.ok) {
        setScans(await custRes.json());
      }
      if (cfgRes.ok) {
        setConfig(await cfgRes.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 text-[#bc13fe] animate-spin" />
      </div>
    );
  }

  if (!session?.user || (session.user as any)?.role !== IS_ADMIN_ROLE) {
    return null;
  }

  const handleManualRun = async () => {
    if (!confirm("Disparar varredura manualmente agora?")) return;
    setRunningManual(true);
    setManualResult(null);
    try {
      const cronSecret = prompt("Insira o CRON_SECRET para autorizar:");
      if (!cronSecret) { setRunningManual(false); return; }
      const res = await fetch(`/api/cron/osint-scan?trigger=manual&secret=${encodeURIComponent(cronSecret)}`);
      const data = await res.json();
      setManualResult(data);
      fetchData();
    } finally {
      setRunningManual(false);
    }
  };

  const successCount = scans.filter(s => (s as any).status === "success").length;
  const errorCount = scans.filter(s => (s as any).status !== "success").length;

  const categoryColors: Record<string, string> = {
    "Tráfico": "text-red-400 bg-red-500/10 border-red-500/30",
    "ECA": "text-pink-400 bg-pink-500/10 border-pink-500/30",
    "Crimes Digitais": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    "Crimes Financeiros": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    "Corrupção": "text-orange-400 bg-orange-500/10 border-orange-500/30",
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 pb-20 px-4 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-[#bc13fe] transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-xl shadow-[0_0_15px_rgba(188,19,254,0.2)]">
              <Radar className="w-6 h-6 text-[#bc13fe] animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Central de Varreduras OSINT</h1>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Automação Agendada — Kali Linux Docker</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
            <HelpCircle size={14} /> Como funciona
          </button>
          <button onClick={fetchData} className="p-2 text-gray-500 hover:text-[#bc13fe] transition border border-gray-800 rounded-lg hover:border-[#bc13fe]/30">
            <RefreshCw className="w-4 h-4" />
          </button>
          {(session?.user as any)?.role === IS_ADMIN_ROLE && (
            <button
              onClick={handleManualRun}
              disabled={runningManual}
              className="px-4 py-2 bg-[#bc13fe]/10 border border-[#bc13fe]/40 text-[#bc13fe] rounded-lg text-sm font-bold hover:bg-[#bc13fe]/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {runningManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Executar Agora
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-[#bc13fe]/30 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Scans</span>
          <span className="text-3xl font-black text-white">{scans.length}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-green-500/30 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sucesso</span>
          <span className="text-3xl font-black text-green-400">{successCount}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-red-500/30 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Erros</span>
          <span className="text-3xl font-black text-red-400">{errorCount}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Keywords Ativas</span>
          <span className="text-3xl font-black text-cyan-400">{config?.keywords?.filter((k: any) => k.active).length ?? "—"}</span>
        </div>
      </div>

      {/* Schedule */}
      <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/20 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#bc13fe] flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Agenda de Varreduras
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {CRON_DAYS.map((day, i) => (
            <div key={day} className="text-center p-4 rounded-xl border border-[#bc13fe]/10 bg-[#bc13fe]/5">
              <div className="text-lg font-black text-white">{day}</div>
              <div className="text-xs text-gray-500 mt-1">03:00 AM</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span>Próxima execução: <span className="text-cyan-400 font-mono">{getNextCronDate()}</span></span>
        </div>
        <div className="bg-black/50 border border-gray-800 rounded-lg p-3">
          <p className="text-[10px] font-mono text-gray-500 mb-1"># Adicionar no crontab da VPS:</p>
          <code className="text-[11px] font-mono text-green-400">
            {`0 3 * * 2,5,0 curl -s -H "Authorization: Bearer $CRON_SECRET" https://ncfn.net/api/cron/osint-scan`}
          </code>
        </div>
      </div>

      {/* Manual result */}
      {manualResult && (
        <div className={`glass-panel p-5 rounded-2xl border space-y-2 ${manualResult.ok ? "border-green-500/30" : "border-red-500/30"}`}>
          <div className="flex items-center gap-2">
            {manualResult.ok ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            <span className="text-sm font-bold text-white">
              {manualResult.ok ? `Varredura concluída: ${manualResult.scanned} keywords` : "Erro na varredura"}
            </span>
          </div>
          {manualResult.results && (
            <div className="text-xs font-mono text-gray-500 space-y-1">
              {manualResult.results.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className={r.status === "success" ? "text-green-400" : "text-red-400"}>●</span>
                  <span className="text-gray-400">{r.keyword}</span>
                  <span className="text-gray-600">{r.tool}</span>
                  <span className="text-gray-700">{r.durationSecs?.toFixed(0)}s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan history */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Histórico de Varreduras</h2>
        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-6 h-6 text-[#bc13fe] animate-spin mx-auto" /></div>
        ) : scans.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">
            Nenhuma varredura automática ainda. Configure o cron na VPS ou use "Executar Agora".
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => {
              const s = scan as any;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  className={`glass-panel px-4 py-3.5 rounded-xl border cursor-pointer transition-all hover:border-[#bc13fe]/30 ${selected?.id === s.id ? "border-[#bc13fe]/40 bg-[#bc13fe]/5" : "border-gray-800"}`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {s.highGravity && (
                      <div className="flex items-center gap-1.2 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-500 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">ALTO RISCO</span>
                      </div>
                    )}

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${categoryColors[s.category] || "text-gray-400 bg-gray-500/10 border-gray-500/30"}`}>
                      {s.category}
                    </span>
                    <span className="text-sm font-mono text-white flex-1">{s.target}</span>
                    <span className="text-[10px] font-mono text-gray-600 hidden md:block">{s.tool}</span>
                    <span className="text-[10px] text-gray-700">{s.durationSecs?.toFixed(0)}s</span>
                    <span className="text-[10px] text-gray-600">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</span>
                    {s.triggeredBy === "manual" && (
                      <span className="text-[10px] bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/20 px-1.5 py-0.5 rounded">manual</span>
                    )}
                  </div>

                  {/* Expandido */}
                  {selected?.id === s.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Hash className="w-3.5 h-3.5 text-[#bc13fe]" />
                        <span className="text-gray-500">SHA-256:</span>
                        <span className="text-[#bc13fe] break-all">{s.sha256Hash}</span>
                      </div>
                      {s.legalRef && (
                        <div className="text-xs text-gray-600 font-mono">Referência legal: {s.legalRef}</div>
                      )}
                      {s.aiReportPreview && (
                        <div className="bg-black/50 border border-gray-800 rounded-lg p-3 text-xs text-gray-400 max-h-48 overflow-auto whitespace-pre-wrap">
                          {s.aiReportPreview}
                          {s.hasAiReport && <span className="text-gray-600"> [...]</span>}
                        </div>
                      )}
                      <Link
                        href={`/admin/relatorios?id=${s.id}&type=auto`}
                        className="text-xs text-[#bc13fe] hover:underline inline-flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        Ver relatório completo →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <HelpCircle className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="font-black text-white text-lg uppercase tracking-widest">COMO FUNCIONA</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>Este módulo executa <strong className="text-white">varreduras OSINT automatizadas</strong> utilizando ferramentas como Sherlock, theHarvester e Nmap em um ambiente Docker Kali Linux isolado.</p>
              <p>As varreduras são <strong className="text-white">agendadas automaticamente</strong> às terças, sextas e domingos às 03h00, ou podem ser disparadas manualmente pelo administrador.</p>
              <p>Os resultados buscam <strong className="text-white">rastros digitais</strong> de alvos monitorados em fontes públicas, redes sociais e infraestrutura de rede — todos registrados com hash SHA-256.</p>
              <p>Os resultados das varreduras são automaticamente salvos na <strong className="text-white">Custódia de Evidências</strong> com análise de IA e podem ser consultados no módulo de Relatórios.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
