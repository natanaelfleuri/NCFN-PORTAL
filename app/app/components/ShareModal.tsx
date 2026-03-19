"use client";
import { useEffect, useState } from 'react';
import {
  Share2, Mail, MessageCircle, Link as LinkIcon, X, Loader2,
  Shield, Clock, Eye, CheckCircle2, Copy, QrCode, AlertTriangle, Lock,
} from 'lucide-react';

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  folder: string;
  notify: (type: 'success' | 'error', msg: string) => void;
};

const EXPIRY_OPTIONS = [
  { label: '30 minutos',  hours: 0.5 },
  { label: '1 hora',      hours: 1   },
  { label: '6 horas',     hours: 6   },
  { label: '24 horas',    hours: 24  },
  { label: '3 dias',      hours: 72  },
  { label: '7 dias',      hours: 168 },
];

const VIEWS_OPTIONS = [
  { label: '1 acesso — BURN AFTER READ', value: 1 },
  { label: '3 acessos',                  value: 3 },
  { label: '5 acessos',                  value: 5 },
  { label: '10 acessos',                 value: 10 },
  { label: 'Ilimitado (no prazo)',        value: 0 },
];

export default function ShareModal({ isOpen, onClose, filename, folder, notify }: ShareModalProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxViews, setMaxViews] = useState(1);
  const [qrVisible, setQrVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeneratedUrl(null);
      setCopied(false);
      setQrVisible(false);
      setExpiresInHours(24);
      setMaxViews(1);
    }
  }, [isOpen, filename]);

  if (!isOpen) return null;

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder,
          filename,
          expiresInHours,
          maxViews: maxViews === 0 ? null : maxViews,
        }),
      });
      const data = await res.json();
      if (data.url) {
        setGeneratedUrl(data.url);
      } else {
        notify('error', 'Erro ao gerar link seguro.');
      }
    } catch {
      notify('error', 'Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    notify('success', 'Link seguro copiado.');
    setTimeout(() => setCopied(false), 2500);
  };

  const expiryLabel = EXPIRY_OPTIONS.find(o => o.hours === expiresInHours)?.label ?? `${expiresInHours}h`;
  const viewsLabel  = VIEWS_OPTIONS.find(o => o.value === maxViews)?.label ?? String(maxViews);
  const qrApiUrl    = generatedUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(generatedUrl)}&color=00f3ff&bgcolor=050510`
    : null;

  const emailUrl = generatedUrl
    ? `mailto:?subject=${encodeURIComponent(`[NCFN] Arquivo Compartilhado com Segurança: ${filename}`)}&body=${encodeURIComponent(
        `Você recebeu um compartilhamento seguro do Sistema NCFN.\n\nArquivo: ${filename}\n\nLink de acesso:\n${generatedUrl}\n\n— Válido por ${expiryLabel}${maxViews > 0 ? ` · Limite de ${maxViews} acesso(s)` : ''}\n\nNão compartilhe este link com terceiros não autorizados.`
      )}`
    : '#';

  const waUrl = generatedUrl
    ? `https://wa.me/?text=${encodeURIComponent(`[NCFN] Compartilhamento Seguro\n\nArquivo: ${filename}\nLink: ${generatedUrl}\n\nVálido por ${expiryLabel}${maxViews > 0 ? ` · ${maxViews} acesso(s)` : ''}.`)}`
    : '#';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#00f3ff]/20 bg-gray-950 shadow-[0_0_50px_rgba(0,243,255,0.08)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-lg">
              <Share2 className="w-4 h-4 text-[#00f3ff]" />
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#00f3ff]/50">Compartilhamento Forense Seguro</p>
              <h3 className="text-sm font-black text-white uppercase tracking-wider truncate max-w-[260px]">
                {filename}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">

          {/* Security config — shown before generation */}
          {!generatedUrl && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-400" /> Parâmetros de Segurança
              </p>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Validade do link
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPIRY_OPTIONS.map(o => (
                    <button
                      key={o.hours}
                      onClick={() => setExpiresInHours(o.hours)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        expiresInHours === o.hours
                          ? 'bg-[#00f3ff]/15 border-[#00f3ff]/50 text-[#00f3ff]'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Limite de acessos
                </label>
                <div className="space-y-1">
                  {VIEWS_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setMaxViews(o.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                        maxViews === o.value
                          ? o.value === 1
                            ? 'bg-red-900/20 border-red-500/40 text-red-400'
                            : 'bg-[#00f3ff]/10 border-[#00f3ff]/30 text-[#00f3ff]'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                      }`}
                    >
                      <span>{o.label}</span>
                      {o.value === 1 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security summary */}
              <div className="flex gap-2 flex-wrap">
                <span className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-gray-400">
                  <Lock className="w-2.5 h-2.5 text-green-400" /> SHA-256 verificado
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-gray-400">
                  <Shield className="w-2.5 h-2.5 text-blue-400" /> Token de 256 bits
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-gray-400">
                  <Clock className="w-2.5 h-2.5 text-amber-400" /> Auto-destruição
                </span>
              </div>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full py-3 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] font-black text-xs uppercase tracking-widest rounded-xl border border-[#00f3ff]/30 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.07)] hover:shadow-[0_0_25px_rgba(0,243,255,0.15)]"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando link seguro...</>
                  : <><LinkIcon className="w-4 h-4" /> Gerar Link Protegido</>
                }
              </button>
            </div>
          )}

          {/* Generated link state */}
          {generatedUrl && (
            <div className="space-y-4">
              {/* Success badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-500/30 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-300 font-bold">Link seguro gerado com sucesso</p>
              </div>

              {/* Security metadata */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 border border-white/8 rounded-xl p-3">
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Validade
                  </p>
                  <p className="text-xs font-black text-amber-400">{expiryLabel}</p>
                </div>
                <div className="bg-black/40 border border-white/8 rounded-xl p-3">
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Eye className="w-2.5 h-2.5" /> Acessos
                  </p>
                  <p className={`text-xs font-black ${maxViews === 1 ? 'text-red-400' : maxViews === 0 ? 'text-gray-300' : 'text-[#00f3ff]'}`}>
                    {maxViews === 0 ? 'Ilimitado' : maxViews === 1 ? '1 · BURN' : maxViews}
                  </p>
                </div>
              </div>

              {/* Link box */}
              <div className="bg-black/60 border border-[#00f3ff]/20 rounded-xl p-3">
                <p className="text-[9px] font-mono text-gray-500 mb-2 uppercase tracking-wider">Link de acesso</p>
                <p className="text-[10px] font-mono text-[#00f3ff] break-all leading-relaxed">{generatedUrl}</p>
              </div>

              {/* QR Code toggle */}
              <button
                onClick={() => setQrVisible(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white transition-all"
              >
                <QrCode className="w-3.5 h-3.5" />
                {qrVisible ? 'Ocultar QR Code' : 'Exibir QR Code'}
              </button>

              {qrVisible && qrApiUrl && (
                <div className="flex justify-center p-4 bg-black/50 border border-white/10 rounded-xl">
                  <img src={qrApiUrl} alt="QR Code" width={160} height={160} className="rounded-lg" />
                </div>
              )}

              {/* Copy + Share buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={copy}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[10px] font-bold transition-all ${
                    copied
                      ? 'bg-green-900/20 border-green-500/40 text-green-400'
                      : 'bg-[#00f3ff]/8 hover:bg-[#00f3ff]/15 border-[#00f3ff]/30 text-[#00f3ff]'
                  }`}
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <a
                  href={emailUrl}
                  className="flex flex-col items-center gap-1.5 py-3 bg-red-500/8 hover:bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-bold transition-all"
                >
                  <Mail className="w-5 h-5" />
                  E-mail
                </a>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 py-3 bg-green-500/8 hover:bg-green-500/15 border border-green-500/30 text-green-400 rounded-xl text-[10px] font-bold transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
              </div>

              <button
                onClick={() => { setGeneratedUrl(null); setCopied(false); }}
                className="w-full py-2 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
              >
                ← Gerar novo link com outros parâmetros
              </button>
            </div>
          )}

          {/* Warning footer */}
          <div className="border-t border-white/5 pt-3">
            <p className="text-[9px] font-mono text-gray-700 text-center leading-relaxed">
              O acesso a este link é registrado no log de auditoria NCFN. Compartilhe apenas com destinatários autorizados. Token de 256 bits com destruição automática após expiração.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
