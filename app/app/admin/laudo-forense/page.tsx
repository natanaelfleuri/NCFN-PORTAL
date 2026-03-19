"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Eye, HelpCircle, X, Clock, ExternalLink,
  ArrowRight, RefreshCw, Folder, FileSearch,
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
};

export default function LaudoForensePage() {
  const router = useRouter();
  const [pericias, setPericias] = useState<Pericia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchPericias(); }, []);

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
      window.open(url, "_blank");
    } catch {
      setMsg("Erro ao conectar ao servidor.");
    } finally {
      setGeneratingPdf(null);
    }
  }

  function handleGoToVault(pericia: Pericia) {
    router.push(`/vault?folder=${encodeURIComponent(pericia.folder)}&file=${encodeURIComponent(pericia.filename)}`);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-3">
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

      {/* Tabela */}
      <div className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-[1fr_180px_260px] gap-0 border-b border-white/8 bg-white/3">
          <div className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Arquivo / Pasta
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
          pericias.map((pericia, idx) => {
            const folderLabel = FOLDER_LABELS[pericia.folder] || pericia.folder;
            const isLast = idx === pericias.length - 1;
            const isGenerating = generatingPdf === pericia.id;
            const showVersion = pericia.totalVersions > 1;

            return (
              <div
                key={pericia.id}
                className={`grid grid-cols-[1fr_180px_260px] gap-0 hover:bg-white/2 transition-colors ${!isLast ? "border-b border-white/5" : ""}`}
              >
                {/* Col 1: Arquivo / Pasta */}
                <div className="px-5 py-3.5 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-[#bc13fe] flex-shrink-0" />
                    <span className="text-sm text-white font-mono font-medium leading-tight truncate max-w-[300px]">
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
                  <div className="flex items-center gap-1.5 pl-[20px]">
                    <Folder size={10} className="text-gray-600 flex-shrink-0" />
                    <span className="text-[10px] text-gray-500 font-mono">{folderLabel}</span>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-gray-600 font-mono flex-shrink-0">
                      Para baixar o laudo, vá ao Cofre:
                    </span>
                    <button
                      onClick={() => handleGoToVault(pericia)}
                      className="flex items-center gap-1 px-2 py-1 bg-cyan-900/20 hover:bg-cyan-900/35 border border-cyan-700/30 text-cyan-400 rounded text-[10px] font-bold transition-all flex-shrink-0"
                    >
                      <ArrowRight size={10} /> IR PARA O COFRE
                    </button>
                  </div>
                </div>
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
                <strong className="text-white"> Relatórios / Perícias</strong> gerados no sistema NCFN, em ordem
                cronológica do mais recente para o mais antigo.
              </p>
              <p>
                Cada linha representa uma perícia gerada no Cofre. Caso o mesmo arquivo tenha passado por mais de
                uma perícia, cada geração aparece como uma versão distinta (<strong className="text-white">v1, v2…</strong>),
                sendo sempre a versão mais recente a exibida no topo.
              </p>
              <p>
                O botão <strong className="text-white">Visualizar Laudo Digital</strong> regenera e abre o PDF
                forense completo diretamente no navegador, com todos os dados atuais do arquivo.
              </p>
              <p>
                Para realizar o <strong className="text-white">download do laudo</strong> ou da custódia ZIP,
                utilize o botão <strong className="text-white">IR PARA O COFRE</strong> — ele abre automaticamente
                o Cofre com o arquivo em questão já selecionado.
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
