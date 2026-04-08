"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setFileCtx } from "@/app/components/FileContextNav";
import {
  FileText, Eye, HelpCircle, X, Clock, ExternalLink,
  ArrowRight, RefreshCw, FileSearch, ArrowLeft, CheckCircle2,
  AlertTriangle, HardDriveDownload, Square, CheckSquare, ChevronDown, ChevronRight,
} from "lucide-react";
import { folderColor } from "@/lib/folderColors";

interface Pericia {
  id: string;
  filePath: string;
  folder: string;
  filename: string;
  version: number;
  totalVersions: number;
  userEmail: string;
  createdAt: string;
  reportType?: string;
  titulo?: string;
  finalReportExpiresAt?: string | null;
}

interface FileGroup {
  filePath: string;
  folder: string;
  filename: string;
  inicial: Pericia[];
  intermediario: Pericia[];
  final: Pericia[];
  manual: Pericia[];
  visible: Pericia[]; // the reports to actually show per visibility rules
}

const FOLDER_LABELS: Record<string, string> = {
  '0_NCFN-ULTRASECRETOS':                      '0 · Ultrasecretos',
  '1_NCFN-PROVAS-SENSÍVEIS':                   '1 · Provas Sensíveis',
  '2_NCFN-ELEMENTOS-DE-PROVA':                 '2 · Elementos de Prova',
  '3_NCFN-DOCUMENTOS-GERENTE':                 '3 · Documentos Gerente',
  '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS':  '4 · Processos / Contratos',
  '5_NCFN-GOVERNOS-EMPRESAS':                  '5 · Governos / Empresas',
  '6_NCFN-FORNECIDOS_sem_registro_de_coleta':  '6 · Fornecidos s/ Registro',
  '7_NCFN-CAPTURAS-WEB_OSINT':                 '7 · Capturas Web / OSINT',
  '8_NCFN-VIDEOS':                             '8 · Vídeos',
  '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS': '9 · Perfis Criminais',
  '10_NCFN-ÁUDIO':                             '10 · Áudio',
  '12_NCFN-METADADOS-LIMPOS':                  '12 · Metadados Limpos',
};

