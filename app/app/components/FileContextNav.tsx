"use client";
/**
 * FileContextNav — barra flutuante de navegação contextual por arquivo.
 * Aparece quando um arquivo está em contexto (ncfn_file_ctx no localStorage).
 * Permite transitar entre as 6 páginas relacionadas mantendo o arquivo selecionado.
 */
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Archive, FileSearch, BookOpen, TrendingUp, Database, Clock, X, FileText,
} from "lucide-react";

export interface FileCtx { folder: string; filename: string; }

const CTX_KEY = "ncfn_file_ctx";
const CTX_EVENT = "ncfn:file-ctx";

/** Write file context (call from any page when a file is selected) */
export function setFileCtx(folder: string, filename: string) {
  const val = JSON.stringify({ folder, filename });
  try { localStorage.setItem(CTX_KEY, val); } catch {}
  window.dispatchEvent(new CustomEvent(CTX_EVENT, { detail: { folder, filename } }));
}

/** Clear file context */
export function clearFileCtx() {
  try { localStorage.removeItem(CTX_KEY); } catch {}
  window.dispatchEvent(new CustomEvent(CTX_EVENT, { detail: null }));
}

const PAGES = [
  { label: "Cofre",       short: "Cofre",      icon: Archive,     href: "/vault",                   color: "#bc13fe" },
  { label: "Perícia",     short: "Perícia",     icon: FileSearch,  href: "/admin/pericia-arquivo",   color: "#00f3ff" },
  { label: "Logs Imt.",   short: "Logs Imt.",   icon: BookOpen,    href: "/admin/cofre",             color: "#f59e0b" },
  { label: "Relatórios",  short: "Relat.",      icon: TrendingUp,  href: "/admin/laudo-forense",     color: "#4ade80" },
  { label: "Sessão",      short: "Sessão",      icon: Database,    href: "/admin/logs",              color: "#f97316" },
  { label: "Timeline",    short: "Timeline",    icon: Clock,       href: "/admin/timeline",          color: "#a78bfa" },
];

// Short folder display
function shortFolder(folder: string) {
  const m = folder.match(/^(\d+)_NCFN-(.+)$/);
  if (!m) return folder.slice(0, 20);
  return `${m[1]} · ${m[2].replace(/-/g, ' ').slice(0, 18)}`;
}

export default function FileContextNav() {
  const [ctx, setCtx]   = useState<FileCtx | null>(null);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  const readCtx = useCallback(() => {
    try {
      const raw = localStorage.getItem(CTX_KEY);
      if (raw) { const c = JSON.parse(raw); if (c?.folder && c?.filename) return c as FileCtx; }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    setCtx(readCtx());

    const onStorage = (e: StorageEvent) => {
      if (e.key === CTX_KEY) setCtx(e.newValue ? JSON.parse(e.newValue) : null);
    };
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setCtx(d ? d : null);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CTX_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CTX_EVENT, onCustom);
    };
  }, [readCtx]);

  // Animate in/out
  useEffect(() => {
    if (ctx) { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }
    else setVisible(false);
  }, [ctx]);

  const ALLOWED_PATHS = ["/vault", "/admin/pericia-arquivo", "/admin/cofre", "/admin/laudo-forense", "/admin/logs", "/admin/timeline"];
  const isAllowedPage = ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));

  if (!ctx || !isAllowedPage) return null;

  const { folder, filename } = ctx;
  const fileParam = `folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(filename)}`;

  return (
    <div
      className="fixed bottom-[72px] md:bottom-4 left-1/2 z-[9000] flex items-center gap-0 transition-all duration-300 select-none"
      style={{
        transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-white/12 bg-black/80 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] text-xs">

        {/* File indicator */}
        <div className="flex items-center gap-2 pr-2 border-r border-white/10 mr-1 max-w-[200px]">
          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-semibold truncate leading-none" style={{ maxWidth: 130 }}>{filename}</p>
            <p className="text-gray-600 text-[9px] truncate leading-none mt-0.5">{shortFolder(folder)}</p>
          </div>
        </div>

        {/* Page buttons */}
        {PAGES.map(page => {
          const isCurrent = pathname === page.href || pathname.startsWith(page.href + "/");
          const url = `${page.href}?${fileParam}`;
          const Icon = page.icon;

          return isCurrent ? (
            <div
              key={page.href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border"
              style={{
                background: `${page.color}20`,
                borderColor: `${page.color}60`,
                color: page.color,
              }}
              title={page.label}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:inline">{page.short}</span>
            </div>
          ) : (
            <Link
              key={page.href}
              href={url}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-medium border border-transparent text-gray-400 hover:border-white/15 hover:bg-white/6 hover:text-white transition-all"
              title={`${page.label} — ${filename}`}
            >
              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: page.color }} />
              <span className="hidden sm:inline">{page.short}</span>
            </Link>
          );
        })}

        {/* Dismiss */}
        <button
          onClick={clearFileCtx}
          className="ml-1 p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all"
          title="Fechar contexto de arquivo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
