"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, ShieldAlert, Loader2, FileSearch, Hash, HardDrive,
  MapPin, User, Monitor, Calendar, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Folder, FolderOpen, Copy, FileText
} from "lucide-react";

interface VaultFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

interface VaultFolder {
  name: string;
  files: VaultFile[];
}

interface Laudo {
  arquivo: string;
  caminho: string;
  peritoOperador: string;
  dataPericia: string;
  tamanhoBytes: number;
  tipoDetectado: string;
  hashes: { sha256: string; md5: string; sha1: string };
  metadados: Record<string, any>;
  achados: string[];
  integridadeConfirmada: boolean;
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
  '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS':   '11 · Compartilhamento c/ Terceiros',
  '12_NCFN-METADADOS-LIMPOS':                  '12 · Metadados Limpos',
  '100_BURN_IMMUTABILITY':                     '100 · Burn / Imutabilidade',
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-2 text-gray-600 hover:text-[#00f3ff] transition-colors">
      {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function PericiaArquivoInner() {
  const searchParams = useSearchParams();
  const [folders, setFolders] = useState<Record<string, VaultFolder>>({});
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState("");
  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metaOpen, setMetaOpen] = useState(true);

  useEffect(() => {
    fetch('/api/vault/browse')
      .then(r => r.json())
      .then(d => {
        setFolders(d);
        // Pré-selecionar arquivo via query params (vindo do /vault)
        const folder = searchParams?.get('folder');
        const file = searchParams?.get('file');
        if (folder && file) {
          setSelectedPath(`${folder}/${file}`);
          setOpenFolders(new Set([folder]));
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const runPericia = async () => {
    if (!selectedPath) return;
    setLoading(true);
    setLaudo(null);
    setError("");
    try {
      const res = await fetch('/api/pericia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedPath }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLaudo(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
          <FileSearch size={32} className="text-[#00f3ff]" />
          Perícia Técnica de Arquivos
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Análise forense automatizada: extração completa de metadados via ExifTool · trilogia de hashes SHA-256 / SHA-1 / MD5 · detecção de achados relevantes · laudo técnico com integridade certificada
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File selector */}
        <div className="glass-panel rounded-2xl border border-white/10 p-4 flex flex-col gap-2">
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Folder size={14} /> Selecionar Arquivo do Vault
          </h2>

          <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-1">
            {Object.entries(folders).map(([folderName, folder]) => {
              const isOpen = openFolders.has(folderName);
              return (
                <div key={folderName}>
                  <button
                    onClick={() => toggleFolder(folderName)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isOpen ? <FolderOpen size={12} className="text-[#00f3ff]" /> : <Folder size={12} className="text-[#00f3ff]/50" />}
                    <span className="flex-1 truncate">{FOLDER_LABELS[folderName] || folderName}</span>
                    <span className="text-[10px] text-gray-600">{folder.files.length}</span>
                  </button>
                  {isOpen && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                      {folder.files.map(file => (
                        <button
                          key={file.path}
                          onClick={() => setSelectedPath(file.path)}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[10px] text-left transition-all ${
                            selectedPath === file.path
                              ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20'
                              : 'text-gray-500 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <FileText size={10} className="flex-shrink-0" />
                          <span className="truncate font-mono">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 pt-3 space-y-2">
            {selectedPath && (
              <p className="text-[10px] text-[#00f3ff] font-mono truncate">{selectedPath}</p>
            )}
            <button
              onClick={runPericia}
              disabled={!selectedPath || loading}
              className="w-full py-3 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] rounded-xl font-bold text-sm transition-all border border-[#00f3ff]/30 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Analisando...' : 'Iniciar Perícia'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="glass-panel rounded-2xl border border-red-500/30 p-4 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!laudo && !error && !loading && (
            <div className="glass-panel rounded-2xl border border-white/10 p-12 flex flex-col items-center justify-center text-center gap-4">
              <FileSearch size={56} className="text-[#00f3ff]/20" />
              <p className="text-gray-600 text-sm">Selecione um arquivo e clique em "Iniciar Perícia"</p>
            </div>
          )}

          {laudo && (
            <>
              {/* Summary card */}
              <div className="glass-panel rounded-2xl border border-[#00f3ff]/20 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-green-400" />
                      Laudo Forense
                    </h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {new Date(laudo.dataPericia).toLocaleString('pt-BR')} — Perito: {laudo.peritoOperador}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/30 font-mono">
                    Íntegro
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-black/30 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Arquivo</p>
                    <p className="text-white font-mono text-xs truncate">{laudo.arquivo}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tipo Detectado</p>
                    <p className="text-white text-xs truncate">{laudo.tipoDetectado}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tamanho</p>
                    <p className="text-white text-xs">{formatBytes(laudo.tamanhoBytes)}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Caminho</p>
                    <p className="text-white font-mono text-xs truncate">{laudo.caminho}</p>
                  </div>
                </div>
              </div>

              {/* Hashes */}
              <div className="glass-panel rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Hash size={14} /> Hashes Criptográficos
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'SHA-256', value: laudo.hashes.sha256, color: 'text-[#00f3ff]' },
                    { label: 'SHA-1', value: laudo.hashes.sha1, color: 'text-yellow-400' },
                    { label: 'MD5', value: laudo.hashes.md5, color: 'text-orange-400' },
                  ].map(h => (
                    <div key={h.label} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                      <span className={`text-[10px] font-bold ${h.color} w-14 flex-shrink-0`}>{h.label}</span>
                      <code className="text-[11px] font-mono text-gray-300 flex-1 break-all">{h.value}</code>
                      <CopyButton text={h.value} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings */}
              {laudo.achados.length > 0 && (
                <div className="glass-panel rounded-2xl border border-yellow-500/20 p-5">
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /> Achados Forenses ({laudo.achados.length})
                  </h3>
                  <div className="space-y-2">
                    {laudo.achados.map((finding, i) => (
                      <div key={i} className="flex items-start gap-2 bg-yellow-950/20 border border-yellow-700/20 rounded-xl p-3">
                        <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                        <span className="text-yellow-300 text-xs">{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="glass-panel rounded-2xl border border-white/10 p-5">
                <button
                  onClick={() => setMetaOpen(v => !v)}
                  className="w-full flex items-center justify-between text-sm font-bold text-white/70 uppercase tracking-widest mb-3"
                >
                  <span className="flex items-center gap-2">
                    <Monitor size={14} /> Metadados ExifTool ({Object.keys(laudo.metadados).length} campos)
                  </span>
                  {metaOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {metaOpen && (
                  <div className="max-h-96 overflow-y-auto space-y-1 custom-scrollbar">
                    {Object.entries(laudo.metadados).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-3 px-3 py-1.5 hover:bg-white/3 rounded-lg transition-colors">
                        <span className="text-[10px] text-gray-500 font-mono w-40 flex-shrink-0 pt-0.5 truncate">{key}</span>
                        <span className="text-xs text-gray-300 break-all">{String(val)}</span>
                      </div>
                    ))}
                    {Object.keys(laudo.metadados).length === 0 && (
                      <p className="text-gray-600 text-xs text-center py-4">Sem metadados extraídos</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PericiaArquivoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06070a] flex items-center justify-center text-gray-500 text-sm">Carregando...</div>}>
      <PericiaArquivoInner />
    </Suspense>
  );
}
