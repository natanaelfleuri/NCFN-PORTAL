'use client';
// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload, Shield, Github, LogIn, HardDrive, Usb,
  Hash, FileSearch, Zap, Lock, CheckCircle2, AlertTriangle,
  ChevronRight, Cpu, Eye, EyeOff, Info, X, Download,
  FlaskConical, Layers, ScanSearch, ShieldCheck,
} from 'lucide-react';

// ─── Magic Bytes Registry ──────────────────────────────────────────────────
const MAGIC: Array<{
  hex: string; offset?: number;
  mime: string; label: string; category: string; extra: number; risk?: string;
}> = [
  { hex: '89504e47',            mime: 'image/png',              label: 'PNG Image',           category: 'Imagem',         extra: 2 },
  { hex: 'ffd8ff',              mime: 'image/jpeg',             label: 'JPEG Image',          category: 'Imagem',         extra: 2 },
  { hex: '47494638',            mime: 'image/gif',              label: 'GIF Image',           category: 'Imagem',         extra: 2 },
  { hex: '52494646',            mime: 'image/webp',             label: 'RIFF Container',      category: 'Imagem',         extra: 2 },
  { hex: '424d',                mime: 'image/bmp',              label: 'BMP Image',           category: 'Imagem',         extra: 2 },
  { hex: '25504446',            mime: 'application/pdf',        label: 'PDF Document',        category: 'Documento',      extra: 3 },
  { hex: '504b0304',            mime: 'application/zip',        label: 'ZIP Archive',         category: 'Compactado',     extra: 15 },
  { hex: '1f8b08',              mime: 'application/gzip',       label: 'GZip Archive',        category: 'Compactado',     extra: 15 },
  { hex: '377abcaf271c',        mime: 'application/x-7z',       label: '7-Zip Archive',       category: 'Compactado',     extra: 15 },
  { hex: '526172211a07',        mime: 'application/x-rar',      label: 'RAR Archive',         category: 'Compactado',     extra: 15 },
  { hex: '7f454c46',            mime: 'application/elf',        label: 'ELF Executable',      category: 'Executável',     extra: 15, risk: 'ALTO' },
  { hex: '4d5a',                mime: 'application/x-msexe',    label: 'PE/MZ Executable',    category: 'Executável',     extra: 15, risk: 'ALTO' },
  { hex: 'cafebabe',            mime: 'application/java-class', label: 'Java Class',          category: 'Executável',     extra: 15, risk: 'MÉDIO' },
  { hex: '1a45dfa3',            mime: 'video/webm',             label: 'WebM Video',          category: 'Vídeo',          extra: 7 },
  { hex: '000000',              mime: 'video/mp4',              label: 'MP4/MOV Video',       category: 'Vídeo',          extra: 7 },
  { hex: '464c5601',            mime: 'video/x-flv',            label: 'FLV Video',           category: 'Vídeo',          extra: 7 },
  { hex: '494433',              mime: 'audio/mp3',              label: 'MP3 Audio',           category: 'Áudio',          extra: 3 },
  { hex: '664c6143',            mime: 'audio/flac',             label: 'FLAC Audio',          category: 'Áudio',          extra: 3 },
  { hex: '4f676753',            mime: 'audio/ogg',              label: 'OGG Audio',           category: 'Áudio',          extra: 3 },
  { hex: '53514c69',            mime: 'application/sqlite3',    label: 'SQLite3 Database',    category: 'Banco de Dados', extra: 15, risk: 'ALTO' },
  { hex: '4d494d4543415245',    mime: 'application/eml',        label: 'MIME Email',          category: 'Documento',      extra: 3 },
  { hex: 'd0cf11e0a1b11ae1',    mime: 'application/msoffice',   label: 'MS Office (OLE)',     category: 'Documento',      extra: 3 },
  { hex: 'efbbbf',              mime: 'text/plain',             label: 'UTF-8 BOM Text',      category: 'Texto',          extra: 3 },
];

