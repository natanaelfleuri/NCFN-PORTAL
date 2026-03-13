"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bot, Cpu, Zap, Shield, Plus, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, CheckCircle, XCircle, Play, Download, AlertTriangle,
  Terminal, Tag, BookOpen, Loader2, ArrowLeft, Key, Globe, Star, Save
} from "lucide-react";
import Link from "next/link";

// ── AI Model catalogue ────────────────────────────────────────────────────
type ProviderDef = {
  id: string;
  label: string;
  color: string;
  border: string;
  bg: string;
  models: { id: string; label: string; description: string }[];
  keyEnvHint: string;
  isLocal?: boolean;
};

const AI_PROVIDERS: ProviderDef[] = [
  {
    id: 'ollama',
    label: 'PERITO SANSÃO - IA NCFN',
    color: 'text-green-400',
    border: 'border-green-500/40',
    bg: 'bg-green-500/10',
    isLocal: true,
    keyEnvHint: 'Local — não requer chave',
    models: [
      { id: 'mistral', label: 'Mistral 7B', description: 'Leve e rápido (4GB RAM)' },
      { id: 'llama3:8b', label: 'LLaMA 3 8B', description: 'Meta — ótimo equilíbrio' },
      { id: 'llama3:70b', label: 'LLaMA 3 70B', description: 'Alta precisão (40GB RAM)' },
      { id: 'gemma2:9b', label: 'Gemma 2 9B', description: 'Google — eficiente' },
      { id: 'phi3:mini', label: 'Phi-3 Mini', description: 'Microsoft — ultra leve' },
      { id: 'qwen2:7b', label: 'Qwen 2 7B', description: 'Alibaba — multilíngue' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    keyEnvHint: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', description: 'Mais avançado da OpenAI' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Rápido e econômico' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '128k contexto' },
      { id: 'o1-mini', label: 'o1 Mini', description: 'Raciocínio avançado' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    keyEnvHint: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Mais poderoso da Anthropic' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Equilíbrio velocidade/qualidade' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Ultra rápido e econômico' },
    ],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    keyEnvHint: 'GOOGLE_AI_API_KEY',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Rápido e preciso' },
      { id: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro', description: 'Alta precisão' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '1M tokens contexto' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    keyEnvHint: 'DEEPSEEK_API_KEY',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat', description: 'Geral — custo baixo' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', description: 'Raciocínio avançado' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI (API)',
    color: 'text-yellow-400',
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/10',
    keyEnvHint: 'MISTRAL_API_KEY',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large', description: 'Mais capaz da Mistral' },
      { id: 'mistral-small-latest', label: 'Mistral Small', description: 'Rápido e econômico' },
      { id: 'codestral-latest', label: 'Codestral', description: 'Especializado em código' },
    ],
  },
];

const IS_ADMIN_ROLE = "admin";

const categoryColors: Record<string, string> = {
  "CP": "text-red-400 bg-red-500/10 border-red-500/30",
  "CPP": "text-orange-400 bg-orange-500/10 border-orange-500/30",
  "OSINT": "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "Geral": "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

type Keyword = {
  id: string; keyword: string; category: string;
  legalRef?: string; active: boolean; createdAt: string;
};

type ConfigData = {
  ollamaUrl: string; ollamaOnline: boolean; activeModel: string;
  models: string[]; keywords: Keyword[];
  recentScans: any[];
  aiConfig: {
    geminiApiKey: string | null;
    openaiApiKey: string | null;
    ollamaEndpoint: string | null;
    activeModel: string;
    maxDailyRequests: number;
    keywords: string | null;
    monthlyBudget: number;
  };
};

type SavedAIModel = {
  provider: string;
  model: string;
  hasApiKey: boolean;
};

export default function IaConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPrompt, setTestPrompt] = useState("Resuma em 2 frases o que é lavagem de dinheiro segundo a legislação brasileira.");
  const [testResponse, setTestResponse] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [pullModel, setPullModel] = useState("mistral:7b");
  const [pullLoading, setPullLoading] = useState(false);
  const [pullOutput, setPullOutput] = useState("");
  const [newKw, setNewKw] = useState({ keyword: "", category: "", legalRef: "" });
  const [addingKw, setAddingKw] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // ── AI Model Selection ───────────────────────────────────────────────────
  const [savedAI, setSavedAI] = useState<SavedAIModel>({ provider: 'ollama', model: 'mistral', hasApiKey: false });
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [modelMsg, setModelMsg] = useState('');

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      if ((session?.user as any)?.role !== IS_ADMIN_ROLE) router.push("/");
      else fetchConfig();
    }
  }, [status, session]);

  const fetchConfig = async () => {
    try {
      const [configRes, modelRes] = await Promise.all([
        fetch("/api/admin/ia-config"),
        fetch("/api/admin/ai-model"),
      ]);
      const data = await configRes.json();
      setConfig(data);
      if (modelRes.ok) {
        const md = await modelRes.json();
        setSavedAI(md);
        setSelectedProvider(md.provider || 'ollama');
        setSelectedModel(md.model || 'mistral');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModel = async () => {
    setSavingModel(true);
    setModelMsg('');
    try {
      const res = await fetch('/api/admin/ai-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel, apiKey: apiKeyInput || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setModelMsg('IA padrão salva com sucesso! Todas as ferramentas usarão este modelo.');
        setApiKeyInput('');
        fetchConfig();
        setTimeout(() => setModelMsg(''), 5000);
      } else {
        setModelMsg(`Erro: ${data.error}`);
      }
    } finally {
      setSavingModel(false);
    }
  };

  const postAction = async (payload: any) => {
    try {
      const res = await fetch("/api/admin/ia-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) setActionMsg(`Erro: ${data.error}`);
      return data;
    } catch (e) {
      console.error(e);
      return { error: "Erro na conexão" };
    }
  };

  const handleUpdateConfig = async (payload: any) => {
    setSaveLoading(true);
    const res = await postAction({ action: "update_ai_config", ...payload });
    setSaveLoading(false);
    if (!res.error) {
      setActionMsg("Configuração salva com sucesso.");
      setTimeout(() => setActionMsg(""), 3000);
      fetchConfig();
    }
  };

  const handlePullModel = async () => {
    setPullLoading(true);
    setPullOutput("Iniciando download...");
    const data = await postAction({ action: "pull_model", model: pullModel });
    setPullOutput(data.message || data.error);
    setPullLoading(false);
    fetchConfig();
  };

  const handleTestPrompt = async () => {
    setTestLoading(true);
    setTestResponse("Gerando resposta...");
    const data = await postAction({ action: "test_prompt", prompt: testPrompt });
    setTestResponse(data.response || data.error);
    setTestLoading(false);
    fetchConfig();
  };

  const handleAddKeyword = async () => {
    setAddingKw(true);
    await postAction({ action: "add_keyword", ...newKw });
    setNewKw({ keyword: "", category: "", legalRef: "" });
    setAddingKw(false);
    fetchConfig();
  };

  const handleToggle = async (id: string) => {
    await postAction({ action: "toggle_keyword", id });
    fetchConfig();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deletar esta keyword?")) {
      await postAction({ action: "delete_keyword", id });
      fetchConfig();
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    await postAction({ action: "seed_keywords" });
    setSeedLoading(false);
    fetchConfig();
  };

  if (loading || !config) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <Loader2 className="w-10 h-10 text-[#bc13fe] animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto mt-8 pb-20 px-4 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              IA <span className="text-[#bc13fe] inline-flex items-center gap-1"><Bot className="w-6 h-6" /> COGNITIVE</span> CORE
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-1">Sytem Forensic OSINT Configuration</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Active Core Services</span>
        </div>
      </div>

      {/* AI Strategy & Budget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Ollama Status */}
        <div className={`glass-panel p-5 rounded-2xl border flex flex-col gap-2 ${config.ollamaOnline ? "border-green-500/30 font-bold" : "border-red-500/30"}`}>
          <div className="flex items-center gap-2">
            {config.ollamaOnline
              ? <CheckCircle className="w-5 h-5 text-green-400" />
              : <XCircle className="w-5 h-5 text-red-400" />}
            <span className="font-bold text-sm text-white">Ollama</span>
          </div>
          <span className={`text-2xl font-black ${config.ollamaOnline ? "text-green-400" : "text-red-400"}`}>
            {config.ollamaOnline ? "Online" : "Offline"}
          </span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Local Intel</span>
        </div>

        {/* Active AI Model */}
        <div className={`glass-panel p-5 rounded-2xl border flex flex-col gap-2 ${savedAI.hasApiKey || savedAI.provider === 'ollama' ? "border-cyan-500/30" : "border-yellow-500/30"}`}>
          <div className="flex items-center gap-2 text-cyan-400">
            <Zap className="w-5 h-5" />
            <span className="font-bold text-sm text-white">{savedAI.model || "mistral"}</span>
          </div>
          <span className={`text-2xl font-black ${savedAI.hasApiKey || savedAI.provider === 'ollama' ? "text-cyan-400" : "text-yellow-400"}`}>
            {savedAI.provider === 'ollama' ? 'Local' : savedAI.hasApiKey ? 'Ativo' : 'Pendente'}
          </span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{savedAI.provider.toUpperCase()}</span>
        </div>

        {/* Budget */}
        <div className="glass-panel p-5 rounded-2xl border border-[#bc13fe]/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#bc13fe]" />
            <span className="font-bold text-sm text-white">Orçamento Mensal</span>
          </div>
          <span className="text-2xl font-black text-[#bc13fe]">
            R$ {config.aiConfig?.monthlyBudget?.toFixed(2) || "10.00"}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Limite Diário: {config.aiConfig?.maxDailyRequests ?? '∞'} Req.</span>
        </div>

        {/* Mode */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-700 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-sm text-white">Manual Trigger</span>
          </div>
          <Link href="/admin/investigar" className="bg-[#bc13fe]/10 border border-[#bc13fe]/30 text-[#bc13fe] text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-[#bc13fe]/20 transition text-center uppercase tracking-widest">
            Acessar Protocolo
          </Link>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest text-center mt-1">OpenClaw 360º</span>
        </div>
      </div>

      {/* ── IA ASSISTENTE PREFERÊNCIA ─────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/30 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#bc13fe] flex items-center gap-2">
            <Star className="w-4 h-4" /> IA Assistente Preferência — Padrão do Site
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-black/50 rounded-lg border border-[#bc13fe]/20">
            <Bot className="w-3.5 h-3.5 text-[#bc13fe]" />
            <span className="text-[10px] font-mono text-[#bc13fe] uppercase tracking-widest">
              {savedAI.provider === 'ollama' ? 'PERITO SANSÃO - IA NCFN' : savedAI.provider.toUpperCase()} · {savedAI.model}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500">
          Selecione o modelo de IA padrão para todas as ferramentas do portal: Laudo Forense, Perícia de Arquivo, Captura Web e Análise de Evidências. Quando uma IA externa é configurada aqui, ela substitui o Ollama local em todo o sistema.
        </p>

        {/* Provider cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {AI_PROVIDERS.map(prov => (
            <button
              key={prov.id}
              onClick={() => {
                setSelectedProvider(prov.id);
                setSelectedModel(prov.models[0].id);
                setApiKeyInput('');
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedProvider === prov.id
                  ? `${prov.border} ${prov.bg} shadow-lg`
                  : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
              }`}
            >
              <div className={`text-xs font-black uppercase tracking-wider mb-1 ${selectedProvider === prov.id ? prov.color : 'text-gray-400'}`}>
                {prov.label}
              </div>
              <div className="text-[10px] text-gray-600">{prov.isLocal ? '🖥️ Local / Privado' : '☁️ API Externa'}</div>
              {selectedProvider === prov.id && (
                <div className={`mt-1.5 text-[9px] font-bold ${prov.color} opacity-80 uppercase tracking-widest`}>✓ SELECIONADO</div>
              )}
            </button>
          ))}
        </div>

        {/* Model + Key form */}
        {selectedProvider && (() => {
          const prov = AI_PROVIDERS.find(p => p.id === selectedProvider)!;
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Modelo</label>
                <select
                  className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none ${prov.border} text-white`}
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  {prov.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                  ))}
                </select>
              </div>
              {!prov.isLocal && (
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">
                    API Key {savedAI.provider === selectedProvider && savedAI.hasApiKey && <span className="text-green-400">✓ Salva</span>}
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder={savedAI.provider === selectedProvider && savedAI.hasApiKey ? '••••••••••••• (deixe vazio para manter)' : `Cole sua ${prov.keyEnvHint}...`}
                    className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none ${prov.border}`}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {modelMsg && (
          <div className={`px-4 py-3 rounded-xl text-xs font-mono border ${modelMsg.includes('Erro') ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-green-500/40 bg-green-500/10 text-green-400'}`}>
            {modelMsg}
          </div>
        )}

        <button
          onClick={handleSaveModel}
          disabled={savingModel}
          className="flex items-center gap-2 px-6 py-3 bg-[#bc13fe]/20 border border-[#bc13fe]/50 text-[#bc13fe] rounded-xl font-black text-sm hover:bg-[#bc13fe]/30 transition-all disabled:opacity-40 uppercase tracking-widest"
        >
          {savingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar como IA Padrão do Site
        </button>
      </div>

      {/* Legacy config section (budget, limits, keywords) */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Controles Adicionais
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
            <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Orçamento Mensal (BRL)</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-xs">R$</span>
                <input
                type="number"
                step="0.01"
                defaultValue={config.aiConfig?.monthlyBudget}
                className="w-full bg-black/60 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono focus:border-[#bc13fe]/50"
                onBlur={(e) => handleUpdateConfig({ monthlyBudget: parseFloat(e.target.value) })}
                />
            </div>
            </div>
            <div>
            <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Limite Diário de Requisições</label>
            <input
                type="number"
                defaultValue={config.aiConfig?.maxDailyRequests}
                className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-[#bc13fe]/50"
                onBlur={(e) => handleUpdateConfig({ maxDailyRequests: parseInt(e.target.value) })}
            />
            </div>
            <div>
            <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">Gatilhos Automáticos (Keywords)</label>
            <input
                type="text"
                placeholder="fraude, lavagem, desvio..."
                defaultValue={config.aiConfig?.keywords || ""}
                className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:border-[#bc13fe]/50"
                onBlur={(e) => handleUpdateConfig({ keywords: e.target.value })}
            />
            <p className="text-[8px] text-gray-600 mt-1 uppercase">Separe por vírgula para múltiplos gatilhos.</p>
            </div>
        </div>

        <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Relatórios Forenses por E-mail</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Notificar fleuriengenharia@gmail.com</span>
                <div className="w-10 h-5 bg-green-500/20 border border-green-500/50 rounded-full flex items-center px-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full ml-auto" />
                </div>
            </div>
        </div>
      </div>

      {/* Pull Model */}
      <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/20 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#bc13fe] flex items-center gap-2">
          <Download className="w-4 h-4" /> Instalar / Atualizar Modelo
        </h2>
        <div className="flex gap-3">
          <input
            value={pullModel}
            onChange={e => setPullModel(e.target.value)}
            placeholder="ex: mistral:7b, llama3:8b, phi3:mini"
            className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#bc13fe]/60 placeholder-gray-600"
          />
          <button
            onClick={handlePullModel}
            disabled={pullLoading}
            className="px-5 py-2.5 bg-[#bc13fe]/10 border border-[#bc13fe]/40 text-[#bc13fe] rounded-lg text-sm font-bold hover:bg-[#bc13fe]/20 transition disabled:opacity-50 flex items-center gap-2"
          >
            {pullLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Pull
          </button>
        </div>
        {pullOutput && (
          <pre className="bg-black/60 border border-gray-800 rounded-lg p-3 text-[10px] font-mono text-green-400 max-h-32 overflow-auto">
            {pullOutput}
          </pre>
        )}
        <p className="text-[10px] text-gray-600">Recomendado: <span className="text-gray-400 font-mono">mistral:7b</span> (4.1GB) — melhor custo/benefício para 8GB RAM</p>
      </div>

      {/* Test Prompt */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> Testar Prompt de IA
        </h2>
        <textarea
          value={testPrompt}
          onChange={e => setTestPrompt(e.target.value)}
          rows={3}
          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/60 resize-none"
        />
        <button
          onClick={handleTestPrompt}
          disabled={testLoading || !config.ollamaOnline}
          className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg text-sm font-bold hover:bg-cyan-500/20 transition disabled:opacity-40 flex items-center gap-2"
        >
          {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Executar
        </button>
        {testResponse && (
          <div className="bg-black/60 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-auto font-mono">
            {testResponse}
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/20 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#bc13fe] flex items-center gap-2">
            <Tag className="w-4 h-4" /> Keywords Monitoradas ({config.keywords.filter(k => k.active).length} ativas)
          </h2>
          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="px-3 py-1.5 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {seedLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
            Seed CP/CPP
          </button>
        </div>

        {actionMsg && (
          <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 animate-in slide-in-from-top-2">{actionMsg}</div>
        )}

        {/* Add keyword */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={newKw.keyword} onChange={e => setNewKw(p => ({ ...p, keyword: e.target.value }))}
            placeholder="keyword (ex: golpe pix)" className="col-span-2 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#bc13fe]/50" />
          <input value={newKw.category} onChange={e => setNewKw(p => ({ ...p, category: e.target.value }))}
            placeholder="categoria" className="bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#bc13fe]/50" />
          <input value={newKw.legalRef} onChange={e => setNewKw(p => ({ ...p, legalRef: e.target.value }))}
            placeholder="Art. X CP (opcional)" className="bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#bc13fe]/50" />
        </div>
        <button onClick={handleAddKeyword} disabled={addingKw || !newKw.keyword || !newKw.category}
          className="px-4 py-2 text-xs bg-[#bc13fe]/10 border border-[#bc13fe]/40 text-[#bc13fe] rounded-lg hover:bg-[#bc13fe]/20 transition flex items-center gap-2 disabled:opacity-40 font-bold">
          {addingKw ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Adicionar Keyword
        </button>

        {/* List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {config.keywords.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-6">Nenhuma keyword. Clique em "Seed CP/CPP" para começar.</p>
          )}
          {config.keywords.map(kw => (
            <div key={kw.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${kw.active ? "border-[#bc13fe]/20 bg-[#bc13fe]/5" : "border-gray-800 bg-gray-900/30 opacity-50"}`}>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${categoryColors[kw.category] || "text-gray-400 bg-gray-500/10 border-gray-500/30"}`}>
                {kw.category}
              </span>
              <span className="text-xs font-mono text-white flex-1">{kw.keyword}</span>
              {kw.legalRef && (
                <span className="text-[10px] text-gray-600 font-mono hidden md:block">{kw.legalRef}</span>
              )}
              <button onClick={() => handleToggle(kw.id)} className="text-gray-500 hover:text-[#bc13fe] transition">
                {kw.active ? <ToggleRight className="w-4 h-4 text-[#bc13fe]" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(kw.id)} className="text-gray-700 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent scans */}
      {config.recentScans.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Últimas Varreduras
          </h2>
          <div className="space-y-2">
            {config.recentScans.map(s => (
              <div key={s.id} className="flex items-center gap-3 text-xs font-mono text-gray-500 border-b border-gray-900 pb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {s.status}
                </span>
                <span className="flex-1 text-gray-400">{s.target}</span>
                <span className="text-gray-600">{s.tool}</span>
                <span className={`text-gray-700 ${s.durationSecs ? "" : "hidden"}`}>{s.durationSecs?.toFixed(0)}s</span>
                <span className="text-gray-700">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
          <Link href="/admin/varreduras" className="text-xs text-[#bc13fe] hover:underline">
            Ver todas as varreduras →
          </Link>
        </div>
      )}
    </div>
  );
}
