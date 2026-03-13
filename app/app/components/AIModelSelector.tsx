"use client";
import { useState, useEffect, useRef } from "react";
import { Bot, ChevronDown, Check } from "lucide-react";

type ModelOption = {
  provider: string;
  model: string;
  label: string;
  color: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  // Ollama (local)
  { provider: 'ollama', model: 'mistral', label: 'PERITO SANSÃO (Ollama · mistral)', color: 'text-green-400' },
  { provider: 'ollama', model: 'llama3:8b', label: 'PERITO SANSÃO (Ollama · llama3)', color: 'text-green-400' },
  // OpenAI
  { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o (OpenAI)', color: 'text-emerald-400' },
  { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)', color: 'text-emerald-400' },
  // Anthropic
  { provider: 'anthropic', model: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Anthropic)', color: 'text-orange-400' },
  { provider: 'anthropic', model: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Anthropic)', color: 'text-orange-400' },
  // Google
  { provider: 'google', model: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Google)', color: 'text-blue-400' },
  { provider: 'google', model: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro (Google)', color: 'text-blue-400' },
  // DeepSeek
  { provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek Chat', color: 'text-purple-400' },
  // Mistral API
  { provider: 'mistral', model: 'mistral-large-latest', label: 'Mistral Large (API)', color: 'text-yellow-400' },
];

interface AIModelSelectorProps {
  /** Called when user changes the model for this session */
  onChange?: (provider: string, model: string) => void;
  /** Optional size: 'sm' | 'md' */
  size?: 'sm' | 'md';
}

export default function AIModelSelector({ onChange, size = 'sm' }: AIModelSelectorProps) {
  const [siteDefault, setSiteDefault] = useState<ModelOption>(MODEL_OPTIONS[0]);
  const [selected, setSelected] = useState<ModelOption | null>(null); // null = use site default
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/ai-model')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const found = MODEL_OPTIONS.find(o => o.provider === d.provider && o.model === d.model);
        if (found) setSiteDefault(found);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = selected || siteDefault;

  const handleSelect = (opt: ModelOption | null) => {
    setSelected(opt);
    setOpen(false);
    const effective = opt || siteDefault;
    onChange?.(effective.provider, effective.model);
  };

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#bc13fe]/30 bg-[#bc13fe]/5 hover:bg-[#bc13fe]/10 transition-all ${textSize} font-mono`}
      >
        <Bot size={size === 'sm' ? 11 : 13} className="text-[#bc13fe]" />
        <span className={`${active.color} font-bold truncate max-w-[160px]`}>{active.label}</span>
        <ChevronDown size={10} className="text-gray-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-[#0a0a14] border border-[#bc13fe]/30 rounded-xl shadow-2xl shadow-[#bc13fe]/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-800">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-mono">Selecionar IA para esta sessão</p>
          </div>

          {/* Use site default */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors ${textSize}`}
          >
            <span className={`w-3 h-3 flex-shrink-0 ${!selected ? 'text-[#bc13fe]' : 'text-transparent'}`}>
              <Check size={12} />
            </span>
            <span className="text-gray-400">Padrão do site</span>
            <span className={`ml-auto ${siteDefault.color} font-bold text-[9px] truncate`}>{siteDefault.label}</span>
          </button>

          <div className="border-t border-gray-800/50" />

          <div className="max-h-56 overflow-y-auto">
            {MODEL_OPTIONS.map(opt => (
              <button
                key={`${opt.provider}/${opt.model}`}
                onClick={() => handleSelect(opt)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors ${textSize}`}
              >
                <span className={`w-3 h-3 flex-shrink-0 ${selected?.provider === opt.provider && selected?.model === opt.model ? 'text-[#bc13fe]' : 'text-transparent'}`}>
                  <Check size={12} />
                </span>
                <span className={`${opt.color} font-mono`}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
