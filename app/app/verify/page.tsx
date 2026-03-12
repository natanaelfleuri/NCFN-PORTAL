"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface VerifyResult {
  found: boolean;
  message?: string;
  sha256?: string;
  filename?: string;
  folder?: string;
  captureId?: string;
  tsaUrl?: string;
  timestampedAt?: string;
  hasTsr?: boolean;
  type?: string;
  capture?: {
    id: string;
    url: string;
    hashScreenshot?: string;
    hashPdf?: string;
    hashHtml?: string;
    rfcTimestamp?: string;
    status: string;
    createdAt: string;
    operatorEmail: string;
    serverIp?: string;
    serverLocation?: string;
  };
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const initHash = searchParams?.get("hash") || "";
  const initId = searchParams?.get("id") || "";

  const [hashInput, setHashInput] = useState(initHash);
  const [captureId, setCaptureId] = useState(initId);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const ab = await f.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", ab);
      const hex = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      setHashInput(hex);
    } catch {}
  };

  const verify = async () => {
    if (!hashInput && !captureId) return;
    setVerifying(true);
    setResult(null);
    try {
      const param = captureId ? `id=${encodeURIComponent(captureId)}` : `hash=${encodeURIComponent(hashInput)}`;
      const res = await fetch(`/api/verify?${param}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, message: "Erro de comunicação com o servidor." });
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify if params come from URL
  useEffect(() => {
    if (initHash || initId) verify();
  }, []);

  return (
    <div className="min-h-screen bg-[#06070a] text-gray-300 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-black/40 border border-cyan-900/40 p-8 rounded-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/50 border border-cyan-500/30 text-cyan-400 mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            Verificação de Evidência
          </h1>
          <p className="text-sm text-gray-500 mt-2">Validação de integridade via RFC 3161 Timestamp</p>
        </div>

        <div className="space-y-5 relative z-10">
          {/* File drop */}
          <div>
            <label className="block text-xs font-mono text-cyan-500/70 mb-2 uppercase tracking-wider">
              1. Carregar Arquivo (calcula hash automaticamente)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-cyan-900/50 rounded-lg cursor-pointer bg-black/40 hover:border-cyan-500/50 transition-all">
              <svg className="w-7 h-7 mb-2 text-cyan-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-gray-400"><span className="font-semibold text-cyan-400">Clique</span> ou arraste</p>
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {/* Hash input */}
          <div>
            <label className="block text-xs font-mono text-cyan-500/70 mb-2 uppercase tracking-wider">
              2. Hash SHA-256 ou ID da Captura
            </label>
            <input
              type="text"
              value={hashInput}
              onChange={e => { setHashInput(e.target.value); setCaptureId(""); }}
              placeholder="SHA-256 (64 caracteres hex)..."
              className="w-full bg-black/50 border border-cyan-900/50 rounded p-3 text-sm font-mono text-cyan-100 placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors mb-2"
            />
            <input
              type="text"
              value={captureId}
              onChange={e => { setCaptureId(e.target.value); setHashInput(""); }}
              placeholder="ID da Captura Web (cuid)..."
              className="w-full bg-black/50 border border-cyan-900/50 rounded p-3 text-sm font-mono text-cyan-100 placeholder-gray-700 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            onClick={verify}
            disabled={verifying || (!hashInput && !captureId)}
            className={`w-full py-3 rounded text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
              verifying || (!hashInput && !captureId)
                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                : "bg-cyan-950/50 text-cyan-400 border border-cyan-500 hover:bg-cyan-900 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
            }`}
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Consultando Custódia...
              </span>
            ) : "Verificar Autenticidade"}
          </button>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded border ${
              result.found
                ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-300"
                : "bg-rose-950/30 border-rose-500/50 text-rose-300"
            }`}>
              <div className="flex items-start gap-3">
                {result.found ? (
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <h3 className="font-bold mb-2">
                    {result.found ? "Evidência Autêntica — Custódia Confirmada" : "Não Encontrado na Custódia"}
                  </h3>
                  {!result.found && <p className="text-sm opacity-80">{result.message}</p>}

                  {result.found && !result.type && (
                    <div className="text-xs font-mono space-y-1 opacity-80">
                      {result.sha256 && <p>SHA-256: {result.sha256.slice(0, 32)}...</p>}
                      {result.filename && <p>Arquivo: {result.filename}</p>}
                      {result.folder && <p>Pasta: {result.folder}</p>}
                      {result.timestampedAt && (
                        <p>Carimbado em: {new Date(result.timestampedAt).toLocaleString("pt-BR")}</p>
                      )}
                      {result.tsaUrl && <p>TSA: {result.tsaUrl}</p>}
                      <p>TSR RFC 3161: {result.hasTsr ? "✓ Presente" : "✗ Ausente"}</p>
                    </div>
                  )}

                  {result.found && result.type === "capture" && result.capture && (
                    <div className="text-xs font-mono space-y-1 opacity-80">
                      <p>URL: {result.capture.url.slice(0, 60)}...</p>
                      <p>IP: {result.capture.serverIp}</p>
                      <p>Localização: {result.capture.serverLocation}</p>
                      <p>Capturado em: {new Date(result.capture.createdAt).toLocaleString("pt-BR")}</p>
                      <p>Operador: {result.capture.operatorEmail}</p>
                      {result.capture.hashScreenshot && (
                        <p>Hash Screenshot: {result.capture.hashScreenshot.slice(0, 32)}...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
