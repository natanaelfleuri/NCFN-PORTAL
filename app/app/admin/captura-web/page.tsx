"use client";
import { useState, useEffect } from "react";
import {
  Camera, FileText, Globe, Code2, Search, Zap, Loader2, CheckCircle,
  AlertTriangle, Download, Trash2, Eye, Save, ChevronDown, ChevronUp,
  ExternalLink, Wifi, WifiOff, HelpCircle, X, Hash, Shield, Plus, Minus,
  BookOpen, Link2, Archive, Server, Cpu, Clock, Activity,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Action = "screenshot" | "pdf" | "content" | "scrape" | "performance";

type CollectedItem = {
  id: string;
  action: Action;
  name: string;
  mime: string;
  base64?: string;
  data?: any;
  sizeBytes: number;
  addedAt: Date;
};

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
  webCheckData?: string;
  waybackUrl?: string;
  blockchainVerify?: string;
  pingMs?: number;
  siteStatus?: number;
};

// ─── Action definitions ───────────────────────────────────────────────────────

const ACTIONS = [
  {
    key: "screenshot" as Action,
    label: "Screenshot",
    icon: Camera,
    desc: "Captura de tela completa (PNG full-page)",
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    hover: "hover:border-cyan-400/60 hover:bg-cyan-500/15",
    name: "screenshot.png",
    mime: "image/png",
  },
  {
    key: "pdf" as Action,
    label: "PDF",
    icon: FileText,
    desc: "Página renderizada como PDF (A4)",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    hover: "hover:border-purple-400/60 hover:bg-purple-500/15",
    name: "pagina.pdf",
    mime: "application/pdf",
  },
  {
    key: "content" as Action,
    label: "HTML / DOM",
    icon: Code2,
    desc: "HTML totalmente renderizado (inclui JS)",
    color: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/10",
    hover: "hover:border-green-400/60 hover:bg-green-500/15",
    name: "dom.html",
    mime: "text/html",
  },
  {
    key: "scrape" as Action,
    label: "Raspar Dados",
    icon: Search,
    desc: "Extração estruturada via seletores CSS",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
    hover: "hover:border-yellow-400/60 hover:bg-yellow-500/15",
    name: "raspa_dados.json",
    mime: "application/json",
  },
  {
    key: "performance" as Action,
    label: "Performance",
    icon: Zap,
    desc: "Auditoria Lighthouse (velocidade, SEO, acessibilidade)",
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    hover: "hover:border-orange-400/60 hover:bg-orange-500/15",
    name: "performance.json",
    mime: "application/json",
  },
] as const;

// ─── Plan limits (Browserless.io free tier) ───────────────────────────────────

const MAX_UNITS = 1000;          // units/month
const COOLDOWN_SECS = 12;        // wait between actions (2 concurrent browser limit)
const MAX_SESSION_SECS = 55;     // warn at 55 s (1 min hard limit)

