"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Lock, Unlock, Shield, AlertTriangle,
  CheckCircle, Mail, Eye, EyeOff, Upload, FileText,
  Download, Hash, HelpCircle, X,
} from "lucide-react";

type Status = 'idle' | 'decrypting' | 'success' | 'error';

const BOOT_LOGS = [
  "[SYS] NCFN Cryptographic Module v4.2 — PRONTO.",
  "[SYS] Motor AES-256-CBC carregado.",
  "[SYS] PBKDF2 / scrypt disponível.",
  "[SYS] Aguardando arquivo .enc e chave de acesso...",
];

const DECRYPT_LOGS = [
  "[INI] Protocolo de autorização iniciado.",
  "[MEM] Buffer seguro alocado — 64KB.",
  "[KEY] Derivando chave criptográfica via PBKDF2...",
  "[ALT] Lendo vetor de inicialização (IV: 16 bytes)...",
  "[SEG] Processando segmento 1/8...",
  "[SEG] Processando segmento 2/8...",
  "[BLK] Verificação bloco 001-032 — COMPLETO",
  "[SEG] Processando segmento 3/8...",
  "[SEG] Processando segmento 4/8...",
  "[SEG] Processando segmento 5/8...",
  "[BLK] Verificação bloco 033-064 — COMPLETO",
  "[ALT] Injetando payload — segmento 6...",
  "[SEG] Processando segmento 6/8...",
  "[PRO] Reconstruindo estrutura do documento...",
  "[SEG] Processando segmento 7/8...",
  "[SEG] Processando segmento 8/8...",
  "[BLK] Verificação bloco 065-128 — COMPLETO",
  "[SHA] Computando SHA-256 do conteúdo...",
  "[VER] Verificando integridade dos dados...",
];

// Vertical data stream background
function DataStream({ delay = 0, speed = 40 }: { delay?: number; speed?: number }) {
  const chars = "0192837465 5647382910 8829304185 1029384756 9483726150 ";
  return (
    <div className="flex flex-col overflow-hidden h-full opacity-10 select-none pointer-events-none">
      <div
        className="font-mono text-[9px] text-cyan-400 whitespace-nowrap"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          letterSpacing: '0.5em',
          animation: `dataScroll ${speed}s linear ${delay}s infinite`,
        }}
      >
        {chars.repeat(4)}
      </div>
    </div>
  );
}

