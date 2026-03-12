"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText, Hash, Shield, Download, Copy, CheckCircle, Search,
  ArrowLeft, Filter, Eye, Loader2, AlertTriangle, User, Clock, Zap, Bot
} from "lucide-react";
import Link from "next/link";
import QRCodeGenerator from "../../components/QRCodeGenerator";
type Evidence = {
  id: string; type: "manual" | "auto"; target: string; tool: string;
  sha256Hash: string; operatorEmail: string; triggeredBy: string;
  category: string; legalRef?: string; status?: string;
  durationSecs?: number; hasAiReport: boolean; aiReportPreview?: string;
  rawOutputSize: number; createdAt: string; recordIntegrityHash: string;
};

type FullEvidence = Evidence & { rawOutput: string; aiReport: string; command: string };

const TOOLS: Record<string, { color: string; label: string }> = {
  sherlock: { color: "text-cyan-400", label: "Sherlock" },
  theharvester: { color: "text-yellow-400", label: "theHarvester" },
  nmap: { color: "text-green-400", label: "Nmap" },
};

export default function RelatoriosPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams?.get("id") ?? null;
  const preselectedType = searchParams?.get("type") ?? null;

  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FullEvidence | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "manual" | "auto">("all");
  const [search, setSearch] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fetchEvidences = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/custodian?limit=100");
      if (res.ok) {
        const data = await res.json();
        setEvidences(data.evidences || []);
        // The new API returns metadata for the whole list
        setStats(data.metadata?.stats || data.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvidences(); }, []);

  // Auto-open preselected item
  useEffect(() => {
    if (preselectedId && preselectedType && evidences.length > 0) {
      const found = evidences.find(e => e.id === preselectedId);
      if (found) openDetail(found);
    }
  }, [evidences, preselectedId]);

  const openDetail = useCallback(async (ev: Evidence) => {
    setDetailLoading(true);
    try {
      const res = await fetch("/api/admin/custodian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ev.id, type: ev.type }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelected({ ...ev, ...data.evidence });
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const printReport = () => window.print();

  const filtered = evidences.filter(e => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.target.toLowerCase().includes(q) ||
        e.tool.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.sha256Hash.slice(0, 16).includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto mt-8 pb-20 px-4">

      {/* Print style */}
      <style>{`@media print { .no-print { display: none !important; } .print-full { max-height: none !important; overflow: visible !important; } }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8 no-print">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-[#bc13fe] transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-xl shadow-[0_0_15px_rgba(188,19,254,0.2)]">
              <FileText className="w-6 h-6 text-[#bc13fe]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Custódia de Evidências</h1>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Materialidade Digital · SHA-256 · Cadeia de Custódia Certificada</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8 no-print">
          <div className="glass-panel p-4 rounded-2xl border border-[#bc13fe]/30 text-center">
            <div className="text-2xl font-black text-white">{stats.totalEvidences}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Total de Evidências</div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 text-center">
            <div className="text-2xl font-black text-cyan-400">{stats.totalManual}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Inserção Manual</div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 text-center">
            <div className="text-2xl font-black text-purple-400">{stats.totalAuto}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Coleta Automatizada</div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 min-w-0 space-y-4 no-print">

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-gray-800 rounded-lg">
              {(["all", "manual", "auto"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filter === f ? "bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/30" : "text-gray-500 hover:text-white"}`}
                >
                  {f === "all" ? "Todos" : f === "manual" ? "Manuais" : "Automáticos"}
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-black/40 border border-gray-800 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="buscar alvo, ferramenta, hash..."
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder-gray-700"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16"><Loader2 className="w-6 h-6 text-[#bc13fe] animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-600 text-sm">Nenhuma evidência encontrada.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => openDetail(ev)}
                  className={`glass-panel px-4 py-4 rounded-xl border cursor-pointer transition-all hover:border-[#bc13fe]/30 ${selected?.id === ev.id ? "border-[#bc13fe]/50 bg-[#bc13fe]/5" : "border-gray-800"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {ev.type === "manual"
                        ? <User className="w-4 h-4 text-cyan-400" />
                        : <Zap className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{ev.target}</span>
                        <span className={`text-[10px] font-mono ${TOOLS[ev.tool]?.color || "text-gray-400"}`}>
                          [{TOOLS[ev.tool]?.label || ev.tool}]
                        </span>
                        {ev.status && ev.status !== "success" && (
                          <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                            {ev.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono text-gray-600 inline-flex items-center gap-1`}>
                          <Hash className="w-3 h-3 text-[#bc13fe]" />
                          {ev.sha256Hash.slice(0, 20)}...
                        </span>
                        <span className="text-[10px] text-gray-700">•</span>
                        <span className="text-[10px] text-gray-600">{ev.category}</span>
                        <span className="text-[10px] text-gray-700">•</span>
                        <span className="text-[10px] text-gray-600">
                          {new Date(ev.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        {ev.hasAiReport && (
                          <span className="text-[10px] bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5" /> IA ✓
                          </span>
                        )}
                        {ev.recordIntegrityHash && (
                            <span className="text-[10px] text-gray-700 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/30">
                                <Shield className="w-2.5 h-2.5 inline mr-1" /> Verificado
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {(selected || detailLoading) && (
          <div className="w-full md:w-[480px] flex-shrink-0">
            {detailLoading ? (
              <div className="glass-panel p-8 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-6 h-6 text-[#bc13fe] animate-spin" />
              </div>
            ) : selected && (
              <div className="glass-panel rounded-2xl border border-[#bc13fe]/30 overflow-hidden sticky top-4">

                {/* Detail header */}
                <div className="p-5 border-b border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#bc13fe] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Laudo de Custódia · NCFN
                    </span>
                    <div className="flex items-center gap-2 no-print">
                      <button onClick={printReport} className="p-1.5 text-gray-500 hover:text-white border border-gray-800 rounded-lg hover:border-gray-600 transition">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setSelected(null)} className="p-1.5 text-gray-500 hover:text-white border border-gray-800 rounded-lg hover:border-gray-600 transition text-xs px-2">
                        ✕
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white">{selected.target}</h3>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div><span className="text-gray-600">Ferramenta:</span> <span className={TOOLS[selected.tool]?.color || "text-gray-400"}>{TOOLS[selected.tool]?.label || selected.tool}</span></div>
                    <div><span className="text-gray-600">Tipo:</span> <span className="text-gray-400">{selected.type === "manual" ? "Manual" : "Automático"}</span></div>
                    <div><span className="text-gray-600">Operador:</span> <span className="text-gray-400">{selected.operatorEmail}</span></div>
                    <div><span className="text-gray-600">Data:</span> <span className="text-gray-400">{new Date(selected.createdAt).toLocaleString("pt-BR")}</span></div>
                    {selected.legalRef && <div className="col-span-2"><span className="text-gray-600">Ref. Legal:</span> <span className="text-gray-400">{selected.legalRef}</span></div>}
                  </div>

                  {/* Hash SHA-256 */}
                  <div className="bg-black/60 border border-[#bc13fe]/20 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#bc13fe] uppercase tracking-wider flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Assinatura SHA-256 · Imutável
                      </span>
                      <button onClick={() => copyHash(selected.sha256Hash)} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1">
                        {copiedHash === selected.sha256Hash ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        Copiar
                      </button>
                    </div>
                    <code className="text-[10px] text-[#bc13fe] break-all block">{selected.sha256Hash}</code>
                    <div className="text-[9px] text-gray-700 mt-2">Verificação de integridade: {selected.recordIntegrityHash}</div>
                  </div>

                  {/* QR Code Verification */}
                  {origin && (
                    <div className="flex justify-center my-4 print:my-8 print:border print:border-gray-300 print:p-4 print:break-inside-avoid">
                      <QRCodeGenerator data={`${origin}/verify?hash=${selected.sha256Hash}`} size={160} colorDark="#bc13fe" />
                    </div>
                  )}
                </div>

                {/* AI Report */}
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto print-full">
                  {selected.hasAiReport && selected.aiReport && (
                    <div>
                      <h4 className="text-xs font-bold text-[#bc13fe] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Análise de Materialidade · IA Generativa
                      </h4>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/30 rounded-lg p-3 border border-gray-800">
                        {selected.aiReport}
                      </div>
                    </div>
                  )}

                  {/* Raw output */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Output Pericial Bruto ({selected.rawOutputSize} bytes)
                    </h4>
                    <pre className="text-[10px] font-mono text-gray-500 bg-black/50 border border-gray-900 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                      {(selected as any).rawOutput?.slice(0, 3000)}
                      {(selected as any).rawOutput?.length > 3000 && "\n[...]"}
                    </pre>
                  </div>

                  {/* Command */}
                  {(selected as any).command && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Comando Executado</h4>
                      <code className="text-[9px] font-mono text-gray-700 bg-black/30 rounded p-2 block break-all">
                        {(selected as any).command}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
