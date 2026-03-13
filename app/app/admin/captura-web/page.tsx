"use client";
import { useState, useEffect } from "react";
import { Globe, Camera, FileText, Shield, Clock, Hash, AlertTriangle, CheckCircle, Download, Loader2, ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import AIModelSelector from "@/app/components/AIModelSelector";

type CaptureProfile = "rapida" | "completa" | "deep";

type Capture = {
  id: string;
  url: string;
  profile: string;
  status: "processing" | "done" | "error";
  operatorEmail: string;
  serverIp?: string;
  serverLocation?: string;
  hashScreenshot?: string;
  screenshotFile?: string;
  certidaoPdf?: string;
  createdAt: string;
  errorMessage?: string;
};

const PROFILE_INFO = {
  rapida: {
    label: "Rápida",
    desc: "Screenshot + PDF + hash SHA-256",
    color: "text-green-400",
    border: "border-green-500/40",
    bg: "bg-green-500/10",
    time: "~15s",
  },
  completa: {
    label: "Completa",
    desc: "Screenshot + PDF + HTML + HAR + SSL + WHOIS + Certidão",
    color: "text-[#00f3ff]",
    border: "border-[#00f3ff]/40",
    bg: "bg-[#00f3ff]/10",
    time: "~45s",
  },
  deep: {
    label: "Deep",
    desc: "Captura completa + lançamento no CSI Linux",
    color: "text-[#bc13fe]",
    border: "border-[#bc13fe]/40",
    bg: "bg-[#bc13fe]/10",
    time: "~60s",
  },
};

const STEPS = [
  { key: "dns", label: "Resolvendo DNS e IP do servidor" },
  { key: "ssl", label: "Extraindo certificado SSL/TLS" },
  { key: "whois", label: "Consultando registro WHOIS" },
  { key: "browser", label: "Abrindo navegador forense (Playwright)" },
  { key: "screenshot", label: "Capturando screenshot full-page" },
  { key: "pdf", label: "Renderizando PDF" },
  { key: "html", label: "Salvando DOM/HTML" },
  { key: "hash", label: "Calculando hashes SHA-256" },
  { key: "rfc", label: "Aplicando carimbo temporal RFC 3161" },
  { key: "certidao", label: "Gerando Certidão de Captura" },
  { key: "custody", label: "Enviando para custódia forense" },
];

export default function CapturaWebPage() {
  const [url, setUrl] = useState("");
  const [profile, setProfile] = useState<CaptureProfile>("completa");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Capture | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Capture[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!loading) { setElapsed(0); setCurrentStep(-1); return; }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const stepTimes = profile === "rapida" ? [1, 2, 3, 5, 8, 10, 12, 14] : [1, 3, 6, 10, 18, 25, 30, 35, 40, 43, 45];
    const idx = stepTimes.findIndex(t => elapsed < t);
    setCurrentStep(idx === -1 ? STEPS.length - 1 : idx - 1);
  }, [elapsed, loading, profile]);

  async function fetchHistory() {
    try {
      const r = await fetch("/api/capture");
      if (r.ok) {
        const d = await r.json();
        setHistory(d.captures || []);
      }
    } catch {}
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const r = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), profile }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Falha na captura");
      setResult(data.capture);
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  function truncateHash(h?: string) {
    if (!h) return "N/A";
    return h.slice(0, 16) + "..." + h.slice(-8);
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 pt-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full mb-3">
          <Camera className="w-7 h-7 text-[#00f3ff]" />
        </div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] tracking-tighter">
          CAPTURA FORENSE DA WEB
        </h1>
        <p className="text-gray-400 text-sm font-mono uppercase tracking-widest">
          Preserve evidências digitais com valor probatório
        </p>
        <div className="flex justify-center mt-2">
          <AIModelSelector />
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleCapture} className="glass-panel rounded-2xl border border-[#00f3ff]/20 p-6 space-y-6">
        {/* URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            URL Alvo
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://exemplo.com/pagina-suspeita"
                disabled={loading}
                required
                className="w-full bg-black/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#00f3ff]/60 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Perfil de Captura
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.entries(PROFILE_INFO) as [CaptureProfile, typeof PROFILE_INFO.rapida][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfile(key)}
                disabled={loading}
                className={`p-4 rounded-xl border text-left transition-all ${profile === key
                  ? `${info.bg} ${info.border} shadow-[0_0_15px_rgba(0,0,0,0.3)]`
                  : "border-gray-800 hover:border-gray-600"
                  } disabled:opacity-50`}
              >
                <div className={`font-bold text-sm ${profile === key ? info.color : "text-gray-300"}`}>
                  {info.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">{info.desc}</div>
                <div className={`text-xs mt-2 font-mono ${profile === key ? info.color : "text-gray-600"}`}>
                  ⏱ {info.time}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all bg-gradient-to-r from-[#00f3ff]/20 to-[#bc13fe]/20 border border-[#00f3ff]/30 hover:border-[#00f3ff]/60 text-[#00f3ff] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Capturando... ({elapsed}s)
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Iniciar Captura Forense
            </span>
          )}
        </button>
      </form>

      {/* Progress */}
      {loading && (
        <div className="glass-panel rounded-2xl border border-yellow-500/20 p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            <span className="text-yellow-400 font-bold text-sm uppercase tracking-widest">
              Operação em andamento — {elapsed}s
            </span>
          </div>
          {STEPS.filter((_, i) => profile === "rapida" ? i < 8 : true).map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              {i < currentStep ? (
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              ) : i === currentStep ? (
                <Loader2 className="w-4 h-4 text-[#00f3ff] animate-spin flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-700 flex-shrink-0" />
              )}
              <span className={`text-sm ${i < currentStep ? "text-gray-500 line-through" : i === currentStep ? "text-[#00f3ff]" : "text-gray-600"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="glass-panel rounded-2xl border border-red-500/30 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-400 text-sm">Falha na Captura</p>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && result.status === "done" && (
        <div className="glass-panel rounded-2xl border border-green-500/30 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="font-black text-white text-lg">Captura Concluída — Em Custódia</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Globe className="w-4 h-4 text-[#00f3ff] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs">Servidor</p>
                  <p className="text-white font-mono text-xs">{result.serverIp} — {result.serverLocation}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Hash className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs">SHA-256 Screenshot</p>
                  <p className="text-green-400 font-mono text-xs">{truncateHash(result.hashScreenshot)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs">Data/Hora</p>
                  <p className="text-white text-xs">{formatDate(result.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-[#bc13fe] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs">ID de Custódia</p>
                  <p className="text-[#bc13fe] font-mono text-xs">{result.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Artefatos */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Artefatos Gerados</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {result.screenshotFile && (
                <a href={`/api/download?folder=capturas_web/${result.id}&filename=screenshot.png`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-[#00f3ff]/40 transition text-xs text-gray-300 hover:text-[#00f3ff]">
                  <Camera className="w-3.5 h-3.5" /> screenshot.png
                </a>
              )}
              {result.certidaoPdf && (
                <a href={`/api/download?folder=capturas_web/${result.id}&filename=certidao_captura.pdf`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-[#bc13fe]/30 hover:border-[#bc13fe]/60 transition text-xs text-[#bc13fe]">
                  <FileText className="w-3.5 h-3.5" /> Certidão PDF
                </a>
              )}
              <a href={`/api/download?folder=capturas_web/${result.id}&filename=pagina.pdf`}
                className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-600 transition text-xs text-gray-300">
                <Download className="w-3.5 h-3.5" /> pagina.pdf
              </a>
              <a href={`/api/download?folder=capturas_web/${result.id}&filename=dom.html`}
                className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-600 transition text-xs text-gray-300">
                <Download className="w-3.5 h-3.5" /> dom.html
              </a>
              {profile !== "rapida" && (
                <a href={`/api/download?folder=capturas_web/${result.id}&filename=network.har`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-gray-800 hover:border-gray-600 transition text-xs text-gray-300">
                  <Download className="w-3.5 h-3.5" /> network.har
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-gray-300">Histórico de Capturas</h3>
            <div className="h-px bg-gray-800 flex-grow" />
          </div>
          <div className="space-y-2">
            {history.map(cap => (
              <div key={cap.id} className="glass-panel rounded-xl border border-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === cap.id ? null : cap.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition text-left"
                >
                  {cap.status === "done" ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : cap.status === "error" ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono truncate">{cap.url}</p>
                    <p className="text-xs text-gray-500">{formatDate(cap.createdAt)} · {cap.profile}</p>
                  </div>
                  {expandedId === cap.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {expandedId === cap.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
                    {cap.errorMessage && (
                      <p className="text-red-400 text-xs font-mono">{cap.errorMessage}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-500">IP: </span><span className="text-white font-mono">{cap.serverIp || "N/A"}</span></div>
                      <div><span className="text-gray-500">Local: </span><span className="text-white">{cap.serverLocation || "N/A"}</span></div>
                      {cap.hashScreenshot && (
                        <div className="col-span-2">
                          <span className="text-gray-500">SHA-256: </span>
                          <span className="text-green-400 font-mono">{truncateHash(cap.hashScreenshot)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {cap.certidaoPdf && (
                        <a href={`/api/download?folder=capturas_web/${cap.id}&filename=certidao_captura.pdf`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bc13fe]/10 border border-[#bc13fe]/30 text-[#bc13fe] text-xs hover:bg-[#bc13fe]/20 transition">
                          <FileText className="w-3 h-3" /> Certidão PDF
                        </a>
                      )}
                      {cap.screenshotFile && (
                        <a href={`/api/download?folder=capturas_web/${cap.id}&filename=screenshot.png`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-gray-700 text-gray-300 text-xs hover:bg-white/10 transition">
                          <Camera className="w-3 h-3" /> Screenshot
                        </a>
                      )}
                      <a href={cap.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-gray-700 text-gray-300 text-xs hover:bg-white/10 transition">
                        <ExternalLink className="w-3 h-3" /> Abrir URL
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