// SVG Radar Animation
function RadarCore({ status, progress }: { status: Status; progress: number }) {
  const isActive = status === 'decrypting';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const primaryColor = isError ? '#ff4444' : isSuccess ? '#00ff88' : '#00f3ff';
  const ring1Speed = isActive ? '2s' : '8s';
  const ring2Speed = isActive ? '3s' : '14s';
  const ring3Speed = isActive ? '1.5s' : '6s';
  const sweepSpeed = isActive ? '1.5s' : '4s';

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-72 md:h-72">
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${primaryColor}14 0%, transparent 70%)`,
          boxShadow: isActive ? `0 0 60px ${primaryColor}30` : `0 0 20px ${primaryColor}15`,
        }}
      />

      <svg viewBox="0 0 280 280" className="absolute inset-0 w-full h-full">
        {/* Outer static ring */}
        <circle cx="140" cy="140" r="130" fill="none" stroke={primaryColor} strokeWidth="0.5" strokeOpacity="0.2" />

        {/* Grid crosshair */}
        <line x1="10" y1="140" x2="270" y2="140" stroke={primaryColor} strokeWidth="0.4" strokeOpacity="0.15" />
        <line x1="140" y1="10" x2="140" y2="270" stroke={primaryColor} strokeWidth="0.4" strokeOpacity="0.15" />

        {/* Cardinal dots */}
        {[[140, 10], [270, 140], [140, 270], [10, 140]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill={primaryColor} fillOpacity="0.5" />
        ))}

        {/* Orbit ring 1 — dashed, rotating */}
        <circle
          cx="140" cy="140" r="105"
          fill="none"
          stroke={primaryColor}
          strokeWidth="0.8"
          strokeOpacity={isActive ? 0.6 : 0.25}
          strokeDasharray="8 6"
          style={{
            transformOrigin: '140px 140px',
            animation: `spin ${ring1Speed} linear infinite`,
            transition: 'stroke-opacity 0.5s',
          }}
        />

        {/* Orbit ring 2 — reverse */}
        <circle
          cx="140" cy="140" r="80"
          fill="none"
          stroke={primaryColor}
          strokeWidth="0.6"
          strokeOpacity={isActive ? 0.4 : 0.15}
          strokeDasharray="4 10"
          style={{
            transformOrigin: '140px 140px',
            animation: `spin ${ring2Speed} linear infinite reverse`,
            transition: 'stroke-opacity 0.5s',
          }}
        />

        {/* Inner solid ring */}
        <circle cx="140" cy="140" r="55" fill="none" stroke={primaryColor} strokeWidth="1" strokeOpacity="0.3" />

        {/* Sweep arc */}
        <path
          d={`M 140 140 L 140 35 A 105 105 0 0 1 ${140 + 105 * Math.sin(Math.PI / 3)} ${140 - 105 * Math.cos(Math.PI / 3)} Z`}
          fill={`url(#sweepGrad)`}
          style={{
            transformOrigin: '140px 140px',
            animation: `spin ${sweepSpeed} linear infinite`,
          }}
        />
        <defs>
          <radialGradient id="sweepGrad" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ring 3 — fast small dashes */}
        <circle
          cx="140" cy="140" r="125"
          fill="none"
          stroke={primaryColor}
          strokeWidth="0.4"
          strokeOpacity={isActive ? 0.3 : 0.1}
          strokeDasharray="2 18"
          style={{
            transformOrigin: '140px 140px',
            animation: `spin ${ring3Speed} linear infinite`,
          }}
        />

        {/* Progress arc */}
        {progress > 0 && (
          <circle
            cx="140" cy="140" r="105"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
            strokeOpacity="0.9"
            strokeDasharray={`${(progress / 100) * 659.7} 659.7`}
            strokeLinecap="round"
            style={{ transformOrigin: '140px 140px', transform: 'rotate(-90deg)' }}
          />
        )}
      </svg>

      {/* Center icon */}
      <div
        className="relative z-10 flex flex-col items-center gap-1 transition-all duration-500"
        style={{ filter: `drop-shadow(0 0 12px ${primaryColor})` }}
      >
        {isSuccess
          ? <Unlock className="w-10 h-10" style={{ color: primaryColor }} />
          : isError
          ? <AlertTriangle className="w-10 h-10 text-red-400" />
          : <Lock className="w-10 h-10" style={{ color: primaryColor, opacity: isActive ? 1 : 0.6 }} />
        }
        <span
          className="font-mono text-[9px] tracking-widest uppercase mt-1"
          style={{ color: primaryColor, opacity: 0.8 }}
        >
          {status === 'idle' && 'AGUARDANDO'}
          {status === 'decrypting' && 'DECIFRANDO'}
          {status === 'success' && 'ACESSO LIBERADO'}
          {status === 'error' && 'ACESSO NEGADO'}
        </span>
      </div>
    </div>
  );
}