const TYPE_COLORS: Record<string, string> = {
  manual: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  inicial: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  intermediario: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  final: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const TYPE_LABELS: Record<string, string> = {
  manual: 'NOVA LEITURA', inicial: 'INICIAL', intermediario: 'INTERMEDIÁRIO', final: 'FINAL',
};

const MS_48H = 48 * 60 * 60 * 1000;

function buildFileGroups(pericias: Pericia[], nowMs: number): FileGroup[] {
  const map: Record<string, Omit<FileGroup, 'visible'>> = {};

  for (const p of pericias) {
    const key = p.filePath || `${p.folder}/${p.filename}`;
    if (!map[key]) {
      map[key] = { filePath: key, folder: p.folder, filename: p.filename, inicial: [], intermediario: [], final: [], manual: [] };
    }
    const rType = (p.reportType || 'manual') as keyof Pick<FileGroup, 'inicial'|'intermediario'|'final'|'manual'>;
    if (rType === 'inicial') map[key].inicial.push(p);
    else if (rType === 'intermediario') map[key].intermediario.push(p);
    else if (rType === 'final') map[key].final.push(p);
    else map[key].manual.push(p);
  }

  return Object.values(map).map(g => {
    let visible: Pericia[] = [];

    const hasFinal = g.final.length > 0;
    const hasManual = g.manual.length > 0;

    // Assign version numbers for intermediário
    const sortedInter = [...g.intermediario].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sortedInter.forEach((p, i) => { p.version = i + 1; p.totalVersions = sortedInter.length; });

    if (hasFinal) {
      // Regra 48h: após 48h do FINAL, apenas final + manual ficam visíveis
      const finalCreatedMs = new Date(g.final[0].createdAt).getTime();
      const passed48h = nowMs - finalCreatedMs >= MS_48H;
      if (passed48h) {
        visible.push(...g.final);
        visible.push(...g.manual);
      } else {
        // Todos visíveis por até 48h
        visible.push(...g.inicial);
        visible.push(...g.intermediario);
        visible.push(...g.final);
        visible.push(...g.manual);
      }
    } else if (g.intermediario.length > 0) {
      // Sem final ainda — mostra todos
      visible.push(...g.inicial);
      visible.push(...g.intermediario);
    } else if (g.inicial.length > 0) {
      visible.push(...g.inicial);
    }
    // Manuais sem final (pericias antigas avulsas)
    if (!hasFinal && hasManual) visible.push(...g.manual);

    return { ...g, visible };
  }).filter(g => g.visible.length > 0)
    .sort((a, b) => {
      const aLatest = Math.max(...a.visible.map(p => new Date(p.createdAt).getTime()));
      const bLatest = Math.max(...b.visible.map(p => new Date(p.createdAt).getTime()));
      return bLatest - aLatest;
    });
}

function LaudoForenseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from');
  const highlightPath = searchParams.get('highlight');
  const ctxFolder   = searchParams.get('folder');
  const ctxFile     = searchParams.get('file');

  const highlightRowRef = useRef<HTMLDivElement | null>(null);

  const [pericias, setPericias] = useState<Pericia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string | null; title: string }>({ open: false, url: null, title: '' });
  const [nowMs, setNowMs] = useState(Date.now());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchPericias(); }, []);

  // Auto-expand group from URL params + set file context
  useEffect(() => {
    if (ctxFolder && ctxFile) {
      const fp = `${ctxFolder}/${ctxFile}`;
      setExpandedGroups(prev => new Set([...prev, fp]));
      setFileCtx(ctxFolder, ctxFile);
    }
  }, [ctxFolder, ctxFile]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && highlightPath && highlightRowRef.current) {
      setTimeout(() => {
        highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [loading, highlightPath]);

  async function fetchPericias() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/laudo-forense");
      const data = await res.json();
      setPericias(data.pericias || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleVisualize(pericia: Pericia, printMode = false) {
    setGeneratingPdf(pericia.id);
    setMsg("");
    try {
      let res: Response;
      const isTyped = pericia.reportType && ['inicial', 'intermediario', 'final', 'manual'].includes(pericia.reportType);
      if (isTyped) {
        res = await fetch("/api/vault/custody-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: 'view_typed_report', id: pericia.id, print: printMode }),
          credentials: 'include',
        });
      } else {
        res = await fetch("/api/vault/custody-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath: pericia.filePath, print: printMode }),
          credentials: 'include',
        });
      }
      if (!res.ok) { setMsg("Erro ao gerar relatório."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (printMode) {
        const win = window.open(url, '_blank');
        if (win) { win.onload = () => { win.focus(); win.print(); }; }
      } else {
        setPdfModal({ open: true, url, title: pericia.filename });
      }
    } catch {
      setMsg("Erro ao conectar ao servidor.");
    } finally {
      setGeneratingPdf(null);
    }
  }

  function handleGoToVault(pericia: Pericia) {
    router.push(`/vault?folder=${encodeURIComponent(pericia.folder)}&file=${encodeURIComponent(pericia.filename)}`);
  }

  async function handleExportZip() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { setMsg("Selecione pelo menos um laudo para exportar."); return; }
    setExporting(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/export-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "laudos", ids }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error || "Erro ao exportar.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ncfn_laudos_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setSelectedIds(new Set());
    } catch (e: any) {
      setMsg("Erro ao exportar: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  function handleBackToVault() {
    if (fromPath) {
      const parts = fromPath.split('/');
      const folder = parts[0];
      const file = parts.slice(1).join('/');
      router.push(`/vault?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`);
    } else {
      router.push('/vault');
    }
  }

  const fileGroups = buildFileGroups(pericias, nowMs);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#bc13fe]/20 rounded-xl flex items-center justify-center border border-[#bc13fe]/40">
            <FileSearch className="w-5 h-5 text-[#bc13fe]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Histórico de Relatórios / Perícias
            </h1>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
              Consulta · Ciclo de vida INICIAL → INTERMEDIÁRIO → FINAL por arquivo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBackToVault}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-white border border-cyan-700/40 hover:border-cyan-500/60 bg-cyan-900/15 hover:bg-cyan-900/30 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft size={13} />
            {fromPath ? 'Voltar ao Cofre' : 'Ir ao Cofre'}
          </button>
          <button
            onClick={fetchPericias}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all"
          >
            <HelpCircle size={14} /> Como funciona
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleExportZip}
              disabled={exporting}
              className="flex items-center gap-2 text-xs text-emerald-300 hover:text-white border border-emerald-700/40 hover:border-emerald-500/60 bg-emerald-900/15 hover:bg-emerald-900/30 px-3 py-2 rounded-xl transition-all disabled:opacity-40"
            >
              <HardDriveDownload size={13} className={exporting ? "animate-pulse" : ""} />
              {exporting ? "Exportando..." : `Exportar ZIP (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
          {msg}
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] font-mono text-gray-500">
        <span className="uppercase tracking-widest">Legenda:</span>
        {(['inicial','intermediario','final','manual'] as const).map(t => (
          <span key={t} className={`px-2 py-0.5 rounded border ${TYPE_COLORS[t]} text-[9px] font-black uppercase tracking-widest`}>
            {TYPE_LABELS[t]}
          </span>
        ))}
        <span className="text-gray-700 ml-2">Regras de visibilidade aplicadas automaticamente</span>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-16 text-center text-gray-600 font-mono text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 text-gray-700" />
          Carregando relatórios...
        </div>
      ) : pericias.length === 0 ? (
        <div className="py-16 text-center text-gray-600 text-sm rounded-2xl border border-white/8 bg-black/30">
          <FileText className="w-8 h-8 mx-auto mb-3 text-gray-800" />
          Nenhum relatório / perícia gerado ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {fileGroups.map(group => {
            const isExpanded = expandedGroups.has(group.filePath);
            const toggleGroup = () => {
              setExpandedGroups(prev => {
                const next = new Set(prev);
                isExpanded ? next.delete(group.filePath) : next.add(group.filePath);
                return next;
              });
              if (!isExpanded) setFileCtx(group.folder, group.filename);
            };
            return (
            <div
              key={group.filePath}
              className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden"
              ref={highlightPath === group.filePath ? highlightRowRef : undefined}
            >
              {/* File header — clickable to expand/collapse */}
              <button
                onClick={toggleGroup}
                className="w-full text-left px-5 py-3 bg-[#00f3ff]/[0.03] hover:bg-[#00f3ff]/[0.06] border-b border-white/8 flex items-center gap-3 flex-wrap transition-colors"
              >
                {isExpanded
                  ? <ChevronDown size={13} className="flex-shrink-0" style={{ color: `${folderColor(group.folder)}80` }} />
                  : <ChevronRight size={13} className="flex-shrink-0" style={{ color: `${folderColor(group.folder)}50` }} />
                }
                <FileSearch size={14} className="flex-shrink-0" style={{ color: `${folderColor(group.folder)}90` }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-black text-white font-mono truncate block">
                    {group.filename}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest font-mono font-bold" style={{ color: folderColor(group.folder) }}>
                    {FOLDER_LABELS[group.folder] || group.folder}
                  </span>
                </div>
                {/* Lifecycle badge */}
                <div className="flex items-center gap-1.5">
                  {(['inicial','intermediario','final'] as const).map((stage, i) => {
                    const hasStage = group[stage] as Pericia[];
                    const has = hasStage && hasStage.length > 0;
                    return (
                      <div key={stage} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight size={8} className="text-gray-700" />}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                          has ? TYPE_COLORS[stage] : 'border-white/10 text-gray-700 bg-transparent'
                        }`}>
                          {stage === 'inicial' ? 'I' : stage === 'intermediario' ? 'II' : 'III'}
                        </span>
                      </div>
                    );
                  })}
                  <span className="text-[9px] text-gray-600 font-mono ml-2">{group.visible.length} relatório{group.visible.length !== 1 ? 's' : ''}</span>
                </div>
              </button>

              {/* Reports for this file — only when expanded */}
              {isExpanded && <div className="divide-y divide-white/5">
                {(() => {
                  // Determine which report gets the print button (highest priority)
                  const manualRep = group.manual[0];
                  const finalRep  = group.final[0];
                  const interRep  = group.intermediario.length > 0 ? group.intermediario[group.intermediario.length - 1] : null;
                  const printableId = manualRep?.id ?? finalRep?.id ?? interRep?.id ?? null;
                  return group.visible
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(pericia => {
                  const isGenerating = generatingPdf === pericia.id;
                  const rType = pericia.reportType || 'manual';
                  const expiresMs = pericia.finalReportExpiresAt ? new Date(pericia.finalReportExpiresAt).getTime() : null;
                  const expiresRemaining = expiresMs ? Math.max(0, (expiresMs - nowMs) / 1000) : null;
                  const expH = expiresRemaining !== null ? Math.floor(expiresRemaining / 3600) : null;
                  const expMin = expiresRemaining !== null ? Math.floor((expiresRemaining % 3600) / 60) : null;
                  const isHighlighted = highlightPath === pericia.filePath;

                  return (
                    <div
                      key={pericia.id}
                      className={`grid grid-cols-[32px_1fr_150px_1fr] gap-0 hover:bg-white/[0.02] transition-all
                        ${isHighlighted ? "bg-[#bc13fe]/[0.06] border-l-2 border-l-[#bc13fe]" : ""}
                        ${selectedIds.has(pericia.id) ? "bg-emerald-900/[0.04]" : ""}
                      `}
                    >
                      {/* Col 0: Checkbox */}
                      <div className="flex items-center justify-center py-3.5 pl-2">
                        <button
                          onClick={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              next.has(pericia.id) ? next.delete(pericia.id) : next.add(pericia.id);
                              return next;
                            });
                          }}
                          className="text-gray-600 hover:text-emerald-400 transition-colors"
                          title={selectedIds.has(pericia.id) ? "Desselecionar" : "Selecionar para exportar"}
                        >
                          {selectedIds.has(pericia.id)
                            ? <CheckSquare size={14} className="text-emerald-400" />
                            : <Square size={14} />
                          }
                        </button>
                      </div>

                      {/* Col 1: Report info */}
                      <div className="px-5 py-3.5 flex flex-col justify-center gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest flex-shrink-0 ${TYPE_COLORS[rType] || TYPE_COLORS.manual}`}>
                            {TYPE_LABELS[rType] || rType}
                          </span>
                          {pericia.totalVersions > 1 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0 ${
                              pericia.version === pericia.totalVersions
                                ? 'bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/30'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                            }`}>
                              v{pericia.version}
                            </span>
                          )}
                          {rType === 'final' && (
                            <span className="flex items-center gap-1 text-[8px] text-red-400 font-black uppercase tracking-widest">
                              <CheckCircle2 size={8} /> DEFINITIVO
                            </span>
                          )}
                        </div>
                        {rType === 'final' && expiresRemaining !== null && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock size={9} className={expiresRemaining > 0 ? 'text-amber-500' : 'text-red-500'} />
                            <span className={`text-[9px] font-mono ${expiresRemaining > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                              {expiresRemaining > 0 ? `Expira em ${expH}h ${expMin}min` : 'EXPIRADO'}
                            </span>
                          </div>
                        )}
                        {rType === 'intermediario' && pericia.totalVersions > 1 && (
                          <span className="text-[9px] text-amber-500/70 font-mono">
                            {pericia.version === pericia.totalVersions ? 'Mais recente' : 'Anterior'}
                          </span>
                        )}
                      </div>

                      {/* Col 2: Data / Hora */}
                      <div className="px-4 py-3.5 flex flex-col justify-center border-l border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-gray-600 flex-shrink-0" />
                          <span className="text-xs text-gray-300 font-mono">
                            {new Date(pericia.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono pl-[18px]">
                          {new Date(pericia.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>

                      {/* Col 3: Ações */}
                      <div className="px-4 py-3.5 flex flex-col gap-2 justify-center border-l border-white/5">
                        <button
                          onClick={() => handleVisualize(pericia, false)}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bc13fe]/15 hover:bg-[#bc13fe]/25 border border-[#bc13fe]/30 text-[#bc13fe] rounded-lg text-xs font-bold transition-all disabled:opacity-40 w-full justify-center"
                        >
                          <Eye size={11} />
                          {isGenerating ? "Gerando PDF..." : "Versão Digital"}
                        </button>
                        {pericia.id === printableId && (
                          <button
                            onClick={() => handleVisualize(pericia, true)}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-300 rounded-lg text-xs font-bold transition-all disabled:opacity-40 w-full justify-center"
                          >
                            <ExternalLink size={11} />
                            Versão Impressão
                          </button>
                        )}
                        <button
                          onClick={() => handleGoToVault(pericia)}
                          className="flex items-center gap-1 px-2 py-1 bg-cyan-900/20 hover:bg-cyan-900/35 border border-cyan-700/30 text-cyan-400 rounded text-[10px] font-bold transition-all w-full justify-center"
                        >
                          <ArrowRight size={10} /> IR PARA O COFRE
                        </button>
                      </div>
                    </div>
                  );
                  });
                })()}
              </div>}
            </div>
            );
          })}
        </div>
      )}

      {pericias.length > 0 && (
        <p className="text-[10px] text-gray-700 font-mono text-right">
          {fileGroups.length} arquivo{fileGroups.length !== 1 ? 's' : ''} · {pericias.length} relatório{pericias.length !== 1 ? 's' : ''} total
        </p>
      )}

      {/* Modal PDF */}
      {pdfModal.open && pdfModal.url && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col p-4">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#bc13fe]/15 rounded-lg border border-[#bc13fe]/30">
                <FileText className="w-4 h-4 text-[#bc13fe]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Laudo Digital</h3>
                <p className="text-[10px] text-gray-500 font-mono truncate max-w-[400px]">{pdfModal.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={pdfModal.url}
                download={`NCFN_Laudo_${pdfModal.title}_${Date.now()}.pdf`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bc13fe]/20 hover:bg-[#bc13fe]/35 border border-[#bc13fe]/40 text-[#bc13fe] rounded-lg text-xs font-bold transition-all"
              >
                <ExternalLink size={11} /> Baixar PDF
              </a>
              <button
                onClick={() => { setPdfModal({ open: false, url: null, title: '' }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-lg text-xs transition-all"
              >
                <X size={13} /> Fechar
              </button>
            </div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
            <iframe src={pdfModal.url} className="w-full h-full" title={pdfModal.title} />
          </div>
        </div>
      )}

      {/* Modal Como Funciona */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#bc13fe]/10 rounded-xl border border-[#bc13fe]/30">
                <HelpCircle className="w-5 h-5 text-[#bc13fe]" />
              </div>
              <h2 className="font-black text-white text-lg uppercase tracking-widest">CICLO DE VIDA</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Os relatórios são exibidos <strong className="text-white">agrupados por arquivo</strong>, seguindo as regras de visibilidade do ciclo de custódia forense:
              </p>
              <div className="space-y-2">
                <div className="flex gap-3 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border bg-cyan-500/15 text-cyan-300 border-cyan-500/30 uppercase tracking-widest self-start mt-0.5 flex-shrink-0">INICIAL</span>
                  <p className="text-xs">Exibido enquanto nenhum intermediário for gerado.</p>
                </div>
                <div className="flex gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/30 uppercase tracking-widest self-start mt-0.5 flex-shrink-0">INTERM.</span>
                  <p className="text-xs">Quando gerado, <strong className="text-white">oculta o Inicial</strong>. Múltiplos intermediários exibem V1, V2, etc.</p>
                </div>
                <div className="flex gap-3 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border bg-red-500/15 text-red-300 border-red-500/30 uppercase tracking-widest self-start mt-0.5 flex-shrink-0">FINAL</span>
                  <p className="text-xs">Quando disponível, <strong className="text-white">oculta todos os intermediários</strong>. Expira automaticamente.</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 border-t border-white/5 pt-3">
                Página somente de visualização e auditoria. Nenhuma ação destrutiva é possível aqui.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LaudoForensePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-gray-600 font-mono text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Carregando...
      </div>
    }>
      <LaudoForenseInner />
    </Suspense>
  );
}
