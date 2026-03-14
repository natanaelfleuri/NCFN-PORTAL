"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, BookOpen, Server, GitBranch, LayoutDashboard,
  Crosshair, Plus, Pencil, Trash2, X, Save, Upload,
  FileArchive, RefreshCw, Check, Hash, Clock, ExternalLink,
  ChevronRight, Shield, Loader2, AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  slug: string;
  title: string;
  icon: string;
  order: number;
  content: string;
  updatedAt: string;
}

interface Investigation {
  id: string;
  filename: string;
  size: number;
  sha256: string;
  notes: string | null;
  uploadedBy: string;
  createdAt: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  BookOpen, Server, GitBranch, LayoutDashboard, Crosshair, Shield,
};

function SectionIcon({ name, ...props }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || BookOpen;
  return <Icon {...props} />;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Mermaid renderer ────────────────────────────────────────────────────────

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#1a0030",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#bc13fe",
            lineColor: "#00f3ff",
            secondaryColor: "#0a0a1a",
            tertiaryColor: "#050510",
            background: "#030310",
            mainBkg: "#0d0d1a",
            nodeBorder: "#bc13fe",
            clusterBkg: "#0d0d20",
            titleColor: "#00f3ff",
            edgeLabelBackground: "#0d0d1a",
            fontFamily: "ui-monospace, monospace",
          },
        });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <pre className="text-xs text-red-400/70 bg-red-950/20 border border-red-900/30 rounded-lg p-4 overflow-x-auto font-mono">
        {code}
      </pre>
    );
  }
  if (!svg) {
    return (
      <div className="flex items-center gap-2 text-xs text-purple-400/60 py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Renderizando diagrama...
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className="my-4 rounded-xl overflow-x-auto bg-black/40 border border-[#bc13fe]/10 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─── Markdown renderer with mermaid + table support ──────────────────────────

function MarkdownView({ content }: { content: string }) {
  return (
    <div className="prose-osint">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // pre — transparent, code handles its own wrapper
          pre({ children }: any) {
            return <>{children}</>;
          },
          // code — intercept mermaid, style block vs inline
          code({ node, className, children, ...props }: any) {
            const lang = (className || "").replace("language-", "");
            const code = String(children).replace(/\n$/, "");
            if (lang === "mermaid") {
              return <MermaidDiagram code={code} />;
            }
            if (className) {
              // Fenced block code (non-mermaid)
              return (
                <pre className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto text-sm text-gray-300 font-mono my-4 leading-relaxed">
                  <code>{children}</code>
                </pre>
              );
            }
            // Inline code
            return (
              <code
                className="bg-white/5 text-[#00f3ff] px-1.5 py-0.5 rounded font-mono text-[0.85em]"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1({ children }: any) {
            return (
              <h1 className="text-2xl font-black uppercase tracking-widest mt-8 mb-4 pb-2 border-b border-white/10"
                style={{ background: "linear-gradient(90deg,#00ff9f,#a100ff,#00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {children}
              </h1>
            );
          },
          h2({ children }: any) {
            return (
              <h2 className="text-xl font-bold mt-6 mb-3"
                style={{ background: "linear-gradient(90deg,#00ff9f,#00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {children}
              </h2>
            );
          },
          h3({ children }: any) {
            return (
              <h3 className="text-base font-semibold text-[#bc13fe] mt-5 mb-2">{children}</h3>
            );
          },
          p({ children }: any) {
            return <p className="text-gray-300 leading-relaxed mb-3 text-sm">{children}</p>;
          },
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#00f3ff] hover:text-[#00f3ff]/80 underline underline-offset-2 text-sm transition-colors"
              >
                {children}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            );
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                <table className="w-full text-sm border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }: any) {
            return <thead className="bg-[#bc13fe]/10 border-b border-[#bc13fe]/20">{children}</thead>;
          },
          th({ children }: any) {
            return (
              <th className="px-3 py-2.5 text-left text-xs font-bold text-[#bc13fe] uppercase tracking-wider whitespace-nowrap">
                {children}
              </th>
            );
          },
          tr({ children }: any) {
            return (
              <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                {children}
              </tr>
            );
          },
          td({ children }: any) {
            return <td className="px-3 py-2.5 text-gray-300 text-xs align-top">{children}</td>;
          },
          strong({ children }: any) {
            return <strong className="text-white font-semibold">{children}</strong>;
          },
          em({ children }: any) {
            return <em className="text-gray-400 italic">{children}</em>;
          },
          hr() {
            return <hr className="border-white/10 my-6" />;
          },
          ul({ children }: any) {
            return <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm my-3 ml-2">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm my-3 ml-2">{children}</ol>;
          },
          li({ children }: any) {
            return <li className="text-gray-300 text-sm">{children}</li>;
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-2 border-[#00f3ff]/40 pl-4 text-gray-400 italic my-4 text-sm">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Section editor modal ─────────────────────────────────────────────────────

function SectionModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Section>;
  onSave: (data: Partial<Section>) => Promise<void>;
  onClose: () => void;
}) {
  const [slug, setSlug] = useState(initial?.slug || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [icon, setIcon] = useState(initial?.icon || "BookOpen");
  const [content, setContent] = useState(initial?.content || "");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSave = async () => {
    if (!slug || !title || !content) return;
    setSaving(true);
    await onSave({ ...(initial?.id && { id: initial.id }), slug, title, icon, content, order });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-4xl bg-[#06070a] border border-[#bc13fe]/30 rounded-2xl shadow-[0_0_60px_rgba(188,19,254,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-sm font-bold text-white">
            {initial?.id ? "Editar Seção" : "Nova Seção"}
          </span>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 font-mono mb-1 block">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="ex: ferramentas-osint"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#bc13fe] transition-colors font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 font-mono mb-1 block">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da seção"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#bc13fe] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Ícone</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-[#bc13fe] transition-colors"
              >
                {Object.keys(ICON_MAP).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Ordem</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bc13fe] transition-colors"
              />
            </div>
          </div>

          {/* Content / Preview tabs */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-gray-500 font-mono">Conteúdo (Markdown)</label>
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className={`ml-auto text-xs px-3 py-1 rounded-lg border transition-colors ${
                  preview
                    ? "border-[#00f3ff]/40 text-[#00f3ff] bg-[#00f3ff]/5"
                    : "border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {preview ? "Editor" : "Preview"}
              </button>
            </div>

            {preview ? (
              <div className="bg-black/30 border border-white/10 rounded-xl p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                <MarkdownView content={content} />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                placeholder="# Título&#10;&#10;Conteúdo em Markdown..."
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-300 text-xs placeholder-gray-700 focus:outline-none focus:border-[#bc13fe] transition-colors font-mono resize-y leading-relaxed"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !slug || !title || !content}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#bc13fe]/20 border border-[#bc13fe]/40 rounded-xl text-[#bc13fe] text-sm font-bold hover:bg-[#bc13fe]/30 disabled:opacity-40 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvestigarPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // ZIP / investigations
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Admin modals
  const [editModal, setEditModal] = useState<{ open: boolean; section?: Section }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/osint-sections");
      const data = await res.json();
      setSections(data.sections || []);
      if (data.sections?.length && !activeSlug) {
        setActiveSlug(data.sections[0].slug);
      }
    } finally {
      setLoading(false);
    }
  }, [activeSlug]);

  const loadInvestigations = useCallback(async () => {
    setInvLoading(true);
    try {
      const res = await fetch("/api/admin/osint-sections/upload");
      const data = await res.json();
      setInvestigations(data.investigations || []);
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
    loadInvestigations();
  }, []);

  // Active section
  const activeSection = sections.find((s) => s.slug === activeSlug);

  // ── ZIP upload ──
  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setUploadMsg({ text: "Apenas arquivos .zip são aceitos.", ok: false });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    if (notes.trim()) form.append("notes", notes.trim());
    try {
      const res = await fetch("/api/admin/osint-sections/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setUploadMsg({ text: `Enviado com sucesso. SHA-256: ${data.sha256.slice(0, 20)}...`, ok: true });
        setNotes("");
        if (fileRef.current) fileRef.current.value = "";
        loadInvestigations();
      } else {
        setUploadMsg({ text: data.error || "Erro ao enviar.", ok: false });
      }
    } catch (e: any) {
      setUploadMsg({ text: e.message, ok: false });
    } finally {
      setUploading(false);
    }
  };

  // ── Section CRUD ──
  const handleSaveSection = async (data: Partial<Section>) => {
    const method = data.id ? "PUT" : "POST";
    await fetch("/api/admin/osint-sections", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadSections();
    if (!data.id && data.slug) setActiveSlug(data.slug);
  };

  const handleDeleteSection = async (id: string) => {
    await fetch("/api/admin/osint-sections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleteConfirm(null);
    const remaining = sections.filter((s) => s.id !== id);
    setSections(remaining);
    if (remaining.length) setActiveSlug(remaining[0].slug);
  };

  const handleDeleteInvestigation = async (id: string) => {
    await fetch("/api/admin/osint-sections/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadInvestigations();
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-600 hover:text-[#00f3ff] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Shield className="w-5 h-5 text-[#bc13fe]" />
          <h1 className="text-lg font-black text-white tracking-wide">Arsenal OSINT</h1>
          <span className="text-[10px] font-mono text-[#bc13fe]/40 uppercase tracking-widest ml-1 hidden sm:block">
            Ferramentas · Fluxogramas · Investigações
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ZONA DE UPLOAD — Investigações Externas
        ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-[#00f3ff]/15 bg-black/30 overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-[#00f3ff]/[0.03]">
            <FileArchive className="w-4 h-4 text-[#00f3ff]" />
            <span className="text-sm font-bold text-white">Carregar Investigação Externa (.zip)</span>
            <button onClick={loadInvestigations} className="ml-auto text-gray-600 hover:text-[#00f3ff] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-5 grid lg:grid-cols-2 gap-5">
            {/* Left — upload form */}
            <div className="space-y-3">
              {/* Explanation */}
              <div className="text-xs text-gray-500 leading-relaxed bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1.5">
                <p className="text-gray-300 font-semibold text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> Como funciona
                </p>
                <p>Faça o upload de um arquivo <code className="text-[#00f3ff] font-mono bg-[#00f3ff]/10 px-1 rounded">.zip</code> contendo evidências coletadas fora do portal (prints, logs, relatórios, capturas de tela, arquivos OSINT externos).</p>
                <p>O sistema calcula automaticamente o <strong className="text-white">SHA-256</strong> do arquivo, garantindo a integridade da cadeia de custódia — em conformidade com a <strong className="text-white">RFC 3227</strong>.</p>
                <p>Futuramente, os arquivos serão processados por IA para extração automática de evidências e geração de laudos.</p>
                <p className="text-yellow-400/70">Tamanho máximo: <strong className="text-yellow-400">500 MB</strong> por arquivo.</p>
              </div>

              {/* File input */}
              <div
                className="border-2 border-dashed border-white/10 hover:border-[#00f3ff]/30 rounded-xl p-5 text-center cursor-pointer transition-colors group"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-gray-600 group-hover:text-[#00f3ff] mx-auto mb-2 transition-colors" />
                <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                  {fileRef.current?.files?.[0]?.name || "Clique para selecionar arquivo .zip"}
                </p>
                <input ref={fileRef} type="file" accept=".zip" className="hidden" />
              </div>

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas sobre a investigação (opcional)..."
                rows={3}
                className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-[#00f3ff]/40 transition-colors font-mono resize-none"
              />

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] text-sm font-bold hover:bg-[#00f3ff]/15 disabled:opacity-40 transition-all"
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  : <><Upload className="w-4 h-4" /> Enviar Investigação</>
                }
              </button>

              {uploadMsg && (
                <div className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-lg border ${
                  uploadMsg.ok
                    ? "bg-emerald-950/30 border-emerald-700/30 text-emerald-400"
                    : "bg-red-950/30 border-red-700/30 text-red-400"
                }`}>
                  {uploadMsg.ok ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="font-mono">{uploadMsg.text}</span>
                </div>
              )}
            </div>

            {/* Right — investigations list */}
            <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Arquivos carregados</span>
                <span className="ml-auto text-xs bg-[#00f3ff]/10 text-[#00f3ff] px-2 py-0.5 rounded-full font-mono">
                  {investigations.length}
                </span>
              </div>

              {invLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                </div>
              ) : investigations.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-700 font-mono">Nenhuma investigação carregada.</div>
              ) : (
                <div className="divide-y divide-white/[0.03] max-h-64 overflow-y-auto">
                  {investigations.map((inv) => (
                    <div key={inv.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileArchive className="w-3.5 h-3.5 text-[#00f3ff]/60 flex-shrink-0" />
                          <span className="text-xs text-white font-medium truncate">{inv.filename}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteInvestigation(inv.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-5">
                        <span className="text-[10px] text-gray-600 font-mono">{fmtBytes(inv.size)}</span>
                        <span className="text-[10px] text-gray-700 font-mono flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" />{inv.sha256.slice(0, 16)}…
                        </span>
                        <span className="text-[10px] text-gray-700 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {inv.notes && (
                        <p className="mt-1 text-[10px] text-gray-500 pl-5 italic truncate">{inv.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            LEITOR MARKDOWN — Seções OSINT
        ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-[#bc13fe]/15 bg-black/30 overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-[#bc13fe]/[0.03]">
            <BookOpen className="w-4 h-4 text-[#bc13fe]" />
            <span className="text-sm font-bold text-white">Base de Conhecimento OSINT</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setEditModal({ open: true })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bc13fe]/10 border border-[#bc13fe]/30 text-[#bc13fe] hover:bg-[#bc13fe]/20 transition-all font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Seção
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 text-[#bc13fe] animate-spin" />
            </div>
          ) : sections.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm text-gray-600">Nenhuma seção cadastrada.</p>
              <button
                onClick={() => setEditModal({ open: true })}
                className="text-xs text-[#bc13fe] hover:text-[#bc13fe]/80 transition-colors"
              >
                Criar primeira seção →
              </button>
            </div>
          ) : (
            <div className="flex min-h-[600px]">
              {/* ── Sidebar — section nav ── */}
              <div className="w-52 flex-shrink-0 border-r border-white/5 bg-black/20">
                <div className="py-2">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSlug(s.slug)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold transition-all group ${
                        activeSlug === s.slug
                          ? "text-white bg-[#bc13fe]/10 border-r-2 border-[#bc13fe]"
                          : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                      }`}
                    >
                      <SectionIcon
                        name={s.icon}
                        className={`w-3.5 h-3.5 flex-shrink-0 ${activeSlug === s.slug ? "text-[#bc13fe]" : "text-gray-600"}`}
                      />
                      <span className="flex-1 truncate">{s.title}</span>
                      {activeSlug === s.slug && (
                        <ChevronRight className="w-3 h-3 text-[#bc13fe] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Sidebar admin actions for active section */}
                {activeSection && (
                  <div className="mt-auto px-3 py-3 border-t border-white/5 space-y-1">
                    <button
                      onClick={() => setEditModal({ open: true, section: activeSection })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-yellow-400 hover:bg-yellow-950/20 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar Seção
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(activeSection.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-red-400 hover:bg-red-950/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover Seção
                    </button>
                  </div>
                )}
              </div>

              {/* ── Content area ── */}
              <div className="flex-1 overflow-auto p-6 lg:p-8">
                {activeSection ? (
                  <MarkdownView content={activeSection.content} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-gray-700">
                    Selecione uma seção
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section editor modal ── */}
      {editModal.open && (
        <SectionModal
          initial={editModal.section}
          onSave={handleSaveSection}
          onClose={() => setEditModal({ open: false })}
        />
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#06070a] border border-red-900/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="font-bold text-white text-sm">Confirmar exclusão</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Esta ação é irreversível. A seção e todo o seu conteúdo serão removidos permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:text-white hover:border-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteSection(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-950/30 border border-red-900/40 hover:bg-red-950/50 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
