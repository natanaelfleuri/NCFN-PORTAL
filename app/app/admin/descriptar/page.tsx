"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, KeyRound, Upload, Download, Shield, Unlock,
  AlertTriangle, CheckCircle, RefreshCw, FileText, Eye, EyeOff,
} from "lucide-react";

type Status = 'idle' | 'loading-key' | 'decrypting' | 'success' | 'error';

export default function DescriptarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState("");
  const [resultName, setResultName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setStatus('idle');
    setStatusMsg("");
    setResultName("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const loadMasterKey = async () => {
    setStatus('loading-key');
    try {
      const res = await fetch('/api/descriptar/master-key');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar chave mestra');
      setPassword(data.key || '');
      setStatus('idle');
      setStatusMsg("Chave mestra carregada.");
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message);
    }
  };

  const decrypt = async () => {
    if (!file || !password) {
      setStatus('error');
      setStatusMsg("Selecione um arquivo .enc e informe a senha.");
      return;
    }

    setStatus('decrypting');
    setStatusMsg("Derivando chave e desencriptando...");

    try {
      // Ler arquivo como ArrayBuffer
      const arrayBuf = await file.arrayBuffer();
      const allBytes = new Uint8Array(arrayBuf);

      // Formato gerado pelo Portal: IV (16 bytes) + dados cifrados
      const iv = allBytes.slice(0, 16);
      const cipherData = allBytes.slice(16);

      // Derivar chave via PBKDF2 (compatível com scrypt do Node usando salt do .env via servidor)
      // Para arquivos do Portal NCFN, usamos a rota /api/decrypt no servidor
      // Para arquivos legados (HTML antigo), usamos WebCrypto diretamente

      // Estratégia: tentar via servidor primeiro (Portal NCFN), depois WebCrypto legado
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      const serverRes = await fetch('/api/descriptar/decrypt', {
        method: 'POST',
        body: formData,
      });

      if (serverRes.ok) {
        const blob = await serverRes.blob();
        const originalName = file.name.replace(/\.enc(\.bin)?$/, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        a.click();
        URL.revokeObjectURL(url);
        setResultName(originalName);
        setStatus('success');
        setStatusMsg(`Arquivo desencriptado: ${originalName}`);
        return;
      }

      // Fallback: decriptação legada via WebCrypto (salt fixo do HTML antigo)
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

      const originalName = file.name.replace(/\.enc(\.bin)?$/, '');
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);
      setResultName(originalName);
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
    <div className="min-h-screen bg-[#06070a] text-gray-300 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-gray-600 hover:text-orange-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <KeyRound className="w-5 h-5 text-orange-400" />
          <h1 className="text-lg font-bold text-white">Descriptar Arquivo</h1>
          <span className="text-xs text-gray-600 ml-2 font-mono">Modo de Resgate AES-256</span>
        </div>

        <div className="bg-black/40 border border-orange-900/30 rounded-xl p-6 space-y-6">

          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-orange-950/20 border border-orange-700/20 rounded-lg text-xs text-orange-300/70">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-400" />
            <div>
              Decriptação local — arquivos processados no servidor com a chave do Portal NCFN.
              Use a <strong>Chave Mestra</strong> para emergências ou auditoria.
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
              <button
                onClick={loadMasterKey}
                disabled={status === 'loading-key'}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-950/40 border border-orange-700/40 rounded-lg text-orange-400 text-xs font-bold hover:bg-orange-900/30 disabled:opacity-50 transition-all whitespace-nowrap"
                title="Carrega a chave mestra NCFN do servidor"
              >
                {status === 'loading-key'
                  ? <RefreshCw size={12} className="animate-spin" />
                  : <KeyRound size={12} />
                } Chave Mestra
              </button>
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

          {status === 'success' && resultName && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-700/20 rounded-lg text-xs text-gray-500">
              <span className="text-emerald-400 font-bold">Download iniciado:</span> {resultName}
              <br />
              Arquivo decriptado salvo na pasta de Downloads do seu navegador.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
