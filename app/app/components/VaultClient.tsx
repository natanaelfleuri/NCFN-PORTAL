"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setFileCtx } from "./FileContextNav";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Folder, FolderOpen, FileText, ShieldAlert, Key, Flame, Lock, Unlock,
  Image as ImageIcon, FileVideo, FileAudio, File, Eye, EyeOff, Download,
  ChevronDown, ChevronRight, Hash, Clock, HardDrive, X, ZoomIn,
  FileSearch, Shield, AlertTriangle, Menu, ChevronsDown, ChevronsUp,
  Trash2, Upload, Globe, FileCheck2, CheckCircle, XCircle, CheckCircle2,
  ArrowRight, PackageCheck, Printer, HelpCircle, Share2, RefreshCw,
  History, BarChart2, ExternalLink, BookOpen, Layers, Loader2, Cloud, CloudUpload,
} from "lucide-react";
import ShareModal from "./ShareModal";
import CofrePanel from "./CofrePanel";
import dynamic from "next/dynamic";
const VaultGraphDiagram = dynamic(() => import("./VaultGraphDiagram"), { ssr: false });
const AdminCharts = dynamic(() => import("./AdminCharts"), { ssr: false });
import { folderColor } from "@/lib/folderColors";

/* ── Vitrine Publish Modal ── */
function gerarSenhas(): string[] {
  return Array.from({ length: 20 }, () =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
}

function VitrinePublishModal({
  folder,
  filename,
  onClose,
  notify,
}: {
  folder: string;
  filename: string;
  onClose: () => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}) {
  const [recipientName, setRecipientName] = useState('');
  const [senhas, setSenhas] = useState<string[]>(() => gerarSenhas());
  const [selectedPw, setSelectedPw] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null); // 1-based
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);

  const canSubmit = recipientName.trim().length > 0 && selectedPw !== null && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vitrine/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename, recipientName: recipientName.trim(), password: selectedPw, passwordIndex: selectedIdx }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao publicar');
      }
      setPublished(true);
      notify('success', `"${filename}" publicado na vitrine para ${recipientName.trim()}.`);
      setTimeout(() => onClose(), 2000);
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-violet-500/40 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-violet-950/40 border-b border-violet-500/30 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-violet-400 flex-shrink-0" />
            <div>
              <h3 className="text-violet-200 font-black text-sm uppercase tracking-widest">Publicar na Vitrine</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-xs">{filename}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {published ? (
          <div className="px-5 py-10 text-center space-y-3">
            <CheckCircle size={48} className="text-green-400 mx-auto" />
            <p className="text-green-300 font-black text-base uppercase tracking-widest">Publicado na vitrine!</p>
            <p className="text-gray-500 text-xs font-mono">Código entregue a: {recipientName}</p>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* File display */}
            <div className="flex items-center gap-3 px-3 py-2 bg-black/40 border border-white/10 rounded-xl">
              <FileText size={16} className="text-violet-400 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-white text-xs font-mono truncate">{filename}</p>
                <p className="text-gray-600 text-[10px] font-mono">{folder}</p>
              </div>
            </div>

            {/* Recipient name */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Disponibilizar para</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Nome do destinatário..."
                className="w-full bg-black/40 border border-white/10 focus:border-violet-500/50 rounded-xl px-3 py-2 text-white text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Password grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Código de acesso</label>
                <button
                  onClick={() => { setSenhas(gerarSenhas()); setSelectedPw(null); }}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-violet-400 transition-colors"
                >
                  <RefreshCw size={10} /> Gerar novas senhas
                </button>
              </div>
              <p className="text-[10px] text-gray-600 font-mono mb-2">Selecione um código para entregar ao destinatário:</p>
              <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto">
                {senhas.map((pw, i) => {
                  const num = i + 1;
                  const isSelected = selectedPw === pw;
                  return (
                    <button
                      key={pw}
                      onClick={() => { setSelectedPw(isSelected ? null : pw); setSelectedIdx(isSelected ? null : num); }}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all flex flex-col items-center gap-0.5 ${
                        isSelected
                          ? 'bg-violet-600/40 border-violet-400 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-violet-500/40 hover:text-violet-300'
                      }`}
                    >
                      <span className={`text-[8px] font-black leading-none ${isSelected ? 'text-violet-400' : 'text-gray-600'}`}>#{num}</span>
                      {pw}
                    </button>
                  );
                })}
              </div>
              {selectedPw && selectedIdx !== null && (
                <p className="mt-2 text-center text-violet-300 text-sm font-mono font-black">
                  Selecionado: <span className="bg-violet-900/40 px-2 py-0.5 rounded">#{selectedIdx} · {selectedPw}</span>
                </p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 pt-1 border-t border-gray-800">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-500 hover:text-gray-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2 rounded-xl bg-violet-900/40 border border-violet-500/40 text-violet-300 hover:bg-violet-900/70 hover:text-white text-xs font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Share2 size={13} />
                {saving ? 'Gravando...' : 'Gravar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface VaultFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  type: string;
  hash: string;
  r2?: boolean; // true = arquivo armazenado no Cloudflare R2
}

interface VaultFolder {
  name: string;
  files: VaultFile[];
}

const PERICIA_STEPS = [
  'Verificando arquivo no sistema de arquivos...',
  'Extraindo linha do tempo MACB...',
  'Calculando inode e blocos de disco...',
  'Verificando permissoes POSIX e propriedade...',
  'Calculando hashes criptograficos SHA-256/MD5/SHA-1...',
  'Analisando assinatura de bytes magicos...',
  'Calculando entropia Shannon do arquivo...',
  'Verificando padroes de malware e codigos suspeitos...',
  'Executando exiftool para metadados completos...',
  'Consultando logs de acesso e cadeia de custodia...',
  'Compilando historico de pericias anteriores...',
  'Gerando relatorio PDF forense multi-pagina...',
];

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function FileTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const cls = `flex-shrink-0`;
  if (type === 'image') return <ImageIcon size={size} className={`${cls} text-blue-400`} />;
  if (type === 'pdf') return <FileText size={size} className={`${cls} text-red-400`} />;
  if (type === 'text') return <FileText size={size} className={`${cls} text-green-400`} />;
  if (type === 'video') return <FileVideo size={size} className={`${cls} text-purple-400`} />;
  if (type === 'audio') return <FileAudio size={size} className={`${cls} text-yellow-400`} />;
  if (type === 'encrypted') return <Lock size={size} className={`${cls} text-orange-400`} />;
  return <File size={size} className={`${cls} text-gray-400`} />;
}

function StepBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
      done
        ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'
        : 'bg-gray-900/60 border-gray-700/40 text-gray-500'
    }`}>
      {done
        ? <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
        : <div className="w-2.5 h-2.5 rounded-full border border-gray-600 flex-shrink-0" />}
      {label}
    </div>
  );
}

export default function VaultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [folders, setFolders] = useState<Record<string, VaultFolder>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['0_NCFN-ULTRASECRETOS']));
  const [selected, setSelected] = useState<VaultFile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [burnLink, setBurnLink] = useState("");

  // Action states
  const [actionLoading, setActionLoading] = useState("");
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [generatedPericias, setGeneratedPericias] = useState<Set<string>>(new Set());
  const [sessionEncrypted, setSessionEncrypted] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);
  const [encDownloadWarning, setEncDownloadWarning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [burnDownloaded, setBurnDownloaded] = useState<Set<string>>(new Set());
  const [custodiaDownloaded, setCustodiaDownloaded] = useState<Set<string>>(new Set());
  const [burnDeleteTarget, setBurnDeleteTarget] = useState<string | null>(null); // path of file to delete
  const [burnDeleteAck, setBurnDeleteAck] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadFolder, setUploadFolder] = useState("");
  const [r2UploadProgress, setR2UploadProgress] = useState<number | null>(null); // 0-100, null = não está fazendo upload R2
  const [operatorEmail, setOperatorEmail] = useState("Operador NCFN");

  // Floating modals for folder internal files
  const [logModal, setLogModal] = useState<{ open: boolean; folder: string; content: string; loading: boolean }>({ open: false, folder: '', content: '', loading: false });
  const [hashModal, setHashModal] = useState<{ open: boolean; folder: string; content: string; loading: boolean }>({ open: false, folder: '', content: '', loading: false });
  const [periciaStep, setPericiaStep] = useState(0);

  // Post-upload attestation modal
  const [coletaModal, setColetaModal] = useState<{
    open: boolean;
    folder: string;
    filename: string;
    saving: boolean;
  }>({ open: false, folder: '', filename: '', saving: false });
  const [coletaAttest, setColetaAttest] = useState(false);
  const [coletaByUser, setColetaByUser] = useState(false);
  const [coletaDate, setColetaDate] = useState('');
  const periciaIntervalRef = useRef<any>(null);

  // Pericia download confirmation modal
  const [periciaDownloadModal, setPericiaDownloadModal] = useState<{
    open: boolean; blobUrl: string | null; filename: string;
  }>({ open: false, blobUrl: null, filename: '' });

  // Share modal (DISPONIBILIZAR PARA TERCEIROS)
  const [shareModal, setShareModal] = useState<{
    open: boolean; folder: string; filename: string;
  }>({ open: false, folder: '', filename: '' });

  // Vitrine Publish modal
  const [vitrineModal, setVitrineModal] = useState<{
    open: boolean; folder: string; filename: string;
  }>({ open: false, folder: '', filename: '' });

  // Ampliar (fullscreen preview)
  const [ampliar, setAmpliar] = useState(false);
  const [ampliarZoom, setAmpliarZoom] = useState(1);

  // Vitrine codes modal
  const [vitrineCodesModal, setVitrineCodesModal] = useState<{
    open: boolean; loading: boolean;
    codes: { id: string; recipientName: string; passwordIndex: number; publishedAt: string; active: boolean }[];
  }>({ open: false, loading: false, codes: [] });

  // Custody lifecycle state
  const [custodyState, setCustodyState] = useState<{
    id: string;
    folder: string;
    filename: string;
    custodyStartedAt: string;
    initialReportId: string | null;
    initialReportAt: string | null;
    intermediaryReportId: string | null;
    intermediaryReportAt: string | null;
    intermediaryReportDone: boolean;
    encryptedAt: string | null;
    finalReportId: string | null;
    finalReportAt: string | null;
    finalReportExpiresAt: string | null;
    manualReportId: string | null;
    manualReportDone: boolean;
  } | null>(null);
  const [custodyStateLoading, setCustodyStateLoading] = useState(false);
  const [generatingIntermediaryReport, setGeneratingIntermediaryReport] = useState(false);
  const [generatingFinalReport, setGeneratingFinalReport] = useState(false);
  const [generatingManualReport, setGeneratingManualReport] = useState(false);
  const autoIntermediaryFired = useRef(false);
  const cofrePanelRef = useRef<HTMLDivElement>(null);
  const [graphFolder, setGraphFolder] = useState<string>("");

  // Suspicious file modal
  const [suspiciousFile, setSuspiciousFile] = useState<{ open: boolean; name: string }>({ open: false, name: '' });

  // Mandatory encryption modal (after coleta)
  const [encryptionModal, setEncryptionModal] = useState<{ open: boolean; folder: string; filename: string }>({ open: false, folder: '', filename: '' });
  const [encModalPassword, setEncModalPassword] = useState('');
  const [encModalConfirm, setEncModalConfirm] = useState('');
  const [encModalShowPw, setEncModalShowPw] = useState(false);
  const [encModalShowConfirm, setEncModalShowConfirm] = useState(false);
  const [autoEncrypting, setAutoEncrypting] = useState(false);

  // Pre-encryption loading (geração do Relatório Inicial antes de encriptar)
  const [preEncryptLoading, setPreEncryptLoading] = useState(false);
  const [preEncryptProgress, setPreEncryptProgress] = useState(0);

  // Visualizar Original modal
  const [visualizarOriginal, setVisualizarOriginal] = useState(false);
  const [visualizarZoom, setVisualizarZoom] = useState(1);

  // Report PDF viewer modal (for Inicial/Intermediário/Final)
  const [reportViewModal, setReportViewModal] = useState<{ open: boolean; url: string | null; title: string }>({ open: false, url: null, title: '' });
  const [loadingViewReport, setLoadingViewReport] = useState<string | null>(null);

  // Custódia na Nuvem (Google Drive)
  const [cloudCustody, setCloudCustody] = useState<any>(null);
  const [cloudCustodyChecked, setCloudCustodyChecked] = useState(false);
  const [cloudCustodyLoading, setCloudCustodyLoading] = useState(false);

  // Live clock for countdown timers (updates every second)
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault/browse');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFolders(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
    fetch('/api/vault/browse', { credentials: 'include' })
      .then(r => r.json())
      .catch(() => null);
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => { if (d?.user?.email) setOperatorEmail(d.user.email); })
      .catch(() => {});
  }, [fetchFolders]);

  // Auto-select file from URL params (?folder=X&file=Y)
  useEffect(() => {
    const paramFolder = searchParams.get('folder');
    const paramFile   = searchParams.get('file');
    if (!paramFolder || !paramFile || Object.keys(folders).length === 0) return;
    const folderData = folders[paramFolder];
    if (!folderData) return;
    const fileObj = folderData.files.find(f => f.name === paramFile);
    if (fileObj) {
      setOpenFolders(prev => new Set([...prev, paramFolder]));
      selectFile(fileObj);
    }
  }, [folders, searchParams]);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4500);
  };

  const logAction = async (filePath: string, action: string) => {
    try {
      await fetch('/api/vault/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, action }),
      });
    } catch { /* silent */ }
  };

  // ── Malware / executable detection (client-side magic bytes) ────────────
  const detectSuspiciousFile = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buf = new Uint8Array(e.target?.result as ArrayBuffer);
        // PE header: MZ (Windows executable)
        if (buf[0] === 0x4D && buf[1] === 0x5A) { resolve(true); return; }
        // ELF header (Linux executable)
        if (buf[0] === 0x7F && buf[1] === 0x45 && buf[2] === 0x4C && buf[3] === 0x46) { resolve(true); return; }
        // Script shebang #!
        if (buf[0] === 0x23 && buf[1] === 0x21) { resolve(true); return; }
        // Mach-O (macOS)
        if ((buf[0] === 0xFE && buf[1] === 0xED && buf[2] === 0xFA) ||
            (buf[0] === 0xCE && buf[1] === 0xFA && buf[2] === 0xED && buf[3] === 0xFE) ||
            (buf[0] === 0xCF && buf[1] === 0xFA && buf[2] === 0xED && buf[3] === 0xFE)) { resolve(true); return; }
        resolve(false);
      };
      reader.readAsArrayBuffer(file.slice(0, 16));
    });
  };

  // ── Auto-encrypt + generate initial report (called after encryption modal) ──
  const handleAutoEncryptAndReport = async (folder: string, filename: string, pwd: string) => {
    setAutoEncrypting(true);
    try {
      // 1 — Encrypt
      const encRes = await fetch('/api/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename, password: pwd }),
        credentials: 'include',
      });
      if (!encRes.ok) throw new Error('Falha na encriptação');
      setSessionEncrypted(prev => new Set([...prev, `${folder}/${filename}`]));
      logAction(`${folder}/${filename}`, 'encrypt');

      // 2 — Marca como encriptado (custody state e relatório já foram criados antes)
      await fetch('/api/vault/custody-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_encrypted', folder, filename }),
        credentials: 'include',
      }).catch(() => {});

      notify('success', `"${filename}" encriptado com sucesso!`);
      setEncryptionModal({ open: false, folder: '', filename: '' });
      setEncModalPassword('');
      setEncModalConfirm('');
      await fetchFolders();
      await fetchCustodyState(folder, filename);
      // Select the uploaded file
      const newFolders = await fetch('/api/vault/browse').then(r => r.json()).catch(() => null);
      if (newFolders && newFolders[folder]) {
        const fileObj = newFolders[folder].files.find((f: any) => f.name === filename || f.name === filename + '.enc');
        if (fileObj) selectFile(fileObj);
      }
    } catch (e: any) {
      notify('error', 'Erro ao encriptar: ' + e.message);
    } finally {
      setAutoEncrypting(false);
    }
  };

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const openAllFolders = () => setOpenFolders(new Set(Object.keys(folders)));
  const closeAllFolders = () => setOpenFolders(new Set());

  const handleViewReport = async (reportId: string, label: string) => {
    setLoadingViewReport(reportId);
    try {
      const res = await fetch('/api/vault/custody-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view_typed_report', id: reportId, print: true }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao carregar relatório');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e: any) {
      notify('error', e.message || 'Erro ao abrir relatório');
    } finally {
      setLoadingViewReport(null);
    }
  };

  const handleViewReportPrint = async (reportId: string, label: string) => {
    setLoadingViewReport(reportId);
    try {
      const res = await fetch('/api/vault/custody-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view_typed_report', id: reportId, print: true }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao carregar relatório');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) { win.onload = () => { win.focus(); win.print(); }; }
    } catch (e: any) {
      notify('error', e.message || 'Erro ao abrir relatório para impressão');
    } finally {
      setLoadingViewReport(null);
    }
  };

  const fetchCloudCustody = async (folder: string, filename: string) => {
    setCloudCustodyChecked(false);
    setCloudCustody(null);
    try {
      const res = await fetch('/api/vault/cloud-custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', folder, filename }),
        credentials: 'include',
      });
      const data = await res.json();
      // byProvider: { google_drive: record, internxt: record }
      setCloudCustody(data.exists ? data.byProvider : null);
    } catch { setCloudCustody(null); }
    finally { setCloudCustodyChecked(true); }
  };

  const handleCloudCustody = async (provider: 'google_drive' | 'internxt') => {
    if (!selected) return;
    const [folder] = selected.path.split('/');
    const filename = selected.path.split('/').slice(1).join('/');
    setCloudCustodyLoading(true);
    const label = provider === 'internxt' ? 'Internxt' : 'Google Drive';
    try {
      const res = await fetch('/api/vault/cloud-custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', folder, filename, provider }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok && res.status !== 200) throw new Error(data.error || `Erro ao enviar para ${label}`);
      setCloudCustody((prev: any) => ({ ...(prev || {}), [provider]: data }));
      notify('success', `Custódia na nuvem concluída! Arquivo enviado ao ${label}.`);
    } catch (e: any) {
      notify('error', e.message || `Erro ao enviar para ${label}.`);
    } finally { setCloudCustodyLoading(false); }
  };

  const handleDownloadCloudKey = async (custodyId: string, fname: string) => {
    try {
      const res = await fetch('/api/vault/cloud-custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download_key', id: custodyId }),
        credentials: 'include',
      });
      if (!res.ok) { notify('error', 'Erro ao baixar chave.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `NCFN_KEY_${fname}_${Date.now()}.txt`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 3000);
      notify('success', 'Chave baixada. Guarde em local seguro e separado do arquivo.');
    } catch { notify('error', 'Erro ao baixar chave AES.'); }
  };

  const fetchCustodyState = async (folder: string, filename: string) => {
    setCustodyStateLoading(true);
    try {
      const res = await fetch('/api/vault/custody-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', folder, filename }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCustodyState(data.state || null);
      }
    } catch {}
    finally { setCustodyStateLoading(false); }
  };

  // Auto-generate Relatório Intermediário when 2h timer completes
  useEffect(() => {
    if (!custodyState || custodyState.intermediaryReportDone) {
      autoIntermediaryFired.current = false;
      return;
    }
    if (autoIntermediaryFired.current || !selected) return;
    const t0 = new Date(custodyState.custodyStartedAt).getTime();
    if ((nowMs - t0) / 1000 < 7200) return;
    autoIntermediaryFired.current = true;
    const [iFolder] = selected.path.split('/');
    const rawFilename = selected.path.split('/').slice(1).join('/');
    const iFilename = rawFilename.endsWith('.enc') ? rawFilename.slice(0, -4) : rawFilename;
    setGeneratingIntermediaryReport(true);
    fetch('/api/vault/custody-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_intermediario', folder: iFolder, filename: iFilename }),
      credentials: 'include',
    }).then(r => r.json()).then(async rpt => {
      await fetch('/api/vault/custody-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_intermediary_done', folder: iFolder, filename: iFilename, reportId: rpt.reportId }),
        credentials: 'include',
      });
      await fetchCustodyState(iFolder, iFilename);
      notify('success', 'Relatório Intermediário gerado automaticamente.');
    }).catch(() => {
      autoIntermediaryFired.current = false;
      notify('error', 'Erro ao gerar Relatório Intermediário automaticamente.');
    }).finally(() => setGeneratingIntermediaryReport(false));
  }, [nowMs, custodyState, selected]);

  const selectFile = async (file: VaultFile) => {
    setSelected(file);
    setBurnLink("");
    setPassword("");
    setCustodyState(null);
    const parts = file.path.split('/');
    const fileFolder = parts[0];
    const fileFilename = parts.slice(1).join('/');
    // Custody state é salvo sem .enc — strip para lookup
    const plainFilename = fileFilename.endsWith('.enc') ? fileFilename.slice(0, -4) : fileFilename;
    if (parts.length >= 2) {
      fetchCustodyState(fileFolder, plainFilename);
      fetchCloudCustody(fileFolder, fileFilename);
      setFileCtx(fileFolder, fileFilename);
    }
    if (file.type === 'text') {
      setTextLoading(true);
      setTextContent("");
      try {
        const res = await fetch(`/api/vault/file?path=${encodeURIComponent(file.path)}`);
        const text = await res.text();
        setTextContent(text);
      } catch {
        setTextContent("[Erro ao carregar arquivo]");
      } finally {
        setTextLoading(false);
      }
    }
  };

  const createBurnToken = async () => {
    if (!selected) return;
    const parts = selected.path.split('/');
    const filename = parts[1];
    const folder = parts[0];
    try {
      const res = await fetch('/api/vault/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBurnLink(window.location.origin + data.url);
      logAction(selected.path, 'burn');
    } catch (e: any) {
      alert('Erro ao criar burn token: ' + e.message);
    }
  };

  const handleEncryption = async (type: 'encrypt' | 'decrypt') => {
    if (!selected || !password) {
      alert('Selecione um arquivo e defina uma senha.');
      return;
    }
    setProcessing(true);
    try {
      const parts = selected.path.split('/');
      const filename = parts[1];
      const folder = parts[0];
      const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename, password }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (type === 'encrypt') {
        setSessionEncrypted(prev => new Set([...prev, selected.path]));
        logAction(selected.path, 'encrypt');
        notify('success', `"${selected.name}" encriptado com AES-256. Arquivo .enc gerado na pasta.`);
        // Mark custody state as encrypted
        const [encFolder] = selected.path.split('/');
        const encFilename = selected.path.split('/').slice(1).join('/');
        fetch('/api/vault/custody-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_encrypted', folder: encFolder, filename: encFilename }),
          credentials: 'include',
        }).then(() => fetchCustodyState(encFolder, encFilename)).catch(() => {});
      } else {
        logAction(selected.path, 'decrypt');
        notify('success', `Arquivo decriptado com sucesso.`);
      }
      setPassword('');
      fetchFolders();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // ── Custódia Local (fetch + blob to fix download) ───────────────────────
  const handleCustodiaDownload = async () => {
    if (!selected) return;
    const [folder] = selected.path.split('/');

    // Arquivo R2: abre URL assinada diretamente (sem passar pelo Next.js)
    if (selected.r2) {
      setActionLoading('custod');
      try {
        const res = await fetch(`/api/vault/r2-download?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(selected.name)}`, { credentials: 'include' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const { url } = await res.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = selected.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        notify('success', `Download R2 iniciado: ${selected.name}`);
        logAction(selected.path, 'download');
      } catch (e: any) {
        notify('error', 'Erro ao gerar link R2: ' + e.message);
      } finally {
        setActionLoading('');
      }
      return;
    }

    // After encryption the original file is deleted; the actual file on disk is filename.enc
    const actualFilename = (sessionEncrypted.has(selected.path) && !selected.name.endsWith('.enc'))
      ? selected.name + '.enc'
      : selected.name;
    setActionLoading('custod');
    try {
      const url = `/api/download-bundle?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(actualFilename)}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : `COFRE_${selected.name}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      notify('success', 'Bundle ZIP gerado com sucesso! Verifique seus downloads.');
      setCustodiaDownloaded(prev => new Set([...prev, selected.path]));
      logAction(selected.path, 'download');
    } catch (e: any) {
      notify('error', 'Erro ao gerar bundle de custódia: ' + e.message);
    } finally {
      setActionLoading('');
    }
  };

  // ── File action handlers ────────────────────────────────────────────────
  const handleTrash = async () => {
    if (!selected) return;
    if (!confirm(`Enviar "${selected.name}" para a lixeira?`)) return;
    setActionLoading('trash');
    try {
      const res = await fetch(`/api/vault?path=${encodeURIComponent(selected.path)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      logAction(selected.path, 'trash');
      notify('success', `"${selected.name}" enviado para a lixeira.`);
      setSelected(null);
      fetchFolders();
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleBurnDelete = async () => {
    if (!burnDeleteTarget) return;
    setActionLoading('burn-delete');
    try {
      const res = await fetch('/api/vault/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'burn-delete', filePath: burnDeleteTarget }),
      });
      if (!res.ok) throw new Error('Falha ao excluir arquivo BURN');
      notify('success', 'Arquivo BURN excluído com registro de ciência no log de auditoria.');
      setBurnDeleteTarget(null);
      setBurnDeleteAck(false);
      setSelected(null);
      await fetchFolders();
    } catch (e: any) {
      notify('error', 'Erro: ' + e.message);
    } finally {
      setActionLoading('');
    }
  };

  const handlePermanentDelete = async () => {
    if (!selected) return;
    if (!confirm(`⚠️ Excluir "${selected.name}" PERMANENTEMENTE?\nEsta ação NÃO pode ser desfeita!`)) return;
    if (!confirm('Confirme novamente: exclusão permanente é irreversível!')) return;
    setActionLoading('delete');
    try {
      const res = await fetch('/api/vault/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'permanent-delete', filePath: selected.path }),
      });
      if (!res.ok) throw new Error(await res.text());
      logAction(selected.path, 'delete');
      notify('success', `"${selected.name}" excluído permanentemente.`);
      setSelected(null);
      fetchFolders();
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleOpenShare = () => {
    if (!selected) return;
    const [folder] = selected.path.split('/');
    const actualName = (sessionEncrypted.has(selected.path) && !selected.name.endsWith('.enc'))
      ? selected.name + '.enc'
      : selected.name;
    logAction(selected.path, 'share');
    setShareModal({ open: true, folder, filename: actualName });
  };

  const handleOpenVitrine = () => {
    if (!selected) return;
    const [folder] = selected.path.split('/');
    const actualName = (sessionEncrypted.has(selected.path) && !selected.name.endsWith('.enc'))
      ? selected.name + '.enc'
      : selected.name;
    setVitrineModal({ open: true, folder, filename: actualName });
  };

  const openVitrineCodesModal = async () => {
    if (!selected) return;
    const [folder] = selected.path.split('/');
    const filename = selected.path.split('/').slice(1).join('/');
    setVitrineCodesModal({ open: true, loading: true, codes: [] });
    try {
      const res = await fetch(`/api/vitrine/publish?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setVitrineCodesModal(prev => ({ ...prev, loading: false, codes: Array.isArray(data) ? data : [] }));
    } catch {
      setVitrineCodesModal(prev => ({ ...prev, loading: false }));
    }
  };

  const R2_THRESHOLD = 50 * 1024 * 1024; // 50MB

  const uploadViaR2 = async (file: File): Promise<void> => {
    // 1. Pede URL assinada ao servidor
    const presignRes = await fetch(
      `/api/vault/r2-presign?folder=${encodeURIComponent(uploadFolder)}&filename=${encodeURIComponent(file.name)}&size=${file.size}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}`
    );
    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao obter URL de upload R2');
    }
    const { presignedUrl, r2Key, filename } = await presignRes.json();

    // 2. Upload direto ao R2 com progresso (XHR para ter progresso real)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setR2UploadProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 upload retornou ${xhr.status}`)));
      xhr.onerror = () => reject(new Error('Erro de rede durante upload R2'));
      xhr.send(file);
    });

    // 3. Confirma no servidor (registra no banco + hash + timestamp)
    const confirmRes = await fetch('/api/vault/r2-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, folder: uploadFolder, filename, size: file.size }),
    });
    if (!confirmRes.ok) {
      const err = await confirmRes.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao confirmar upload R2');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadFolder || !e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = '';

    // ── Malware / executable check ─────────────────────────────────────────
    // Skip malware check for METADADOS LIMPOS (folder 12) — still process it
    const isMeta = uploadFolder === '12_NCFN-METADADOS-LIMPOS';
    if (!isMeta) {
      const suspicious = await detectSuspiciousFile(file);
      if (suspicious) {
        setSuspiciousFile({ open: true, name: file.name });
        return;
      }
    }

    // ── Arquivos grandes (>50MB) → upload direto ao Cloudflare R2 ──────────
    if (file.size > R2_THRESHOLD && !isMeta) {
      setActionLoading('upload');
      setR2UploadProgress(0);
      try {
        await uploadViaR2(file);
        notify('success', `"${file.name}" enviado para R2 (${(file.size / 1048576).toFixed(0)}MB).`);
        logAction(`${uploadFolder}/${file.name}`, 'upload');
        fetchFolders();
        setColetaAttest(false);
        setColetaByUser(false);
        setColetaDate('');
        setColetaModal({ open: true, folder: uploadFolder, filename: file.name, saving: false });
      } catch (e: any) {
        notify('error', e.message);
      } finally {
        setActionLoading('');
        setR2UploadProgress(null);
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', uploadFolder);
    setActionLoading('upload');
    try {
      const res = await fetch('/api/vault/actions', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());

      // METADADOS LIMPOS: server returns the cleaned file as a direct download
      if (isMeta) {
        const ct = res.headers.get('Content-Type') || '';
        if (ct.includes('octet-stream') || ct.includes('application/')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          notify('success', `Metadados removidos! "${file.name}" baixado com limpeza EXIF. Arquivo excluído do servidor.`);
        } else {
          notify('success', `"${file.name}" processado — metadados removidos.`);
        }
        return;
      }

      notify('success', `"${file.name}" enviado para ${FOLDER_LABELS[uploadFolder] || uploadFolder}.`);
      logAction(`${uploadFolder}/${file.name}`, 'upload');
      fetchFolders();
      // Show attestation modal (custody form)
      setColetaAttest(false);
      setColetaByUser(false);
      setColetaDate('');
      setColetaModal({ open: true, folder: uploadFolder, filename: file.name, saving: false });
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setActionLoading('');
    }
  };

  const saveColetaInfo = async (filled: boolean) => {
    setColetaModal(m => ({ ...m, saving: true }));
    const { folder, filename } = coletaModal;
    try {
      await fetch('/api/vault/coleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          folder,
          filename,
          filled,
          attestsVeracity: filled ? coletaAttest : false,
          collectedByUser: filled ? coletaByUser : false,
          collectionDate: filled ? coletaDate : null,
        }),
      });
    } catch {}
    setColetaModal(m => ({ ...m, open: false, saving: false }));

    // Mostra barra de carregamento e gera Relatório Inicial ANTES de encriptar
    setPreEncryptProgress(0);
    setPreEncryptLoading(true);

    // Anima a barra até 85% enquanto as APIs rodam
    let prog = 0;
    const ticker = setInterval(() => {
      prog = Math.min(prog + (prog < 60 ? 4 : prog < 80 ? 1.5 : 0.3), 85);
      setPreEncryptProgress(prog);
    }, 120);

    try {
      // 1 — Cria custody state (T0)
      await fetch('/api/vault/custody-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', folder, filename }),
        credentials: 'include',
      }).catch(() => {});

      // 2 — Gera Relatório Inicial (arquivo ainda original, não encriptado)
      const rpt = await fetch('/api/vault/custody-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_inicial', folder, filename }),
        credentials: 'include',
      }).then(r => r.json()).catch(() => null);

      if (rpt?.reportId) {
        await fetch('/api/vault/custody-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_initial_report', folder, filename, reportId: rpt.reportId }),
          credentials: 'include',
        }).catch(() => {});
      }
    } catch {}

    // Barra vai para 100% e fecha
    clearInterval(ticker);
    setPreEncryptProgress(100);
    await new Promise(r => setTimeout(r, 500));
    setPreEncryptLoading(false);
    setPreEncryptProgress(0);

    // Abre modal de encriptação
    setEncModalPassword('');
    setEncModalShowPw(false);
    setEncryptionModal({ open: true, folder, filename });
  };

  const handleGeneratePericia = async () => {
    if (!selected) return;
    setActionLoading('pericia');
    setPericiaStep(0);
    periciaIntervalRef.current = setInterval(() => {
      setPericiaStep(prev => Math.min(prev + 1, PERICIA_STEPS.length - 1));
    }, 1400);
    try {
      const res = await fetch('/api/vault/custody-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selected.path }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const pdfFilename = `NCFN_Pericia_${selected.name}_${Date.now()}.pdf`;
      logAction(selected.path, 'pericia');
      setGeneratedPericias(prev => new Set([...prev, selected.path]));
      // Show confirmation modal instead of auto-downloading
      setPericiaDownloadModal({ open: true, blobUrl, filename: pdfFilename });
      notify('success', 'Pericia gerada. Confirme o download.');

      // Trigger custody lifecycle T0 + Relatório Inicial (fire-and-forget)
      const [csFolder] = selected.path.split('/');
      const csFilenameRaw = selected.path.split('/').slice(1).join('/');
      const csFilename = csFilenameRaw.endsWith('.enc') ? csFilenameRaw.slice(0, -4) : csFilenameRaw;
      fetch('/api/vault/custody-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', folder: csFolder, filename: csFilename }),
        credentials: 'include',
      }).then(r => r.json()).then(async ({ state }) => {
        if (!state) return;
        // Generate Relatório Inicial
        const rpt = await fetch('/api/vault/custody-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_inicial', folder: csFolder, filename: csFilename }),
          credentials: 'include',
        }).then(r => r.json()).catch(() => null);
        if (rpt?.reportId) {
          await fetch('/api/vault/custody-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_initial_report', folder: csFolder, filename: csFilename, reportId: rpt.reportId }),
            credentials: 'include',
          }).catch(() => {});
        }
        fetchCustodyState(csFolder, csFilename);
      }).catch(() => {});

      // Also trigger the JSON pericia for /admin/pericia-arquivo (fire-and-forget)
      fetch('/api/pericia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selected.path }),
        credentials: 'include',
      }).catch(() => {});
    } catch (e: any) {
      notify('error', 'Erro ao gerar pericia: ' + e.message);
    } finally {
      clearInterval(periciaIntervalRef.current);
      setActionLoading('');
      setPericiaStep(0);
    }
  };

  const handlePrintPericia = async () => {
    if (!selected) return;
    setActionLoading('print');
    try {
      const res = await fetch('/api/vault/custody-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selected.path, print: true }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NCFN_Pericia_IMPRESSAO_${selected.name}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
      notify('success', 'Versao para impressao gerada com sucesso.');
    } catch (e: any) {
      notify('error', 'Erro ao gerar versao para impressao: ' + e.message);
    } finally {
      setActionLoading('');
    }
  };

  // ── Folder internal file modals ─────────────────────────────────────────
  const openInternalFile = async (folder: string, internalFile: string, type: 'log' | 'hash') => {
    const setter = type === 'log' ? setLogModal : setHashModal;
    setter({ open: true, folder, content: '', loading: true });
    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(folder + '/' + internalFile)}`, { credentials: 'include' });
      const text = await res.text();
      setter(prev => ({ ...prev, content: text, loading: false }));
    } catch {
      setter(prev => ({ ...prev, content: '[Erro ao carregar arquivo]', loading: false }));
    }
  };

  const downloadInternalFile = (folder: string, internalFile: string, content: string) => {
    const now = new Date();
    const sha256 = Array.from(new Uint8Array(
      // simple hash via TextEncoder trick — compute client side
    )).join('');
    const header = [
      '=========================================================',
      'NCFN — REGISTRO DE ACESSO AO ARQUIVO INTERNO',
      `Data/Hora Download : ${now.toISOString()}`,
      `Operador           : ${operatorEmail}`,
      `Pasta              : ${folder}`,
      `Arquivo            : ${internalFile}`,
      '=========================================================',
      '',
    ].join('\n');
    const enriched = header + content;
    const blob = new Blob([enriched], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NCFN_${folder}_${internalFile}_${now.getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    logAction(`${folder}/${internalFile}`, 'download');
  };

  const totalFiles = Object.values(folders).reduce((sum, f) => sum + f.files.filter(f => !f.name.startsWith('_')).length, 0);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-black/80 text-[#00f3ff] font-mono text-sm">
      <div className="flex items-center gap-3">
        <ShieldAlert className="animate-pulse" size={24} />
        Autenticando sessão · Vault Forense NCFN...
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center bg-black/80 text-red-500 font-mono gap-4">
      <ShieldAlert size={48} />
      <h1 className="text-xl font-bold">Bloqueio de Segurança</h1>
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  // Derived states for prerequisites
  const isEncrypted = selected ? (selected.type === 'encrypted' || sessionEncrypted.has(selected.path)) : false;
  const hasReport = selected ? (generatedPericias.has(selected.path) || !!custodyState?.initialReportId) : false;
  const canDownloadZip = isEncrypted && hasReport;

  return (
    <div className="flex h-screen bg-transparent text-[#00f3ff] font-sans overflow-hidden">

      {/* Hidden file input */}
      <input ref={uploadRef} type="file" className="hidden" onChange={handleUpload} />

      {/* ── Log / Hash floating modals ─────────────────────────────────── */}
      {[{ modal: logModal, setModal: setLogModal, title: 'LOGS DA PASTA', internalFile: '_registros_acesso.txt', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/20' },
        { modal: hashModal, setModal: setHashModal, title: 'HASHES DA PASTA', internalFile: '_hashes_vps.txt', color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-950/20' }
      ].map(({ modal, setModal, title, internalFile, color, border, bg }) => modal.open && (
        <div key={title} className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-gray-950 ${border} border rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] shadow-2xl`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest ${color} flex items-center gap-2`}>
                {title === 'LOGS DA PASTA' ? <Eye size={14} /> : <Hash size={14} />}
                {title} — {modal.folder}
              </h3>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} className="text-gray-600 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {modal.loading
                ? <p className="text-gray-500 text-xs font-mono text-center py-8">Carregando...</p>
                : <pre className="text-[11px] font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed">{modal.content || '(arquivo vazio ou não encontrado)'}</pre>
              }
            </div>
            <div className={`px-5 py-3 border-t ${border} flex justify-end`}>
              <button
                onClick={() => downloadInternalFile(modal.folder, internalFile, modal.content)}
                disabled={modal.loading || !modal.content}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${border} ${bg} ${color} hover:opacity-80 transition-all disabled:opacity-40`}>
                <Download size={12} /> Baixar com Registro de Acesso
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Pericia progress overlay */}
      {actionLoading === 'pericia' && (
        <div className="fixed inset-0 z-[150] bg-black/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-violet-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-violet-950/40 border-b border-violet-500/30 px-6 py-4 flex items-center gap-3">
              <ShieldAlert size={20} className="text-violet-400 animate-pulse flex-shrink-0" />
              <div>
                <h2 className="text-violet-200 font-black text-sm uppercase tracking-widest">Perito Sansao — Analise Forense</h2>
                <p className="text-violet-500 text-[10px] font-mono mt-0.5">Protocolo NCFN v2.0 — Custodia Digital</p>
              </div>
            </div>
            {/* Steps list */}
            <div className="px-6 py-4 space-y-2">
              {PERICIA_STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-[11px] font-mono transition-all duration-500 ${
                  i < periciaStep ? 'text-emerald-400 opacity-70' :
                  i === periciaStep ? 'text-violet-200 opacity-100' :
                  'text-gray-700 opacity-50'
                }`}>
                  {i < periciaStep ? (
                    <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" />
                  ) : i === periciaStep ? (
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full border border-gray-700 flex-shrink-0" />
                  )}
                  {step}
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="px-6 pb-5">
              <div className="bg-gray-900 rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-500 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${Math.round(((periciaStep + 1) / PERICIA_STEPS.length) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-gray-600">
                <span>Perito Sansao executando script forense...</span>
                <span>{Math.round(((periciaStep + 1) / PERICIA_STEPS.length) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encrypted file download warning */}
      {encDownloadWarning && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-red-500/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-red-950/40 border-b border-red-500/30 px-5 py-4 flex items-center gap-3">
              <Lock size={18} className="text-red-400 flex-shrink-0" />
              <h3 className="text-red-300 font-black text-sm uppercase tracking-widest">Arquivo Encriptado</h3>
            </div>
            <div className="px-5 py-5 text-center">
              <Lock size={40} className="text-orange-400/60 mx-auto mb-3" />
              <p className="text-white font-bold text-sm mb-2">PARA BAIXAR O ARQUIVO ORIGINAL É PRECISO DESCRIPTÁ-LO</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Este arquivo está protegido com criptografia AES-256. Informe a Chave AES-256 no campo acima e clique em <strong className="text-emerald-400">Decriptar</strong> para recuperar o original antes de fazer o download.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setEncDownloadWarning(false)}
                className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-xs font-bold transition-all">
                Fechar
              </button>
              <a href={`/api/vault/file?path=${encodeURIComponent(selected?.path || '')}`} download={selected?.name}
                onClick={() => setEncDownloadWarning(false)}
                className="flex-1 py-2 rounded-xl bg-orange-900/40 border border-orange-600/40 text-orange-300 hover:text-white text-xs font-bold text-center transition-all">
                Baixar Mesmo Assim (.enc)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Post-upload Attestation Modal (#COLETA) */}
      {coletaModal.open && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-cyan-500/30 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-cyan-950/40 border-b border-cyan-500/20 px-5 py-4 flex items-center gap-3">
              <FileCheck2 size={18} className="text-cyan-400 flex-shrink-0" />
              <div>
                <h3 className="text-cyan-300 font-black text-sm uppercase tracking-widest">Atestado de Coleta — #COLETA</h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-xs">{coletaModal.filename}</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <p className="text-gray-400 text-xs leading-relaxed border-l-2 border-cyan-500/40 pl-3">
                As informações abaixo integrarão o <span className="text-cyan-300 font-bold">Relatório Pericial</span> na seção <span className="text-cyan-300 font-mono">#COLETA</span>, garantindo a rastreabilidade da origem do vestígio digital conforme o <span className="text-white font-bold">Art. 158-B do CPP</span>.
              </p>

              {/* Checkbox 1 */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setColetaAttest(v => !v)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    coletaAttest ? 'bg-cyan-600 border-cyan-400' : 'border-gray-600 hover:border-cyan-500'
                  }`}
                >
                  {coletaAttest && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Você atesta a veracidade deste arquivo?</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Declaro que este arquivo é autêntico e foi obtido de forma lícita.</p>
                </div>
              </label>

              {/* Checkbox 2 */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setColetaByUser(v => !v)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    coletaByUser ? 'bg-cyan-600 border-cyan-400' : 'border-gray-600 hover:border-cyan-500'
                  }`}
                >
                  {coletaByUser && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Este arquivo foi coletado por você?</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Confirmo que realizei pessoalmente a coleta deste vestígio digital.</p>
                </div>
              </label>

              {/* Date field */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Data da Coleta</label>
                <input
                  type="date"
                  value={coletaDate}
                  onChange={e => setColetaDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white text-sm font-mono outline-none transition-colors"
                />
                <p className="text-gray-600 text-[10px] mt-1">Data em que o vestígio foi originalmente coletado/capturado na fonte.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2 border-t border-gray-800 pt-4">
              <button
                onClick={() => saveColetaInfo(false)}
                disabled={coletaModal.saving}
                className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-500 hover:text-gray-300 text-xs font-bold transition-all"
              >
                Fechar sem preencher
              </button>
              <button
                onClick={() => saveColetaInfo(true)}
                disabled={coletaModal.saving}
                className="flex-1 py-2 rounded-xl bg-cyan-900/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/70 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <FileCheck2 size={13} />
                {coletaModal.saving ? 'Salvando...' : 'Confirmar Atestado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pericia download confirmation modal */}
      {periciaDownloadModal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-gray-950 border border-violet-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-violet-900/30 border border-violet-500/30 rounded-xl">
                <FileCheck2 size={20} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Relatório / Perícia Gerado</h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">Documento forense pronto para download</p>
              </div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-3 mb-4">
              <p className="text-[10px] font-mono text-gray-400 truncate">{periciaDownloadModal.filename}</p>
            </div>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              O relatório pericial foi gerado com sucesso. Deseja fazer o download agora?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (periciaDownloadModal.blobUrl) URL.revokeObjectURL(periciaDownloadModal.blobUrl);
                  setPericiaDownloadModal({ open: false, blobUrl: null, filename: '' });
                }}
                className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-500 hover:text-gray-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!periciaDownloadModal.blobUrl) return;
                  const a = document.createElement('a');
                  a.href = periciaDownloadModal.blobUrl;
                  a.download = periciaDownloadModal.filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(periciaDownloadModal.blobUrl!), 10000);
                  setPericiaDownloadModal({ open: false, blobUrl: null, filename: '' });
                  notify('success', 'Download iniciado.');
                }}
                className="flex-1 py-2 rounded-xl bg-violet-900/40 border border-violet-500/40 text-violet-300 hover:bg-violet-900/70 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download size={13} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal — DISPONIBILIZAR ATIVO PARA TERCEIROS */}
      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal(s => ({ ...s, open: false }))}
        folder={shareModal.folder}
        filename={shareModal.filename}
        notify={notify}
      />

      {/* Vitrine Publish modal */}
      {vitrineModal.open && (
        <VitrinePublishModal
          folder={vitrineModal.folder}
          filename={vitrineModal.filename}
          onClose={() => setVitrineModal(s => ({ ...s, open: false }))}
          notify={notify}
        />
      )}

      {/* Notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            : <XCircle size={16} className="text-red-400 flex-shrink-0" />}
          {notification.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && selected?.type === 'image' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={32} /></button>
          <img src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} alt={selected.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Ampliar — fullscreen preview with zoom */}
      {ampliar && selected && (
        <div className="fixed inset-0 z-[200] bg-black/97 flex items-center justify-center p-4"
          onClick={() => { setAmpliar(false); setAmpliarZoom(1); }}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white z-10" onClick={() => { setAmpliar(false); setAmpliarZoom(1); }}>
            <X size={32} />
          </button>
          <p className="absolute top-4 left-4 text-white/40 text-xs font-mono truncate max-w-[60vw]">{selected.name}</p>
          {selected.type === 'image' && (
            <div className="relative flex items-center justify-center w-full h-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <img
                src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                alt={selected.name}
                style={{ transform: `scale(${ampliarZoom})`, transformOrigin: 'center', transition: 'transform 0.1s' }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onWheel={e => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    setAmpliarZoom(prev => Math.min(Math.max(prev - e.deltaY * 0.002, 0.2), 8));
                  }
                }}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-300 font-mono pointer-events-none">
                {Math.round(ampliarZoom * 100)}% · Ctrl+scroll para zoom
              </div>
            </div>
          )}
          {selected.type === 'pdf' && (
            <div className="w-full h-full" onClick={e => e.stopPropagation()}>
              <iframe src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                className="w-full h-full rounded-xl border border-white/10" title={selected.name} />
            </div>
          )}
          {selected.type === 'video' && (
            <div className="flex items-center justify-center w-full h-full" onClick={e => e.stopPropagation()}>
              <video controls autoPlay className="max-w-full max-h-full rounded-xl border border-white/10"
                src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} />
            </div>
          )}
          {selected.type === 'text' && (
            <div className="w-full h-full overflow-auto bg-black/50 rounded-xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{textContent}</pre>
            </div>
          )}
          {(selected.type !== 'image' && selected.type !== 'pdf' && selected.type !== 'video' && selected.type !== 'text') && (
            <div className="text-center text-gray-400 space-y-3" onClick={e => e.stopPropagation()}>
              <File size={64} className="mx-auto text-gray-600" />
              <p className="text-sm">Prévia ampliada não disponível para este tipo de arquivo.</p>
              <p className="text-xs font-mono text-gray-600 break-all max-w-md">SHA256: {selected.hash}</p>
            </div>
          )}
        </div>
      )}

      {/* Vitrine Codes Modal */}
      {vitrineCodesModal.open && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-violet-500/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-violet-950/40 border-b border-violet-500/30 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key size={16} className="text-violet-400 flex-shrink-0" />
                <h3 className="text-violet-200 font-black text-sm uppercase tracking-widest">Códigos de Vitrine</h3>
              </div>
              <button onClick={() => setVitrineCodesModal(prev => ({ ...prev, open: false }))} className="text-gray-600 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              {vitrineCodesModal.loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={20} className="animate-spin text-violet-400" />
                </div>
              ) : vitrineCodesModal.codes.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8 font-mono">Nenhum código publicado para este arquivo.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {vitrineCodesModal.codes.map(code => (
                    <div key={code.id} className={`flex items-center gap-3 p-3 rounded-xl border ${code.active ? 'border-violet-500/30 bg-violet-950/20' : 'border-white/5 bg-black/20 opacity-60'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{code.recipientName}</p>
                        <p className="text-[10px] text-gray-500 font-mono">Código #{code.passwordIndex} · {new Date(code.publishedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded flex-shrink-0 ${code.active ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-600 border border-gray-700'}`}>
                        {code.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Mobile hamburger — positioned below sticky header (~56px) */}
      <button
        className="lg:hidden fixed z-40 p-2.5 bg-black/90 border border-[#00f3ff]/20 rounded-xl shadow-lg backdrop-blur-md"
        style={{ top: 'calc(56px + 0.75rem)', left: '0.75rem' }}
        onClick={() => setSidebarOpen(v => !v)}
        aria-label="Abrir menu de arquivos"
      >
        {sidebarOpen ? <X size={18} className="text-[#00f3ff]" /> : <Menu size={18} className="text-[#00f3ff]" />}
      </button>

      {/* Sidebar — width capped to viewport on mobile */}
      <div className={`fixed lg:relative z-40 lg:z-auto h-full transition-transform duration-300 w-[min(24rem,calc(100vw-0.5rem))] border-r border-white/10 flex flex-col glass-panel rounded-r-2xl my-2 ml-2 overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <button onClick={() => { setSelected(null); fetchFolders(); }}
            className="flex items-center gap-2 text-[#00f3ff] hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(0,243,255,0.5)] w-full text-left"
            title="Clique para recarregar o Cofre">
            <ShieldAlert size={20} />
            <h2 className="text-base font-bold leading-tight">COFRE / BUNKER DIGITAL · NCFN</h2>
          </button>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">{totalFiles} ativos em custódia certificada</p>
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all mt-2 w-full justify-center">
            <HelpCircle size={14} /> Como funciona
          </button>
          {/* Navigation row 1 */}
          <div className="flex gap-1 mt-2">
            <button onClick={() => { setSelected(null); }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-cyan-500 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-800/30 transition-all uppercase tracking-wide">
              <BarChart2 size={9} /> Grafo
            </button>
            <button onClick={() => cofrePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-purple-500 hover:text-purple-300 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-800/30 transition-all uppercase tracking-wide">
              <Shield size={9} /> Log's
            </button>
            <button onClick={() => router.push('/admin/laudo-forense')}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-violet-500 hover:text-violet-300 bg-violet-950/20 hover:bg-violet-950/40 border border-violet-800/30 transition-all uppercase tracking-wide">
              <BookOpen size={9} /> Relatórios
            </button>
          </div>
          {/* Navigation row 2 */}
          <div className="flex gap-1 mt-1">
            <button onClick={() => router.push('/vitrine')}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-green-500 hover:text-green-300 bg-green-950/20 hover:bg-green-950/40 border border-green-800/30 transition-all uppercase tracking-wide">
              <Globe size={9} /> Vitrine
            </button>
            <button onClick={() => router.push('/admin/lixeira')}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-yellow-600 hover:text-yellow-400 bg-yellow-950/20 hover:bg-yellow-950/40 border border-yellow-800/30 transition-all uppercase tracking-wide">
              <Trash2 size={9} /> Lixeira
            </button>
          </div>
        </div>

        {/* Open / Close all */}
        <div className="flex gap-1 px-2 py-1.5 border-b border-white/10 flex-shrink-0">
          <button onClick={openAllFolders} className="flex-1 flex items-center justify-center gap-1 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#00f3ff] rounded text-[10px] font-medium transition-all">
            <ChevronsDown size={10} /> Abrir todas
          </button>
          <button onClick={closeAllFolders} className="flex-1 flex items-center justify-center gap-1 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 rounded text-[10px] font-medium transition-all">
            <ChevronsUp size={10} /> Fechar todas
          </button>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(folders).map(([folderName, folder]) => {
            const isOpen = openFolders.has(folderName);
            const label = FOLDER_LABELS[folderName] || folderName;
            const isBurn = folderName === '100_BURN_IMMUTABILITY';
            const fColor = isBurn ? '#f97316' : folderColor(folderName);
            return (
              <div key={folderName} className="mb-1">
                <button onClick={() => toggleFolder(folderName)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs font-semibold uppercase tracking-wide ${isOpen ? 'bg-white/5' : 'hover:bg-white/3'}`}
                  style={{ color: isOpen ? fColor : undefined }}>
                  {isOpen ? <ChevronDown size={12} style={{ color: fColor }} /> : <ChevronRight size={12} className="text-gray-500" />}
                  {isOpen
                    ? <FolderOpen size={14} style={{ color: fColor }} />
                    : <Folder size={14} style={{ color: `${fColor}80` }} />}
                  <span className="flex-1 truncate" style={{ color: isOpen ? fColor : '#9ca3af' }}>{label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                    style={folder.files.filter(f => !f.name.startsWith('_')).length > 0
                      ? { background: `${fColor}18`, color: fColor }
                      : { background: 'rgba(255,255,255,0.04)', color: '#4b5563' }}>
                    {folder.files.filter(f => !f.name.startsWith('_')).length}
                  </span>
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                    {folder.files.filter(f => !f.name.startsWith('_')).length === 0 ? (
                      <p className="text-[10px] text-gray-600 italic px-2 py-1">Pasta vazia</p>
                    ) : folder.files.filter(f => !f.name.startsWith('_')).map(file => (
                      <button key={file.path} onClick={() => selectFile(file)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all text-xs ${
                          selected?.path === file.path ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}>
                        <FileTypeIcon type={file.type} size={12} />
                        <span className="flex-1 truncate font-mono text-[10px]">{file.name}</span>
                        {file.r2 && <span className="text-[8px] text-sky-400 font-bold bg-sky-900/30 px-1 rounded border border-sky-700/30 flex-shrink-0">☁R2</span>}
                      </button>
                    ))}
                    {folderName === '12_NCFN-METADADOS-LIMPOS' ? (
                      <button onClick={() => { setUploadFolder(folderName); uploadRef.current?.click(); }}
                        disabled={actionLoading === 'upload'}
                        className="w-full flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] text-green-400/80 hover:text-green-300 bg-green-950/20 hover:bg-green-950/40 transition-all border border-dashed border-green-700/40 hover:border-green-500/50 font-semibold">
                        <Upload size={10} /> {actionLoading === 'upload' && uploadFolder === folderName ? 'Removendo metadados...' : 'Limpar metadados (1-download)'}
                      </button>
                    ) : folderName !== '7_NCFN-CAPTURAS-WEB_OSINT' && (
                      <button onClick={() => { setUploadFolder(folderName); uploadRef.current?.click(); }}
                        disabled={actionLoading === 'upload'}
                        className="w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-md text-[10px] text-[#00f3ff]/80 hover:text-[#00f3ff] bg-[#00f3ff]/5 hover:bg-[#00f3ff]/10 transition-all border border-dashed border-[#00f3ff]/25 hover:border-[#00f3ff]/50 font-semibold shadow-[0_0_8px_rgba(0,243,255,0.05)]">
                        <span className="flex items-center gap-1">
                          <Upload size={10} />
                          {actionLoading === 'upload' && uploadFolder === folderName
                            ? (r2UploadProgress !== null ? `R2 ${r2UploadProgress}%` : 'Enviando...')
                            : 'Enviar arquivo aqui'}
                        </span>
                        {actionLoading === 'upload' && uploadFolder === folderName && r2UploadProgress !== null && (
                          <div className="w-full bg-[#00f3ff]/10 rounded-full h-1 overflow-hidden">
                            <div className="bg-[#00f3ff] h-1 rounded-full transition-all duration-300" style={{ width: `${r2UploadProgress}%` }} />
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col m-2 ml-4 glass-panel rounded-2xl">
        {selected ? (
          <div className="flex flex-col h-full">
            {/* File header */}
            <div className="flex-shrink-0 p-5 border-b border-white/10 overflow-y-auto max-h-[60vh]">

              {/* File name + meta — centered */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileTypeIcon type={selected.type} size={20} />
                  <h1 className="text-lg font-bold text-white">{selected.name}</h1>
                  {selected.r2 && <span className="text-[9px] text-sky-300 font-bold bg-sky-900/40 px-2 py-0.5 rounded-full border border-sky-600/40">☁ Cloudflare R2</span>}
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
                  <span className="flex items-center gap-1"><Hash size={10} />{selected.hash.slice(0, 32)}...</span>
                  <span className="flex items-center gap-1"><HardDrive size={10} />{formatBytes(selected.size)}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{new Date(selected.modifiedAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* ── Action buttons: Visualizar / Histórico / Relatórios / Lixeira ── */}
              <div className="flex justify-center gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => { setVisualizarOriginal(true); setVisualizarZoom(1); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 rounded-lg text-xs transition-all border border-blue-700/30">
                  <Eye size={12} /> Visualizar Original
                </button>
                <button
                  onClick={() => cofrePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 rounded-lg text-xs transition-all border border-purple-700/30">
                  <History size={12} /> Linha do Tempo
                </button>
                <button
                  onClick={() => router.push('/admin/laudo-forense?from=' + encodeURIComponent(selected.path))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-900/30 hover:bg-violet-800/40 text-violet-400 rounded-lg text-xs transition-all border border-violet-700/30">
                  <BookOpen size={12} /> Central de Relatórios
                </button>
                <button onClick={handleTrash} disabled={actionLoading === 'trash'}
                  className="flex items-center gap-1 px-3 py-1.5 bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 rounded-lg text-xs transition-all border border-yellow-700/30 disabled:opacity-50">
                  <Trash2 size={12} /> {actionLoading === 'trash' ? '...' : 'Lixeira'}
                </button>
                <button onClick={handlePermanentDelete} disabled={actionLoading === 'delete'}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded-lg text-xs transition-all border border-red-700/30 disabled:opacity-50">
                  <X size={12} /> {actionLoading === 'delete' ? '...' : 'Excluir'}
                </button>
              </div>

              {/* ── Relatórios de Custódia (Inicial / Intermediário / Final) ── */}
              <div className="space-y-1.5 mb-6">

                {/* RELATÓRIO INICIAL */}
                <div className={`flex flex-col rounded-lg border border-l-4 transition-all duration-300 ${
                  custodyState?.initialReportId
                    ? 'border-white/5 border-l-emerald-500/60 bg-black'
                    : 'border-[#00f3ff]/15 border-l-[#00f3ff]/40 bg-[#05101e]'
                }`}>
                  <div className="flex items-center gap-3 pl-3 pr-2 py-2">
                    {custodyState?.initialReportId
                      ? <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                      : <FileCheck2 size={13} className="text-[#00f3ff]/60 flex-shrink-0" />
                    }
                    <span className={`text-xs font-bold flex-1 ${custodyState?.initialReportId ? 'text-gray-500' : 'text-[#00f3ff]/70'}`}>
                      Relatório Inicial
                    </span>
                    {custodyState?.initialReportId ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-emerald-500 font-mono mr-1">Gerado</span>
                        <button
                          onClick={() => handleViewReport(custodyState.initialReportId!, 'Relatório Inicial')}
                          disabled={loadingViewReport === custodyState.initialReportId}
                          className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 rounded border border-cyan-700/30 transition-all disabled:opacity-40"
                        >
                          <Eye size={8} /> {loadingViewReport === custodyState.initialReportId ? '...' : 'Digital'}
                        </button>
                        <button
                          onClick={() => handleViewReportPrint(custodyState.initialReportId!, 'Relatório Inicial')}
                          disabled={loadingViewReport === custodyState.initialReportId}
                          className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-600/30 transition-all disabled:opacity-40"
                        >
                          <FileText size={8} /> Impressão
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600 font-mono">Gerado após encriptação</span>
                    )}
                  </div>
                  {/* Ações disponíveis enquanto Intermediário não foi gerado */}
                  {custodyState?.initialReportId && !custodyState?.intermediaryReportDone && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Senha ZIP:</span>
                        <span className="text-[10px] text-[#00f3ff]/60 font-mono font-bold bg-[#00f3ff]/5 px-1.5 py-0.5 rounded border border-[#00f3ff]/15">ncfn</span>
                      </div>
                      <button onClick={handleCustodiaDownload} disabled={actionLoading === 'custod'}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-[#00f3ff]/15 hover:bg-[#00f3ff]/25 border-[#00f3ff]/40 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.08)]">
                        <PackageCheck size={13} />
                        {actionLoading === 'custod' ? 'Gerando ZIP...' : 'CUSTÓDIA LOCAL · BACKUP'}
                      </button>
                      {cloudCustodyChecked && !cloudCustody?.google_drive && (
                        <button onClick={() => handleCloudCustody('google_drive')} disabled={cloudCustodyLoading}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-sky-900/20 hover:bg-sky-800/35 border-sky-600/40 text-sky-400 disabled:opacity-50">
                          {cloudCustodyLoading ? <><Loader2 size={11} className="animate-spin" /> Enviando...</> : <><CloudUpload size={12} /> DRIVE · GOOGLE</>}
                        </button>
                      )}
                      {cloudCustodyChecked && cloudCustody?.google_drive && (
                        <div className="flex flex-col gap-1 p-2 rounded-lg border border-sky-700/30 bg-sky-950/20">
                          <div className="flex items-center gap-1.5">
                            <Cloud size={9} className="text-sky-400 shrink-0" />
                            <span className="text-[9px] text-sky-300 font-bold uppercase tracking-wider">Google Drive · Ativa</span>
                          </div>
                          <a href={cloudCustody.google_drive.driveLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-200 font-mono truncate">
                            <ExternalLink size={8} /> Ver no Drive
                          </a>
                          <button onClick={() => handleDownloadCloudKey(cloudCustody.google_drive.id, selected?.name || 'arquivo')}
                            className="flex items-center justify-center gap-1 py-1 rounded text-[9px] font-bold border border-amber-700/40 bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 transition-all">
                            <Key size={9} /> Chave AES
                          </button>
                        </div>
                      )}
                      {cloudCustodyChecked && !cloudCustody?.internxt && (
                        <button onClick={() => handleCloudCustody('internxt')} disabled={cloudCustodyLoading}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-violet-900/20 hover:bg-violet-800/35 border-violet-600/40 text-violet-400 disabled:opacity-50">
                          {cloudCustodyLoading ? <><Loader2 size={11} className="animate-spin" /> Enviando...</> : <><CloudUpload size={12} /> INTERNXT · CRIPTOGRAFADO</>}
                        </button>
                      )}
                      {cloudCustodyChecked && cloudCustody?.internxt && (
                        <div className="flex flex-col gap-1 p-2 rounded-lg border border-violet-700/30 bg-violet-950/20">
                          <div className="flex items-center gap-1.5">
                            <Cloud size={9} className="text-violet-400 shrink-0" />
                            <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider">Internxt · Ativa</span>
                          </div>
                          <span className="text-[9px] text-violet-400/70 font-mono truncate">{cloudCustody.internxt.driveFileName}</span>
                          <button onClick={() => handleDownloadCloudKey(cloudCustody.internxt.id, selected?.name || 'arquivo')}
                            className="flex items-center justify-center gap-1 py-1 rounded text-[9px] font-bold border border-amber-700/40 bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 transition-all">
                            <Key size={9} /> Chave AES
                          </button>
                        </div>
                      )}
                      <button onClick={handleOpenShare}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border bg-green-900/20 hover:bg-green-800/30 border-green-700/40 text-green-400">
                        <Globe size={12} />
                        DISPONIBILIZAR PARA TERCEIROS
                      </button>
                      <button onClick={handleOpenVitrine}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border bg-violet-900/20 hover:bg-violet-800/30 border-violet-700/40 text-violet-400">
                        <Share2 size={12} />
                        PUBLICAR NA VITRINE
                      </button>
                    </div>
                  )}
                </div>

                {/* RELATÓRIO INTERMEDIÁRIO (auto-gerado quando timer 2h completa) */}
                {custodyState && !custodyState.intermediaryReportDone && (() => {
                  const t0 = new Date(custodyState.custodyStartedAt).getTime();
                  const secsPassed = (nowMs - t0) / 1000;
                  const ready = secsPassed >= 7200; // 2h
                  const progress = Math.min((secsPassed / 7200) * 100, 100);
                  const remaining = Math.max(0, 7200 - secsPassed);
                  const remH = Math.floor(remaining / 3600);
                  const remMin = Math.floor((remaining % 3600) / 60);
                  const remSec = Math.floor(remaining % 60);
                  return (
                    <div className={`flex flex-col gap-2 pl-3 pr-2 py-2 rounded-lg border border-l-4 transition-all duration-300 ${
                      ready ? 'border-amber-500/30 border-l-amber-400 bg-amber-950/10' : 'border-white/4 border-l-white/10 bg-black'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Clock size={13} className={ready ? 'text-amber-400 flex-shrink-0' : 'text-gray-700 flex-shrink-0'} />
                        <span className={`text-xs font-bold flex-1 ${ready ? 'text-amber-200' : 'text-gray-600'}`}>
                          Relatório Intermediário
                        </span>
                        {ready ? (
                          <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono animate-pulse">
                            <Loader2 size={10} className="animate-spin" />
                            {generatingIntermediaryReport ? 'Gerando...' : 'Aguardando...'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600 font-mono">
                            {remH > 0 ? `${remH}h ` : ''}{remMin}min {String(remSec).padStart(2,'0')}s
                          </span>
                        )}
                      </div>
                      <div className="mx-8 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${ready ? 'bg-amber-400' : 'bg-amber-500/50'}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })()}

                {/* RELATÓRIO INTERMEDIÁRIO — já gerado */}
                {custodyState?.intermediaryReportDone && (
                  <div className="flex flex-col rounded-lg border border-l-4 border-white/5 border-l-amber-500/60 bg-black">
                    <div className="flex items-center gap-3 pl-3 pr-2 py-2">
                      <CheckCircle size={13} className="text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-bold flex-1 text-gray-500">Relatório Intermediário</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-amber-500/70 font-mono mr-1">Gerado</span>
                        {custodyState?.intermediaryReportId && (
                          <>
                            <button
                              onClick={() => handleViewReport(custodyState.intermediaryReportId!, 'Relatório Intermediário')}
                              disabled={loadingViewReport === custodyState.intermediaryReportId}
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 rounded border border-amber-700/30 transition-all disabled:opacity-40"
                            >
                              <Eye size={8} /> {loadingViewReport === custodyState.intermediaryReportId ? '...' : 'Digital'}
                            </button>
                            <button
                              onClick={() => handleViewReportPrint(custodyState.intermediaryReportId!, 'Relatório Intermediário')}
                              disabled={loadingViewReport === custodyState.intermediaryReportId}
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-600/30 transition-all disabled:opacity-40"
                            >
                              <FileText size={8} /> Impressão
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Ações disponíveis enquanto Relatório Final não foi gerado */}
                    {!custodyState?.finalReportAt && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Senha ZIP:</span>
                          <span className="text-[10px] text-[#00f3ff]/60 font-mono font-bold bg-[#00f3ff]/5 px-1.5 py-0.5 rounded border border-[#00f3ff]/15">ncfn</span>
                        </div>
                        <button onClick={handleCustodiaDownload} disabled={actionLoading === 'custod'}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-[#00f3ff]/15 hover:bg-[#00f3ff]/25 border-[#00f3ff]/40 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.08)]">
                          <PackageCheck size={13} />
                          {actionLoading === 'custod' ? 'Gerando ZIP...' : 'CUSTÓDIA LOCAL · BACKUP'}
                        </button>
                        {/* CUSTÓDIA NA NUVEM — Google Drive */}
                        {cloudCustodyChecked && !cloudCustody?.google_drive && (
                          <button onClick={() => handleCloudCustody('google_drive')} disabled={cloudCustodyLoading}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-sky-900/20 hover:bg-sky-800/35 border-sky-600/40 text-sky-400 disabled:opacity-50">
                            {cloudCustodyLoading ? <><Loader2 size={11} className="animate-spin" /> Enviando...</> : <><CloudUpload size={12} /> DRIVE · GOOGLE</>}
                          </button>
                        )}
                        {cloudCustodyChecked && cloudCustody?.google_drive && (
                          <div className="flex flex-col gap-1 p-2 rounded-lg border border-sky-700/30 bg-sky-950/20">
                            <div className="flex items-center gap-1.5">
                              <Cloud size={9} className="text-sky-400 shrink-0" />
                              <span className="text-[9px] text-sky-300 font-bold uppercase tracking-wider">Google Drive · Ativa</span>
                              <span className="ml-auto text-[9px] text-gray-600 font-mono">{new Date(cloudCustody.google_drive.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <a href={cloudCustody.google_drive.driveLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-200 font-mono truncate">
                              <ExternalLink size={8} /> Ver no Drive
                            </a>
                            <button onClick={() => handleDownloadCloudKey(cloudCustody.google_drive.id, selected?.name || 'arquivo')}
                              className="flex items-center justify-center gap-1 py-1 rounded text-[9px] font-bold border border-amber-700/40 bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 transition-all">
                              <Key size={9} /> Chave AES
                            </button>
                          </div>
                        )}
                        {/* CUSTÓDIA NA NUVEM — Internxt (criptografada) */}
                        {cloudCustodyChecked && !cloudCustody?.internxt && (
                          <button onClick={() => handleCloudCustody('internxt')} disabled={cloudCustodyLoading}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-violet-900/20 hover:bg-violet-800/35 border-violet-600/40 text-violet-400 disabled:opacity-50">
                            {cloudCustodyLoading ? <><Loader2 size={11} className="animate-spin" /> Enviando...</> : <><CloudUpload size={12} /> INTERNXT · CRIPTOGRAFADO</>}
                          </button>
                        )}
                        {cloudCustodyChecked && cloudCustody?.internxt && (
                          <div className="flex flex-col gap-1 p-2 rounded-lg border border-violet-700/30 bg-violet-950/20">
                            <div className="flex items-center gap-1.5">
                              <Cloud size={9} className="text-violet-400 shrink-0" />
                              <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider">Internxt · Ativa</span>
                              <span className="ml-auto text-[9px] text-gray-600 font-mono">{new Date(cloudCustody.internxt.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <span className="text-[9px] text-violet-400/70 font-mono truncate">{cloudCustody.internxt.driveFileName}</span>
                            <button onClick={() => handleDownloadCloudKey(cloudCustody.internxt.id, selected?.name || 'arquivo')}
                              className="flex items-center justify-center gap-1 py-1 rounded text-[9px] font-bold border border-amber-700/40 bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 transition-all">
                              <Key size={9} /> Chave AES
                            </button>
                          </div>
                        )}
                        <button onClick={handleOpenShare}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border bg-green-900/20 hover:bg-green-800/30 border-green-700/40 text-green-400">
                          <Globe size={12} />
                          DISPONIBILIZAR PARA TERCEIROS
                        </button>
                        <button onClick={handleOpenVitrine}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border bg-violet-900/20 hover:bg-violet-800/30 border-violet-700/40 text-violet-400">
                          <Share2 size={12} />
                          PUBLICAR NA VITRINE
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* RELATÓRIO FINAL (disponível 48h após intermediário) */}
                {custodyState?.intermediaryReportDone && !custodyState.finalReportAt && (() => {
                  const intAt = custodyState.intermediaryReportAt
                    ? new Date(custodyState.intermediaryReportAt).getTime()
                    : new Date(custodyState.custodyStartedAt).getTime();
                  const secsPassed = (nowMs - intAt) / 1000;
                  const ready = secsPassed >= 172800; // 48h
                  const progress = Math.min((secsPassed / 172800) * 100, 100);
                  const remaining = Math.max(0, 172800 - secsPassed);
                  const remH = Math.floor(remaining / 3600);
                  const remMin = Math.floor((remaining % 3600) / 60);

                  const handleFinalReport = async () => {
                    if (!selected) return;
                    setGeneratingFinalReport(true);
                    try {
                      const [fFolder] = selected.path.split('/');
                      const fFilenameRaw = selected.path.split('/').slice(1).join('/');
                      const fFilename = fFilenameRaw.endsWith('.enc') ? fFilenameRaw.slice(0, -4) : fFilenameRaw;
                      const rpt = await fetch('/api/vault/custody-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'generate_final', folder: fFolder, filename: fFilename }),
                        credentials: 'include',
                      }).then(r => r.json());
                      await fetch('/api/vault/custody-state', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'mark_final_done', folder: fFolder, filename: fFilename, reportId: rpt.reportId }),
                        credentials: 'include',
                      });
                      await fetchCustodyState(fFolder, fFilename);
                      notify('success', 'Relatório Final gerado. Disponível em /admin/laudo-forense por 5 horas.');
                    } catch { notify('error', 'Erro ao gerar Relatório Final.'); }
                    finally { setGeneratingFinalReport(false); }
                  };

                  return (
                    <div className={`flex flex-col gap-2 pl-3 pr-2 py-2 rounded-lg border border-l-4 transition-all duration-300 ${
                      ready ? 'border-red-500/20 border-l-red-400 bg-red-950/10' : 'border-white/4 border-l-white/10 bg-black'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Shield size={13} className={ready ? 'text-red-400 flex-shrink-0' : 'text-gray-700 flex-shrink-0'} />
                        <span className={`text-xs font-bold flex-1 ${ready ? 'text-red-200' : 'text-gray-600'}`}>
                          Relatório Final
                        </span>
                        {ready ? (
                          <button
                            onClick={handleFinalReport}
                            disabled={generatingFinalReport}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border border-red-500/50 text-red-100 bg-red-900/20 hover:bg-red-900/35 transition-all disabled:opacity-40"
                          >
                            <Shield size={11} />
                            {generatingFinalReport ? 'Gerando...' : 'Gerar agora'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-600 font-mono">
                            {remH}h {remMin}min
                          </span>
                        )}
                      </div>
                      {!ready && (
                        <div className="mx-8 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500/40 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* RELATÓRIO FINAL — já gerado */}
                {custodyState?.finalReportAt && (() => {
                  const expiresAt = custodyState.finalReportExpiresAt ? new Date(custodyState.finalReportExpiresAt).getTime() : null;
                  const remaining = expiresAt ? Math.max(0, (expiresAt - nowMs) / 1000) : null;
                  const remH = remaining !== null ? Math.floor(remaining / 3600) : null;
                  const remMin = remaining !== null ? Math.floor((remaining % 3600) / 60) : null;
                  const expired = remaining !== null && remaining <= 0;
                  return (
                    <div className="flex flex-col rounded-lg border border-l-4 border-white/5 border-l-red-500/60 bg-black">
                      <div className="flex items-center gap-3 pl-3 pr-2 py-2">
                        <CheckCircle size={13} className="text-red-400 flex-shrink-0" />
                        <span className="text-xs font-bold flex-1 text-gray-500">Relatório Final</span>
                        <div className="flex items-center gap-1.5">
                          {remaining !== null && !expired && (
                            <span className="text-[10px] text-amber-600 font-mono">expira {remH}h {remMin}min</span>
                          )}
                          {expired && (
                            <span className="text-[10px] text-red-500 font-mono">Expirado</span>
                          )}
                          {!expired && custodyState?.finalReportId && (
                            <>
                              <button
                                onClick={() => handleViewReport(custodyState.finalReportId!, 'Relatório Final')}
                                disabled={loadingViewReport === custodyState.finalReportId}
                                className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-700/30 transition-all disabled:opacity-40"
                              >
                                <Eye size={8} /> {loadingViewReport === custodyState.finalReportId ? '...' : 'Digital'}
                              </button>
                              <button
                                onClick={() => handleViewReportPrint(custodyState.finalReportId!, 'Relatório Final')}
                                disabled={loadingViewReport === custodyState.finalReportId}
                                className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-600/30 transition-all disabled:opacity-40"
                              >
                                <FileText size={8} /> Impressão
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Ações disponíveis no Relatório Final */}
                      {!expired && (
                        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Senha ZIP:</span>
                            <span className="text-[10px] text-[#00f3ff]/60 font-mono font-bold bg-[#00f3ff]/5 px-1.5 py-0.5 rounded border border-[#00f3ff]/15">ncfn</span>
                          </div>
                          <button onClick={handleCustodiaDownload} disabled={actionLoading === 'custod'}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all border bg-[#00f3ff]/15 hover:bg-[#00f3ff]/25 border-[#00f3ff]/40 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.08)]">
                            <PackageCheck size={13} />
                            {actionLoading === 'custod' ? 'Gerando ZIP...' : 'CUSTÓDIA LOCAL · BACKUP'}
                          </button>
                          <button onClick={handleOpenShare}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border bg-green-900/20 hover:bg-green-800/30 border-green-700/40 text-green-400">
                            <Globe size={12} />
                            DISPONIBILIZAR PARA TERCEIROS
                          </button>
                          <button onClick={handleOpenVitrine}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border bg-violet-900/20 hover:bg-violet-800/30 border-violet-700/40 text-violet-400">
                            <Share2 size={12} />
                            PUBLICAR NA VITRINE
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* LAUDO MANUAL — disponível após FINAL concluído, apenas 1 */}
                {custodyState?.finalReportAt && !custodyState.manualReportDone && (() => {
                  const handleManualReport = async () => {
                    if (!selected) return;
                    setGeneratingManualReport(true);
                    try {
                      const [mFolder] = selected.path.split('/');
                      const mFilenameRaw = selected.path.split('/').slice(1).join('/');
                      const mFilename = mFilenameRaw.endsWith('.enc') ? mFilenameRaw.slice(0, -4) : mFilenameRaw;
                      const rpt = await fetch('/api/vault/custody-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'generate_manual', folder: mFolder, filename: mFilename }),
                        credentials: 'include',
                      }).then(r => r.json());
                      if (rpt.error) throw new Error(rpt.error);
                      await fetch('/api/vault/custody-state', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'mark_manual_done', folder: mFolder, filename: mFilename, reportId: rpt.reportId }),
                        credentials: 'include',
                      });
                      await fetchCustodyState(mFolder, mFilename);
                      notify('success', 'Nova Leitura Manual gerada com sucesso.');
                    } catch (e: any) { notify('error', e.message || 'Erro ao gerar laudo manual.'); }
                    finally { setGeneratingManualReport(false); }
                  };
                  return (
                    <div className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg border border-l-4 border-emerald-500/20 border-l-emerald-400 bg-emerald-950/10 mt-1">
                      <RefreshCw size={13} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-xs font-bold flex-1 text-emerald-200">Nova Leitura Manual</span>
                      <button
                        onClick={handleManualReport}
                        disabled={generatingManualReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border border-emerald-500/50 text-emerald-100 bg-emerald-600/20 hover:bg-emerald-600/35 transition-all disabled:opacity-40"
                      >
                        <FileSearch size={11} />
                        {generatingManualReport ? 'Gerando...' : 'Gerar Nova Leitura'}
                      </button>
                    </div>
                  );
                })()}

                {/* LAUDO MANUAL — já gerado */}
                {custodyState?.manualReportDone && (
                  <div className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg border border-l-4 border-white/5 border-l-emerald-500/60 bg-black mt-1">
                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold flex-1 text-gray-500">Laudo Manual (Nova Leitura)</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-emerald-500/70 font-mono mr-1">Gerado</span>
                      {custodyState?.manualReportId && (
                        <>
                          <button
                            onClick={() => handleViewReport(custodyState.manualReportId!, 'Laudo Manual')}
                            disabled={loadingViewReport === custodyState.manualReportId}
                            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 rounded border border-emerald-700/30 transition-all disabled:opacity-40"
                          >
                            <Eye size={8} /> {loadingViewReport === custodyState.manualReportId ? '...' : 'Digital'}
                          </button>
                          <button
                            onClick={() => handleViewReportPrint(custodyState.manualReportId!, 'Laudo Manual')}
                            disabled={loadingViewReport === custodyState.manualReportId}
                            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-600/30 transition-all disabled:opacity-40"
                          >
                            <FileText size={8} /> Impressão
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Ver Códigos de Compartilhamento */}
              {canDownloadZip && (
                <div className="mb-3">
                  <button
                    onClick={openVitrineCodesModal}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl font-bold text-xs transition-all border border-violet-700/20 bg-violet-950/10 hover:bg-violet-950/25 text-violet-500 hover:text-violet-300"
                  >
                    <Key size={11} />
                    Ver Códigos de Compartilhamento na Vitrine
                  </button>
                </div>
              )}

              {/* Burn link */}
              {burnLink && (
                <div className="mb-3 p-3 bg-orange-950/30 border border-orange-500/30 rounded-lg flex items-center gap-2">
                  <Flame size={14} className="text-orange-400 flex-shrink-0" />
                  <span className="text-orange-300 text-xs font-mono break-all flex-1">{burnLink}</span>
                  <button onClick={() => setBurnLink("")} className="text-gray-500 hover:text-white flex-shrink-0"><X size={14} /></button>
                </div>
              )}

            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-auto p-6">
              {selected.type === 'image' && (
                <div className="flex items-start justify-center">
                  <img src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} alt={selected.name}
                    className="max-w-full rounded-xl shadow-2xl border border-white/10 cursor-zoom-in" onClick={() => setLightbox(true)} />
                </div>
              )}
              {selected.type === 'pdf' && (
                <iframe src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                  className="w-full h-full rounded-xl border border-white/10" title={selected.name} />
              )}
              {selected.type === 'text' && (
                <div className="max-w-3xl mx-auto">
                  {textLoading ? (
                    <p className="text-gray-500 text-sm font-mono animate-pulse">Carregando documento...</p>
                  ) : (
                    <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
              {selected.type === 'video' && (
                <div className="flex justify-center">
                  <video controls className="max-w-full max-h-[70vh] rounded-xl border border-white/10"
                    src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} />
                </div>
              )}
              {selected.type === 'audio' && (
                <div className="flex justify-center pt-8">
                  <audio controls className="w-full max-w-lg" src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`} />
                </div>
              )}
              {selected.type === 'encrypted' && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <Lock size={64} className="text-orange-400/50" />
                  <h3 className="text-xl font-bold text-orange-400">Ativo Cifrado · AES-256</h3>
                  <p className="text-gray-500 text-sm">Informe a chave de blindagem AES-256 acima para descriptografar.</p>
                  <p className="font-mono text-[10px] text-gray-600 max-w-sm break-all">SHA256: {selected.hash}</p>
                </div>
              )}
              {selected.type === 'binary' && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <File size={64} className="text-gray-500/40" />
                  <h3 className="text-lg font-bold text-gray-400">Arquivo Binário</h3>
                  <p className="text-gray-600 text-sm">Prévia não disponível. Use Baixar Arquivo Individual para acessar.</p>
                  <p className="font-mono text-[10px] text-gray-600 max-w-sm break-all">SHA256: {selected.hash}</p>
                </div>
              )}
              {selected.type === 'capture' && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <Eye size={64} className="text-cyan-500/40" />
                  <h3 className="text-lg font-bold text-cyan-400">Arquivo de Captura Forense</h3>
                  <p className="text-gray-500 text-sm">Arquivo HAR/WACZ — use o Replay.io ou WarcArchive para visualizar.</p>
                  <p className="font-mono text-[10px] text-gray-600 max-w-sm break-all">SHA256: {selected.hash}</p>
                </div>
              )}
            </div>

            {/* ── Cofre Audit Panel ── */}
            <div ref={cofrePanelRef}>
              {(() => {
                const parts = selected.path.split('/');
                const f = parts[0];
                const fn = parts.slice(1).join('/');
                return <CofrePanel folder={f} filename={fn} custodyState={custodyState} />;
              })()}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-2 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono">
              <Key size={10} />
              CADEIA DE CUSTÓDIA · SHA-256 + AES-256-CBC + HMAC · NEXUS CLOUD FORENSIC NETWORK
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-y-auto">

            {/* ── Linha superior: Folder cards + Painel Analítico ── */}
            <div className="flex overflow-visible border-b border-white/5">

              {/* Coluna esquerda: Vault info + folder cards */}
              <div className="flex flex-col items-center justify-center text-center p-6 gap-4 w-80 flex-shrink-0 border-r border-white/5">
                <ShieldAlert size={56} className="text-[#00f3ff]/20" />
                <h2 className="text-lg font-bold text-white/30">Vault Forense NCFN</h2>
                <p className="text-gray-600 text-xs max-w-xs">
                  Selecione uma categoria e um ativo forense para visualização segura com controle SHA-256.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {Object.entries(folders).map(([key, f]) => {
                    const fc = folderColor(key);
                    return (
                    <div key={key} className="flex flex-col gap-1">
                      <button onClick={() => setOpenFolders(new Set([key]))}
                        className="w-full glass-panel p-2.5 rounded-xl border transition-all text-center"
                        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${fc}40`}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'}>
                        <Folder size={16} className="mx-auto mb-1" style={{ color: `${fc}90` }} />
                        <p className="text-[9px] truncate leading-tight" style={{ color: `${fc}bb` }}>{FOLDER_LABELS[key]?.split('·')[1]?.trim() || key}</p>
                        <p className="text-base font-bold" style={{ color: fc }}>{f.files.filter(ff => !ff.name.startsWith('_')).length}</p>
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => openInternalFile(key, '_registros_acesso.txt', 'log')} title="Ver Logs da Pasta"
                          className="flex-1 flex items-center justify-center py-1 rounded-lg text-[9px] text-amber-500/70 hover:text-amber-400 bg-amber-950/10 hover:bg-amber-950/30 border border-amber-800/20 transition-all">
                          <Eye size={9} />
                        </button>
                        <button onClick={() => openInternalFile(key, '_hashes_vps.txt', 'hash')} title="Hashes desta Pasta"
                          className="flex-1 flex items-center justify-center py-1 rounded-lg text-[9px] text-violet-500/70 hover:text-violet-400 bg-violet-950/10 hover:bg-violet-950/30 border border-violet-800/20 transition-all">
                          <Hash size={9} />
                        </button>
                      </div>
                    </div>
                  );})}
                </div>
              </div>

              {/* Coluna direita: Painel Analítico */}
              <div className="flex-1 min-w-0 p-4">
                <AdminCharts
                  files={Object.values(folders).flatMap(f => f.files).filter(file => !file.name.startsWith('_')).map(file => ({
                    folder: file.path.split('/')[0],
                    filename: file.name,
                    size: file.size,
                    mtime: file.modifiedAt || new Date().toISOString(),
                    isPublic: false,
                  }))}
                />
              </div>
            </div>

            {/* ── Linha inferior: Grafo de Custódia Digital (largura total) ── */}
            <div className="flex flex-col" style={{ minHeight: '520px' }}>
              {/* Header */}
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-black/20">
                <BarChart2 size={13} className="text-[#00f3ff]" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex-1">
                  Grafo de Custódia Digital · Mapa dos Ativos
                </span>
                <select
                  value={graphFolder}
                  onChange={e => setGraphFolder(e.target.value)}
                  className="text-[10px] bg-black/40 border border-white/10 text-gray-300 rounded-lg px-2 py-1 outline-none hover:border-[#00f3ff]/40 focus:border-[#00f3ff]/60 transition-colors"
                >
                  <option value="">Todas as pastas</option>
                  {Object.keys(folders).sort().map(fname => (
                    <option key={fname} value={fname}>{FOLDER_LABELS[fname] || fname}</option>
                  ))}
                </select>
              </div>

              {/* Grafo — altura fixa generosa para visualização completa */}
              <div className="flex-1" style={{ minHeight: '480px' }}>
                <VaultGraphDiagram
                  files={(graphFolder
                    ? (folders[graphFolder]?.files ?? [])
                    : Object.values(folders).flatMap(f => f.files)
                  ).filter(file => !file.name.startsWith('_')).map(file => ({
                    folder: file.path.split('/')[0],
                    filename: file.name,
                    size: file.size,
                    mtime: new Date().toISOString(),
                    isPublic: false,
                  }))}
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Modal: Confirmação de Exclusão BURN ── */}
      {burnDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-red-500/50 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-black text-red-400 text-sm uppercase tracking-widest">Exclusão de Cópia BURN</h3>
                <p className="text-gray-500 text-xs mt-0.5">Esta ação é irreversível e auditada</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed border border-orange-500/20 rounded-xl p-4 bg-orange-500/5">
              <p className="font-bold text-orange-400">⚠ ATENÇÃO — LEIA COM ATENÇÃO ANTES DE CONFIRMAR:</p>
              <p>Ao excluir este arquivo da pasta <strong className="text-white">100 · BURN / IMUTABILIDADE</strong>, o sistema deixará de guardar registros físicos deste arquivo.</p>
              <p>Apenas o <strong className="text-orange-400">log de exclusão</strong> e o <strong className="text-orange-400">log de ciência da exclusão</strong> serão mantidos permanentemente no banco de dados de auditoria.</p>
              <p className="text-red-400 font-bold">Esta ação não pode ser desfeita. O arquivo não poderá ser recuperado.</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={burnDeleteAck}
                onChange={e => setBurnDeleteAck(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-red-500"
              />
              <span className="text-xs text-gray-300">
                <strong className="text-white">Estou ciente</strong> de que a exclusão é permanente, que o sistema não mais guardará registros físicos deste arquivo, e que apenas os logs de auditoria serão mantidos.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => { setBurnDeleteTarget(null); setBurnDeleteAck(false); }}
                className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 text-xs font-bold hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBurnDelete}
                disabled={!burnDeleteAck || actionLoading === 'burn-delete'}
                className="flex-1 py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-600/50 text-red-300 text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {actionLoading === 'burn-delete' ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspicious File Modal ── */}
      {suspiciousFile.open && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-red-500/50 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-red-950/60 border-b border-red-500/30 px-5 py-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400 animate-pulse flex-shrink-0" />
              <div>
                <h3 className="text-red-200 font-black text-sm uppercase tracking-widest">Arquivo Suspeito Detectado</h3>
                <p className="text-[10px] text-red-700 font-mono mt-0.5">Protocolo de Segurança NCFN — Bloqueio Automático</p>
              </div>
            </div>
            <div className="px-6 py-6 text-center space-y-4">
              <AlertTriangle size={48} className="text-red-500 mx-auto" />
              <div>
                <p className="text-white font-black text-base mb-1">Upload Rejeitado</p>
                <p className="text-red-400 text-xs font-mono break-all">"{suspiciousFile.name}"</p>
              </div>
              <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-4 text-xs text-red-300 text-left space-y-2">
                <p className="font-bold text-red-200">O arquivo foi identificado como suspeito:</p>
                <p>• Assinatura de executável detectada (PE/ELF/Mach-O/Script)</p>
                <p>• Arquivos executáveis e scripts não são permitidos no Cofre Forense</p>
                <p className="text-red-500 font-bold mt-2">O arquivo NÃO foi carregado no sistema.</p>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setSuspiciousFile({ open: false, name: '' })}
                className="w-full py-2.5 rounded-xl bg-red-900/30 border border-red-600/40 text-red-300 hover:bg-red-900/50 text-sm font-black transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pre-Encrypt Loading Overlay (Geração do Relatório Inicial) ── */}
      {preEncryptLoading && (
        <div className="fixed inset-0 z-[195] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            {/* Ícone */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center">
              <FileCheck2 size={28} className="text-emerald-400" />
            </div>
            {/* Título */}
            <div className="text-center">
              <p className="text-white font-black text-base tracking-wide uppercase">Gerando Relatório Inicial</p>
              <p className="text-gray-500 text-xs mt-1 font-mono">Analisando e catalogando o arquivo forense...</p>
            </div>
            {/* Barra de progresso */}
            <div className="w-full">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${preEncryptProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-600 font-mono">Relatório Inicial</span>
                <span className="text-[10px] text-emerald-500 font-mono">{Math.round(preEncryptProgress)}%</span>
              </div>
            </div>
            {/* Steps */}
            <div className="w-full space-y-2">
              {[
                { label: 'Calculando hashes SHA-256 / SHA-1 / MD5', done: preEncryptProgress > 20 },
                { label: 'Extraindo metadados e EXIF', done: preEncryptProgress > 45 },
                { label: 'Gerando documento forense PDF', done: preEncryptProgress > 70 },
                { label: 'Registrando na cadeia de custódia', done: preEncryptProgress > 90 },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {step.done
                    ? <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                    : <div className="w-3 h-3 rounded-full border border-gray-700 flex-shrink-0" />
                  }
                  <span className={`text-xs font-mono transition-colors ${step.done ? 'text-gray-300' : 'text-gray-600'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mandatory Encryption Modal ── */}
      {encryptionModal.open && (
        <div className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-orange-500/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-orange-950/50 border-b border-orange-500/30 px-5 py-4 flex items-center gap-3">
              <Lock size={18} className="text-orange-400 flex-shrink-0" />
              <div>
                <h3 className="text-orange-200 font-black text-sm uppercase tracking-widest">Encriptação Obrigatória</h3>
                <p className="text-[10px] text-orange-800 font-mono mt-0.5 truncate max-w-xs">{encryptionModal.filename}</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3 text-xs text-amber-300 leading-relaxed">
                <p className="font-black text-amber-200 mb-1">Senha obrigatória!</p>
                <p>Não esqueça essa senha, pois <strong className="text-white">sem ela não será possível reverter a encriptação futuramente</strong>.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Senha de Encriptação AES-256</label>
                <div className="relative">
                  <input
                    type={encModalShowPw ? 'text' : 'password'}
                    value={encModalPassword}
                    onChange={e => setEncModalPassword(e.target.value)}
                    placeholder="Crie uma senha segura..."
                    className="w-full bg-black border border-orange-600/40 focus:border-orange-400 text-white text-sm px-4 py-3 pr-10 rounded-xl focus:outline-none transition-all"
                  />
                  <button type="button" onClick={() => setEncModalShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-400 transition-colors">
                    {encModalShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {encModalPassword.length > 0 && encModalPassword.length < 4 && (
                  <p className="text-red-500 text-[10px] mt-1 font-mono">Mínimo 4 caracteres</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Confirmar Senha</label>
                <div className="relative">
                  <input
                    type={encModalShowConfirm ? 'text' : 'password'}
                    value={encModalConfirm}
                    onChange={e => setEncModalConfirm(e.target.value)}
                    placeholder="Repita a senha..."
                    className={`w-full bg-black border text-white text-sm px-4 py-3 pr-10 rounded-xl focus:outline-none transition-all ${
                      encModalConfirm.length > 0 && encModalConfirm !== encModalPassword
                        ? 'border-red-600/60 focus:border-red-400'
                        : encModalConfirm.length >= 4 && encModalConfirm === encModalPassword
                        ? 'border-emerald-600/60 focus:border-emerald-400'
                        : 'border-orange-600/40 focus:border-orange-400'
                    }`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && encModalPassword.length >= 4 && encModalPassword === encModalConfirm)
                        handleAutoEncryptAndReport(encryptionModal.folder, encryptionModal.filename, encModalPassword);
                    }}
                  />
                  <button type="button" onClick={() => setEncModalShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-400 transition-colors">
                    {encModalShowConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {encModalConfirm.length > 0 && encModalConfirm !== encModalPassword && (
                  <p className="text-red-500 text-[10px] mt-1 font-mono">As senhas não coincidem</p>
                )}
                {encModalConfirm.length >= 4 && encModalConfirm === encModalPassword && (
                  <p className="text-emerald-500 text-[10px] mt-1 font-mono">✓ Senhas conferem</p>
                )}
              </div>
              <p className="text-[10px] text-gray-600 font-mono text-center">
                Após confirmar: o arquivo será encriptado e o Relatório Inicial gerado automaticamente.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => handleAutoEncryptAndReport(encryptionModal.folder, encryptionModal.filename, encModalPassword)}
                disabled={encModalPassword.length < 4 || encModalPassword !== encModalConfirm || autoEncrypting}
                className="w-full py-3 rounded-xl bg-orange-900/30 border border-orange-500/40 text-orange-200 hover:bg-orange-900/50 font-black text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {autoEncrypting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                    Encriptando e gerando relatório inicial...
                  </>
                ) : (
                  <><Lock size={16} /> Confirmar Encriptação</>
                )}
              </button>
              <p className="text-[10px] text-gray-700 text-center mt-2 font-mono">Esta janela não pode ser fechada sem inserir a senha</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Visualizar Original Modal ── */}
      {visualizarOriginal && selected && (
        <div className="fixed inset-0 z-[200] bg-black/97 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/80">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-[#00f3ff]" />
              <span className="text-[#00f3ff] font-bold text-sm truncate max-w-sm">{selected.name}</span>
              <span className="text-[9px] text-red-400/80 font-mono bg-red-950/30 border border-red-800/30 px-2 py-0.5 rounded uppercase tracking-widest">NCFN · ARQUIVO SOB CUSTÓDIA FORENSE</span>
            </div>
            <div className="flex items-center gap-2">
              {selected.type === 'image' && (
                <>
                  <button onClick={() => setVisualizarZoom(v => Math.max(v - 0.25, 0.25))}
                    className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white text-xs border border-white/10 transition-all">−</button>
                  <span className="text-xs text-gray-500 font-mono w-10 text-center">{Math.round(visualizarZoom * 100)}%</span>
                  <button onClick={() => setVisualizarZoom(v => Math.min(v + 0.25, 8))}
                    className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white text-xs border border-white/10 transition-all">+</button>
                </>
              )}
              <button onClick={() => { setVisualizarOriginal(false); setVisualizarZoom(1); }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border border-white/10 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Content — no download, watermark overlay */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6 relative">
            {/* Watermark diagonal */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
              <p className="text-red-500/8 font-black text-6xl tracking-widest rotate-[-35deg] select-none whitespace-nowrap">
                NCFN · ARQUIVO SOB CUSTÓDIA FORENSE
              </p>
            </div>
            {(() => {
              // Constrói caminho para o original preservado em .originals/
              const parts = selected.path.split('/');
              const selFolder = parts[0];
              const selFile = parts.slice(1).join('/');
              const plainName = selFile.endsWith('.enc') ? selFile.slice(0, -4) : selFile;
              const origPath = `${selFolder}/.originals/${plainName}`;
              const origSrc = `/api/vault/file?path=${encodeURIComponent(origPath)}`;
              const fallbackSrc = `/api/vault/file?path=${encodeURIComponent(selected.path)}`;
              // Para encrypted: usa origPath. Para outros: usa path normal
              const isEnc = selected.type === 'encrypted';
              const src = isEnc ? origSrc : fallbackSrc;
              // Tipo efetivo para renderizar (usa extensão do arquivo original)
              const effectiveType = isEnc
                ? (() => {
                    const ext = plainName.split('.').pop()?.toLowerCase() || '';
                    if (['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return 'image';
                    if (ext === 'pdf') return 'pdf';
                    if (['mp4','mov','avi','webm'].includes(ext)) return 'video';
                    if (['txt','md','log','json','xml','csv'].includes(ext)) return 'text';
                    return 'binary';
                  })()
                : selected.type;
              return (
                <>
                  {effectiveType === 'image' && (
                    <img src={src} alt={selected.name}
                      style={{ transform: `scale(${visualizarZoom})`, transformOrigin: 'center', transition: 'transform 0.15s' }}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                      onContextMenu={e => e.preventDefault()} draggable={false} />
                  )}
                  {effectiveType === 'pdf' && (
                    <iframe src={src} className="w-full h-full rounded-xl border border-white/10" title={selected.name} />
                  )}
                  {effectiveType === 'video' && (
                    <video controls className="max-w-full max-h-full rounded-xl border border-white/10"
                      src={src} controlsList="nodownload" onContextMenu={e => e.preventDefault()} />
                  )}
                  {effectiveType === 'text' && (
                    <div className="w-full max-w-4xl bg-black/50 rounded-xl border border-white/10 p-6 overflow-auto">
                      <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed select-none">{textContent}</pre>
                    </div>
                  )}
                  {effectiveType === 'binary' && (
                    <div className="text-center space-y-3">
                      <Lock size={64} className="text-orange-400/40 mx-auto" />
                      <p className="text-orange-400 font-bold">Tipo de arquivo não suportado para visualização</p>
                      <p className="text-xs text-gray-600 font-mono">{plainName}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Report PDF Viewer Modal (Inicial / Intermediário / Final) ── */}
      {reportViewModal.open && reportViewModal.url && (
        <div className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-sm flex flex-col p-4">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#bc13fe]/15 rounded-lg border border-[#bc13fe]/30">
                <FileText className="w-4 h-4 text-[#bc13fe]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">{reportViewModal.title}</h3>
                <p className="text-[10px] text-gray-500 font-mono">NCFN · Relatório de Custódia Forense</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={reportViewModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-all"
              >
                <ExternalLink size={11} /> Nova aba
              </a>
              <a
                href={reportViewModal.url}
                download={`NCFN_${reportViewModal.title.replace(/\s+/g,'_')}_${Date.now()}.pdf`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bc13fe]/20 hover:bg-[#bc13fe]/35 border border-[#bc13fe]/40 text-[#bc13fe] rounded-lg text-xs font-bold transition-all"
              >
                <Download size={11} /> Baixar PDF
              </a>
              <button
                onClick={() => { if (reportViewModal.url) URL.revokeObjectURL(reportViewModal.url); setReportViewModal({ open: false, url: null, title: '' }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-lg text-xs transition-all"
              >
                <X size={13} /> Fechar
              </button>
            </div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative bg-gray-900">
            <iframe
              src={reportViewModal.url}
              className="w-full h-full border-0"
              title={reportViewModal.title}
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>
      )}

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
              <p>O Vault possui <strong className="text-white">12 zonas de custódia</strong> (0–10 + 12) organizadas por nível de sensibilidade, mais a zona especial <code>100 · BURN</code> para imutabilidade permanente.</p>
              <p>Para <strong className="text-white">criptografar</strong> um arquivo, selecione-o e use Encriptação AES-256. O original é preservado em <code>.originals/</code> e substituído pelo <code>.enc</code> na zona.</p>
              <p><strong className="text-white">Gerar Perícia</strong> cria relatório forense com hash SHA-256/SHA-1/MD5, metadados EXIF, análise de entropia e carimbo RFC 3161 — admissível judicialmente. O ciclo segue: Inicial → Intermediário → Final → Laudo Manual.</p>
              <p><strong className="text-white">Cloud Custody</strong> envia o ativo encriptado para o R2 da Cloudflare, gerando link imutável e registrando a custódia na nuvem. <strong className="text-white">Disponibilizar</strong> torna o arquivo público na Vitrine para compartilhamento autorizado com código de acesso de 6 dígitos.</p>
              <p>A zona <strong className="text-white">7 · Capturas Web/OSINT</strong> recebe automaticamente capturas forenses da web. Todos os acessos ao Vault são registrados nos logs de auditoria com IP, operador e timestamp UTC.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