const UNIT_COSTS: Record<Action, number> = {
  screenshot: 1,
  pdf: 1,
  content: 1,
  scrape: 1,
  performance: 5,   // Lighthouse is heavier
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ─── Performance metrics display ─────────────────────────────────────────────

function PerformanceView({ data }: { data: any }) {
  const lhr = data?.data || data;
  const cats = lhr?.categories || lhr?.lhr?.categories;
  const audits = lhr?.audits || lhr?.lhr?.audits;

  if (!cats) {
    return (
      <pre className="text-xs text-gray-400 overflow-auto max-h-40 font-mono">
        {JSON.stringify(data, null, 2).slice(0, 800)}
      </pre>
    );
  }

  const scores = [
    { key: "performance", label: "Performance" },
    { key: "accessibility", label: "Acessibilidade" },
    { key: "best-practices", label: "Boas Práticas" },
    { key: "seo", label: "SEO" },
  ];

  const vitals = audits
    ? [
        { key: "first-contentful-paint", label: "FCP" },
        { key: "largest-contentful-paint", label: "LCP" },
        { key: "total-blocking-time", label: "TBT" },
        { key: "cumulative-layout-shift", label: "CLS" },
        { key: "speed-index", label: "Speed Index" },
      ]
    : [];

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {scores.map((s) => {
          const score = cats[s.key]?.score;
          if (score === undefined || score === null) return null;
          const pct = Math.round(score * 100);
          const color =
            pct >= 90 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
          const bg =
            pct >= 90 ? "bg-green-500/10 border-green-500/20" : pct >= 50 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
          return (
            <div key={s.key} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${bg}`}>
              <span className={`text-2xl font-black font-mono ${color}`}>{pct}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">{s.label}</span>
            </div>
          );
        })}
      </div>
      {vitals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {vitals.map(({ key, label }) => {
            const a = audits[key];
            if (!a?.displayValue) return null;
            return (
              <div key={key} className="bg-black/20 rounded-lg px-3 py-2">
                <p className="text-xs font-bold text-white font-mono">{a.displayValue}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Scrape data display ──────────────────────────────────────────────────────

function ScrapeView({ data }: { data: any }) {
  const items: any[] = data?.data || [];
  if (!items.length) {
    return <p className="text-xs text-gray-500 mt-2">Nenhum resultado encontrado para os seletores informados.</p>;
  }
  return (
    <div className="mt-3 space-y-3 max-h-56 overflow-auto">
      {items.map((el: any, i: number) => (
        <div key={i}>
          <p className="text-yellow-400 font-mono font-bold text-xs mb-1">{el.selector}</p>
          <div className="space-y-1 ml-2">
            {(el.results || []).slice(0, 5).map((r: any, j: number) => (
              <div key={j} className="bg-black/20 rounded px-2 py-1">
                <p className="text-gray-300 text-xs truncate">{r.text || r.value || r.html?.replace(/<[^>]+>/g, "").slice(0, 120) || ""}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Web-Check panel (history) ────────────────────────────────────────────────

function WebCheckPanel({
  data,
  waybackUrl,
  blockchainVerify,
  pingMs,
  siteStatus,
}: {
  data?: string;
  waybackUrl?: string;
  blockchainVerify?: string;
  pingMs?: number;
  siteStatus?: number;
}) {
  const [open, setOpen] = useState(false);
  let wc: Record<string, any> = {};
  try {
    if (data) wc = JSON.parse(data);
  } catch {}
  const isOnline = siteStatus && siteStatus > 0 && siteStatus < 500;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/8 transition text-left"
      >
        <Globe className="w-4 h-4 text-[#00f3ff]" />
        <span className="text-sm font-bold text-white flex-1">Análise Web</span>
        {siteStatus ? (
          <span
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
              isOnline
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "ONLINE" : "OFFLINE"} · {siteStatus}
          </span>
        ) : null}
        {pingMs !== undefined && pingMs >= 0 && (
          <span className="text-xs text-gray-500 font-mono">{pingMs}ms</span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4 border-t border-white/5 bg-black/20">
          {/* Tech Stack */}
          {wc["tech-stack"]?.technologies?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Cpu className="w-3 h-3" /> Tech Stack
              </p>
              <div className="flex flex-wrap gap-1.5">
                {wc["tech-stack"].technologies.slice(0, 10).map((t: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-[#00f3ff]/10 border border-[#00f3ff]/20 text-[#00f3ff] text-xs font-mono"
                  >
                    {t.name || String(t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* DNS */}
          {wc["dns"] && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Server className="w-3 h-3" /> DNS
              </p>
              <div className="space-y-0.5 text-xs font-mono">
                {(["A", "AAAA", "MX", "NS", "TXT"] as const).map((k) => {
                  const vals = wc["dns"][k];
                  if (!vals?.length) return null;
                  return (
                    <div key={k} className="flex gap-2">
                      <span className="text-[#bc13fe] w-8 flex-shrink-0">{k}</span>
                      <span className="text-gray-300 truncate">
                        {vals
                          .slice(0, 2)
                          .map((r: any) => r.address || r.exchange || r.value || String(r))
                          .join(", ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Ports */}
          {wc["ports"]?.openPorts?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Portas Abertas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {wc["ports"].openPorts.map((p: number) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preservation */}
          {(waybackUrl || blockchainVerify) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Archive className="w-3 h-3" /> Preservação Digital
              </p>
              {waybackUrl && (
                <a
                  href={waybackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition text-xs mb-2"
                >
                  <BookOpen className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="text-blue-400 font-bold flex-1">Wayback Machine</span>
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                </a>
              )}
              {blockchainVerify && (
                <a
                  href={blockchainVerify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition text-xs"
                >
                  <Link2 className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  <span className="text-purple-400 font-bold flex-1">OpenTimestamps — Bitcoin</span>
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapturaWebPage() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  // Scrape selectors
  const [selectors, setSelectors] = useState(["body"]);

  // Per-action loading/error
  const [loadingAction, setLoadingAction] = useState<Action | null>(null);
  const [actionErrors, setActionErrors] = useState<Partial<Record<Action, string>>>({});

  // Rate limit & cooldown
  const [cooldown, setCooldown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [monthlyUsage, setMonthlyUsage] = useState<{ month: string; units: number }>({
    month: currentMonth(),
    units: 0,
  });

  // Collection
  const [collection, setCollection] = useState<CollectedItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<string | null>(null);

  // Save
  const [saving, setSaving] = useState(false);
  const [savedCapture, setSavedCapture] = useState<Capture | null>(null);

  // History
  const [history, setHistory] = useState<Capture[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState<string | null>(null);

  // Help
  const [showHelp, setShowHelp] = useState(false);

  // ── Load monthly usage from localStorage ─────────────────────────────────
  useEffect(() => {
    const month = currentMonth();
    try {
      const stored = localStorage.getItem("bl_usage");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.month === month) {
          setMonthlyUsage(parsed);
          return;
        }
      }
    } catch {}
    const fresh = { month, units: 0 };
    setMonthlyUsage(fresh);
    try { localStorage.setItem("bl_usage", JSON.stringify(fresh)); } catch {}
  }, []);

  // ── Cooldown countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Elapsed timer while loading (session timeout warning) ────────────────
  useEffect(() => {
    if (!loadingAction) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [loadingAction]);

  useEffect(() => {
    fetchHistory();
  }, []);

  // ── Track unit usage ──────────────────────────────────────────────────────
  function addUnits(action: Action) {
    const month = currentMonth();
    setMonthlyUsage((prev) => {
      const base = prev.month === month ? prev.units : 0;
      const updated = { month, units: base + UNIT_COSTS[action] };
      try { localStorage.setItem("bl_usage", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setCooldown(COOLDOWN_SECS);
  }

  async function fetchHistory() {
    try {
      const r = await fetch("/api/capture");
      if (r.ok) setHistory((await r.json()).captures || []);
    } catch {}
  }

  function validateUrl(v: string): boolean {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }

  async function handleAction(action: Action) {
    // Hard limits
    if (cooldown > 0) return;
    if (monthlyUsage.units >= MAX_UNITS) {
      setUrlError(`Limite mensal de ${MAX_UNITS} unidades atingido. Reinicia no próximo mês.`);
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setUrlError("Informe a URL antes de capturar");
      return;
    }
    if (!validateUrl(trimmedUrl)) {
      setUrlError("URL inválida — use https://...");
      return;
    }
    setUrlError("");
    setLoadingAction(action);
    setActionErrors((prev) => ({ ...prev, [action]: undefined }));

    try {
      const body: any = { url: trimmedUrl, action };
      if (action === "scrape") {
        body.selectors = selectors.filter((s) => s.trim());
        if (!body.selectors.length) body.selectors = ["body"];
      }

      const res = await fetch("/api/capture/browserless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || "Falha na requisição");

      const actionDef = ACTIONS.find((a) => a.key === action)!;
      const item: CollectedItem = {
        id: `${action}-${Date.now()}`,
        action,
        name: actionDef.name,
        mime: actionDef.mime,
        sizeBytes: json.sizeBytes || (json.data ? JSON.stringify(json.data).length : 0),
        addedAt: new Date(),
      };

      if (json.base64) item.base64 = json.base64;
      if (json.data) item.data = json.data;

      setCollection((prev) => [...prev, item]);
      setSavedCapture(null);
      addUnits(action); // start cooldown + track usage
    } catch (err: any) {
      setActionErrors((prev) => ({ ...prev, [action]: err.message }));
    } finally {
      setLoadingAction(null);
    }
  }

  function removeItem(id: string) {
    setCollection((prev) => prev.filter((i) => i.id !== id));
    if (expandedItem === id) setExpandedItem(null);
    if (previewItem === id) setPreviewItem(null);
  }

  function downloadItem(item: CollectedItem) {
    if (item.base64) {
      const a = document.createElement("a");
      a.href = `data:${item.mime};base64,${item.base64}`;
      a.download = item.name;
      a.click();
    } else if (item.data) {
      const blob = new Blob([JSON.stringify(item.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  async function handleSave() {
    if (!collection.length || !url.trim()) return;
    setSaving(true);
    try {
      const files = collection.map((item) => ({
        name: item.name,
        ...(item.base64 ? { base64: item.base64 } : {}),
        ...(item.data !== undefined ? { data: item.data } : {}),
      }));

      const res = await fetch("/api/capture/browserless/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), files }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao salvar");

      setSavedCapture(json.capture);
      setCollection([]);
      fetchHistory();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRelatorio(captureId: string) {
    setReportLoading(captureId);
    try {
      const r = await fetch("/api/capture/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureId }),
      });
      if (!r.ok) throw new Error("Falha ao gerar relatório");
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `relatorio_forense_${captureId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setReportLoading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 pt-8 space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full mb-2">
          <Camera className="w-7 h-7 text-[#00f3ff]" />
        </div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] tracking-tighter">
          CAPTURA FORENSE DA WEB
        </h1>
        <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">
          Powered by Browserless.io · Evidências digitais com valor probatório
        </p>
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition"
          >
            <HelpCircle size={13} /> Como funciona
          </button>
        </div>
      </div>

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl border border-[#00f3ff]/20 p-6 space-y-6">

        {/* ── Monthly Usage Meter ─────────────────────────────────────────── */}
        {(() => {
          const pct = Math.min((monthlyUsage.units / MAX_UNITS) * 100, 100);
          const remaining = MAX_UNITS - monthlyUsage.units;
          const isCritical = remaining <= 0;
          const isWarning = pct >= 80 && !isCritical;
          return (
            <div className={`rounded-xl border px-4 py-3 space-y-2 ${
              isCritical
                ? "bg-red-950/30 border-red-500/40"
                : isWarning
                ? "bg-amber-950/20 border-amber-500/30"
                : "bg-white/3 border-white/8"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className={`w-3.5 h-3.5 ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-500"}`} />
                  <span className={`text-xs font-bold uppercase tracking-widest ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-500"}`}>
                    Uso Mensal — Plano Gratuito
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold ${isCritical ? "text-red-400" : isWarning ? "text-amber-300" : "text-gray-400"}`}>
                  {monthlyUsage.units} / {MAX_UNITS} unidades
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-[#00f3ff]/60"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-600 font-mono">
                <span>· 2 navegadores simultâneos · 1 min/sessão · Performance = 5 unidades</span>
                <span>{isCritical ? "ESGOTADO" : `${remaining} restantes`}</span>
              </div>
              {(isWarning || isCritical) && (
                <p className={`text-xs font-bold flex items-center gap-1.5 ${isCritical ? "text-red-400" : "text-amber-400"}`}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {isCritical
                    ? "Limite atingido. As capturas serão desbloqueadas no próximo mês."
                    : `Atenção: apenas ${remaining} unidades restantes este mês.`}
                </p>
              )}
            </div>
          );
        })()}

        {/* ── URL Input ──────────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            URL Alvo
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError("");
                setSavedCapture(null);
              }}
              placeholder="https://exemplo.com/pagina-suspeita"
              className={`w-full bg-black/50 border rounded-lg pl-10 pr-4 py-3 text-white text-sm font-mono focus:outline-none transition ${
                urlError
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-gray-700 focus:border-[#00f3ff]/60"
              }`}
            />
          </div>
          {urlError && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {urlError}
            </p>
          )}
        </div>

        {/* CSS Selectors (for Scrape) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-widest text-yellow-400/70">
              Seletores CSS <span className="text-gray-600 normal-case font-normal">(para Raspar Dados)</span>
            </label>
            <button
              onClick={() => setSelectors((prev) => [...prev, ""])}
              className="flex items-center gap-1 text-xs text-yellow-400/60 hover:text-yellow-400 transition"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {selectors.map((sel, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={sel}
                  onChange={(e) =>
                    setSelectors((prev) =>
                      prev.map((s, i) => (i === idx ? e.target.value : s))
                    )
                  }
                  placeholder="h1, .titulo, #conteudo, table tr..."
                  className="flex-1 bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50 placeholder:text-gray-700"
                />
                {selectors.length > 1 && (
                  <button
                    onClick={() => setSelectors((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-gray-700 hover:text-red-400 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ── CSS Selector reference ──────────────────────────────────── */}
          <div className="mt-3 rounded-xl border border-yellow-500/10 bg-yellow-950/10 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/60">
              Referência de Seletores CSS
            </p>
            {/* Most important */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-yellow-400/80 font-bold mb-1.5 flex items-center gap-1">
                ★ Mais usados em investigação
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { sel: "body", tip: "todo o conteúdo da página" },
                  { sel: "p", tip: "todos os parágrafos" },
                  { sel: "h1, h2, h3", tip: "títulos e subtítulos" },
                  { sel: "a", tip: "todos os links" },
                  { sel: "a[href]", tip: "links com URL" },
                  { sel: "img", tip: "todas as imagens" },
                  { sel: "table", tip: "tabelas de dados" },
                  { sel: "table tr", tip: "linhas de tabela" },
                  { sel: "meta[name='description']", tip: "meta descrição" },
                  { sel: "time", tip: "datas/horas marcadas" },
                  { sel: "[class*='price']", tip: "elementos com 'price' na classe" },
                  { sel: "form", tip: "formulários" },
                ].map(({ sel, tip }) => (
                  <button
                    key={sel}
                    type="button"
                    title={tip}
                    onClick={() => {
                      if (!selectors.includes(sel)) setSelectors((prev) => [...prev.filter(s => s !== ""), sel]);
                    }}
                    className="px-2 py-1 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono hover:bg-yellow-500/25 transition cursor-pointer"
                  >
                    {sel}
                  </button>
                ))}
              </div>
            </div>
            {/* Other selectors */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1.5">
                Outros seletores
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { sel: "#main", tip: "elemento com id='main'" },
                  { sel: ".classe", tip: "elementos com classe específica" },
                  { sel: "article", tip: "artigos/posts" },
                  { sel: "span", tip: "trechos de texto inline" },
                  { sel: "li", tip: "itens de lista" },
                  { sel: "script", tip: "código JavaScript inline" },
                  { sel: "input, select", tip: "campos de formulário" },
                  { sel: "[data-*]", tip: "atributos data-*" },
                  { sel: "header", tip: "cabeçalho da página" },
                  { sel: "footer", tip: "rodapé da página" },
                  { sel: "nav a", tip: "links do menu de navegação" },
                  { sel: "strong, b", tip: "texto em negrito" },
                ].map(({ sel, tip }) => (
                  <button
                    key={sel}
                    type="button"
                    title={tip}
                    onClick={() => {
                      if (!selectors.includes(sel)) setSelectors((prev) => [...prev.filter(s => s !== ""), sel]);
                    }}
                    className="px-2 py-1 rounded-md bg-gray-800/60 border border-gray-700/50 text-gray-400 text-[10px] font-mono hover:bg-gray-700/50 hover:text-gray-200 transition cursor-pointer"
                  >
                    {sel}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-gray-700 font-mono">
              Clique para adicionar · Cada seletor retorna texto, atributos e HTML do elemento encontrado
            </p>
          </div>
        </div>

        {/* ── Session timeout warning ──────────────────────────────────── */}
        {loadingAction && elapsed >= 45 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-400">
                Sessão longa — {elapsed}s (limite: 60s)
              </p>
              <div className="w-full h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min((elapsed / 60) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Cooldown banner ───────────────────────────────────────────── */}
        {cooldown > 0 && (
          <div className="rounded-xl border border-[#00f3ff]/25 bg-[#00f3ff]/5 px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00f3ff] animate-pulse" />
                <span className="text-xs font-black text-[#00f3ff] uppercase tracking-widest">
                  AGUARDE {cooldown}s PARA UMA NOVA CAPTURA
                </span>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                2 navegadores simultâneos
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] rounded-full transition-all duration-1000"
                style={{ width: `${((COOLDOWN_SECS - cooldown) / COOLDOWN_SECS) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 font-mono">
              Plano gratuito · 1 min/sessão · 1 000 unidades/mês · São Francisco · Londres · Amsterdã
            </p>
          </div>
        )}

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Ações de Captura
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ACTIONS.map((action) => {
              const isLoading = loadingAction === action.key;
              const err = actionErrors[action.key];
              const isDisabled = !!loadingAction || cooldown > 0 || monthlyUsage.units >= MAX_UNITS;
              const cost = UNIT_COSTS[action.key];
              return (
                <button
                  key={action.key}
                  onClick={() => handleAction(action.key)}
                  disabled={isDisabled}
                  className={`p-4 rounded-xl border text-left transition-all ${action.bg} ${action.border} ${isDisabled ? "opacity-40 cursor-not-allowed" : action.hover}`}
                >
                  <div className="mb-2">
                    {isLoading ? (
                      <Loader2 className={`w-5 h-5 ${action.color} animate-spin`} />
                    ) : (
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                    )}
                  </div>
                  <p className={`text-xs font-black ${action.color}`}>{action.label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{action.desc}</p>
                  <p className="text-[9px] text-gray-700 mt-1 font-mono">{cost} unidade{cost !== 1 ? "s" : ""}</p>
                  {err && (
                    <p className="text-[9px] text-red-400 mt-1 leading-tight">{err.slice(0, 80)}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Collection Area ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Coleção de Artefatos
              </label>
              {collection.length > 0 && (
                <span className="px-2 py-0.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full text-[#00f3ff] text-xs font-mono font-bold">
                  {collection.length}
                </span>
              )}
            </div>
            {collection.length > 0 && (
              <button
                onClick={() => {
                  setCollection([]);
                  setExpandedItem(null);
                  setPreviewItem(null);
                }}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition"
              >
                <Trash2 className="w-3 h-3" /> Limpar tudo
              </button>
            )}
          </div>

          {collection.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 p-10 text-center space-y-1">
              <p className="text-gray-600 text-sm">Nenhum artefato coletado</p>
              <p className="text-gray-700 text-xs">
                Informe a URL e clique nas ações acima para capturar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {collection.map((item) => {
                const def = ACTIONS.find((a) => a.key === item.action)!;
                const isExpanded = expandedItem === item.id;
                const isPreviewing = previewItem === item.id;
                const hasExpandable = item.action === "performance" || item.action === "scrape";

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border ${def.border} ${def.bg} overflow-hidden`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <def.icon className={`w-4 h-4 ${def.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold font-mono ${def.color}`}>{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(item.sizeBytes)} · {item.addedAt.toLocaleTimeString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Preview toggle (screenshot) */}
                        {item.action === "screenshot" && item.base64 && (
                          <button
                            onClick={() => setPreviewItem(isPreviewing ? null : item.id)}
                            title="Visualizar screenshot"
                            className="p-1.5 rounded-lg bg-black/20 border border-white/10 hover:border-white/30 transition"
                          >
                            <Eye className={`w-3.5 h-3.5 ${isPreviewing ? def.color : "text-gray-400"}`} />
                          </button>
                        )}
                        {/* Expand JSON (scrape / performance) */}
                        {hasExpandable && (
                          <button
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                            className="p-1.5 rounded-lg bg-black/20 border border-white/10 hover:border-white/30 transition"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        )}
                        {/* Download */}
                        <button
                          onClick={() => downloadItem(item)}
                          title="Baixar artefato"
                          className="p-1.5 rounded-lg bg-black/20 border border-white/10 hover:border-white/30 transition"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.id)}
                          title="Remover da coleção"
                          className="p-1.5 rounded-lg bg-black/20 border border-white/10 hover:border-red-500/30 transition text-gray-600 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Screenshot preview */}
                    {isPreviewing && item.base64 && (
                      <div className="px-4 pb-4 border-t border-white/5">
                        <img
                          src={`data:image/png;base64,${item.base64}`}
                          alt="Screenshot"
                          className="w-full rounded-lg border border-white/10 max-h-72 object-cover object-top"
                        />
                      </div>
                    )}

                    {/* JSON expand */}
                    {isExpanded && item.data && (
                      <div className="px-4 pb-4 border-t border-white/5">
                        {item.action === "performance" && <PerformanceView data={item.data} />}
                        {item.action === "scrape" && <ScrapeView data={item.data} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Save Button ────────────────────────────────────────────────── */}
        {collection.length > 0 && (
          <div className="space-y-3">
            {savedCapture && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-green-400 font-bold">Salvo na Pasta 7 com sucesso</p>
                  <p className="text-gray-500 font-mono">{savedCapture.id}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !url.trim() || cooldown > 0}
              className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all bg-gradient-to-r from-[#00f3ff]/20 to-[#bc13fe]/20 border border-[#00f3ff]/40 hover:border-[#00f3ff]/70 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(0,243,255,0.15)] flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvando na Pasta 7...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salvar{" "}
                  {collection.length} artefato{collection.length !== 1 ? "s" : ""} na Pasta 7
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Help Modal ─────────────────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00f3ff]/10 rounded-xl border border-[#00f3ff]/30">
                <HelpCircle className="w-5 h-5 text-[#00f3ff]" />
              </div>
              <h2 className="font-black text-white text-lg uppercase tracking-widest">
                COMO FUNCIONA
              </h2>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Powered by{" "}
              <strong className="text-white">Browserless.io</strong> — browser headless gerenciado
              na nuvem com API REST. Cada ação abre um Chrome real na nuvem, executa a operação e
              retorna o resultado.
            </p>
            <div className="space-y-3">
              {ACTIONS.map((a) => (
                <div key={a.key} className="flex gap-3">
                  <a.icon className={`w-4 h-4 ${a.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <span className={`font-bold text-sm ${a.color}`}>{a.label}:</span>{" "}
                    <span className="text-gray-400 text-sm">{a.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded-xl text-xs text-gray-400 leading-relaxed">
              Após coletar os artefatos desejados, clique em{" "}
              <strong className="text-white">Salvar na Pasta 7</strong> para registrar em custódia
              forense com hashes SHA-256 e carimbo temporal RFC 3161.
            </div>
          </div>
        </div>
      )}

      {/* ── History ────────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-gray-300">
              Histórico de Capturas
            </h3>
            <div className="h-px bg-gray-800 flex-grow" />
          </div>

          <div className="space-y-2">
            {history.map((cap) => {
              const isOnline = cap.siteStatus && cap.siteStatus > 0 && cap.siteStatus < 500;
              const isExpanded = expandedHistory === cap.id;

              return (
                <div key={cap.id} className="glass-panel rounded-xl border border-gray-800 overflow-hidden">
                  <button
                    onClick={() => setExpandedHistory(isExpanded ? null : cap.id)}
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
                      <p className="text-xs text-gray-500">
                        {formatDate(cap.createdAt)} · {cap.profile}
                      </p>
                    </div>
                    {cap.siteStatus ? (
                      <span
                        className={`hidden sm:flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          isOnline
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                      >
                        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {cap.siteStatus}
                      </span>
                    ) : null}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-800 pt-3">
                      {cap.errorMessage && (
                        <p className="text-red-400 text-xs font-mono">{cap.errorMessage}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">IP: </span>
                          <span className="text-white font-mono">{cap.serverIp || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Local: </span>
                          <span className="text-white">{cap.serverLocation || "N/A"}</span>
                        </div>
                        {cap.hashScreenshot && (
                          <div className="col-span-2 flex items-center gap-2">
                            <Hash className="w-3 h-3 text-green-400 flex-shrink-0" />
                            <span className="text-gray-500">SHA-256: </span>
                            <span className="text-green-400 font-mono">
                              {cap.hashScreenshot.slice(0, 16)}...{cap.hashScreenshot.slice(-8)}
                            </span>
                          </div>
                        )}
                        {cap.pingMs !== undefined && cap.pingMs >= 0 && (
                          <div>
                            <span className="text-gray-500">Latência: </span>
                            <span className="text-white font-mono">{cap.pingMs}ms</span>
                          </div>
                        )}
                      </div>

                      {/* Download links */}
                      <div className="flex gap-2 flex-wrap">
                        {cap.certidaoPdf && (
                          <a
                            href={`/api/download?folder=capturas_web/${cap.id}&filename=certidao_captura.pdf`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bc13fe]/10 border border-[#bc13fe]/30 text-[#bc13fe] text-xs hover:bg-[#bc13fe]/20 transition"
                          >
                            <Shield className="w-3 h-3" /> Certidão PDF
                          </a>
                        )}
                        {cap.screenshotFile && (
                          <a
                            href={`/api/download?folder=capturas_web/${cap.id}&filename=screenshot.png`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-gray-700 text-gray-300 text-xs hover:bg-white/10 transition"
                          >
                            <Camera className="w-3 h-3" /> Screenshot
                          </a>
                        )}
                        <a
                          href={cap.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-gray-700 text-gray-300 text-xs hover:bg-white/10 transition"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir URL
                        </a>
                      </div>

                      {/* Web-Check panel */}
                      {cap.status === "done" && (
                        <WebCheckPanel
                          data={cap.webCheckData}
                          waybackUrl={cap.waybackUrl}
                          blockchainVerify={cap.blockchainVerify}
                          pingMs={cap.pingMs}
                          siteStatus={cap.siteStatus}
                        />
                      )}

                      {/* Forensic Report */}
                      {cap.status === "done" && (
                        <button
                          onClick={() => handleRelatorio(cap.id)}
                          disabled={reportLoading === cap.id}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all bg-gradient-to-r from-[#bc13fe]/20 to-[#00f3ff]/10 border border-[#bc13fe]/40 hover:border-[#bc13fe]/70 text-[#bc13fe] disabled:opacity-50 hover:shadow-[0_0_15px_rgba(188,19,254,0.2)]"
                        >
                          {reportLoading === cap.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Gerando Relatório...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" /> Gerar Relatório Forense
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
