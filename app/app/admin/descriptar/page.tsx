"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, KeyRound, Upload, Download, Shield, Unlock,
  AlertTriangle, CheckCircle, RefreshCw, FileText, Eye, EyeOff,
  Mail, Hash, HelpCircle, X,
} from "lucide-react";

type Status = 'idle' | 'decrypting' | 'success' | 'error';

// Hex background rain characters
const HEX_CHARS = "0123456789ABCDEF";
const HEX_COLS = 32;

function HexBackground() {
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    // Generate initial columns
    const initial = Array.from({ length: HEX_COLS }, () =>
      Array.from({ length: 20 }, () => HEX_CHARS[Math.floor(Math.random() * 16)]).join(" ")
    );
    setColumns(initial);

    const interval = setInterval(() => {
      setColumns(prev => prev.map(col => {
        const chars = col.split(" ");
        // shift down and add new char at top
        chars.pop();
        chars.unshift(HEX_CHARS[Math.floor(Math.random() * 16)]);
        return chars.join(" ");
      }));
    }, 120);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none">
      <div className="flex gap-3 opacity-[0.04] font-mono text-[10px] text-orange-300 leading-5 h-full">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-0">
            {col.split(" ").map((ch, j) => (
              <span key={j}>{ch}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DescriptarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState("");
  const [resultName, setResultName] = useState("");
  const [resultHash, setResultHash] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showMailTooltip, setShowMailTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setStatus('idle');
    setStatusMsg("");
    setResultName("");
    setResultHash("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const computeSHA256 = async (buf: ArrayBuffer): Promise<string> => {
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const decrypt = async () => {
    if (!file || !password) {
      setStatus('error');
      setStatusMsg("Selecione um arquivo .enc e informe a senha.");
      return;
    }

    setStatus('decrypting');
    setStatusMsg("Derivando chave e desencriptando...");
    setResultHash("");

    try {
      const arrayBuf = await file.arrayBuffer();
      const allBytes = new Uint8Array(arrayBuf);

      const iv = allBytes.slice(0, 16);
      const cipherData = allBytes.slice(16);

      // Tentar via servidor primeiro
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      const serverRes = await fetch('/api/descriptar/decrypt', {
        method: 'POST',
        body: formData,
      });

      if (serverRes.ok) {
        const blob = await serverRes.blob();
        const decBuf = await blob.arrayBuffer();
        const hash = await computeSHA256(decBuf);

        const originalName = file.name.replace(/\.enc(\.bin)?$/, '');
        const url = URL.createObjectURL(new Blob([decBuf]));
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        a.click();
        URL.revokeObjectURL(url);

        setResultName(originalName);
        setResultHash(hash);
        setStatus('success');
        setStatusMsg(`Arquivo desencriptado: ${originalName}`);
        return;
      }

      // Fallback: WebCrypto legado
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
      );
      const cryptoKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode('salt-forense-ncfn'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-CBC', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        cipherData
      );

      const hash = await computeSHA256(decrypted);
      const originalName = file.name.replace(/\.enc(\.bin)?$/, '');
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);

      setResultName(originalName);
      setResultHash(hash);
      setStatus('success');
      setStatusMsg(`Arquivo desencriptado (modo legado): ${originalName}`);

    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err?.message?.includes('operation-specific')
        ? 'Senha incorreta ou arquivo corrompido.'
        : `Erro: ${err?.message ?? 'Falha na decriptação'}`
      );
    }
  };

  return (
    <div className="relative min-h-screen bg-[#06070a] text-gray-300 p-4 md:p-6">
      <HexBackground />

      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-gray-600 hover:text-orange-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <KeyRound className="w-5 h-5 text-orange-400" />
          <h1 className="text-lg font-bold text-white">Descriptar Arquivo</h1>
          <span className="text-xs text-gray-600 ml-2 font-mono">Modo de Resgate AES-256</span>
          <button onClick={() => setShowHelp(true)}
            className="ml-auto flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
            <HelpCircle size={14} /> Como funciona
          </button>
        </div>

        <div className="bg-black/60 border border-orange-900/30 rounded-xl p-6 space-y-6 backdrop-blur-sm">

          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-orange-950/20 border border-orange-700/20 rounded-lg text-xs text-orange-300/70">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-400" />
            <div>
              Decriptação local — arquivos processados no servidor com a chave do Portal NCFN.
              Para recuperação de emergência com <strong>Chave Mestra</strong>, contacte o administrador
              pelo canal de comunicação seguro.
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-mono uppercase tracking-widest">1. Selecionar Arquivo</label>
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all ${
                dragging
                  ? 'border-orange-400 bg-orange-950/20'
                  : file
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : 'border-gray-700 hover:border-orange-500/50 hover:bg-orange-950/10'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".enc,.bin"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <>
                  <FileText className="w-8 h-8 text-emerald-400" />
                  <span className="text-sm text-emerald-300 font-mono">{file.name}</span>
                  <span className="text-xs text-gray-600">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-600" />
                  <span className="text-sm text-gray-500">Arraste o arquivo <code className="text-orange-400">.enc</code> ou clique para selecionar</span>
                </>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-mono uppercase tracking-widest">2. Chave AES-256</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha de decriptação..."
                  className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-orange-500 pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Chave Mestra → mailto flow */}
              <div className="relative">
                <a
                  href="mailto:ncfn@ncfn.net?subject=Solicita%C3%A7%C3%A3o%20de%20Chave%20Mestra%20NCFN&body=Solicito%20a%20Chave%20Mestra%20para%20decripta%C3%A7%C3%A3o%20de%20emerg%C3%AAncia.%0A%0AMotivo%3A%20"
                  onMouseEnter={() => setShowMailTooltip(true)}
                  onMouseLeave={() => setShowMailTooltip(false)}
                  onFocus={() => setShowMailTooltip(true)}
                  onBlur={() => setShowMailTooltip(false)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-950/40 border border-orange-700/40 rounded-lg text-orange-400 text-xs font-bold hover:bg-orange-900/30 transition-all whitespace-nowrap"
                  title="Solicitar Chave Mestra por email seguro"
                >
                  <Mail size={12} /> Chave Mestra
                </a>

                {showMailTooltip && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-950 border border-orange-700/50 rounded-lg text-[10px] text-orange-200/80 font-mono z-50 shadow-xl">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={10} className="text-orange-400 flex-shrink-0 mt-0.5" />
                      <span>
                        A Chave Mestra é gerada off-line e nunca armazenada no servidor.
                        Esta ação abrirá seu cliente de email seguro para solicitar ao administrador NCFN.
                        Use apenas em casos de emergência forense.
                      </span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-orange-900/40 text-orange-400/60">
                      → ncfn@ncfn.net
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Decrypt button */}
          <button
            onClick={decrypt}
            disabled={!file || !password || status === 'decrypting'}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-950/40 border border-orange-600/40 rounded-xl text-orange-300 font-bold hover:bg-orange-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {status === 'decrypting'
              ? <><RefreshCw size={16} className="animate-spin" /> Desencriptando...</>
              : <><Unlock size={16} /> Desbloquear Arquivo</>
            }
          </button>

          {/* Status */}
          {statusMsg && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              status === 'success'
                ? 'bg-emerald-950/30 border border-emerald-700/30 text-emerald-300'
                : status === 'error'
                ? 'bg-red-950/30 border border-red-700/30 text-red-400'
                : 'bg-gray-900/50 border border-gray-700 text-gray-400'
            }`}>
              {status === 'success'
                ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                : status === 'error'
                ? <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                : <RefreshCw size={16} className="flex-shrink-0 mt-0.5 animate-spin" />
              }
              <span className="font-mono text-xs">{statusMsg}</span>
            </div>
          )}

          {/* Success: SHA-256 verification */}
          {status === 'success' && resultName && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-700/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <Download size={13} />
                Download iniciado: <span className="text-white">{resultName}</span>
              </div>

              {resultHash && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                    <Hash size={10} /> SHA-256 do arquivo decriptado
                  </div>
                  <div className="bg-black/60 border border-gray-800 rounded p-2.5">
                    <code className="text-[10px] text-emerald-300/80 font-mono break-all leading-relaxed">
                      {resultHash}
                    </code>
                  </div>
                  <p className="text-[10px] text-gray-600 font-mono">
                    Verifique este hash contra o registro de custódia original para confirmar integridade.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
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
              <p>Este módulo <strong className="text-white">decripta arquivos AES-256</strong> com extensão <code className="bg-gray-800 px-1 rounded">.enc</code> gerados pelo Vault Forense NCFN.</p>
              <p>Arraste ou selecione o arquivo <code className="bg-gray-800 px-1 rounded">.enc</code> e informe a <strong className="text-white">chave de decriptação</strong> (senha usada no momento da criptografia).</p>
              <p>O arquivo decriptado é disponibilizado para <strong className="text-white">download imediato</strong> junto com o hash SHA-256 para verificação de integridade.</p>
              <p>O <strong className="text-white">evento de decriptação é registrado</strong> no log de auditoria. Para recuperação de emergência com Chave Mestra, contate o administrador via o canal seguro indicado.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