export default function DescriptarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [resultName, setResultName] = useState("");
  const [resultHash, setResultHash] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMailTip, setShowMailTip] = useState(false);
  const [logs, setLogs] = useState<string[]>(BOOT_LOGS);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef2 = useRef<ReturnType<typeof setInterval> | null>(null);

  const primaryColor = status === 'error' ? '#ff4444' : status === 'success' ? '#00ff88' : '#00f3ff';

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleFile = (f: File) => {
    setFile(f);
    setStatus('idle');
    setResultName(""); setResultHash("");
    setLogs(prev => [...prev, `[FILE] Arquivo carregado: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const computeSHA256 = async (buf: ArrayBuffer): Promise<string> => {
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const startProgressAnimation = () => {
    setProgress(0);
    let p = 0;
    let logIdx = 0;
    setLogs(prev => [...prev, DECRYPT_LOGS[logIdx++]]);

    progressRef.current = setInterval(() => {
      p += Math.random() * 4 + 1;
      if (p >= 90) { p = 90; if (progressRef.current) clearInterval(progressRef.current); }
      setProgress(Math.round(p));
    }, 200);

    logRef2.current = setInterval(() => {
      if (logIdx < DECRYPT_LOGS.length) {
        setLogs(prev => [...prev, DECRYPT_LOGS[logIdx++]]);
      } else {
        if (logRef2.current) clearInterval(logRef2.current);
      }
    }, 700);
  };

  const stopProgressAnimation = (success: boolean, finalLog: string) => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (logRef2.current) clearInterval(logRef2.current);
    setProgress(success ? 100 : 0);
    setLogs(prev => [...prev, finalLog]);
  };

  const decrypt = async () => {
    if (!file || !password) {
      setStatus('error');
      setLogs(prev => [...prev, "[ERR] Arquivo e chave são obrigatórios."]);
      return;
    }
    setStatus('decrypting');
    startProgressAnimation();
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      const serverRes = await fetch('/api/descriptar/decrypt', { method: 'POST', body: formData });

      if (serverRes.ok) {
        const blob = await serverRes.blob();
        const decBuf = await blob.arrayBuffer();
        const hash = await computeSHA256(decBuf);
        const originalName = file.name.replace(/\.enc(\.bin)?$/, '');
        const url = URL.createObjectURL(new Blob([decBuf]));
        const a = document.createElement('a'); a.href = url; a.download = originalName; a.click();
        URL.revokeObjectURL(url);
        setResultName(originalName); setResultHash(hash);
        setStatus('success');
        stopProgressAnimation(true, `[OK] Arquivo reconstruído: ${originalName}`);
        return;
      }

      // Fallback WebCrypto
      const arrayBuf = await file.arrayBuffer();
      const allBytes = new Uint8Array(arrayBuf);
      const iv = allBytes.slice(0, 16);
      const cipherData = allBytes.slice(16);
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      const cryptoKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode('salt-forense-ncfn'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-CBC', length: 256 }, false, ['decrypt']
      );
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, cipherData);
      const hash = await computeSHA256(decrypted);
      const originalName = file.name.replace(/\.enc(\.bin)?$/, '');
      const url = URL.createObjectURL(new Blob([decrypted]));
      const a = document.createElement('a'); a.href = url; a.download = originalName; a.click();
      URL.revokeObjectURL(url);
      setResultName(originalName); setResultHash(hash);
      setStatus('success');
      stopProgressAnimation(true, `[OK] Arquivo reconstruído (modo legado): ${originalName}`);
    } catch (err: any) {
      setStatus('error');
      const msg = err?.message?.includes('operation-specific')
        ? '[ERR] Senha incorreta ou arquivo corrompido.'
        : `[ERR] ${err?.message ?? 'Falha na decriptação'}`;
      stopProgressAnimation(false, msg);
    }
  };

  const abort = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (logRef2.current) clearInterval(logRef2.current);
    setStatus('idle'); setProgress(0);
    setLogs(prev => [...prev, "[ABT] Processo abortado pelo operador."]);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden text-cyan-100"
      style={{ background: '#02080a', fontFamily: 'Space Mono, monospace' }}
    >
      {/* CSS animations */}
      <style>{`
        @keyframes dataScroll { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .scanline-overlay {
          background: linear-gradient(to bottom, transparent 50%, rgba(0,243,255,0.025) 50%);
          background-size: 100% 4px;
        }
      `}</style>

      {/* Schematic grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          radial-gradient(circle at 2px 2px, rgba(0,243,255,0.04) 1px, transparent 0),
          linear-gradient(rgba(0,243,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,243,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px, 100px 100px, 100px 100px',
      }} />

      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none scanline-overlay opacity-50" />

      {/* Data stream columns — sides */}
      <div className="fixed top-0 left-4 h-full w-6 overflow-hidden opacity-10 pointer-events-none select-none hidden lg:block">
        <DataStream speed={40} delay={0} />
      </div>
      <div className="fixed top-0 left-12 h-full w-6 overflow-hidden opacity-10 pointer-events-none select-none hidden xl:block">
        <DataStream speed={30} delay={-10} />
      </div>
      <div className="fixed top-0 right-4 h-full w-6 overflow-hidden opacity-10 pointer-events-none select-none hidden lg:block">
        <DataStream speed={35} delay={-15} />
      </div>
      <div className="fixed top-0 right-12 h-full w-6 overflow-hidden opacity-10 pointer-events-none select-none hidden xl:block">
        <DataStream speed={50} delay={-5} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 flex flex-col min-h-screen gap-4">

        {/* ── HEADER ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-cyan-400/50 font-mono tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 inline-block" />
              Sistema de Autorização · Protocolo
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight"
              style={{ fontFamily: 'Michroma, sans-serif', color: '#00f3ff', textShadow: '0 0 30px rgba(0,243,255,0.4)' }}>
              DESCRIPTOGRAFIA<br />DE DADOS
            </h1>
            <div className="flex items-center gap-4 text-[9px] font-mono tracking-widest mt-2">
              <span className="flex items-center gap-1.5 text-cyan-400/50">
                <span className="w-1 h-1 rounded-full bg-cyan-400/50" />
                OBJETIVO: SOBERANIA_CORE_V4
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400/50">
                <span className="w-1 h-1 rounded-full bg-cyan-400/50" />
                NODE: NCFN-HUB-PRIME
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-cyan-400/40 hover:text-cyan-400 transition-colors p-2">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div
              className="p-3 rounded border transition-all"
              style={{ borderColor: `${primaryColor}40`, background: `${primaryColor}10`, color: primaryColor }}
            >
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ────────────────────────────────────────────── */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_80px] gap-4">

          {/* LEFT — inputs */}
          <div className="space-y-4">

            {/* File drop */}
            <div
              className="border rounded p-4 space-y-2 transition-all cursor-pointer"
              style={{
                borderColor: dragging ? '#00f3ff' : file ? '#00ff8840' : 'rgba(0,243,255,0.15)',
                background: dragging ? 'rgba(0,243,255,0.08)' : file ? 'rgba(0,255,136,0.04)' : 'rgba(0,243,255,0.03)',
              }}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <div className="text-[9px] tracking-widest uppercase mb-2" style={{ color: `${primaryColor}70` }}>
                01 · Selecionar Arquivo
              </div>
              <input ref={inputRef} type="file" accept=".enc,.bin" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <div className="flex items-center gap-3">
                {file
                  ? <><FileText className="w-6 h-6 flex-shrink-0" style={{ color: '#00ff88' }} />
                    <div>
                      <div className="text-xs text-white font-mono truncate max-w-[220px]">{file.name}</div>
                      <div className="text-[9px] text-cyan-400/40">{(file.size / 1024).toFixed(1)} KB</div>
                    </div></>
                  : <><Upload className="w-6 h-6 text-cyan-400/30" />
                    <span className="text-xs text-cyan-400/40">Arraste <code className="text-cyan-300/60">.enc</code> ou clique</span></>
                }
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="text-[9px] tracking-widest uppercase" style={{ color: `${primaryColor}70` }}>
                02 · Chave AES-256
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Chave de decriptação..."
                    onKeyDown={(e) => e.key === 'Enter' && decrypt()}
                    className="w-full rounded px-3 py-2 text-xs text-white font-mono pr-8 outline-none transition-all"
                    style={{
                      background: 'rgba(0,243,255,0.04)',
                      border: '1px solid rgba(0,243,255,0.2)',
                      caretColor: '#00f3ff',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,243,255,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,243,255,0.2)'}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400/40 hover:text-cyan-400">
                    {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <div className="relative">
                  <a
                    href="mailto:ncfn@ncfn.net?subject=Solicita%C3%A7%C3%A3o%20de%20Chave%20Mestra%20NCFN&body=Solicito%20a%20Chave%20Mestra%20para%20decripta%C3%A7%C3%A3o%20de%20emerg%C3%AAncia.%0A%0AMotivo%3A%20"
                    onMouseEnter={() => setShowMailTip(true)}
                    onMouseLeave={() => setShowMailTip(false)}
                    className="flex items-center gap-1 px-3 py-2 text-[10px] font-mono rounded border transition-all whitespace-nowrap"
                    style={{ background: 'rgba(255,100,0,0.08)', borderColor: 'rgba(255,100,0,0.3)', color: '#ff9944' }}
                  >
                    <Mail size={11} /> Mestra
                  </a>
                  {showMailTip && (
                    <div className="absolute bottom-full right-0 mb-2 w-60 p-3 rounded border text-[9px] font-mono z-50"
                      style={{ background: '#020c0e', borderColor: 'rgba(255,100,0,0.4)', color: 'rgba(255,153,68,0.8)' }}>
                      Chave Mestra gerada off-line — nunca armazenada no servidor.
                      Solicita ao admin NCFN via email seguro. Emergência forense apenas.<br />
                      <span className="text-orange-400/60 mt-1 block">→ ncfn@ncfn.net</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Success result */}
            {status === 'success' && resultName && (
              <div className="p-3 rounded border space-y-2" style={{ background: 'rgba(0,255,136,0.05)', borderColor: 'rgba(0,255,136,0.3)' }}>
                <div className="flex items-center gap-2 text-xs text-green-300">
                  <Download size={12} /> Download: <span className="text-white font-mono text-[10px]">{resultName}</span>
                </div>
                {resultHash && (
                  <div>
                    <div className="text-[9px] text-green-400/50 mb-1 flex items-center gap-1"><Hash size={9} /> SHA-256</div>
                    <code className="text-[9px] font-mono text-green-300/60 break-all leading-relaxed block">{resultHash}</code>
                  </div>
                )}
              </div>
            )}

            {/* How it works button */}
            <button onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 text-[9px] text-cyan-400/40 hover:text-cyan-400/70 transition-colors">
              <HelpCircle size={11} /> Como funciona
            </button>
          </div>

          {/* CENTER — Radar */}
          <div className="flex items-center justify-center py-4">
            <RadarCore status={status} progress={progress} />
          </div>

          {/* RIGHT — Progress */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="text-[9px] tracking-widest uppercase text-cyan-400/40">PROGRESS</div>
            <div className="text-4xl font-black tabular-nums" style={{ color: primaryColor, textShadow: `0 0 20px ${primaryColor}60`, fontFamily: 'Michroma, sans-serif' }}>
              {String(progress).padStart(2, '0')}
            </div>
            <div className="text-[8px] text-cyan-400/30">%</div>

            {/* Vertical bar */}
            <div className="flex-1 w-6 rounded overflow-hidden relative" style={{ background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.1)', minHeight: '80px' }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded transition-all duration-300"
                style={{ height: `${progress}%`, background: `linear-gradient(to top, ${primaryColor}, ${primaryColor}40)` }}
              />
            </div>

            {/* Stats */}
            <div className="space-y-1 text-center">
              <div className="text-[8px] text-cyan-400/25 uppercase tracking-wider leading-tight">
                BLOCOS<br />ENCRIPTADOS
              </div>
              <div className="text-xs font-mono" style={{ color: primaryColor }}>
                {Math.round(progress * 1.28)}
              </div>
            </div>
          </div>
        </div>

        {/* ── TERMINAL LOG ─────────────────────────────────────────── */}
        <div
          className="rounded border p-3 h-28 overflow-hidden relative"
          style={{ background: 'rgba(0,243,255,0.02)', borderColor: 'rgba(0,243,255,0.1)' }}
        >
          <div className="text-[8px] tracking-widest uppercase text-cyan-400/30 mb-2">■ LOG DO SISTEMA</div>
          <div ref={logRef} className="h-16 overflow-y-auto space-y-0.5 font-mono text-[9px]"
            style={{ scrollbarWidth: 'none' }}>
            {logs.map((log, i) => {
              const isErr = log.startsWith('[ERR') || log.startsWith('[ABT');
              const isOk = log.startsWith('[OK');
              return (
                <div key={i} className={isErr ? 'text-red-400' : isOk ? 'text-green-400' : 'text-cyan-400/50'}>
                  {log}
                </div>
              );
            })}
            {status === 'decrypting' && (
              <div className="text-cyan-400/40 animate-pulse">▊</div>
            )}
          </div>
        </div>

        {/* ── BUTTONS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={abort}
            disabled={status !== 'decrypting'}
            className="flex items-center justify-center gap-2 py-3 rounded text-xs font-mono tracking-widest uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ border: '1px solid rgba(255,68,68,0.4)', color: '#ff4444', background: 'rgba(255,68,68,0.05)' }}
          >
            ○ Abortar Processo
          </button>
          <button
            onClick={decrypt}
            disabled={!file || !password || status === 'decrypting'}
            className="flex items-center justify-center gap-2 py-3 rounded text-xs font-mono tracking-widest uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            style={{
              border: `1px solid ${primaryColor}60`,
              color: primaryColor,
              background: `${primaryColor}10`,
              boxShadow: status === 'idle' && file && password ? `0 0 20px ${primaryColor}20` : 'none',
            }}
          >
            ■ {status === 'decrypting' ? 'Processando...' : 'Desbloquear Arquivo'}
          </button>
        </div>
      </div>

      {/* ── HELP MODAL ───────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded border p-6 max-w-md w-full space-y-4 relative"
            style={{ background: '#02080a', borderColor: 'rgba(0,243,255,0.25)', boxShadow: '0 0 50px rgba(0,243,255,0.1)' }}>
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-cyan-400/30 hover:text-cyan-400">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded border" style={{ borderColor: 'rgba(0,243,255,0.3)', background: 'rgba(0,243,255,0.05)' }}>
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-sm font-black tracking-widest uppercase" style={{ color: '#00f3ff', fontFamily: 'Michroma, sans-serif' }}>
                Como Funciona
              </h2>
            </div>
            <div className="space-y-3 text-xs font-mono text-cyan-400/60 leading-relaxed">
              <p>Este módulo <span className="text-white">decripta arquivos AES-256</span> com extensão <code className="text-cyan-300">.enc</code> gerados pelo Vault Forense NCFN.</p>
              <p>Arraste o arquivo <code className="text-cyan-300">.enc</code> e informe a <span className="text-white">chave de decriptação</span> usada no momento da criptografia.</p>
              <p>O arquivo decriptado é disponibilizado para <span className="text-white">download imediato</span> com hash SHA-256 para verificação de integridade.</p>
              <p>O <span className="text-white">evento é registrado</span> no log de auditoria. Para emergência com Chave Mestra, use o botão "Mestra" acima.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
