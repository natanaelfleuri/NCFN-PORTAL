"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Folder, FolderOpen, FileText, ShieldAlert, Key, Flame, Lock, Unlock,
  Image as ImageIcon, FileVideo, FileAudio, File, Eye, EyeOff, Download,
  ChevronDown, ChevronRight, Hash, Clock, HardDrive, X, ZoomIn,
  FileSearch, Shield, AlertTriangle, Menu, ChevronsDown, ChevronsUp,
  Trash2, Upload, Globe, FileCheck2, CheckCircle, XCircle, CheckCircle2,
  ArrowRight, PackageCheck, Printer, HelpCircle, Share2, RefreshCw,
} from "lucide-react";
import ShareModal from "./ShareModal";

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
  '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS':   '11 · Compartilhamento c/ Terceiros',
  '12_NCFN-METADADOS-LIMPOS':                  '12 · Metadados Limpos',
  '100_BURN_IMMUTABILITY':                     '100 · Burn / Imutabilidade',
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
      setSelected(fileObj);
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

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const openAllFolders = () => setOpenFolders(new Set(Object.keys(folders)));
  const closeAllFolders = () => setOpenFolders(new Set());

  const selectFile = async (file: VaultFile) => {
    setSelected(file);
    setBurnLink("");
    setPassword("");
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadFolder || !e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', uploadFolder);
    setActionLoading('upload');
    try {
      const res = await fetch('/api/vault/actions', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      notify('success', `"${file.name}" enviado para ${FOLDER_LABELS[uploadFolder] || uploadFolder}.`);
      logAction(`${uploadFolder}/${file.name}`, 'upload');
      fetchFolders();
      // Show attestation modal for all folders except folder 7
      if (uploadFolder !== '7_NCFN-CAPTURAS-WEB_OSINT') {
        setColetaAttest(false);
        setColetaByUser(false);
        setColetaDate('');
        setColetaModal({ open: true, folder: uploadFolder, filename: file.name, saving: false });
      }
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setActionLoading('');
      e.target.value = '';
    }
  };

  const saveColetaInfo = async (filled: boolean) => {
    setColetaModal(m => ({ ...m, saving: true }));
    try {
      await fetch('/api/vault/coleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          folder: coletaModal.folder,
          filename: coletaModal.filename,
          filled,
          attestsVeracity: filled ? coletaAttest : false,
          collectedByUser: filled ? coletaByUser : false,
          collectionDate: filled ? coletaDate : null,
        }),
      });
    } catch {}
    setColetaModal(m => ({ ...m, open: false, saving: false }));
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
  const hasReport = selected ? generatedPericias.has(selected.path) : false;
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

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Mobile hamburger */}
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black/80 border border-white/10 rounded-xl" onClick={() => setSidebarOpen(v => !v)}>
        <Menu size={18} className="text-[#00f3ff]" />
      </button>

      {/* Sidebar */}
      <div className={`fixed lg:relative z-40 lg:z-auto h-full transition-transform duration-300 w-96 border-r border-white/10 flex flex-col glass-panel rounded-r-2xl my-2 ml-2 overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
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
            return (
              <div key={folderName} className="mb-1">
                <button onClick={() => toggleFolder(folderName)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs font-semibold uppercase tracking-wide ${isOpen ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/3'}`}>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {isOpen ? <FolderOpen size={14} className={isBurn ? 'text-orange-400' : 'text-[#00f3ff]'} /> : <Folder size={14} className={isBurn ? 'text-orange-400/60' : 'text-[#00f3ff]/60'} />}
                  <span className="flex-1 truncate">{label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${folder.files.filter(f => !f.name.startsWith('_')).length > 0 ? 'bg-[#00f3ff]/10 text-[#00f3ff]' : 'bg-white/5 text-gray-600'}`}>
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
                      </button>
                    ))}
                    {folderName !== '7_NCFN-CAPTURAS-WEB_OSINT' && (
                      <button onClick={() => { setUploadFolder(folderName); uploadRef.current?.click(); }}
                        disabled={actionLoading === 'upload'}
                        className="w-full flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-600 hover:text-[#00f3ff] hover:bg-white/5 transition-all border border-dashed border-transparent hover:border-[#00f3ff]/20">
                        <Upload size={10} /> {actionLoading === 'upload' && uploadFolder === folderName ? 'Enviando...' : 'Enviar arquivo aqui'}
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
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
                  <span className="flex items-center gap-1"><Hash size={10} />{selected.hash.slice(0, 32)}...</span>
                  <span className="flex items-center gap-1"><HardDrive size={10} />{formatBytes(selected.size)}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{new Date(selected.modifiedAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* ── Row 1: Primary — centered ── */}
              <div className="flex justify-center gap-2 flex-wrap mb-2">
                {selected.type === 'encrypted' || selected.name.endsWith('.enc') ? (
                  <button onClick={() => setEncDownloadWarning(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-all border border-white/10">
                    <Download size={12} /> Baixar Arquivo Individual
                  </button>
                ) : (
                  <a
                    href={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                    download={selected.name}
                    onClick={() => setBurnDownloaded(prev => new Set([...prev, selected.path]))}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-all border border-white/10">
                    <Download size={12} /> Baixar Arquivo Individual
                  </a>
                )}
                <button onClick={() => {
                    const parts = selected.path.split('/');
                    const folder = parts[0]; const file = parts.slice(1).join('/');
                    router.push(`/admin/pericia-arquivo?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`);
                  }}
                  disabled={!hasReport}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-400 rounded-lg text-xs transition-all border border-cyan-700/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={hasReport ? 'Abre análise forense completa deste arquivo' : 'Gere o Relatório / Perícia primeiro'}>
                  <FileSearch size={12} /> Ver Perícia
                </button>
                <button onClick={() => router.push('/admin/laudo-forense')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-900/30 hover:bg-violet-800/40 text-violet-400 rounded-lg text-xs transition-all border border-violet-700/30">
                  <FileText size={12} /> Ver Histórico de Perícias e Relatórios
                </button>
                {selected.type === 'image' && (
                  <button onClick={() => setLightbox(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 rounded-lg text-xs transition-all border border-blue-700/30">
                    <ZoomIn size={12} /> Ampliar
                  </button>
                )}
                {selected.path.startsWith('100_BURN') && (
                  <button onClick={createBurnToken}
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-900/30 hover:bg-orange-800/40 text-orange-400 rounded-lg text-xs transition-all border border-orange-700/30">
                    <Flame size={12} /> Burn Token
                  </button>
                )}
              </div>

              {/* ── Row 2: File ops — centered ── */}
              {(() => {
                const isBurn = selected.path.startsWith('100_BURN');
                if (isBurn) {
                  // Get all burn files from folder listing to check if all downloaded
                  const burnFolder = Object.values(folders).find(f => f.name.startsWith('100_BURN'));
                  const burnFiles = burnFolder?.files || [];
                  const allBurnDownloaded = burnFiles.length > 0 && burnFiles.every(f => burnDownloaded.has(`100_BURN_IMMUTABILITY/${f.name}`));
                  return (
                    <div className="flex flex-col items-center gap-2 mb-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/20 bg-orange-500/5 text-xs text-orange-400 max-w-sm text-center">
                        <Shield size={12} className="flex-shrink-0" />
                        <span>Pasta BURN — somente leitura. Arquivo imutável de custódia.</span>
                      </div>
                      {allBurnDownloaded ? (
                        <button
                          onClick={() => { setBurnDeleteAck(false); setBurnDeleteTarget(selected.path); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded-lg text-xs border border-red-700/30 transition-all"
                        >
                          <X size={12} /> Excluir Cópia BURN
                        </button>
                      ) : (
                        <p className="text-[10px] text-gray-600 font-mono text-center">
                          Faça o download de TODOS os arquivos BURN para liberar a exclusão ({burnFiles.filter(f => burnDownloaded.has(`100_BURN_IMMUTABILITY/${f.name}`)).length}/{burnFiles.length} baixados).
                        </p>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="flex justify-center gap-2 flex-wrap mb-3">
                    {selected.path.split('/')[0] !== '7_NCFN-CAPTURAS-WEB_OSINT' && (
                      <button onClick={() => { setUploadFolder(selected.path.split('/')[0]); uploadRef.current?.click(); }}
                        disabled={actionLoading === 'upload'}
                        className="flex items-center gap-1 px-3 py-1.5 bg-sky-900/30 hover:bg-sky-800/40 text-sky-400 rounded-lg text-xs transition-all border border-sky-700/30 disabled:opacity-50">
                        <Upload size={12} /> Upload
                      </button>
                    )}
                    <button onClick={handleTrash} disabled={actionLoading === 'trash'}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 rounded-lg text-xs transition-all border border-yellow-700/30 disabled:opacity-50">
                      <Trash2 size={12} /> {actionLoading === 'trash' ? '...' : 'Lixeira'}
                    </button>
                    <button onClick={handlePermanentDelete} disabled={actionLoading === 'delete'}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded-lg text-xs transition-all border border-red-700/30 disabled:opacity-50">
                      <X size={12} /> {actionLoading === 'delete' ? '...' : 'Excluir'}
                    </button>
                    <button onClick={() => router.push(`/admin/cofre?custody=${encodeURIComponent(selected.path)}`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-xs transition-all border border-slate-600/30">
                      <Shield size={12} /> Registro de Custódia
                    </button>
                  </div>
                );
              })()}

              {/* ── Ações de Custódia ── */}
              {!selected.path.startsWith('100_BURN') && (
                <div className="space-y-1.5 mb-3">

                  {/* LINHA 1 — Relatório / Perícia */}
                  <div className={`flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg border border-l-4 transition-all duration-300 ${
                    hasReport
                      ? 'border-white/5 border-l-emerald-500/60 bg-black'
                      : 'border-blue-500/20 border-l-blue-400 bg-[#05101e]'
                  }`}>
                    {hasReport
                      ? <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                      : <FileCheck2 size={13} className="text-blue-400 flex-shrink-0" />
                    }
                    <span className={`text-xs font-bold flex-1 ${hasReport ? 'text-gray-600 line-through' : 'text-blue-100'}`}>
                      1 · Relatório / Perícia
                    </span>
                    {hasReport && (
                      <button onClick={handlePrintPericia} disabled={actionLoading === 'print'}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] border border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15 rounded-md transition-all disabled:opacity-40">
                        <Printer size={10} /> {actionLoading === 'print' ? '...' : 'Imprimir'}
                      </button>
                    )}
                    <button
                      onClick={handleGeneratePericia}
                      disabled={actionLoading === 'pericia'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        hasReport
                          ? 'border-white/8 text-gray-600 bg-black hover:bg-white/5'
                          : 'border-blue-500/50 text-blue-100 bg-blue-600/20 hover:bg-blue-600/35'
                      }`}
                    >
                      <FileCheck2 size={11} />
                      {actionLoading === 'pericia' ? 'Gerando...' : hasReport ? 'Gerar relatório atualizado' : 'Gerar agora'}
                    </button>
                  </div>

                  {/* LINHA 2 — Encriptar (ou Decriptar) */}
                  {selected.name.endsWith('.enc') ? (
                    <div className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg border border-l-4 border-white/5 border-l-emerald-500/60 bg-black transition-all">
                      <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-gray-600 line-through flex-1">2 · Encriptar AES-256</span>
                      <button disabled={processing} onClick={() => handleEncryption('decrypt')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border bg-black hover:bg-blue-950/40 text-emerald-300 border-emerald-600/30 transition-all disabled:opacity-50">
                        <Unlock size={11} /> Decriptar
                      </button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg border border-l-4 transition-all duration-300 ${
                      isEncrypted
                        ? 'border-white/5 border-l-emerald-500/60 bg-black'
                        : hasReport
                        ? 'border-blue-500/20 border-l-blue-400 bg-[#05101e]'
                        : 'border-white/4 border-l-white/10 bg-black'
                    }`}>
                      {isEncrypted
                        ? <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                        : <Lock size={13} className={`flex-shrink-0 ${hasReport ? 'text-blue-400' : 'text-gray-700'}`} />
                      }
                      <span className={`text-xs font-bold flex-1 ${
                        isEncrypted ? 'text-gray-600 line-through' : hasReport ? 'text-blue-100' : 'text-gray-700'
                      }`}>
                        2 · Encriptar AES-256
                      </span>
                      <div className="relative flex-shrink-0">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Chave AES-256..."
                          disabled={!hasReport || isEncrypted}
                          className={`bg-black border text-white text-xs px-2 py-1.5 pr-7 rounded-lg focus:outline-none w-28 transition-all ${
                            hasReport && !isEncrypted
                              ? 'border-blue-500/40 focus:border-blue-400'
                              : 'border-white/8 opacity-30'
                          }`}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#00f3ff] transition-colors">
                          {showPassword ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                      </div>
                      <button
                        disabled={!hasReport || processing || isEncrypted}
                        onClick={() => handleEncryption('encrypt')}
                        title={!hasReport ? 'Gere o Relatório / Perícia primeiro' : 'Encriptar com AES-256'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          isEncrypted
                            ? 'border-white/8 text-gray-600 bg-black'
                            : hasReport
                            ? 'border-blue-500/50 text-blue-100 bg-blue-600/20 hover:bg-blue-600/35'
                            : 'border-white/5 text-gray-700 bg-black'
                        }`}
                      >
                        <Lock size={11} /> {isEncrypted ? 'Encriptado' : 'Encriptar'}
                      </button>
                    </div>
                  )}

                  {/* LINHA 3 — ZIP (indicador de prontidão) */}
                  <div className={`flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg border border-l-4 transition-all duration-300 ${
                    canDownloadZip
                      ? 'border-blue-500/20 border-l-blue-400 bg-[#05101e]'
                      : 'border-white/4 border-l-white/10 bg-black'
                  }`}>
                    <PackageCheck size={13} className={canDownloadZip ? 'text-blue-400' : 'text-gray-700'} />
                    <span className={`text-xs font-bold flex-1 ${canDownloadZip ? 'text-blue-100' : 'text-gray-700'}`}>
                      3 · ZIP Disponível
                    </span>
                    {canDownloadZip && (
                      <span className="text-[10px] text-blue-400/60 font-mono">pronto para download</span>
                    )}
                  </div>

                </div>
              )}

              {/* ── Custódia Local — Botão ZIP ── */}
              <div className="rounded-xl border border-[#00f3ff]/15 bg-black/40 px-4 pt-2 pb-4 mb-3">
                <button onClick={handleCustodiaDownload} disabled={!canDownloadZip || actionLoading === 'custod'}
                  className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all border ${
                    canDownloadZip
                      ? 'bg-[#00f3ff]/15 hover:bg-[#00f3ff]/25 border-[#00f3ff]/40 text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.1)] hover:shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                      : 'bg-gray-900/40 border-gray-700/30 text-gray-600 cursor-not-allowed'
                  }`}>
                  <PackageCheck size={16} />
                  {actionLoading === 'custod' ? 'Gerando Bundle ZIP...' : 'CUSTÓDIA LOCAL · BACK UP'}
                </button>
                {/* DISPONIBILIZAR / PUBLICAR — only unlocked after CUSTÓDIA LOCAL download */}
                {selected && !custodiaDownloaded.has(selected.path) && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-700/30 bg-amber-950/20">
                    <Lock size={11} className="text-amber-600 flex-shrink-0" />
                    <span className="text-[10px] text-amber-700 font-mono leading-tight">
                      Faça o <strong className="text-amber-500">CUSTÓDIA LOCAL · BACK UP</strong> antes de compartilhar
                    </span>
                  </div>
                )}
                <button
                  onClick={handleOpenShare}
                  disabled={!selected || !custodiaDownloaded.has(selected?.path ?? '')}
                  title={!selected || !custodiaDownloaded.has(selected?.path ?? '') ? 'Faça o CUSTÓDIA LOCAL primeiro' : 'Gerar link seguro com expiração e limite de acessos'}
                  className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all border ${
                    selected && custodiaDownloaded.has(selected.path)
                      ? 'bg-green-900/20 hover:bg-green-800/30 border-green-700/40 text-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                      : 'bg-gray-900/30 border-gray-700/20 text-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Globe size={13} />
                  DISPONIBILIZAR ATIVO PARA TERCEIROS
                </button>
                <button
                  onClick={handleOpenVitrine}
                  disabled={!selected || !custodiaDownloaded.has(selected?.path ?? '')}
                  title={!selected || !custodiaDownloaded.has(selected?.path ?? '') ? 'Faça o CUSTÓDIA LOCAL primeiro' : 'Publicar na Vitrine com código de acesso numérico'}
                  className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all border ${
                    selected && custodiaDownloaded.has(selected.path)
                      ? 'bg-violet-900/20 hover:bg-violet-800/30 border-violet-700/40 text-violet-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                      : 'bg-gray-900/30 border-gray-700/20 text-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Share2 size={13} />
                  PUBLICAR NA VITRINE
                </button>
              </div>

              {/* Burn link */}
              {burnLink && (
                <div className="mb-3 p-3 bg-orange-950/30 border border-orange-500/30 rounded-lg flex items-center gap-2">
                  <Flame size={14} className="text-orange-400 flex-shrink-0" />
                  <span className="text-orange-300 text-xs font-mono break-all flex-1">{burnLink}</span>
                  <button onClick={() => setBurnLink("")} className="text-gray-500 hover:text-white flex-shrink-0"><X size={14} /></button>
                </div>
              )}

              {/* ── Custódia info — updated text ── */}
              <div className="p-4 bg-black/30 border border-amber-500/20 rounded-xl text-[10px] font-mono text-amber-700 leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Todos os arquivos custodiados neste cofre (vault) recebem tratamento forense.
                    E necessario <strong className="text-amber-500">GERAR O RELATORIO</strong> primeiro para extrair o maximo de informacoes do arquivo original, DEPOIS encriptar.
                  </span>
                </div>
                <div className="border-t border-amber-500/20 pt-2 space-y-1">
                  <p><strong className="text-red-400">⚠ IMPORTANTE:</strong> CRIE UMA SENHA EM <strong className="text-amber-400">(Chave AES-256)</strong> e JAMAIS ESQUEÇA ESSA SENHA. SOMENTE COM ELA VOCÊ PODERÁ REVERTER O ARQUIVO COM CRIPTOGRAFIA MILITAR.</p>
                  <p><strong className="text-red-400">⚠ IMPORTANTE:</strong> SEMPRE MANTENHA UMA CÓPIA DE SEGURANÇA EM SEU DISPOSITIVO PESSOAL EM LUGAR PROTEGIDO DE ALTERAÇÕES.</p>
                  <p>AO FAZER O DOWNLOAD É GERADO UM ARQUIVO .ZIP QUE CONTÉM: O <strong className="text-amber-400">ARQUIVO ORIGINAL</strong>, UMA <strong className="text-amber-400">CÓPIA ENCRIPTADA</strong> E O <strong className="text-amber-400">RELATÓRIO PERICIAL</strong>.</p>
                  <p className="text-red-500/80">NUNCA ALTERE NENHUM ELEMENTO DESTES ARQUIVOS. APENAS VISUALIZE. CÓPIAS DESTES ARQUIVOS, MESMO QUE IDÊNTICAS, PODEM GERAR INCONFORMIDADES NO SISTEMA DE AUDITORIA.</p>
                </div>
              </div>
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

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-2 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono">
              <Key size={10} />
              CADEIA DE CUSTÓDIA · SHA-256 + AES-256-CBC + HMAC · NEXUS CLOUD FORENSIC NETWORK
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <ShieldAlert size={72} className="text-[#00f3ff]/20" />
            <h2 className="text-xl font-bold text-white/30">Vault Forense NCFN</h2>
            <p className="text-gray-600 text-sm max-w-sm">
              Selecione, ao lado, uma categoria e um ativo forense para visualização segura em ambiente isolado com controle SHA-256.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4 max-w-lg w-full">
              {Object.entries(folders).map(([key, f]) => (
                <div key={key} className="flex flex-col gap-1">
                  <button onClick={() => setOpenFolders(new Set([key]))}
                    className="w-full glass-panel p-3 rounded-xl border border-white/5 hover:border-[#00f3ff]/20 transition-all text-center">
                    <Folder size={20} className="mx-auto mb-1 text-[#00f3ff]/50" />
                    <p className="text-[10px] text-gray-500 truncate">{FOLDER_LABELS[key]?.split('·')[1]?.trim() || key}</p>
                    <p className="text-lg font-bold text-white/60">{f.files.filter(ff => !ff.name.startsWith('_')).length}</p>
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openInternalFile(key, '_registros_acesso.txt', 'log')}
                      title="Ver Logs da Pasta"
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] text-amber-500/70 hover:text-amber-400 bg-amber-950/10 hover:bg-amber-950/30 border border-amber-800/20 hover:border-amber-600/30 transition-all">
                      <Eye size={9} />
                    </button>
                    <button
                      onClick={() => openInternalFile(key, '_hashes_vps.txt', 'hash')}
                      title="Hashes desta Pasta"
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] text-violet-500/70 hover:text-violet-400 bg-violet-950/10 hover:bg-violet-950/30 border border-violet-800/20 hover:border-violet-600/30 transition-all">
                      <Hash size={9} />
                    </button>
                  </div>
                </div>
              ))}
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
              <p>O Vault possui <strong className="text-white">12 zonas de custódia</strong> organizadas por nível de sensibilidade. Selecione um arquivo na barra lateral para visualizá-lo e operá-lo.</p>
              <p>Para <strong className="text-white">criptografar</strong> um arquivo, selecione-o e use a função de encriptação AES-256. O arquivo original é substituído pelo arquivo <code>.enc</code>.</p>
              <p><strong className="text-white">Gerar Perícia</strong> cria um relatório forense com hash SHA-256, metadados EXIF, análise de entropia e carimbo temporal RFC 3161 — com validade jurídica.</p>
              <p><strong className="text-white">CUSTÓDIA LOCAL</strong> gera um ZIP encriptado para backup offline. <strong className="text-white">DISPONIBILIZAR ATIVO</strong> torna o arquivo público na Vitrine para compartilhamento autorizado.</p>
              <p>A <strong className="text-white">pasta 7 (Capturas Web/OSINT)</strong> recebe automaticamente todas as capturas forenses da web realizadas pelo módulo de captura.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
