"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Folder, FileText, Globe, Search, ShieldCheck,
  Download, X, CheckSquare, Square, HardDrive, Upload,
  Shield, AlertCircle, Hash, Eye, Mail, Plus, Trash2,
  Clock, UserCheck, AlertTriangle, Lock, ChevronDown, ChevronRight,
  RefreshCw, HelpCircle, KeyRound,
} from "lucide-react";

type FileItem = {
  folder: string;
  filename: string;
  isPublic: boolean;
  size: number;
  mtime: string;
  hash?: string;
};

type Viewer = {
  id: string;
  email: string;
  expiresAt: string | null;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/* ── Local Hash Verifier ── */
function LocalHashVerifier() {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<'MATCH' | 'NO_MATCH' | 'COMPUTED' | null>(null);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [referenceHash, setReferenceHash] = useState("");

  const computeHash = async (file: File) => {
    setResult(null); setComputedHash(null); setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    setComputedHash(hex); setResult('COMPUTED');
  };

  const verify = () => {
    if (!computedHash || !referenceHash) return;
    setResult(computedHash.toLowerCase() === referenceHash.trim().toLowerCase() ? 'MATCH' : 'NO_MATCH');
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
        <Hash className="w-4 h-4" /> Verificador de Hash Local
      </div>
      <p className="text-slate-400 text-xs">Verifique qualquer arquivo localmente — <strong className="text-white">100% no seu navegador, sem upload</strong>.</p>
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-cyan-400 bg-cyan-400/5' : 'border-slate-700 hover:border-slate-500'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) computeHash(f); }}
        onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) computeHash(f); }; inp.click(); }}
      >
        <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
        <p className="text-slate-500 text-xs font-mono">{fileName ? <span className="text-cyan-400">{fileName}</span> : 'Soltar arquivo aqui'}</p>
      </div>
      {computedHash && (
        <div className="space-y-3">
          <div className="bg-black/40 rounded-lg p-3">
            <p className="text-slate-500 text-[10px] font-mono uppercase mb-1">SHA-256 Calculado:</p>
            <p className="text-cyan-300 font-mono text-xs break-all">{computedHash}</p>
          </div>
          <input type="text" placeholder="Cole hash de referência para comparar..." value={referenceHash} onChange={e => setReferenceHash(e.target.value)}
            className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none" />
          <button onClick={verify} disabled={!referenceHash} className="w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/50 disabled:opacity-40 border border-cyan-700/50 rounded-lg text-cyan-300 text-xs font-bold transition">
            Verificar Integridade
          </button>
        </div>
      )}
      {result === 'MATCH' && (
        <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/40 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-green-300 text-xs font-bold">MATCH — Arquivo íntegro e autêntico</span>
        </div>
      )}
      {result === 'NO_MATCH' && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/40 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-red-300 text-xs font-bold">ALTERADO / NÃO ENCONTRADO</span>
        </div>
      )}
    </div>
  );
}

