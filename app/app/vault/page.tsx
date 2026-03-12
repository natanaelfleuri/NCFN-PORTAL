"use client";
import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Folder, FolderOpen, FileText, ShieldAlert, Key, Flame, Lock, Unlock,
  Image as ImageIcon, FileVideo, FileAudio, File, Eye, Download,
  ChevronDown, ChevronRight, Hash, Clock, HardDrive, X, ZoomIn
} from "lucide-react";

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

const FOLDER_LABELS: Record<string, string> = {
  '01_OPERACIONAL':       '01 · Operacional',
  '02_INTELIGENCIA':      '02 · Inteligência',
  '03_ALVOS':             '03 · Alvos',
  '04_FINANCEIRO':        '04 · Financeiro',
  '05_LOGS_ACESSO':       '05 · Logs de Acesso',
  '06_CRIPTOGRAFIA':      '06 · Criptografia',
  '07_VAZAMENTOS':        '07 · Vazamentos',
  '08_PERICIAS':          '08 · Perícias',
  '09_BURN_IMMUTABILITY': '09 · Burn / Imutabilidade',
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

export default function VaultPage() {
  const [folders, setFolders] = useState<Record<string, VaultFolder>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['01_OPERACIONAL']));
  const [selected, setSelected] = useState<VaultFile | null>(null);
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [burnLink, setBurnLink] = useState("");

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

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

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
      alert(data.message);
      setPassword('');
      setSelected(null);
      fetchFolders();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const totalFiles = Object.values(folders).reduce((sum, f) => sum + f.files.length, 0);

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

  return (
    <div className="flex h-screen bg-transparent text-[#00f3ff] font-sans overflow-hidden">

      {/* Lightbox */}
      {lightbox && selected?.type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <button className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X size={32} />
          </button>
          <img
            src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
            alt={selected.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Sidebar */}
      <div className="w-72 border-r border-white/10 flex flex-col glass-panel rounded-r-2xl my-2 ml-2 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg font-bold text-[#00f3ff] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
            <ShieldAlert size={20} /> VAULT FORENSE · NCFN
          </h2>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">{totalFiles} ativos em custódia certificada</p>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(folders).map(([folderName, folder]) => {
            const isOpen = openFolders.has(folderName);
            const label = FOLDER_LABELS[folderName] || folderName;
            const isBurn = folderName === '09_BURN_IMMUTABILITY';

            return (
              <div key={folderName} className="mb-1">
                {/* Folder header */}
                <button
                  onClick={() => toggleFolder(folderName)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs font-semibold uppercase tracking-wide ${
                    isOpen ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/3'
                  }`}
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {isOpen ? <FolderOpen size={14} className={isBurn ? 'text-orange-400' : 'text-[#00f3ff]'} /> : <Folder size={14} className={isBurn ? 'text-orange-400/60' : 'text-[#00f3ff]/60'} />}
                  <span className="flex-1 truncate">{label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${folder.files.length > 0 ? 'bg-[#00f3ff]/10 text-[#00f3ff]' : 'bg-white/5 text-gray-600'}`}>
                    {folder.files.length}
                  </span>
                </button>

                {/* Files */}
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                    {folder.files.length === 0 ? (
                      <p className="text-[10px] text-gray-600 italic px-2 py-1">Pasta vazia</p>
                    ) : (
                      folder.files.map(file => (
                        <button
                          key={file.path}
                          onClick={() => selectFile(file)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all text-xs ${
                            selected?.path === file.path
                              ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <FileTypeIcon type={file.type} size={12} />
                          <span className="flex-1 truncate font-mono text-[10px]">{file.name}</span>
                        </button>
                      ))
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
            <div className="flex-shrink-0 p-5 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileTypeIcon type={selected.type} size={18} />
                    <h1 className="text-lg font-bold text-white truncate">{selected.name}</h1>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
                    <span className="flex items-center gap-1">
                      <Hash size={10} />
                      {selected.hash.slice(0, 32)}...
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={10} />
                      {formatBytes(selected.size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(selected.modifiedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <a
                      href={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                      download={selected.name}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-all border border-white/10"
                    >
                      <Download size={12} /> Baixar
                    </a>
                    {selected.type === 'image' && (
                      <button
                        onClick={() => setLightbox(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 rounded-lg text-xs transition-all border border-blue-700/30"
                      >
                        <ZoomIn size={12} /> Ampliar
                      </button>
                    )}
                    {selected.path.startsWith('09_') && (
                      <button
                        onClick={createBurnToken}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-900/30 hover:bg-orange-800/40 text-orange-400 rounded-lg text-xs transition-all border border-orange-700/30"
                      >
                        <Flame size={12} /> Burn Token
                      </button>
                    )}
                  </div>

                  {/* Encryption */}
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Chave AES-256..."
                      className="bg-gray-900/80 border border-white/10 text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-[#00f3ff] w-36"
                    />
                    {selected.name.endsWith('.enc') ? (
                      <button
                        disabled={processing}
                        onClick={() => handleEncryption('decrypt')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 rounded-lg text-xs border border-emerald-700/30 disabled:opacity-50 transition-all"
                      >
                        <Unlock size={12} /> Decriptar
                      </button>
                    ) : (
                      <button
                        disabled={processing}
                        onClick={() => handleEncryption('encrypt')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded-lg text-xs border border-red-700/30 disabled:opacity-50 transition-all"
                      >
                        <Lock size={12} /> Encriptar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Burn link */}
              {burnLink && (
                <div className="mt-3 p-3 bg-orange-950/30 border border-orange-500/30 rounded-lg flex items-center gap-2">
                  <Flame size={14} className="text-orange-400 flex-shrink-0" />
                  <span className="text-orange-300 text-xs font-mono break-all flex-1">{burnLink}</span>
                  <button onClick={() => setBurnLink("")} className="text-gray-500 hover:text-white flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-auto p-6">
              {selected.type === 'image' && (
                <div className="flex items-start justify-center">
                  <img
                    src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                    alt={selected.name}
                    className="max-w-full rounded-xl shadow-2xl border border-white/10 cursor-zoom-in"
                    onClick={() => setLightbox(true)}
                  />
                </div>
              )}

              {selected.type === 'pdf' && (
                <iframe
                  src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                  className="w-full h-full rounded-xl border border-white/10"
                  title={selected.name}
                />
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
                  <video
                    controls
                    className="max-w-full max-h-[70vh] rounded-xl border border-white/10"
                    src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                  />
                </div>
              )}

              {selected.type === 'audio' && (
                <div className="flex justify-center pt-8">
                  <audio
                    controls
                    className="w-full max-w-lg"
                    src={`/api/vault/file?path=${encodeURIComponent(selected.path)}`}
                  />
                </div>
              )}

              {selected.type === 'encrypted' && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <Lock size={64} className="text-orange-400/50" />
                  <h3 className="text-xl font-bold text-orange-400">Ativo Cifrado · AES-256</h3>
                  <p className="text-gray-500 text-sm">Informe a chave de blindagem AES-256 acima para descriptografar com segurança.</p>
                  <p className="font-mono text-[10px] text-gray-600 max-w-sm break-all">SHA256: {selected.hash}</p>
                </div>
              )}

              {selected.type === 'binary' && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <File size={64} className="text-gray-500/40" />
                  <h3 className="text-lg font-bold text-gray-400">Arquivo Binário</h3>
                  <p className="text-gray-600 text-sm">Prévia não disponível. Use o botão Baixar para acessar.</p>
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
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <ShieldAlert size={72} className="text-[#00f3ff]/20" />
            <h2 className="text-xl font-bold text-white/30">Vault Forense NCFN</h2>
            <p className="text-gray-600 text-sm max-w-sm">
              Selecione uma categoria e um ativo forense para visualização segura em ambiente isolado com controle SHA-256.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4 max-w-lg w-full">
              {Object.entries(folders).map(([key, f]) => (
                <button
                  key={key}
                  onClick={() => { setOpenFolders(new Set([key])); }}
                  className="glass-panel p-3 rounded-xl border border-white/5 hover:border-[#00f3ff]/20 transition-all text-center"
                >
                  <Folder size={20} className="mx-auto mb-1 text-[#00f3ff]/50" />
                  <p className="text-[10px] text-gray-500 truncate">{FOLDER_LABELS[key]?.split('·')[1]?.trim() || key}</p>
                  <p className="text-lg font-bold text-white/60">{f.files.length}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
