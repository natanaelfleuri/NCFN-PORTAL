"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Key, Globe, Lock, Unlock, ToggleLeft, ToggleRight, CheckCircle, XCircle,
  Loader2, ArrowLeft, Eye, EyeOff, ExternalLink, AlertTriangle, Terminal,
  Download, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp, Info,
  Zap, Bot, Shield, Cpu,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceMeta = {
  serviceId: string;
  displayName: string;
  website: string;
  icon: string;
  color: string;
  instructions: string;
  functionality: string;
  envVar: string;
};

type ApiConfig = {
  id: string;
  serviceId: string;
  displayName: string;
  apiKey: string;      // masked or full depending on unlock state
  hasKey: boolean;
  enabled: boolean;
  verified: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string;
};

type PageData = {
  configs: ApiConfig[];
  servicesMeta: Record<string, ServiceMeta>;
  ollamaUrl: string;
  ollamaOnline: boolean;
  ollamaModels: string[];
  activeOllamaModel: string;
};

// ── Service Icons ─────────────────────────────────────────────────────────────
function ServiceIcon({ icon, color }: { icon: string; color: string }) {
  if (icon === "google") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  if (icon === "openai") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#10A37F">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  );
  if (icon === "anthropic") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#D97706">
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-6.257 0H11.172L17.742 20h-3.603L8.997 10.285l-2.143 5.483H10.2L11.3 18.42H4.357L3.086 20H0L7.57 3.52z"/>
    </svg>
  );
  return <Globe size={20} style={{ color }} />;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApiCentralPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [fullConfigs, setFullConfigs] = useState<ApiConfig[] | null>(null); // unlocked
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Per-card state
  const [editingKey, setEditingKey] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({});
  const [cardLoading, setCardLoading] = useState<Record<string, boolean>>({});
  const [cardMsg, setCardMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  // Ollama state
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaMsg, setOllamaMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pullingModel, setPullingModel] = useState("");
  const [pullLoading, setPullLoading] = useState(false);
  const [pullMsg, setPullMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showOllamaGuide, setShowOllamaGuide] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-central");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Unlock keys ─────────────────────────────────────────────────────────
  async function handleUnlock() {
    setUnlockLoading(true);
    setUnlockError("");
    const res = await fetch("/api/admin/api-central", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock", password: unlockPassword }),
    });
    const json = await res.json();
    setUnlockLoading(false);
    if (json.ok) {
      setFullConfigs(json.configs);
      setUnlocked(true);
      setShowUnlockModal(false);
      setUnlockPassword("");
    } else {
      setUnlockError(json.error || "Senha incorreta.");
    }
  }

  // ── Lock ─────────────────────────────────────────────────────────────────
  function handleLock() {
    setFullConfigs(null);
    setUnlocked(false);
    setShowKey({});
    setEditingKey({});
  }

  // ── Toggle enable/disable ────────────────────────────────────────────────
  async function handleToggle(serviceId: string) {
    setCardLoading(p => ({ ...p, [serviceId]: true }));
    const res = await fetch("/api/admin/api-central", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", serviceId }),
    });
    const json = await res.json();
    setCardLoading(p => ({ ...p, [serviceId]: false }));
    if (json.ok) {
      await load();
      if (unlocked && fullConfigs) {
        const updated = fullConfigs.map(c =>
          c.serviceId === serviceId ? { ...c, enabled: json.enabled } : c
        );
        setFullConfigs(updated);
      }
      setCardMsg(p => ({ ...p, [serviceId]: { ok: true, text: json.enabled ? "API ativada." : "API desativada." } }));
    } else {
      setCardMsg(p => ({ ...p, [serviceId]: { ok: false, text: json.error || "Erro." } }));
    }
    setTimeout(() => setCardMsg(p => { const n = { ...p }; delete n[serviceId]; return n; }), 3000);
  }

  // ── Save key ─────────────────────────────────────────────────────────────
  async function handleSaveKey(serviceId: string) {
    const key = editingKey[serviceId];
    if (!key?.trim()) return;
    setCardLoading(p => ({ ...p, [serviceId]: true }));
    const res = await fetch("/api/admin/api-central", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_key", serviceId, apiKey: key.trim() }),
    });
    const json = await res.json();
    setCardLoading(p => ({ ...p, [serviceId]: false }));
    if (json.ok) {
      await load();
      // Update fullConfigs if unlocked
      if (unlocked && fullConfigs) {
        const updated = fullConfigs.map(c =>
          c.serviceId === serviceId
            ? { ...c, apiKey: key.trim(), hasKey: true, verified: json.verified, enabled: json.verified }
            : c
        );
        setFullConfigs(updated);
      }
      setEditingKey(p => { const n = { ...p }; delete n[serviceId]; return n; });
      setCardMsg(p => ({
        ...p,
        [serviceId]: { ok: json.verified, text: json.verifyMsg || (json.verified ? "Chave verificada e integrada!" : "Chave salva, mas verificação falhou.") },
      }));
    } else {
      setCardMsg(p => ({ ...p, [serviceId]: { ok: false, text: json.error || "Erro ao salvar." } }));
    }
    setTimeout(() => setCardMsg(p => { const n = { ...p }; delete n[serviceId]; return n; }), 5000);
  }

  // ── Test Ollama ──────────────────────────────────────────────────────────
  async function handleTestOllama() {
    setOllamaLoading(true);
    setOllamaMsg(null);
    const res = await fetch("/api/admin/api-central", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_ollama" }),
    });
    const json = await res.json();
    setOllamaLoading(false);
    if (json.ok) {
      setOllamaMsg({ ok: true, text: `Ollama online — ${json.models.length} modelo(s): ${json.models.join(", ") || "nenhum instalado"}` });
      await load();
    } else {
      setOllamaMsg({ ok: false, text: json.error || "Ollama offline." });
    }
  }

  // ── Pull Ollama model ────────────────────────────────────────────────────
  async function handlePullModel() {
    if (!pullingModel.trim()) return;
    setPullLoading(true);
    setPullMsg(null);
    const res = await fetch("/api/admin/api-central", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pull_model", model: pullingModel.trim() }),
    });
    const json = await res.json();
    setPullLoading(false);
    setPullMsg({ ok: json.ok, text: json.msg || json.error || "Erro." });
    if (json.ok) { setPullingModel(""); await load(); }
  }

  // ── Get config (unlocked or masked) ─────────────────────────────────────
  function getConfig(serviceId: string): ApiConfig | undefined {
    if (unlocked && fullConfigs) {
      const fc = fullConfigs.find(c => c.serviceId === serviceId);
      if (fc) {
        // Merge with latest data state for enabled/verified fields
        const latest = data?.configs.find(c => c.serviceId === serviceId);
        return { ...fc, enabled: latest?.enabled ?? fc.enabled, verified: latest?.verified ?? fc.verified };
      }
    }
    return data?.configs.find(c => c.serviceId === serviceId);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/60 animate-spin" />
        </div>
        <span className="text-[#bc13fe] font-mono text-sm animate-pulse">Carregando Central de API's...</span>
      </div>
    </div>
  );

  const services = Object.values(data?.servicesMeta || {});

  return (
    <div className="mt-6 space-y-10 pb-20 max-w-6xl mx-auto">

      {/* ─── Header ─── */}
      <div className="space-y-4 px-1">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Voltar ao Centro de Comando
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl" style={{ background: "rgba(188,19,254,0.1)", border: "1px solid rgba(188,19,254,0.3)" }}>
                <Key className="w-5 h-5" style={{ color: "#bc13fe" }} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bc13fe] tracking-tight uppercase">
                Central de Gerenciamento de API's de Terceiros
              </h2>
            </div>
            <p className="text-gray-500 text-xs font-mono ml-14">Gerencie integrações externas do sistema NCFN</p>
          </div>

          {/* Lock/Unlock button */}
          {unlocked ? (
            <button
              onClick={handleLock}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border"
              style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}
            >
              <Unlock size={14} /> Visualização Ativa — Bloquear
            </button>
          ) : (
            <button
              onClick={() => setShowUnlockModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border hover:scale-[1.02]"
              style={{ color: "#bc13fe", borderColor: "rgba(188,19,254,0.3)", background: "rgba(188,19,254,0.08)" }}
            >
              <Lock size={14} /> Desbloquear Visualização
            </button>
          )}
        </div>

        {unlocked && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
            <Unlock size={12} /> Chaves visíveis — sessão desbloqueada. Bloquear ao terminar.
          </div>
        )}
      </div>

      {/* ─── API Cards ─── */}
      <div className="px-1 space-y-2">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "#bc13fe" }}>APIs Externas Integradas</h3>
          <div className="h-px flex-grow" style={{ background: "linear-gradient(to right, rgba(188,19,254,0.3), transparent)" }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((svc) => {
            const cfg = getConfig(svc.serviceId);
            const isEnabled = cfg?.enabled ?? false;
            const isVerified = cfg?.verified ?? false;
            const hasKey = cfg?.hasKey ?? false;
            const isLoading = cardLoading[svc.serviceId];
            const msg = cardMsg[svc.serviceId];
            const isExpanded = expandedCard[svc.serviceId];
            const currentKey = editingKey[svc.serviceId] ?? (unlocked && cfg?.apiKey && !cfg.apiKey.includes("••") ? cfg.apiKey : "");
            const displayKey = unlocked && cfg?.apiKey && !cfg.apiKey.includes("••") ? cfg.apiKey : (cfg?.apiKey || "");
            const isShowingKey = showKey[svc.serviceId];

            return (
              <div
                key={svc.serviceId}
                className="rounded-2xl border transition-all duration-300"
                style={{
                  background: `rgba(${hexToRgb(svc.color)}, 0.04)`,
                  borderColor: isEnabled ? `rgba(${hexToRgb(svc.color)}, 0.4)` : "rgba(255,255,255,0.08)",
                  boxShadow: isEnabled ? `0 0 20px rgba(${hexToRgb(svc.color)}, 0.08)` : "none",
                }}
              >
                {/* Card Header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `rgba(${hexToRgb(svc.color)}, 0.12)`, border: `1px solid rgba(${hexToRgb(svc.color)}, 0.25)` }}>
                    <ServiceIcon icon={svc.icon} color={svc.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white">{svc.displayName}</span>
                      {isEnabled && isVerified && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                          ATIVO
                        </span>
                      )}
                      {hasKey && !isVerified && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                          NÃO VERIFICADO
                        </span>
                      )}
                      {!hasKey && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: "rgba(107,114,128,0.15)", color: "#6b7280", border: "1px solid rgba(107,114,128,0.3)" }}>
                          SEM CHAVE
                        </span>
                      )}
                    </div>
                    <a href={svc.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-mono mt-0.5 hover:underline"
                      style={{ color: svc.color, opacity: 0.7 }}>
                      {svc.website.replace("https://", "")} <ExternalLink size={9} />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle ON/OFF */}
                    <button
                      onClick={() => handleToggle(svc.serviceId)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border"
                      style={isEnabled
                        ? { color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)" }
                        : { color: "#6b7280", borderColor: "rgba(107,114,128,0.2)", background: "rgba(107,114,128,0.05)" }
                      }
                      title={isEnabled ? "Desativar API" : "Ativar API"}
                    >
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : isEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {isEnabled ? "ON" : "OFF"}
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedCard(p => ({ ...p, [svc.serviceId]: !p[svc.serviceId] }))}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Functionality description */}
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-gray-500 leading-relaxed">{svc.functionality}</p>
                </div>

                {/* API Key field */}
                <div className="px-4 pb-3 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Chave de API</label>
                  <div className="relative">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${!unlocked ? "cursor-not-allowed" : ""}`}
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        borderColor: "rgba(255,255,255,0.08)",
                        filter: !unlocked ? "blur(4px)" : "none",
                        userSelect: !unlocked ? "none" : "auto",
                      }}
                    >
                      <Key size={12} className="text-gray-600 flex-shrink-0" />
                      <input
                        type={isShowingKey ? "text" : "password"}
                        value={unlocked ? (editingKey[svc.serviceId] !== undefined ? editingKey[svc.serviceId] : (displayKey || "")) : "••••••••••••••••••••"}
                        onChange={e => unlocked && setEditingKey(p => ({ ...p, [svc.serviceId]: e.target.value }))}
                        placeholder={unlocked ? (hasKey ? "Chave salva — edite para alterar" : "Cole sua chave aqui...") : "Bloqueado"}
                        readOnly={!unlocked}
                        className="flex-1 bg-transparent text-xs font-mono text-white outline-none placeholder:text-gray-700"
                      />
                      {unlocked && (
                        <button onClick={() => setShowKey(p => ({ ...p, [svc.serviceId]: !p[svc.serviceId] }))}
                          className="text-gray-600 hover:text-white transition-colors flex-shrink-0">
                          {isShowingKey ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>

                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={() => setShowUnlockModal(true)}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                          style={{ color: "#bc13fe" }}
                        >
                          <Lock size={11} /> Clique para desbloquear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Save button */}
                  {unlocked && editingKey[svc.serviceId] !== undefined && editingKey[svc.serviceId] !== "" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveKey(svc.serviceId)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
                        style={{ background: `rgba(${hexToRgb(svc.color)}, 0.15)`, color: svc.color, border: `1px solid rgba(${hexToRgb(svc.color)}, 0.3)` }}
                      >
                        {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                        Verificar e Integrar
                      </button>
                      <button
                        onClick={() => setEditingKey(p => { const n = { ...p }; delete n[svc.serviceId]; return n; })}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 hover:text-white border border-white/10 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Message */}
                  {msg && (
                    <div className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1.5 rounded-lg ${msg.ok ? "text-green-400" : "text-red-400"}`}
                      style={{ background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${msg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                      {msg.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {msg.text}
                    </div>
                  )}
                </div>

                {/* Expanded: instructions */}
                {isExpanded && (
                  <div className="mx-4 mb-4 p-3 rounded-xl space-y-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <Info size={11} /> Como obter a chave
                    </div>
                    <pre className="text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">{svc.instructions}</pre>
                    <a href={svc.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                      style={{ color: svc.color, background: `rgba(${hexToRgb(svc.color)}, 0.1)`, border: `1px solid rgba(${hexToRgb(svc.color)}, 0.25)` }}>
                      <ExternalLink size={11} /> Abrir site oficial
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Ollama Section ─── */}
      <div className="px-1 space-y-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "#22c55e" }}>
            Ollama — IA Local (PERITO SANSÃO)
          </h3>
          <div className="h-px flex-grow" style={{ background: "linear-gradient(to right, rgba(34,197,94,0.3), transparent)" }} />
          {data?.ollamaOnline
            ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-400"><Wifi size={12} /> ONLINE</span>
            : <span className="flex items-center gap-1 text-[10px] font-bold text-red-400"><WifiOff size={12} /> OFFLINE</span>
          }
        </div>

        <div className="rounded-2xl border p-5 space-y-5"
          style={{ background: "rgba(34,197,94,0.03)", borderColor: data?.ollamaOnline ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)" }}>

          {/* Status row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className={`w-5 h-5 ${data?.ollamaOnline ? "text-green-400" : "text-gray-600"}`} />
              <div>
                <p className="text-xs font-bold text-white">PERITO SANSÃO / Ollama</p>
                <p className="text-[10px] text-gray-500 font-mono">{data?.ollamaUrl}</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${data?.ollamaOnline ? "text-green-400" : "text-red-400"}`}
              style={{ background: data?.ollamaOnline ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${data?.ollamaOnline ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              {data?.ollamaOnline ? <><CheckCircle size={11} /> Conectado</> : <><XCircle size={11} /> Desconectado</>}
            </div>
            {(data?.ollamaModels?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {(data?.ollamaModels ?? []).map(m => (
                  <span key={m} className="px-2 py-0.5 rounded-full text-[9px] font-mono" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                    {m}
                  </span>
                ))}
              </div>
            )}
            <button onClick={handleTestOllama} disabled={ollamaLoading}
              className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border"
              style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}>
              {ollamaLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Testar Conexão
            </button>
          </div>

          {ollamaMsg && (
            <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-lg ${ollamaMsg.ok ? "text-green-400" : "text-red-400"}`}
              style={{ background: ollamaMsg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${ollamaMsg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              {ollamaMsg.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
              {ollamaMsg.text}
            </div>
          )}

          {/* Pull model */}
          {data?.ollamaOnline && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Instalar / Atualizar Modelo</p>
              <div className="flex gap-2">
                <input
                  value={pullingModel}
                  onChange={e => setPullingModel(e.target.value)}
                  placeholder="ex: mistral, llama3:8b, gemma2:9b..."
                  className="flex-1 bg-black/30 border border-white/08 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none placeholder:text-gray-700 focus:border-green-500/40 transition-colors"
                />
                <button onClick={handlePullModel} disabled={pullLoading || !pullingModel.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border disabled:opacity-50"
                  style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)" }}>
                  {pullLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                  Instalar
                </button>
              </div>
              {pullMsg && (
                <div className={`text-[10px] font-bold flex items-center gap-1.5 ${pullMsg.ok ? "text-green-400" : "text-red-400"}`}>
                  {pullMsg.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
                  {pullMsg.text}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {["mistral", "llama3:8b", "gemma2:9b", "phi3:mini", "qwen2:7b", "llava"].map(m => (
                  <button key={m} onClick={() => setPullingModel(m)}
                    className="px-2 py-0.5 rounded text-[9px] font-mono text-gray-500 hover:text-green-400 border border-white/08 hover:border-green-500/30 transition-all">
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Local installation guide toggle */}
          <button onClick={() => setShowOllamaGuide(p => !p)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors w-full pt-2 border-t border-white/05">
            <Terminal size={12} />
            {showOllamaGuide ? "Ocultar" : "Ver"} Guia de Instalação Local do Ollama
            {showOllamaGuide ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>

          {showOllamaGuide && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Cpu size={14} className="text-green-400" /> Instalação Local do Ollama
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  O Ollama já está rodando na VPS do NCFN. Para rodar localmente (em seu computador pessoal):
                </p>

                <div className="space-y-3">
                  {[
                    {
                      os: "Linux",
                      color: "#f97316",
                      cmd: "curl -fsSL https://ollama.com/install.sh | sh",
                    },
                    {
                      os: "macOS",
                      color: "#3b82f6",
                      cmd: "brew install ollama\n# ou baixe em: https://ollama.com/download/mac",
                    },
                    {
                      os: "Windows",
                      color: "#8b5cf6",
                      cmd: "# Baixe o instalador em:\nhttps://ollama.com/download/windows",
                    },
                  ].map(({ os, color, cmd }) => (
                    <div key={os} className="rounded-lg overflow-hidden" style={{ border: `1px solid rgba(255,255,255,0.06)` }}>
                      <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `rgba(${hexToRgb(color)}, 0.1)`, color }}>
                        {os}
                      </div>
                      <pre className="px-3 py-2 text-[10px] font-mono text-green-400 bg-black/40 overflow-x-auto">{cmd}</pre>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Após instalar — Modelo Recomendado</p>
                  <pre className="px-3 py-2 rounded-lg text-[10px] font-mono text-green-400 overflow-x-auto" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
{`# Instale o Mistral (recomendado — 4GB RAM, rápido e preciso):
ollama pull mistral

# Alternativas:
ollama pull llama3:8b     # Meta LLaMA 3 — ótimo equilíbrio (5GB)
ollama pull gemma2:9b     # Google Gemma — eficiente (6GB)
ollama pull phi3:mini     # Microsoft — ultra leve (2GB)

# Inicie o servidor:
ollama serve`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Integrar ao NCFN (Docker)</p>
                  <pre className="px-3 py-2 rounded-lg text-[10px] font-mono text-yellow-400 overflow-x-auto" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
{`# No arquivo .env do sistema, configure:
OLLAMA_URL="http://host.docker.internal:11434"
OLLAMA_MODEL="mistral"

# host.docker.internal → acessa o host a partir do container Docker
# Se rodar fora do Docker: OLLAMA_URL="http://localhost:11434"`}
                  </pre>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <AlertTriangle size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                    <strong>Nota:</strong> O sistema NCFN já usa o Ollama configurado na VPS. A instalação local é opcional e útil para desenvolvimento/testes sem acesso à VPS.
                    Após alterar o .env, reinicie o container Docker para aplicar as mudanças.
                  </p>
                </div>

                <button onClick={handleTestOllama} disabled={ollamaLoading}
                  className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border"
                  style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}>
                  {ollamaLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  Testar Integração Ollama Agora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Unlock Modal ─── */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: "rgba(188,19,254,0.1)", border: "1px solid rgba(188,19,254,0.3)" }}>
                <Lock className="w-4 h-4" style={{ color: "#bc13fe" }} />
              </div>
              <div>
                <h3 className="font-black text-white text-sm uppercase tracking-wider">Desbloquear Chaves</h3>
                <p className="text-[10px] text-gray-500">Digite a senha do administrador</p>
              </div>
            </div>
            <input
              type="password"
              value={unlockPassword}
              onChange={e => setUnlockPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
              placeholder="Senha do administrador..."
              autoFocus
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#bc13fe]/40 transition-colors placeholder:text-gray-700"
            />
            {unlockError && (
              <p className="text-[10px] text-red-400 flex items-center gap-1">
                <XCircle size={11} /> {unlockError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockPassword(""); setUnlockError(""); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-white border border-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlock}
                disabled={unlockLoading || !unlockPassword}
                className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ background: "rgba(188,19,254,0.15)", color: "#bc13fe", border: "1px solid rgba(188,19,254,0.3)" }}
              >
                {unlockLoading ? <Loader2 size={13} className="animate-spin mx-auto" /> : "Desbloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: hex to rgb values ─────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