/* ── Download Modal ── */
function DownloadModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    if (!accepted) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/vitrine/download?folder=${encodeURIComponent(file.folder)}&filename=${encodeURIComponent(file.filename)}`, { method: 'POST' });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${file.filename}_NCFN_CERTIFY.zip`; a.click();
        URL.revokeObjectURL(url); setDone(true);
      } else {
        const a = document.createElement('a');
        a.href = `/api/download?folder=${encodeURIComponent(file.folder)}&filename=${encodeURIComponent(file.filename)}`;
        a.download = file.filename; a.click(); setDone(true);
      }
    } finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-green-400 text-xs font-mono uppercase mb-2">
              <ShieldCheck className="w-4 h-4" /> Cadeia de Custódia Ativa
            </div>
            <h3 className="text-white font-bold text-lg">{file.filename}</h3>
            <p className="text-slate-500 text-xs font-mono mt-1">{file.folder}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="bg-black/40 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono">Tamanho Real</span>
            <span className="text-white font-mono">{formatBytes(file.size)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono">Data de Entrada</span>
            <span className="text-white font-mono">{new Date(file.mtime).toLocaleDateString('pt-BR')}</span>
          </div>
          {file.hash && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-slate-500 text-[10px] font-mono uppercase mb-1">Hash SHA-256</p>
              <p className="text-cyan-400 font-mono text-xs break-all">{file.hash}</p>
            </div>
          )}
        </div>
        <div className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-4 text-xs text-slate-300">
          <Download className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>O download gerará um <strong>.zip</strong> contendo o arquivo original + <code className="bg-black/40 px-1 rounded">certificado_imutabilidade.pdf</code></p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <button onClick={() => setAccepted(!accepted)} className="mt-0.5 shrink-0">
            {accepted ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition" />}
          </button>
          <span className="text-slate-400 text-xs leading-relaxed">
            Declaro ciência de que este acesso, incluindo meu endereço IP e dados de conexão, será <strong className="text-white">registrado permanentemente</strong> nos logs de cadeia de custódia.
          </span>
        </label>
        {done ? (
          <div className="text-center py-3 text-green-400 font-mono text-sm">✓ Download iniciado — acesso registrado no log de auditoria</div>
        ) : (
          <button onClick={handleDownload} disabled={!accepted || downloading}
            className="w-full py-3 bg-cyan-900/40 hover:bg-cyan-800/60 disabled:opacity-30 disabled:cursor-not-allowed border border-cyan-700/50 hover:border-cyan-500/70 rounded-xl text-cyan-300 font-bold text-sm transition flex items-center justify-center gap-2">
            {downloading ? <><div className="w-4 h-4 border-2 border-t-cyan-400 border-slate-700 rounded-full animate-spin" />Compilando pacote forense...</> : <><Download className="w-4 h-4" />BAIXAR PACOTE FORENSE CERTIFICADO</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Admin Email Manager per file ── */
function AdminEmailManager({ folder, filename, highlighted }: { folder: string; filename: string; highlighted: boolean }) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(highlighted);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [highlighted]);

  const fetchViewers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vitrine/access?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      setViewers(data.viewers || []);
    } catch { } finally { setLoading(false); }
  }, [folder, filename]);

  useEffect(() => { if (open) fetchViewers(); }, [open, fetchViewers]);

  const doAction = async (email: string, action: 'add' | 'remove' | 'add48h') => {
    setAdding(true);
    try {
      await fetch('/api/vitrine/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename, email, action }),
      });
      if (action !== 'remove') setNewEmail('');
      await fetchViewers();
    } catch { } finally { setAdding(false); }
  };

  const isExpired = (v: Viewer) => v.expiresAt && new Date(v.expiresAt) < new Date();
  const isExpiringSoon = (v: Viewer) => {
    if (!v.expiresAt) return false;
    const diff = new Date(v.expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 6 * 3600 * 1000;
  };

  return (
    <div ref={panelRef} className={`mt-3 rounded-xl border transition-all ${highlighted ? 'border-red-500/60 bg-red-950/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-white/10 bg-black/20'}`}>
      {/* Red alert banner for new files */}
      {highlighted && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-600/20 border-b border-red-500/40 rounded-t-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs font-bold uppercase tracking-wider">
            Insira o e-mail de quem pode ver este arquivo
          </p>
        </div>
      )}

      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-white transition-all">
        <span className="flex items-center gap-2 font-semibold">
          <UserCheck size={12} className={highlighted ? 'text-red-400' : 'text-gray-500'} />
          Controle de Acesso — {viewers.length} {viewers.length === 1 ? 'email autorizado' : 'emails autorizados'}
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Add email input */}
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newEmail) doAction(newEmail, 'add'); }}
              placeholder="email@pessoa.com"
              className="flex-1 bg-gray-900 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#00f3ff] placeholder:text-gray-600"
            />
            <button onClick={() => newEmail && doAction(newEmail, 'add')} disabled={!newEmail || adding}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-700/40 rounded-lg text-xs font-bold disabled:opacity-40 transition-all whitespace-nowrap">
              <Plus size={11} /> Adicionar Email
            </button>
            <button onClick={() => newEmail && doAction(newEmail, 'add48h')} disabled={!newEmail || adding}
              className="flex items-center gap-1 px-3 py-2 bg-amber-900/40 hover:bg-amber-800/50 text-amber-400 border border-amber-700/40 rounded-lg text-xs font-bold disabled:opacity-40 transition-all whitespace-nowrap">
              <Clock size={11} /> 48 horas
            </button>
          </div>

          {/* Viewers list */}
          {loading ? (
            <p className="text-gray-600 text-xs text-center py-2">Carregando...</p>
          ) : viewers.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-2 font-mono">
              Nenhum email adicionado — arquivo visível para qualquer visitante autenticado
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {viewers.map(v => (
                <div key={v.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${isExpired(v) ? 'border-red-800/30 bg-red-950/20 opacity-60' : isExpiringSoon(v) ? 'border-amber-700/40 bg-amber-950/20' : 'border-white/5 bg-white/5'}`}>
                  <Mail size={10} className={isExpired(v) ? 'text-red-500' : isExpiringSoon(v) ? 'text-amber-400' : 'text-gray-500'} />
                  <span className="flex-1 font-mono text-gray-300 truncate">{v.email}</span>
                  {v.expiresAt && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isExpired(v) ? 'bg-red-900/40 text-red-400' : isExpiringSoon(v) ? 'bg-amber-900/40 text-amber-400' : 'bg-blue-900/30 text-blue-400'}`}>
                      {isExpired(v) ? 'EXPIRADO' : `até ${new Date(v.expiresAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  )}
                  {!v.expiresAt && <span className="text-[9px] font-mono bg-green-900/30 text-green-500 px-1.5 py-0.5 rounded">PERMANENTE</span>}
                  <button onClick={() => doAction(v.email, 'remove')} className="text-gray-600 hover:text-red-400 transition-colors ml-1">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Email Gate (visitors) ── */
function EmailGate({ onAccess }: { onAccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/vitrine/files?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      if (!res.ok) throw new Error('Erro ao verificar acesso');
      onAccess(email.trim().toLowerCase());
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-[#00f3ff]" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Restrito</h2>
          <p className="text-gray-500 text-sm font-mono">
            Digite seu e-mail para visualizar os arquivos disponibilizados para você
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full bg-black/40 border border-white/10 focus:border-[#00f3ff]/50 rounded-2xl py-4 pl-12 pr-4 text-white font-mono focus:outline-none transition-all"
            />
          </div>
          <p className="text-[11px] text-gray-600 font-mono text-center -mt-1">
            Digite seu primeiro nome
          </p>
          {error && <p className="text-red-400 text-xs text-center font-mono">{error}</p>}
          <button type="submit" disabled={loading || !email}
            className="w-full py-4 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/40 text-[#00f3ff] font-black rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-t-[#00f3ff] border-white/20 rounded-full animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? 'Verificando...' : 'Ver Arquivos Disponíveis'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Public Vitrine (password-based, no auth required) ── */
type PublicEntry = {
  id: string;
  recipientName: string;
  filename: string;
  publishedAt: string;
  downloadCount: number;
  passwordIndex: number;
};

function PublicVitrineView({ isAdmin = false }: { isAdmin?: boolean }) {
  const [entries, setEntries] = useState<PublicEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/vitrine/public')
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRedeem = async (entry: PublicEntry) => {
    const pw = passwords[entry.id] || '';
    if (!pw) return;
    setDownloading(d => ({ ...d, [entry.id]: true }));
    setErrors(e => ({ ...e, [entry.id]: '' }));
    try {
      const res = await fetch('/api/vitrine/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, password: pw }),
      });
      if (res.status === 401) {
        setErrors(e => ({ ...e, [entry.id]: 'Senha incorreta' }));
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors(e => ({ ...e, [entry.id]: data.error || 'Erro ao baixar' }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match ? match[1] : `${entry.filename}_NCFN_CERTIFY.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setDone(d => ({ ...d, [entry.id]: true }));
      // refresh download counts
      fetch('/api/vitrine/public').then(r => r.json()).then(data => setEntries(Array.isArray(data) ? data : [])).catch(() => {});
    } finally {
      setDownloading(d => ({ ...d, [entry.id]: false }));
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover este arquivo da vitrine?')) return;
    setRemoving(r => ({ ...r, [id]: true }));
    try {
      await fetch(`/api/vitrine/publish?id=${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
    } finally {
      setRemoving(r => ({ ...r, [id]: false }));
    }
  };

  const filtered = entries.filter(e =>
    e.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full text-[#00f3ff] text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
          <Globe className="w-4 h-4" /> Canal de Distribuição Forense Certificada
        </div>
        <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter italic">VITRINE PÚBLICA</h1>
        <p className="text-gray-500 font-mono text-sm max-w-2xl mx-auto uppercase tracking-widest opacity-80">
          Repositório de ativos forenses autorizados pelo protocolo NCFN — cadeia de custódia verificável
        </p>
        <div className="flex justify-center mt-4">
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
            <HelpCircle size={14} /> Como funciona
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mx-auto mb-10 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#00f3ff] transition-colors" />
        <input type="text" placeholder="BUSCAR POR DESTINATÁRIO OU ARQUIVO..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 backdrop-blur-xl border border-white/10 focus:border-[#00f3ff]/50 rounded-2xl py-5 pl-16 pr-6 text-white font-mono tracking-widest focus:outline-none transition-all" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
          <div className="max-w-xs mx-auto space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Nenhum arquivo disponível</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Nenhum arquivo foi publicado na vitrine ainda.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(entry => (
            <div key={entry.id} className="relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 hover:border-violet-500/40 hover:shadow-[0_20px_60px_-15px_rgba(139,92,246,0.15)] hover:-translate-y-1 rounded-3xl p-6 transition-all duration-300">
              {/* Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-900/30 border border-green-500/30 rounded-full px-2 py-1">
                <ShieldCheck className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-[9px] font-mono uppercase">Custódia Ativa</span>
              </div>

              {/* File info */}
              <div className="flex items-start gap-4 mb-4 mt-2">
                <div className="p-3 bg-white/5 rounded-2xl text-violet-400">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="flex-1 overflow-hidden pr-20">
                  <p className="text-[10px] font-mono text-gray-500 uppercase mb-0.5">Para</p>
                  <h3 className="text-white font-bold text-base truncate mb-1" title={entry.recipientName}>{entry.recipientName}</h3>
                  <p className="text-gray-400 text-xs font-mono truncate" title={entry.filename}>{entry.filename}</p>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={removing[entry.id]}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 hover:text-red-400 font-mono transition-colors disabled:opacity-40"
                    >
                      <X className="w-3 h-3" /> {removing[entry.id] ? 'Removendo...' : 'Remover da vitrine'}
                    </button>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-[10px] font-mono text-gray-600 mb-4">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(entry.publishedAt).toLocaleDateString('pt-BR')}</span>
                <span className="flex items-center gap-1"><Download className="w-3 h-3" />{entry.downloadCount} downloads</span>
              </div>

              {/* Password index badge */}
              {entry.passwordIndex > 0 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-violet-950/30 border border-violet-700/30 rounded-xl">
                  <KeyRound className="w-3 h-3 text-violet-500 flex-shrink-0" />
                  <span className="text-[10px] font-mono text-gray-500">Código</span>
                  <span className="text-violet-300 font-black font-mono text-sm">#{entry.passwordIndex}</span>
                  <span className="text-[10px] font-mono text-gray-600 ml-1">— use o código de número {entry.passwordIndex} fornecido pelo NCFN</span>
                </div>
              )}

              {/* Password + download */}
              {done[entry.id] ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-500/30 rounded-xl text-green-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-green-400" /> Download iniciado — acesso registrado
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-3.5 h-3.5" />
                      <input
                        type="password"
                        placeholder="Código de acesso..."
                        value={passwords[entry.id] || ''}
                        onChange={e => setPasswords(p => ({ ...p, [entry.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleRedeem(entry); }}
                        className="w-full bg-black/40 border border-white/10 focus:border-violet-500/50 rounded-xl pl-9 pr-3 py-2 text-white font-mono text-xs focus:outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleRedeem(entry)}
                      disabled={!passwords[entry.id] || downloading[entry.id]}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-900/30 hover:bg-violet-800/40 border border-violet-700/40 text-violet-300 font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {downloading[entry.id]
                        ? <div className="w-3.5 h-3.5 border-2 border-t-violet-400 border-white/20 rounded-full animate-spin" />
                        : <Download className="w-3.5 h-3.5" />}
                      {downloading[entry.id] ? 'Baixando...' : 'Baixar ZIP'}
                    </button>
                  </div>
                  {errors[entry.id] && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors[entry.id]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legal footer */}
      <div className="mt-24 pt-12 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 text-[#00f3ff]/40 text-xs font-mono uppercase tracking-[0.4em] mb-4">
          <Shield className="w-4 h-4" /> NCFN Zero-Trust Global Delivery
        </div>
        <p className="text-slate-600 text-[10px] max-w-3xl mx-auto font-mono italic leading-relaxed">
          Os ativos listados nesta vitrine são protegidos por algoritmos de integridade SHA-256 e estão em conformidade com o protocolo NCFN de preservação de materialidade digital.
        </p>
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
              <p>A <strong className="text-white">Vitrine Pública</strong> lista arquivos forenses disponibilizados pelo protocolo NCFN para destinatários específicos.</p>
              <p>Cada arquivo possui um <strong className="text-white">código de acesso numérico de 6 dígitos</strong> entregue ao destinatário pelo operador NCFN.</p>
              <p>O download gera um <strong className="text-white">pacote ZIP certificado</strong> contendo o arquivo original mais um guia de verificação de autenticidade SHA-256.</p>
              <p>Todo acesso — incluindo IP e timestamp — é <strong className="text-white">registrado permanentemente</strong> nos logs de auditoria forense do portal.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Vitrine Component ── */
function VitrineInner({ initialIsAdmin }: { initialIsAdmin: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Admin detection — initialised from server prop, no async check needed
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [visitorEmail, setVisitorEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const [showHelp, setShowHelp] = useState(false);

  // From vault redirect: ?file=folder/filename&new=true
  const newFileParam = searchParams?.get('file') || null; // "folder/filename"
  const isNew = searchParams?.get('new') === 'true';
  const [newFolder, newFilename] = newFileParam ? newFileParam.split('/') : [null, null];

  // Fetch files for admin (all public files) or visitor (by email)
  const fetchFiles = useCallback(async (email?: string) => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await fetch('/api/files', { credentials: 'include' });
        const data = await res.json();
        setFiles(data.filter((f: FileItem) => f.isPublic));
      } else if (email) {
        const res = await fetch(`/api/vitrine/files?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      }
    } catch { } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchFiles();
  }, [isAdmin, fetchFiles]);

  const handleVisitorAccess = (email: string) => {
    setVisitorEmail(email);
    fetchFiles(email);
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.folder.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.hash && f.hash.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // If hash pasted → auto open
  useEffect(() => {
    if (/^[0-9a-f]{64}$/i.test(searchTerm)) {
      const match = files.find(f => f.hash?.toLowerCase() === searchTerm.toLowerCase());
      if (match) setSelectedFile(match);
    }
  }, [searchTerm, files]);

  // Everyone sees the new password-based public vitrine
  return <PublicVitrineView isAdmin={isAdmin} />;
  // eslint-disable-next-line no-unreachable

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {selectedFile && <DownloadModal file={selectedFile} onClose={() => setSelectedFile(null)} />}

      {/* Header */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full text-[#00f3ff] text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
          <Globe className="w-4 h-4" /> Canal de Distribuição Forense Certificada
        </div>
        <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter italic">VITRINE PÚBLICA</h1>
        <p className="text-gray-500 font-mono text-sm max-w-2xl mx-auto uppercase tracking-widest opacity-80">
          Repositório de ativos forenses autorizados pelo protocolo NCFN — cadeia de custódia verificável
        </p>
        <div className="flex justify-center mt-4">
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
            <HelpCircle size={14} /> Como funciona
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto mb-10 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#00f3ff] transition-colors" />
        <input type="text" placeholder="BUSCAR POR NOME, PASTA OU HASH SHA-256..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 backdrop-blur-xl border border-white/10 focus:border-[#00f3ff]/50 rounded-2xl py-5 pl-16 pr-6 text-white font-mono tracking-widest focus:outline-none transition-all" />
      </div>

      {/* Admin: refresh button */}
      <div className="flex justify-end mb-4">
        <button onClick={() => fetchFiles()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#00f3ff] transition-all">
          <RefreshCw size={12} /> Atualizar lista
        </button>
      </div>

      {/* Main grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />)}
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredFiles.map((file, idx) => {
                const isHighlighted = isNew && file.folder === newFolder && file.filename === newFilename;
                return (
                  <div key={idx} className={`relative bg-[#0a0a0a]/80 backdrop-blur-xl border rounded-3xl p-6 transition-all duration-500 ${isHighlighted ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.15)]' : 'border-white/10 hover:border-[#00f3ff]/40 hover:shadow-[0_20px_60px_-15px_rgba(0,243,255,0.15)] hover:-translate-y-1'}`}>
                    {/* Custody badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-900/30 border border-green-500/30 rounded-full px-2 py-1">
                      <ShieldCheck className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-[9px] font-mono uppercase">Custódia Ativa</span>
                    </div>

                    <div className="flex items-start gap-4 mb-4 mt-2 cursor-pointer" onClick={() => setSelectedFile(file)}>
                      <div className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-[#00f3ff] transition-colors">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="flex-1 overflow-hidden pr-20">
                        <h3 className="text-white font-bold text-lg truncate mb-1" title={file.filename}>{file.filename}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono uppercase">
                          <Folder className="w-3 h-3" /> {file.folder}
                        </div>
                      </div>
                    </div>

                    {file.hash && (
                      <div className="mb-3 bg-black/30 rounded-lg px-3 py-2 cursor-pointer" onClick={() => setSelectedFile(file)}>
                        <p className="text-[9px] text-slate-600 font-mono uppercase mb-0.5">SHA-256</p>
                        <p className="text-cyan-700 font-mono text-[10px] truncate">{file.hash}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 cursor-pointer" onClick={() => setSelectedFile(file)}>
                      <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">{formatBytes(file.size)}</div>
                      <div className="inline-flex items-center gap-2 text-xs font-black text-[#00f3ff] uppercase tracking-widest">
                        <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                      </div>
                    </div>

                    {/* Admin: email access manager */}
                    <AdminEmailManager
                      folder={file.folder}
                      filename={file.filename}
                      highlighted={isHighlighted}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
              <div className="max-w-xs mx-auto space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Nenhuma Evidência</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Nenhum arquivo foi marcado como público.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <LocalHashVerifier />
        </div>
      </div>

      {/* Legal Footer */}
      <div className="mt-24 pt-12 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 text-[#00f3ff]/40 text-xs font-mono uppercase tracking-[0.4em] mb-4">
          <Shield className="w-4 h-4" /> NCFN Zero-Trust Global Delivery
        </div>
        <p className="text-slate-600 text-[10px] max-w-3xl mx-auto font-mono italic leading-relaxed">
          Os ativos listados nesta vitrine são protegidos por algoritmos de integridade SHA-256 e estão em conformidade com o protocolo NCFN de preservação de materialidade digital.
        </p>
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
              <p>A <strong className="text-white">Vitrine Pública</strong> é o repositório de evidências forenses autorizadas pelo protocolo NCFN para compartilhamento com terceiros.</p>
              <p>Os arquivos aqui listados foram <strong className="text-white">explicitamente marcados como públicos</strong> por um administrador no Vault — nenhum arquivo chega aqui automaticamente.</p>
              <p>O download gera um <strong className="text-white">pacote ZIP certificado</strong> contendo o arquivo original mais um certificado de imutabilidade PDF com hash SHA-256 e cadeia de custódia verificável.</p>
              <p>Todo acesso ao arquivo — incluindo IP e dados de conexão — é <strong className="text-white">registrado permanentemente</strong> nos logs de auditoria forense do portal.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VitrineClient({ initialIsAdmin = false }: { initialIsAdmin?: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm"><div className="w-8 h-8 border-2 border-t-[#00f3ff] border-white/10 rounded-full animate-spin" /></div>}>
      <VitrineInner initialIsAdmin={initialIsAdmin} />
    </Suspense>
  );
}
