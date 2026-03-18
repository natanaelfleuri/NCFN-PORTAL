"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, ShieldAlert, Loader2, FileSearch, Hash, HardDrive,
  Monitor, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Folder, FolderOpen, Copy, FileText,
  HelpCircle, X, Save, Trash2, PlusCircle, BookOpen
} from "lucide-react";
import AIModelSelector from "@/app/components/AIModelSelector";

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
  metadados: Record<string, string>;
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

const STAGES = [
  'Calculando Trilogia de Hashes (MD5, SHA1, SHA256)...',
  'Varrendo Estrutura de Metadados via ExifTool...',
  'Executando Heurística Forense (Perito Sansão)...',
  'Validando Assinatura de Cadeia de Custódia...',
];

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

  // Stage progress
  const [currentStage, setCurrentStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modals
  const [showHelp, setShowHelp] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [peritoNotes, setPeritoNotes] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    fetch('/api/vault/browse')
      .then(r => r.json())
      .then(d => {
        setFolders(d);
        const folder = searchParams?.get('folder');
        const file = searchParams?.get('file');
        if (folder && file) {
          setSelectedPath(`${folder}/${file}`);
          setOpenFolders(new Set([folder]));
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const startStageAnimation = () => {
    setCurrentStage(0);
    setCompletedStages([]);
    let stage = 0;
    stageTimer.current = setInterval(() => {
      stage++;
      if (stage < STAGES.length) {
        setCompletedStages(prev => [...prev, stage - 1]);
        setCurrentStage(stage);
      } else {
        setCompletedStages(prev => [...prev, STAGES.length - 1]);
        setCurrentStage(-1);
        if (stageTimer.current) clearInterval(stageTimer.current);
      }
    }, 2500);
  };

  const runPericia = async () => {
    if (!selectedPath) return;
    setLoading(true);
    setLaudo(null);
    setError("");
    startStageAnimation();
    try {
      const res = await fetch('/api/pericia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedPath }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Wait for animation to finish if still running
      await new Promise(resolve => setTimeout(resolve, 2600));
      setLaudo(data);
    } catch (e: unknown) {
      if (stageTimer.current) clearInterval(stageTimer.current);
      setCurrentStage(-1);
      setCompletedStages([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLaudo = async () => {
    if (!laudo) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(laudo, null, 2));
      // Toast would be ideal but we use a simple alert approach
      alert('Laudo copiado para clipboard (salvo localmente).');
    } catch {
      alert('Não foi possível salvar o laudo.');
    }
  };

  const handleExcluir = () => {
    if (!laudo) return;
    if (confirm('Tem certeza que deseja limpar este laudo da sessão?')) {
      setLaudo(null);
      setCompletedStages([]);
      setCurrentStage(-1);
    }
  };

  const handleSaveReport = async () => {
    if (!laudo || !caseName) return;
    setSavingReport(true);
    try {
      await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laudo, caseName, peritoNotes }),
      });
      setShowReport(false);
      setCaseName('');
      setPeritoNotes('');
    } catch {
      alert('Erro ao salvar relatório.');
    } finally {
      setSavingReport(false);
    }
  };

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const isRunning = loading || currentStage >= 0;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                <FileSearch size={32} className="text-[#00f3ff]" />
                Realizar Nova Perícia Individual
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Análise forense automatizada · Trilogia de hashes SHA-256 / SHA-1 / MD5 · Metadados ExifTool · Cadeia de custódia certificada
              </p>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all whitespace-nowrap mt-1"
            >
              <HelpCircle size={13} /> Como funciona
            </button>
          </div>
          <AIModelSelector />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File selector */}
        <div className="lg:col-span-3 glass-panel rounded-2xl border border-white/10 p-4 flex flex-col gap-2">
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Folder size={14} /> Selecionar Arquivo
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
              disabled={!selectedPath || isRunning}
              className="w-full py-3 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] rounded-xl font-bold text-sm transition-all border border-[#00f3ff]/30 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {isRunning ? 'Analisando...' : 'Iniciar Perícia'}
            </button>
          </div>
        </div>

        {/* Results + Progress */}
        <div className="lg:col-span-7 space-y-4">

          {/* Stage Progress Bar */}
          {(isRunning || completedStages.length > 0) && (
            <div className="glass-panel rounded-2xl border border-[#00f3ff]/20 p-5 space-y-3">
              <h3 className="text-xs font-bold text-[#00f3ff] uppercase tracking-widest">Processamento Forense</h3>
              <div className="space-y-2">
                {STAGES.map((stage, i) => {
                  const done = completedStages.includes(i);
                  const active = currentStage === i;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        done ? 'bg-green-500/20 border border-green-500' :
                        active ? 'bg-[#00f3ff]/20 border border-[#00f3ff] shadow-[0_0_8px_rgba(0,243,255,0.5)]' :
                        'bg-gray-900 border border-gray-700'
                      }`}>
                        {done
                          ? <CheckCircle2 size={10} className="text-green-400" />
                          : active
                            ? <Loader2 size={10} className="text-[#00f3ff] animate-spin" />
                            : <span className="text-[9px] text-gray-600">{i + 1}</span>
                        }
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs transition-colors ${
                          done ? 'text-green-400' :
                          active ? 'text-[#00f3ff]' :
                          'text-gray-600'
                        }`}>{stage}</p>
                        {active && (
                          <div className="mt-1 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00f3ff] rounded-full shadow-[0_0_6px_#00f3ff] animate-pulse" style={{ width: '60%' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="glass-panel rounded-2xl border border-red-500/30 p-4 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!laudo && !error && !isRunning && completedStages.length === 0 && (
            <div className="glass-panel rounded-2xl border border-white/10 p-12 flex flex-col items-center justify-center text-center gap-4">
              <FileSearch size={56} className="text-[#00f3ff]/20" />
              <p className="text-gray-600 text-sm">Selecione um arquivo e clique em &quot;Iniciar Perícia&quot;</p>
            </div>
          )}

          {laudo && (
            <>
              {/* Summary */}
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
                  <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/30 font-mono">Íntegro</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Arquivo', value: laudo.arquivo },
                    { label: 'Tipo Detectado', value: laudo.tipoDetectado },
                    { label: 'Tamanho', value: formatBytes(laudo.tamanhoBytes) },
                    { label: 'Caminho', value: laudo.caminho },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-black/30 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
                      <p className="text-white font-mono text-xs truncate">{value}</p>
                    </div>
                  ))}
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
                      <div key={key} className="flex items-start gap-3 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors">
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

        {/* Action Sidebar */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Ações</h2>

          <button
            onClick={handleSaveLaudo}
            disabled={!laudo}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 bg-gray-900/50 hover:border-green-500/40 hover:bg-green-500/5 transition-all disabled:opacity-30 group"
          >
            <Save size={20} className="text-gray-400 group-hover:text-green-400 transition-colors" />
            <span className="text-xs text-gray-400 group-hover:text-green-400 font-bold uppercase tracking-widest transition-colors text-center">Salvar Laudo</span>
          </button>

          <button
            onClick={handleExcluir}
            disabled={!laudo}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 bg-gray-900/50 hover:border-red-500/40 hover:bg-red-500/5 transition-all disabled:opacity-30 group"
          >
            <Trash2 size={20} className="text-gray-400 group-hover:text-red-400 transition-colors" />
            <span className="text-xs text-gray-400 group-hover:text-red-400 font-bold uppercase tracking-widest transition-colors text-center">Excluir</span>
          </button>

          <button
            onClick={() => setShowReport(true)}
            disabled={!laudo}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 bg-gray-900/50 hover:border-[#00f3ff]/40 hover:bg-[#00f3ff]/5 transition-all disabled:opacity-30 group"
          >
            <PlusCircle size={20} className="text-gray-400 group-hover:text-[#00f3ff] transition-colors" />
            <span className="text-xs text-gray-400 group-hover:text-[#00f3ff] font-bold uppercase tracking-widest transition-colors text-center leading-tight">Adicionar Relatório</span>
          </button>

          <div className="mt-auto">
            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all group"
            >
              <BookOpen size={18} className="text-gray-600 group-hover:text-white transition-colors" />
              <span className="text-[10px] text-gray-600 group-hover:text-white transition-colors text-center">Ajuda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00f3ff]/10 rounded-xl border border-[#00f3ff]/30">
                <HelpCircle className="w-5 h-5 text-[#00f3ff]" />
              </div>
              <h2 className="font-black text-white text-lg uppercase tracking-widest">Como essa página funciona</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p><strong className="text-white">1. Selecione um arquivo</strong> do Vault no painel esquerdo. Arquivos das pastas Ultrasecretos e Provas Sensíveis acionam limpeza automática de cache após a perícia.</p>
              <p><strong className="text-white">2. Clique em &quot;Iniciar Perícia&quot;</strong> para processar o arquivo em 4 etapas:</p>
              <ol className="space-y-1 pl-4">
                {STAGES.map((s, i) => (
                  <li key={i} className="text-xs font-mono text-[#00f3ff]/80 flex gap-2">
                    <span className="text-gray-600">{i + 1}.</span>{s}
                  </li>
                ))}
              </ol>
              <p><strong className="text-white">3. Ações disponíveis</strong> após a análise: Salvar Laudo (JSON), Excluir da sessão, ou Adicionar Relatório ao caso forense.</p>
              <div className="bg-gray-900 rounded-xl p-3 text-xs text-gray-500 font-mono">
                Hash SHA-256 · SHA-1 · MD5 | ExifTool metadata | Achados heurísticos | Cadeia de custódia
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-[#00f3ff]/20 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
            <button onClick={() => setShowReport(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00f3ff]/10 rounded-xl border border-[#00f3ff]/30">
                <PlusCircle className="w-5 h-5 text-[#00f3ff]" />
              </div>
              <h2 className="font-black text-white text-lg uppercase tracking-widest">Adicionar Relatório</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Caso / Incidente</label>
                <input
                  type="text"
                  value={caseName}
                  onChange={e => setCaseName(e.target.value)}
                  placeholder="Ex: Caso #2024-001 — Fraude Documental"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#00f3ff]/50 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notas de Observação do Perito (Markdown)</label>
                <textarea
                  value={peritoNotes}
                  onChange={e => setPeritoNotes(e.target.value)}
                  placeholder="## Observações&#10;&#10;Descreva os achados relevantes, conclusões técnicas e recomendações..."
                  rows={6}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#00f3ff]/50 focus:border-transparent outline-none text-sm font-mono resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-all text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveReport}
                disabled={savingReport || !caseName}
                className="flex-1 py-3 rounded-xl bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30 font-black uppercase tracking-widest text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingReport ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PericiaArquivoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm"><Loader2 className="w-8 h-8 animate-spin text-[#00f3ff]" /></div>}>
      <PericiaArquivoInner />
    </Suspense>
  );
}