function detectMagicBytes(bytes: Uint8Array): typeof MAGIC[0] | null {
  const hex = Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  for (const sig of MAGIC) {
    if (hex.startsWith(sig.hex)) return sig;
  }
  return null;
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Pricing Engine ────────────────────────────────────────────────────────
const COMPLEXITY = {
  standard: { label: 'Standard',       mult: 1.0, color: 'text-cyan-400',   bg: 'bg-cyan-500/10   border-cyan-500/30',   features: ['Metadados completos', 'Dados EXIF', 'Timestamps NTFS/EXT4'] },
  advanced: { label: 'Advanced',       mult: 1.8, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', features: ['Tudo do Standard', 'Chain of Custody', 'OCR de texto', 'Timeline de eventos'] },
  deep:     { label: 'Deep Forensic',  mult: 3.0, color: 'text-red-400',    bg: 'bg-red-500/10    border-red-500/30',    features: ['Tudo do Advanced', 'Carving de arquivos deletados', 'Deep Scan de setores', 'Análise de entropia'] },
};

function calcPrice(sizeMB: number, extra: number, privacy: boolean, complexity: keyof typeof COMPLEXITY) {
  const base = (sizeMB / 10) * 1.5;
  const privacyExtra = privacy ? 5 : 0;
  const subtotal = (base + extra + privacyExtra);
  return Math.max(1, Math.round(subtotal * COMPLEXITY[complexity].mult * 10) / 10);
}

// ─── Scan Step type ────────────────────────────────────────────────────────
type ScanStep = 'idle' | 'reading' | 'hashing' | 'magic' | 'done';

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AnaliseClient() {
  const [dragOver, setDragOver]       = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [step, setStep]               = useState<ScanStep>('idle');
  const [progress, setProgress]       = useState(0);
  const [sha256, setSha256]           = useState('');
  const [magic, setMagic]             = useState<typeof MAGIC[0] | null>(null);
  const [mismatch, setMismatch]       = useState(false);
  const [complexity, setComplexity]   = useState<keyof typeof COMPLEXITY>('standard');
  const [privacy, setPrivacy]         = useState(true); // Privacy ON by default
  const [privacyLockMsg, setPrivacyLockMsg] = useState(false);
  const [scanLines, setScanLines]     = useState<string[]>([]);
  const dropRef  = useRef<HTMLDivElement>(null);
  const logRef   = useRef<HTMLDivElement>(null);

  // Registration modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regStep, setRegStep] = useState<'form'|'code'|'success'>('form');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSolicitar, setRegSolicitar] = useState(false);
  const [regNoticias, setRegNoticias] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Free analysis tracking (session)
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsRegistered(!!localStorage.getItem('ncfn_registered'));
    }
  }, []);

  const addLog = (line: string) => setScanLines(p => [...p.slice(-18), line]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [scanLines]);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setStep('reading');
    setProgress(0);
    setScanLines([]);
    setSha256('');
    setMagic(null);
    setMismatch(false);

    addLog(`> INICIANDO ANÁLISE: ${f.name}`);
    addLog(`> TAMANHO: ${formatBytes(f.size)}`);
    addLog(`> TIPO DECLARADO: ${f.type || 'desconhecido'}`);
    await new Promise(r => setTimeout(r, 300));

    // ── Read first 16 bytes (magic bytes)
    addLog('> LENDO MAGIC BYTES (offset 0x00)...');
    setStep('magic');
    const headBuf = await f.slice(0, 16).arrayBuffer();
    const headBytes = new Uint8Array(headBuf);
    const hexHead = Array.from(headBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    addLog(`> HEX[0..15]: ${hexHead}`);
    await new Promise(r => setTimeout(r, 400));

    const detected = detectMagicBytes(headBytes);
    setMagic(detected);
    if (detected) {
      addLog(`> ASSINATURA DETECTADA: ${detected.label} (${detected.mime})`);
      if (detected.risk) addLog(`> ⚠ NÍVEL DE RISCO: ${detected.risk}`);
    } else {
      addLog('> ASSINATURA: DESCONHECIDA / BINÁRIO GENÉRICO');
    }

    // ── Check extension vs mime mismatch
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const extMime = f.type;
    if (detected && extMime && !detected.mime.includes(ext) && ext.length > 1) {
      const isMismatch = detected.category === 'Executável' && !['exe','elf','bin','so','dll'].includes(ext);
      setMismatch(isMismatch);
      if (isMismatch) addLog('> ⚠ POLYGLOT DETECTADO: extensão diverge da assinatura real!');
    }

    // ── SHA-256
    addLog('> CALCULANDO SHA-256 (ZERO-COPY STREAMING)...');
    setStep('hashing');
    setProgress(5);

    const CHUNK = 2 * 1024 * 1024;
    const chunks = Math.ceil(f.size / CHUNK);
    const fullBuf = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
      reader.readAsArrayBuffer(f);
    });

    // Simulate chunked progress
    for (let i = 0; i < chunks; i++) {
      await new Promise(r => setTimeout(r, Math.min(80, 600 / chunks)));
      setProgress(Math.floor(((i + 1) / chunks) * 90));
    }

    const hashBuf = await crypto.subtle.digest('SHA-256', fullBuf);
    const hash = bufferToHex(hashBuf);
    setSha256(hash);
    setProgress(100);
    addLog(`> SHA-256: ${hash.slice(0, 32)}...`);
    addLog(`>          ${hash.slice(32)}`);
    addLog('> SCAN CONCLUÍDO. CADEIA DE CUSTÓDIA INICIADA.');
    setStep('done');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const reset = () => {
    setFile(null); setStep('idle'); setProgress(0);
    setSha256(''); setMagic(null); setMismatch(false); setScanLines([]);
  };

  const handlePrivacyToggle = () => {
    if (privacy) {
      // Trying to turn OFF → blocked for non-credentialed users
      setPrivacyLockMsg(true);
      setTimeout(() => setPrivacyLockMsg(false), 4000);
    } else {
      setPrivacy(true);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!regName.trim() || !regEmail.trim()) { setRegError('Nome e e-mail são obrigatórios.'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      const res = await fetch('/api/convidados/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), phone: regPhone.trim(), solicitarCredenciamento: regSolicitar, receberNoticias: regNoticias }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro ao cadastrar');
      setRegStep('code');
    } catch (e: any) {
      setRegError(e.message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleCodeVerify = async () => {
    if (!regCode.trim()) { setRegError('Digite o código recebido.'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      const res = await fetch('/api/convidados/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim(), code: regCode.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Código inválido');
      if (typeof window !== 'undefined') localStorage.setItem('ncfn_registered', '1');
      setIsRegistered(true);
      setRegStep('success');
    } catch (e: any) {
      setRegError(e.message);
    } finally {
      setRegLoading(false);
    }
  };

  const sizeMB = file ? file.size / (1024 * 1024) : 0;
  const extra  = magic?.extra ?? 3;
  const price  = step === 'done' ? calcPrice(sizeMB, extra, privacy, complexity) : 0;
  const cmx    = COMPLEXITY[complexity];

  return (
    <div className="min-h-screen bg-[#020408] text-white font-mono overflow-x-hidden">

      {/* ── GRID BACKGROUND ── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── HEADER ── */}
      <header className="relative border-b border-cyan-500/10 bg-black/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest text-white">NCFN</span>
              <span className="text-xs text-cyan-500/60 ml-2">// FORENSIC ANALYSIS</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-white/10 rounded text-gray-400 hover:text-white hover:border-white/30 transition-all"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Source</span>
            </a>
            <a
              href="#iso"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-purple-500/20 rounded text-purple-400 hover:border-purple-500/40 transition-all"
              title="Em breve"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download ISO</span>
            </a>
            <a
              href="#usb"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-green-500/20 rounded text-green-400 hover:border-green-500/40 transition-all"
              title="Em breve"
            >
              <Usb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pendrive Forense</span>
            </a>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-cyan-500/10 border border-cyan-500/40 rounded text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-16">

        {/* ── HERO ── */}
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] text-cyan-400 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Sistema Operacional Online — v4.2
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            <span className="text-white">Análise Forense</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400">
              por Créditos
            </span>
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Envie qualquer arquivo digital. Calculamos o SHA-256, detectamos a assinatura real via Magic Bytes
            e geramos um orçamento preciso para análise forense com cadeia de custódia certificada.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6 pt-2">
            {[
              { label: 'SHA-256 Client-Side', icon: Hash,        color: 'text-cyan-400' },
              { label: 'Magic Bytes Detection', icon: ScanSearch, color: 'text-purple-400' },
              { label: 'Chain of Custody',     icon: ShieldCheck, color: 'text-green-400' },
              { label: 'Privacy Mode',         icon: EyeOff,      color: 'text-yellow-400' },
            ].map(({ label, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* ── DROPZONE ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileSearch className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400 uppercase tracking-widest">Zero-Copy Scanner</span>
          </div>

          {step === 'idle' && (
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`relative border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-300 ${
                dragOver
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input id="fileInput" type="file" className="hidden" onChange={onFileInput} />
              <div className="space-y-4">
                <div className={`mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center transition-all ${
                  dragOver ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/10 bg-white/5'
                }`}>
                  <Upload className={`w-7 h-7 ${dragOver ? 'text-cyan-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-300 font-semibold">
                    {dragOver ? 'Solte para iniciar análise' : 'Arraste um arquivo ou clique para selecionar'}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Qualquer formato · Processado localmente · SHA-256 calculado no browser
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── SCANNING IN PROGRESS ── */}
          {(step === 'reading' || step === 'hashing' || step === 'magic') && (
            <div className="border border-cyan-500/20 rounded-xl bg-black/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs text-cyan-400 tracking-widest uppercase">
                    {step === 'magic' ? 'Detectando Magic Bytes...' : 'Calculando SHA-256...'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Terminal log */}
              <div
                ref={logRef}
                className="bg-black/80 rounded-lg p-4 h-36 overflow-y-auto text-[10px] leading-relaxed space-y-0.5 border border-white/5"
              >
                {scanLines.map((line, i) => (
                  <div key={i} className={`${
                    line.includes('⚠') ? 'text-yellow-400' :
                    line.includes('SHA-256') || line.includes('HEX') ? 'text-cyan-300' :
                    line.includes('DETECTADA') || line.includes('CONCLUÍDO') ? 'text-green-400' :
                    'text-gray-500'
                  }`}>
                    {line}
                  </div>
                ))}
                <div className="text-gray-700 animate-pulse">█</div>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === 'done' && file && (
            <div className="grid gap-4 lg:grid-cols-2">

              {/* File info card */}
              <div className="border border-white/10 rounded-xl bg-black/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 uppercase tracking-widest font-semibold">Análise Concluída</span>
                  </div>
                  <button onClick={reset} className="p-1 text-gray-600 hover:text-gray-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Filename */}
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest shrink-0">Arquivo</span>
                    <span className="text-xs text-white text-right truncate max-w-[200px]" title={file.name}>{file.name}</span>
                  </div>
                  {/* Size */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">Tamanho Real</span>
                    <span className="text-xs text-white">{formatBytes(file.size)}</span>
                  </div>
                  {/* Declared MIME */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">MIME Declarado</span>
                    <span className="text-xs text-gray-400">{file.type || '—'}</span>
                  </div>
                  {/* Detected type */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">Tipo Real (Magic)</span>
                    {magic ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${magic.risk ? 'text-yellow-400' : 'text-cyan-300'}`}>
                          {magic.label}
                        </span>
                        {magic.risk && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Genérico / Desconhecido</span>
                    )}
                  </div>
                  {/* Polyglot warning */}
                  {mismatch && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-[10px] text-red-300">Possível arquivo Polyglot — extensão diverge da assinatura real</span>
                    </div>
                  )}
                  {/* SHA-256 */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest flex items-center gap-1">
                      <Hash className="w-3 h-3" /> SHA-256
                    </span>
                    <div className="bg-black/60 border border-white/5 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-cyan-300 font-mono break-all leading-relaxed">{sha256}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing card */}
              <div className="border border-white/10 rounded-xl bg-black/40 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400 uppercase tracking-widest font-semibold">Orçamento Dinâmico</span>
                </div>

                {/* Complexity selector */}
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">Nível de Análise</span>
                  <div className="space-y-2">
                    {(Object.entries(COMPLEXITY) as Array<[keyof typeof COMPLEXITY, typeof COMPLEXITY[keyof typeof COMPLEXITY]]>).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setComplexity(key)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                          complexity === key ? cfg.bg : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${complexity === key ? cfg.color : 'text-gray-400'}`}>
                            {cfg.label}
                          </span>
                          <span className={`text-[10px] ${complexity === key ? cfg.color : 'text-gray-600'}`}>
                            ×{cfg.mult.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cfg.features.map(f => (
                            <span key={f} className="text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{f}</span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy mode */}
                {privacyLockMsg && (
                  <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                    Função disponível apenas para Usuários Credenciados
                  </div>
                )}
                <button
                  onClick={handlePrivacyToggle}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                    privacy
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {privacy ? <EyeOff className="w-3.5 h-3.5 text-yellow-400" /> : <Eye className="w-3.5 h-3.5 text-gray-500" />}
                    <div className="text-left">
                      <p className={`text-xs font-semibold ${privacy ? 'text-yellow-400' : 'text-gray-400'}`}>Privacy Mode</p>
                      <p className="text-[9px] text-gray-600">Processado em RAM (/dev/shm) · Destruído após download</p>
                    </div>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-all ${privacy ? 'bg-yellow-500/60' : 'bg-gray-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${privacy ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>

                {/* Price breakdown */}
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">Base ({sizeMB.toFixed(2)} MB)</span>
                    <span className="text-gray-400">{((sizeMB / 10) * 1.5).toFixed(1)} cr</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">Adicional de tipo ({magic?.category ?? 'Genérico'})</span>
                    <span className="text-gray-400">+{extra} cr</span>
                  </div>
                  {privacy && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-yellow-600/80">Privacy Mode</span>
                      <span className="text-yellow-400">+5 cr</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">Multiplicador {cmx.label}</span>
                    <span className={cmx.color}>×{cmx.mult.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-300 font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{price}</span>
                      <span className="text-xs text-gray-500 ml-1">créditos</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                {isRegistered ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> Cadastro ativo — 1 análise gratuita disponível
                    </div>
                    <button
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-cyan-900/30 opacity-60 cursor-not-allowed"
                      title="Página de pagamento em breve"
                    >
                      Seguir para Pagamento — Em Breve
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => { setShowRegisterModal(true); setRegStep('form'); setRegError(''); }}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-cyan-900/30"
                    >
                      <LogIn className="w-4 h-4" />
                      Cadastre-se para continuar
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <p className="text-[9px] text-gray-600 text-center leading-relaxed">
                      Novos acessos ao sistema completo serão disponibilizados em breve — solicite gratuitamente seu credenciamento
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="space-y-6" id="como-funciona">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Como funciona</h2>
            <p className="text-sm text-gray-500">Processo forense em 4 etapas, do upload ao laudo certificado</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', icon: Upload,      color: 'text-cyan-400',   bg: 'bg-cyan-500/10   border-cyan-500/20',   title: 'Upload Seguro',   desc: 'Arraste o arquivo. SHA-256 calculado no browser antes de qualquer transmissão.' },
              { step: '02', icon: FlaskConical, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', title: 'Análise Forense', desc: 'Magic Bytes, EXIF, metadados, timeline e entropia. Workers isolados por container.' },
              { step: '03', icon: Layers,       color: 'text-yellow-400', bg: 'bg-yellow-500/10  border-yellow-500/20', title: 'Custódia Digital', desc: 'Cadeia de custódia com timestamp RFC 3161. Log assinado digitalmente.' },
              { step: '04', icon: Download,     color: 'text-green-400',  bg: 'bg-green-500/10  border-green-500/20',  title: 'Laudo em ZIP',    desc: 'Pacote .zip com PDF, CSV, log de custódia e assinatura .sig verificável.' },
            ].map(({ step: s, icon: Icon, color, bg, title, desc }) => (
              <div key={s} className={`rounded-xl border p-5 space-y-3 ${bg}`}>
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className={`text-[10px] font-black ${color} opacity-40`}>{s}</span>
                </div>
                <div>
                  <p className={`text-sm font-bold ${color}`}>{title}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING TABLE ── */}
        <section className="space-y-6" id="precos">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Tabela de Preços</h2>
            <p className="text-sm text-gray-500">
              Custo = (Tamanho<sub>MB</sub> / 10 × 1.5) + Adicional de Tipo + Adicional de Privacidade
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { category: 'Imagens',              extra: 2,  color: 'text-blue-400',   bg: 'bg-blue-500/5   border-blue-500/15',   types: 'PNG, JPEG, GIF, BMP, WebP, TIFF' },
              { category: 'Documentos',            extra: 3,  color: 'text-cyan-400',   bg: 'bg-cyan-500/5   border-cyan-500/15',   types: 'PDF, DOCX, XLSX, ODS, TXT, EML' },
              { category: 'Áudio',                 extra: 3,  color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/15', types: 'MP3, FLAC, OGG, WAV, AAC' },
              { category: 'Vídeos',                extra: 7,  color: 'text-yellow-400', bg: 'bg-yellow-500/5  border-yellow-500/15', types: 'MP4, MKV, AVI, WebM, FLV, MOV' },
              { category: 'Compactados / Disk Images', extra: 15, color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/15', types: 'ZIP, RAR, 7Z, ISO, IMG, VMDK, DD' },
              { category: 'Executáveis',           extra: 15, color: 'text-red-400',    bg: 'bg-red-500/5    border-red-500/15',    types: 'ELF, PE/EXE, DLL, SO, APK, JAR' },
            ].map(({ category, extra: ex, color, bg, types }) => (
              <div key={category} className={`rounded-xl border p-4 space-y-2 ${bg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${color}`}>{category}</span>
                  <span className={`text-xs font-black ${color}`}>+{ex} cr</span>
                </div>
                <p className="text-[10px] text-gray-600">{types}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <EyeOff className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs text-yellow-400 font-semibold">Privacy Mode — +5 créditos</p>
              <p className="text-[10px] text-gray-500">Processamento em /dev/shm (RAM), sem gravação em disco. Arquivo destruído imediatamente após download. Log de deleção assinado incluído no pacote.</p>
            </div>
          </div>
        </section>

        {/* ── DISTRIBUTION ── */}
        <section className="space-y-6" id="iso">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">NCFN OS — Distribuição</h2>
            <p className="text-sm text-gray-500">Sistema operacional forense baseado em Linux para análise air-gapped</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-300">Download NCFN OS</p>
                  <p className="text-[10px] text-gray-500">Imagem ISO para KVM / VirtualBox</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {['Ferramentas forenses pré-instaladas', 'Autopsy, Sleuth Kit, Volatility', 'Suporte a KVM/VirtualBox/VMware', 'Snapshot automático do ambiente'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-[11px] text-gray-400">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2">
                <Download className="w-3.5 h-3.5" /> Em breve — ncfn-os-x86_64.iso
              </button>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 space-y-4" id="usb">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Usb className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-300">Pendrive Forense Live</p>
                  <p className="text-[10px] text-gray-500">Versão bootable air-gapped para campo</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {['Boot via USB sem instalação', 'Modo read-only do disco alvo', 'Sem swap — análise apenas em RAM', 'Geração de hash na inicialização'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-[11px] text-gray-400">
                    <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-semibold hover:bg-green-500/30 transition-all flex items-center justify-center gap-2">
                <Usb className="w-3.5 h-3.5" /> Em breve — guia de criação
              </button>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section className="text-center py-8 space-y-4 border-t border-white/5">
          <p className="text-gray-500 text-sm">Novos acessos ao sistema completo serão disponibilizados em breve.</p>
          <p className="text-xs text-cyan-400/70">Solicite gratuitamente seu credenciamento e ganhe 1 análise gratuita Standard.</p>
          <button
            onClick={() => { setShowRegisterModal(true); setRegStep('form'); setRegError(''); }}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold tracking-wide transition-all shadow-xl shadow-cyan-900/20"
          >
            <LogIn className="w-4 h-4" />
            Solicitar Credenciamento Gratuito
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>

      </main>

      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-[10px] text-gray-700">
          NCFN © 2026 — Nexus Cyber Forensic Network · Todos os direitos reservados
        </p>
      </footer>

      {/* ── MODAL Cadastre-se para continuar ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#020408] border border-cyan-500/30 rounded-2xl max-w-md w-full shadow-2xl shadow-cyan-900/30 overflow-hidden">
            {/* Header */}
            <div className="bg-cyan-950/30 border-b border-cyan-500/20 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-black text-white text-sm uppercase tracking-widest">Cadastre-se para continuar</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">Sistema NCFN — Acesso gratuito</p>
                </div>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              {regStep === 'form' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Nome completo *</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full bg-black/60 border border-white/10 focus:border-cyan-500/60 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">E-mail *</label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-black/60 border border-white/10 focus:border-cyan-500/60 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Telefone</label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-black/60 border border-white/10 focus:border-cyan-500/60 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-700"
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2.5 border-t border-white/5 pt-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${regSolicitar ? 'bg-cyan-500 border-cyan-500' : 'border-white/20 hover:border-cyan-500/50'}`}
                        onClick={() => setRegSolicitar(v => !v)}
                      >
                        {regSolicitar && <CheckCircle2 className="w-3 h-3 text-black" />}
                      </div>
                      <span className="text-[11px] text-gray-400 leading-relaxed">
                        Solicitar gratuitamente meu credenciamento no sistema completo
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${regNoticias ? 'bg-cyan-500 border-cyan-500' : 'border-white/20 hover:border-cyan-500/50'}`}
                        onClick={() => setRegNoticias(v => !v)}
                      >
                        {regNoticias && <CheckCircle2 className="w-3 h-3 text-black" />}
                      </div>
                      <span className="text-[11px] text-gray-400 leading-relaxed">
                        Receber notícias do sistema NCFN
                      </span>
                    </label>
                  </div>

                  {regError && (
                    <p className="text-[10px] text-red-400 font-mono px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{regError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowRegisterModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold border border-white/10 transition-all">
                      Cancelar
                    </button>
                    <button
                      onClick={handleRegisterSubmit}
                      disabled={regLoading || !regName.trim() || !regEmail.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {regLoading ? <span className="animate-spin">⟳</span> : null}
                      Continuar
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-700 text-center">
                    Ou entre com Google — disponível em breve
                  </p>
                </>
              )}

              {regStep === 'code' && (
                <>
                  <div className="text-center space-y-2 py-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6 text-cyan-400" />
                    </div>
                    <p className="text-sm text-white font-semibold">Verifique seu e-mail</p>
                    <p className="text-[11px] text-gray-500">Enviamos um código de verificação para <span className="text-cyan-400 font-mono">{regEmail}</span></p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Código de verificação</label>
                    <input
                      type="text"
                      value={regCode}
                      onChange={e => setRegCode(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-black/60 border border-white/10 focus:border-cyan-500/60 text-white text-center text-xl font-black rounded-xl px-4 py-3 outline-none transition-colors placeholder:text-gray-700 tracking-[0.5em]"
                    />
                  </div>
                  {regError && (
                    <p className="text-[10px] text-red-400 font-mono px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{regError}</p>
                  )}
                  <button
                    onClick={handleCodeVerify}
                    disabled={regLoading || !regCode.trim()}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {regLoading ? <span className="animate-spin">⟳</span> : null}
                    Verificar código
                  </button>
                </>
              )}

              {regStep === 'success' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <p className="text-base font-black text-white uppercase tracking-widest">Cadastro Confirmado!</p>
                    <p className="text-xs text-gray-500 mt-1">Você ganhou 1 análise gratuita no modo Standard.</p>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-cyan-300 leading-relaxed">
                    Seu pedido de credenciamento foi registrado. Nossa equipe entrará em contato em breve.
                  </div>
                  <button
                    onClick={() => setShowRegisterModal(false)}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black uppercase tracking-widest transition-all"
                  >
                    Começar Análise
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
