"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText, Eye, HelpCircle, X, Clock, ExternalLink,
  ArrowRight, RefreshCw, Folder, FileSearch, ArrowLeft,
} from "lucide-react";

interface Pericia {
  id: string;
  filePath: string;
  folder: string;
  filename: string;
  version: number;
  totalVersions: number;
  userEmail: string;
  createdAt: string;
}

const FOLDER_LABELS: Record<string, string> = {
  '0_NCFN-ULTRASECRETOS':                      '0 · Ultrasecretos',
  '1_NCFN-PROVAS_DIGITAIS':                    '1 · Provas Digitais',
  '2_NCFN-DOCUMENTOS_OFICIAIS':                '2 · Documentos Oficiais',
  '3_NCFN-COMUNICACOES':                       '3 · Comunicações',
  '4_NCFN-IMAGENS_VIDEOS':                     '4 · Imagens / Vídeos',
  '5_NCFN-FINANCEIRO':                         '5 · Financeiro',
  '6_NCFN-RELATORIOS_INTERNOS':                '6 · Relatórios Internos',
  '7_NCFN-CAPTURAS-WEB_OSINT':                 '7 · Capturas Web / OSINT',
  '8_NCFN-CONTRATOS_JURIDICO':                 '8 · Contratos / Jurídico',
  '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS': '9 · Perfis Criminais',
  '10_NCFN-ÁUDIO':                             '10 · Áudio',
  '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS':   '11 · Compartilhamento c/ Terceiros',
  '12_NCFN-METADADOS-LIMPOS':                  '12 · Metadados Limpos',
  '100_BURN_IMMUTABILITY':                     '100 · Burn / Imutabilidade',
  // VaultClient folder names
  '1_NCFN-PROVAS-SENSÍVEIS':                   '1 · Provas Sensíveis',
  '2_NCFN-ELEMENTOS-DE-PROVA':                 '2 · Elementos de Prova',
  '3_NCFN-DOCUMENTOS-GERENTE':                 '3 · Documentos Gerente',
  '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS':  '4 · Processos / Contratos',
  '5_NCFN-GOVERNOS-EMPRESAS':                  '5 · Governos / Empresas',
  '6_NCFN-FORNECIDOS_sem_registro_de_coleta':  '6 · Fornecidos s/ Registro',
  '8_NCFN-VIDEOS':                             '8 · Vídeos',
};

function LaudoForenseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from'); // e.g. "0_NCFN-ULTRASECRETOS/arquivo.pdf"
  const highlightPath = searchParams.get('highlight');
  const highlightVersionStr = searchParams.get('highlightVersion');
  const highlightVersion = highlightVersionStr ? parseInt(highlightVersionStr) : null;

  const highlightRowRef = useRef<HTMLDivElement | null>(null);

  const [pericias, setPericias] = useState<Pericia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string | null; title: string }>({ open: false, url: null, title: '' });

  useEffect(() => { fetchPericias(); }, []);

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

  async function handleVisualize(pericia: Pericia) {
    setGeneratingPdf(pericia.id);
    setMsg("");
    try {
      const res = await fetch("/api/vault/custody-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: pericia.filePath }),
      });
      if (!res.ok) { setMsg("Erro ao gerar relatório."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfModal({ open: true, url, title: pericia.filename });
    } catch {
      setMsg("Erro ao conectar ao servidor.");
    } finally {
      setGeneratingPdf(null);
    }
  }

  function handleGoToVault(pericia: Pericia) {
    router.push(`/vault?folder=${encodeURIComponent(pericia.folder)}&file=${encodeURIComponent(pericia.filename)}`);
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

  // Group by folder
  const grouped = pericias.reduce<Record<string, Pericia[]>>((acc, p) => {
    (acc[p.folder] ??= []).push(p);
    return acc;
  }, {});
  const folderKeys = Object.keys(grouped).sort();

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
              Consulta · Todos os laudos periciais gerados no sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBackToVault}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-white border border-cyan-700/40 hover:border-cyan-500/60 bg-cyan-900/15 hover:bg-cyan-900/30 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft size={13} />
            {fromPath ? 'Voltar ao Cofre de Arquivos' : 'Ir ao Cofre de Arquivos'}
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
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
          {msg}
        </div>
      )}

      {/* Tabela agrupada por pasta */}
      <div className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-[1fr_160px_1fr] gap-0 border-b border-white/8 bg-white/3">
          <div className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Arquivo
          </div>
          <div className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-l border-white/5">
            Data / Hora
          </div>
          <div className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-l border-white/5">
            Ações
          </div>
        </div>

        {/* Linhas */}
        {loading ? (
          <div className="py-16 text-center text-gray-600 font-mono text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 text-gray-700" />
            Carregando perícias...
          </div>
        ) : pericias.length === 0 ? (
          <div className="py-16 text-center text-gray-600 text-sm border-dashed">
            <FileText className="w-8 h-8 mx-auto mb-3 text-gray-800" />
            Nenhum relatório / perícia gerado ainda.
          </div>
        ) : (
          folderKeys.map(folderKey => {
            const folderLabel = FOLDER_LABELS[folderKey] || folderKey;
            const rows = grouped[folderKey];
            return (
              <div key={folderKey}>
                {/* Folder header row */}
                <div className="grid grid-cols-[1fr_160px_1fr] border-b border-white/8 bg-[#00f3ff]/[0.03]">
                  <div className="col-span-3 px-5 py-2 flex items-center gap-2">
                    <Folder size={12} className="text-[#00f3ff]/60 flex-shrink-0" />
                    <span className="text-[10px] font-black text-[#00f3ff]/80 uppercase tracking-widest">{folderLabel}</span>
                    <span className="text-[9px] text-gray-600 font-mono">{rows.length} relatório{rows.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {rows.map((pericia, idx) => {
                  const isLast = idx === rows.length - 1;
                  const isGenerating = generatingPdf === pericia.id;
                  const showVersion = pericia.totalVersions > 1;
                  const isHighlighted = highlightPath === pericia.filePath && (highlightVersion === null || highlightVersion === pericia.version);

                  return (
                    <div
                      key={pericia.id}
                      ref={isHighlighted ? highlightRowRef : undefined}
                      className={`grid grid-cols-[1fr_160px_1fr] gap-0 hover:bg-white/2 transition-all ${!isLast ? "border-b border-white/5" : ""} ${isHighlighted ? "bg-[#bc13fe]/[0.07] border-l-2 border-l-[#bc13fe] shadow-[inset_0_0_20px_rgba(188,19,254,0.06)]" : ""}`}
                    >
                      {/* Col 1: Arquivo */}
                      <div className="px-5 py-3.5 flex flex-col justify-center gap-1">
                        {isHighlighted && (
                          <span className="text-[8px] font-black text-[#bc13fe] uppercase tracking-widest flex items-center gap-1 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#bc13fe] inline-block animate-pulse" /> Em destaque
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-[#bc13fe] flex-shrink-0" />
                          <span className="text-sm text-white font-mono font-medium leading-tight truncate max-w-[260px]">
                            {pericia.filename}
                          </span>
                          {showVersion && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0 ${
                              pericia.version === pericia.totalVersions
                                ? 'bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/30'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                            }`}>
                              v{pericia.version}
                            </span>
                          )}
                        </div>
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
                          onClick={() => handleVisualize(pericia)}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bc13fe]/15 hover:bg-[#bc13fe]/25 border border-[#bc13fe]/30 text-[#bc13fe] rounded-lg text-xs font-bold transition-all disabled:opacity-40 w-full justify-center"
                        >
                          <Eye size={11} />
                          {isGenerating ? "Gerando PDF..." : "Visualizar Laudo Digital"}
                        </button>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-gray-600 font-mono">Para baixar, vá ao Cofre:</span>
                          <button
                            onClick={() => handleGoToVault(pericia)}
                            className="flex items-center gap-1 px-2 py-1 bg-cyan-900/20 hover:bg-cyan-900/35 border border-cyan-700/30 text-cyan-400 rounded text-[10px] font-bold transition-all w-full justify-center"
                          >
                            <ArrowRight size={10} /> IR PARA O COFRE
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Contador */}
      {pericias.length > 0 && (
        <p className="text-[10px] text-gray-700 font-mono text-right">
          {pericias.length} registo{pericias.length !== 1 ? "s" : ""} · ordenados do mais recente para o mais antigo
        </p>
      )}

      {/* Modal PDF inline */}
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
              <h2 className="font-black text-white text-lg uppercase tracking-widest">COMO FUNCIONA</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Esta é uma <strong className="text-white">página de consulta</strong> que exibe todos os
                <strong className="text-white"> Relatórios / Perícias</strong> gerados no sistema NCFN, agrupados
                por pasta e ordenados do mais recente para o mais antigo.
              </p>
              <p>
                Cada linha representa uma perícia gerada no Cofre. Caso o mesmo arquivo tenha passado por mais de
                uma perícia, cada geração aparece como uma versão distinta (<strong className="text-white">v1, v2…</strong>),
                sendo sempre a versão mais recente a exibida no topo.
              </p>
              <p>
                O botão <strong className="text-white">Visualizar Laudo Digital</strong> regenera e abre o PDF
                forense completo diretamente nesta página, com opção de download.
              </p>
              <p>
                Para realizar o <strong className="text-white">download do laudo</strong> ou da custódia ZIP,
                utilize o botão <strong className="text-white">IR PARA O COFRE</strong>.
              </p>
              <p className="text-xs text-gray-500 border-t border-white/5 pt-3">
                Nenhuma ação pode ser realizada aqui. Esta página é somente de visualização e auditoria.
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
