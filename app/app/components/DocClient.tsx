"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  BookOpen, Plus, Trash2, Save, Search, X, CheckCircle, AlertTriangle,
  AlignLeft, Eye, Columns2, ChevronRight, ChevronDown,
  Folder as FolderIcon, FolderPlus, Pin, PinOff, Palette,
  Image as ImageIcon, Loader2, Pencil, FolderOpen, FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FolderItem { id: string; name: string; createdAt: string; }
interface Note {
  id: string; title: string; content: string;
  folderId?: string | null;
  createdAt: string; updatedAt: string;
  pinned?: boolean; color?: string | null;
}

const NOTE_COLORS = [
  { value: '#f59e0b', label: 'Âmbar',   bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
  { value: '#ef4444', label: 'Vermelho', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)' },
  { value: '#3b82f6', label: 'Azul',     bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)' },
  { value: '#00f3ff', label: 'Ciano',    bg: 'rgba(0,243,255,0.12)',   border: 'rgba(0,243,255,0.35)' },
  { value: '#bc13fe', label: 'Roxo',     bg: 'rgba(188,19,254,0.12)', border: 'rgba(188,19,254,0.35)' },
  { value: '#4ade80', label: 'Verde',    bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Markdown Renderer ─────────────────────────────────────────────────────── */
function DocPreview({ content }: { content: string }) {
  return (
    <div className="obs-root prose-doc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="obs-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="obs-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="obs-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="obs-h4">{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="obs-link">{children}</a>
          ),
          img: ({ src, alt }) => (
            <span className="block my-3">
              <img
                src={src} alt={alt ?? ''}
                className="max-w-full rounded-lg border border-white/10 shadow-lg"
                style={{ maxHeight: 480 }}
              />
              {alt && <span className="block text-center text-xs text-gray-500 mt-1 italic">{alt}</span>}
            </span>
          ),
          table: ({ children }) => (
            <div className="obs-table-wrap"><table className="obs-table">{children}</table></div>
          ),
          thead: ({ children }) => <thead className="obs-thead">{children}</thead>,
          th: ({ children }) => <th className="obs-th">{children}</th>,
          td: ({ children }) => <td className="obs-td">{children}</td>,
          tr: ({ children }) => <tr className="obs-tr">{children}</tr>,
          code: ({ inline, children }: any) =>
            inline
              ? <code className="obs-code-inline">{children}</code>
              : <code className="obs-code-block">{children}</code>,
          pre: ({ children }) => <pre className="obs-pre">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="obs-blockquote">{children}</blockquote>,
          ul: ({ children }) => <ul className="obs-ul">{children}</ul>,
          ol: ({ children }) => <ol className="obs-ol">{children}</ol>,
          li: ({ children }) => <li className="obs-li">{children}</li>,
          hr: () => <hr className="obs-hr" />,
          p: ({ children }) => <p className="obs-p">{children}</p>,
          strong: ({ children }) => <strong className="obs-strong">{children}</strong>,
          em: ({ children }) => <em className="obs-em">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */
export default function DocClient() {
  const [notes, setNotes]     = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [mode, setMode]       = useState<'preview' | 'edit' | 'split'>('preview');
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  // sidebar
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderVal, setRenameFolderVal] = useState('');
  const [folderDropdown, setFolderDropdown] = useState(false);

  // color picker
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

  // image upload
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const folderDropRef = useRef<HTMLDivElement>(null);
  const newFolderRef  = useRef<HTMLInputElement>(null);

  const isDirty = selected
    ? title !== selected.title || content !== selected.content || folderId !== (selected.folderId ?? null)
    : title.trim() !== '' || content.trim() !== '';

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  /* ── Load ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doc');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes ?? []);
        setFolders(data.folders ?? []);
        // auto-open all folders
        setOpenFolders(new Set((data.folders ?? []).map((f: FolderItem) => f.id)));
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Close folder dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (folderDropRef.current && !folderDropRef.current.contains(e.target as Node)) {
        setFolderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Select note ── */
  const selectNote = (note: Note) => {
    setSelected(note);
    setTitle(note.title);
    setContent(note.content);
    setFolderId(note.folderId ?? null);
    setConfirmDel(false);
    setColorPickerFor(null);
  };

  /* ── New note ── */
  const newNote = (inFolderId?: string) => {
    setSelected(null);
    setTitle('');
    setContent('');
    setFolderId(inFolderId ?? null);
    setMode('edit');
    setConfirmDel(false);
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!title.trim()) { showMsg('err', 'Título obrigatório'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected?.id, title, content, folderId }),
      });
      if (!res.ok) throw new Error();
      const saved: Note = await res.json();
      setNotes(prev => {
        const idx = prev.findIndex(n => n.id === saved.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [saved, ...prev];
      });
      setSelected(saved);
      showMsg('ok', 'Salvo');
    } catch { showMsg('err', 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/doc?id=${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setNotes(prev => prev.filter(n => n.id !== selected.id));
      setSelected(null); setTitle(''); setContent(''); setFolderId(null);
      setConfirmDel(false);
      showMsg('ok', 'Nota removida');
    } catch { showMsg('err', 'Erro ao remover'); }
    finally { setDeleting(false); }
  };

  /* ── Pin ── */
  const handlePin = async () => {
    if (!selected) return;
    const newPinned = !selected.pinned;
    try {
      const res = await fetch('/api/doc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'patch-note', id: selected.id, pinned: newPinned }),
      });
      if (!res.ok) throw new Error();
      const updated: Note = await res.json();
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setSelected(updated);
    } catch { showMsg('err', 'Erro ao fixar'); }
  };

  /* ── Color ── */
  const handleColor = async (noteId: string, color: string | null) => {
    try {
      const res = await fetch('/api/doc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'patch-note', id: noteId, color }),
      });
      if (!res.ok) throw new Error();
      const updated: Note = await res.json();
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      if (selected?.id === updated.id) setSelected(updated);
    } catch { showMsg('err', 'Erro ao mudar cor'); }
    setColorPickerFor(null);
  };

  /* ── Add folder ── */
  const handleAddFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'folder', name }),
      });
      if (!res.ok) throw new Error();
      const folder: FolderItem = await res.json();
      setFolders(prev => [...prev, folder]);
      setOpenFolders(prev => new Set([...prev, folder.id]));
      setNewFolderName(''); setAddingFolder(false);
      showMsg('ok', `Pasta "${name}" criada`);
    } catch { showMsg('err', 'Erro ao criar pasta'); }
  };

  /* ── Rename folder ── */
  const handleRenameFolder = async (id: string) => {
    const name = renameFolderVal.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/doc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rename-folder', id, name }),
      });
      if (!res.ok) throw new Error();
      const updated: FolderItem = await res.json();
      setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      setRenamingFolder(null);
    } catch { showMsg('err', 'Erro ao renomear'); }
  };

  /* ── Delete folder ── */
  const handleDeleteFolder = async (id: string) => {
    try {
      await fetch(`/api/doc?id=${id}&type=folder`, { method: 'DELETE' });
      setFolders(prev => prev.filter(f => f.id !== id));
      setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: null } : n));
      showMsg('ok', 'Pasta removida');
    } catch { showMsg('err', 'Erro ao remover pasta'); }
  };

  /* ── Image upload ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/doc/upload-image', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const { url } = await res.json();
      const altText = file.name.replace(/\.[^.]+$/, '');
      const insertion = `\n![${altText}](${url})\n`;

      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? content.length;
        const end   = ta.selectionEnd   ?? content.length;
        const next  = content.slice(0, start) + insertion + content.slice(end);
        setContent(next);
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start + insertion.length, start + insertion.length);
        }, 0);
      } else {
        setContent(prev => prev + insertion);
      }
      showMsg('ok', 'Imagem inserida');
    } catch (err: any) {
      showMsg('err', err?.message ?? 'Erro ao fazer upload da imagem');
    } finally {
      setUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  /* ── Filtered notes ── */
  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const pinnedNotes   = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  const notesInFolder = (fid: string | null) =>
    unpinnedNotes.filter(n => (n.folderId ?? null) === fid);

  /* ── Keyboard: Ctrl+S ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, handleSave]);

  /* ── Note card ── */
  const NoteCard = ({ note }: { note: Note }) => {
    const isSelected = selected?.id === note.id;
    const col = NOTE_COLORS.find(c => c.value === note.color);
    return (
      <div
        onClick={() => selectNote(note)}
        className={`group relative px-3 py-2 rounded-lg cursor-pointer transition-all border text-left ${
          isSelected
            ? 'border-[#00f3ff]/60 bg-[#00f3ff]/8 shadow-[0_0_10px_rgba(0,243,255,0.08)]'
            : 'border-transparent hover:border-white/10 hover:bg-white/3'
        }`}
        style={col ? { borderColor: col.border, background: col.bg } : {}}
      >
        <div className="flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate leading-tight">{note.title}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{fmtDate(note.updatedAt)}</p>
          </div>
          {note.pinned && <Pin className="w-3 h-3 text-[#f59e0b] flex-shrink-0 mt-0.5" />}
        </div>
      </div>
    );
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#00f3ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-2 pb-20">
    <style>{`
      /* ── Headings — gradiente Obsidian ── */
      .obs-h1,.obs-h2,.obs-h3,.obs-h4 {
        background-color: transparent !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        font-weight: 800 !important;
        display: inline-block;
        margin: 1.1em 0 0.4em;
        line-height: 1.25;
      }
      .obs-h1 {
        font-size: 1.75em;
        background-image: linear-gradient(90deg, #00ff9f, #a100ff, #00b4ff) !important;
        text-transform: uppercase;
        letter-spacing: 3px;
        border-left: 5px solid #00ff9f;
        padding-left: 14px !important;
        display: block;
        -webkit-text-fill-color: transparent;
      }
      .obs-h2 {
        font-size: 1.45em;
        background-image: linear-gradient(90deg, #00ff9f, #00b4ff) !important;
      }
      .obs-h3 {
        font-size: 1.2em;
        background-image: linear-gradient(90deg, #a100ff, #00b4ff) !important;
      }
      .obs-h4 {
        font-size: 1.05em;
        background-image: linear-gradient(90deg, #00b4ff, #00ff9f) !important;
      }
      .obs-h5 {
        font-size: 0.95em;
        font-weight: 700;
        background-image: linear-gradient(90deg, #a100ff, #6b4f9a) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        display: inline-block;
        margin: 0.9em 0 0.35em;
      }
      .obs-h6 {
        font-size: 0.85em;
        font-weight: 600;
        color: rgba(255,255,255,0.40);
        margin: 0.8em 0 0.3em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      /* ── Bold — prata com profundidade ── */
      .obs-strong {
        background: linear-gradient(180deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        font-weight: 750 !important;
        filter: drop-shadow(1px 1px 0px rgba(0,0,0,0.8)) drop-shadow(0 0 1px rgba(255,255,255,0.3));
      }

      /* ── Itálico — lilás fosco ── */
      .obs-em {
        color: #c8a2c8 !important;
        font-style: italic !important;
        opacity: 0.85;
        -webkit-text-fill-color: #c8a2c8;
      }

      /* ── Parágrafo e listas ── */
      .obs-p  { font-size: 14px; color: rgba(255,255,255,0.82); margin: 0.5em 0; line-height: 1.75; text-align: justify; }
      .obs-ul { list-style: disc;    padding-left: 1.5em; margin: 0.4em 0; }
      .obs-ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
      .obs-li { font-size: 14px; color: rgba(255,255,255,0.78); line-height: 1.7; margin: 0.15em 0; }

      /* ── Code ── */
      .obs-code-inline {
        font-family: 'Fira Code', 'Courier New', monospace;
        font-size: 12px;
        color: #e2c08d;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 4px;
        padding: 1px 5px;
      }
      .obs-pre {
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 8px;
        padding: 12px 14px;
        overflow-x: auto;
        margin: 0.75em 0;
      }
      .obs-code-block {
        font-family: 'Fira Code', 'Courier New', monospace;
        font-size: 12.5px;
        color: #a8d0a8;
        display: block;
        white-space: pre;
      }

      /* ── Blockquote ── */
      .obs-blockquote {
        border-left: 3px solid rgba(188,19,254,0.7);
        background: rgba(188,19,254,0.06);
        margin: 0.6em 0;
        padding: 8px 12px;
        border-radius: 0 6px 6px 0;
        color: rgba(255,255,255,0.65);
        font-style: italic;
      }

      /* ── Tabelas ── */
      .obs-table-wrap { overflow-x: auto; margin: 0.75em 0; }
      .obs-table      { border-collapse: collapse; width: 100%; font-size: 13px; }
      .obs-thead      { border-bottom: 1px solid rgba(0,243,255,0.25); }
      .obs-th         { color: #00f3ff; font-weight: 700; padding: 6px 10px; text-align: left; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
      .obs-td         { color: rgba(255,255,255,0.75); padding: 5px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .obs-tr:hover .obs-td { background: rgba(255,255,255,0.02); }

      /* ── Link ── */
      .obs-link { color: #7c9ef8; text-decoration: underline; text-underline-offset: 2px; }
      .obs-link:hover { color: #a5b4fc; }

      /* ── HR ── */
      .obs-hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 1.2em 0; }

      /* ── Container raiz ── */
      .obs-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,243,255,0.1)', border: '1px solid rgba(0,243,255,0.3)' }}>
          <BookOpen className="w-5 h-5 text-[#00f3ff]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">MANUAIS DO SISTEMA</h1>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
            Base de conhecimento operacional — {notes.length} documentos
          </p>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl border backdrop-blur-xl transition-all ${
          msg.type === 'ok'
            ? 'bg-green-500/15 border-green-500/40 text-green-300'
            : 'bg-red-500/15 border-red-500/40 text-red-300'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-200px)]">

        {/* ── Sidebar ── */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar documentos..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs bg-white/3 border border-white/8 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00f3ff]/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* New note + New folder */}
          <div className="flex gap-1.5">
            <button onClick={() => newNote()}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff]/10">
              <Plus className="w-3.5 h-3.5" /> Nova Nota
            </button>
            <button onClick={() => { setAddingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50); }}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New folder input */}
          {addingFolder && (
            <div className="flex gap-1">
              <input ref={newFolderRef}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setAddingFolder(false); }}
                placeholder="Nome da pasta"
                className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-[#00f3ff]/30 text-white placeholder-gray-600 focus:outline-none"
              />
              <button onClick={handleAddFolder} className="px-2 py-1 rounded-lg bg-[#00f3ff]/15 border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff]/25 transition-all">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pinned notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <p className="px-1 text-[9px] font-bold text-[#f59e0b] uppercase tracking-widest mb-1">Fixadas</p>
              {pinnedNotes.map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          )}

          {/* Folders */}
          {folders.map(folder => {
            const isOpen = openFolders.has(folder.id);
            const folderNotes = notesInFolder(folder.id);
            return (
              <div key={folder.id}>
                <div className="flex items-center gap-1 group/folder px-1 py-1 rounded hover:bg-white/3 transition-colors">
                  <button
                    onClick={() => setOpenFolders(prev => {
                      const next = new Set(prev);
                      if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id);
                      return next;
                    })}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  >
                    {isOpen
                      ? <><ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" /><FolderOpen className="w-3.5 h-3.5 text-[#00f3ff]/70 flex-shrink-0" /></>
                      : <><ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" /><FolderIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" /></>
                    }
                    {renamingFolder === folder.id ? (
                      <input
                        value={renameFolderVal}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setRenameFolderVal(e.target.value)}
                        onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleRenameFolder(folder.id);
                          if (e.key === 'Escape') setRenamingFolder(null);
                        }}
                        onBlur={() => handleRenameFolder(folder.id)}
                        autoFocus
                        className="flex-1 min-w-0 bg-transparent text-[11px] text-white border-b border-[#00f3ff]/40 focus:outline-none"
                      />
                    ) : (
                      <span className="text-[11px] font-medium text-gray-300 truncate">{folder.name}</span>
                    )}
                    <span className="text-[9px] text-gray-600 ml-auto flex-shrink-0">{folderNotes.length}</span>
                  </button>
                  <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                    <button onClick={() => newNote(folder.id)} title="Nova nota nesta pasta"
                      className="p-0.5 rounded text-gray-500 hover:text-[#00f3ff] transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setRenamingFolder(folder.id); setRenameFolderVal(folder.name); }} title="Renomear"
                      className="p-0.5 rounded text-gray-500 hover:text-yellow-400 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteFolder(folder.id)} title="Remover pasta"
                      className="p-0.5 rounded text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/6 pl-2">
                    {folderNotes.length === 0 ? (
                      <p className="text-[10px] text-gray-700 italic px-1 py-1">vazio</p>
                    ) : (
                      folderNotes.map(n => <NoteCard key={n.id} note={n} />)
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes without folder */}
          {notesInFolder(null).length > 0 && (
            <div>
              <p className="px-1 text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1 mt-2">Sem pasta</p>
              {notesInFolder(null).map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          )}
        </div>

        {/* ── Main Editor/Preview ── */}
        <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-white/8 bg-black/30 backdrop-blur overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/6 flex-shrink-0">
            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={selected ? 'Título da nota' : 'Novo documento...'}
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-white placeholder-gray-600 focus:outline-none"
            />

            {/* Folder selector */}
            {(selected !== null || title.trim() !== '') && (
              <div className="relative" ref={folderDropRef}>
                <button
                  onClick={() => setFolderDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <FolderIcon className="w-3 h-3" />
                  <span className="max-w-[80px] truncate">
                    {folderId ? (folders.find(f => f.id === folderId)?.name ?? 'Pasta') : 'Sem pasta'}
                  </span>
                </button>
                {folderDropdown && (
                  <div className="absolute top-full mt-1 right-0 z-30 w-44 rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl overflow-hidden">
                    <button onClick={() => { setFolderId(null); setFolderDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5 ${!folderId ? 'text-[#00f3ff]' : 'text-gray-400'}`}>
                      Sem pasta
                    </button>
                    {folders.map(f => (
                      <button key={f.id} onClick={() => { setFolderId(f.id); setFolderDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5 ${folderId === f.id ? 'text-[#00f3ff]' : 'text-gray-400'}`}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View mode */}
            <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5 border border-white/8">
              {([
                { id: 'edit', icon: Pencil, label: 'Editar' },
                { id: 'split', icon: Columns2, label: 'Dividido' },
                { id: 'preview', icon: Eye, label: 'Preview' },
              ] as const).map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setMode(id)} title={label}
                  className={`p-1.5 rounded-md transition-all ${mode === id ? 'bg-[#00f3ff]/15 text-[#00f3ff]' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            {/* Image upload */}
            <div>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => imgInputRef.current?.click()}
                disabled={uploadingImg || mode === 'preview'}
                title="Inserir imagem"
                className="p-1.5 rounded-lg text-gray-400 border border-white/10 hover:bg-white/5 hover:text-[#00f3ff] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Pin */}
            {selected && (
              <button onClick={handlePin} title={selected.pinned ? 'Desafixar' : 'Fixar'}
                className={`p-1.5 rounded-lg border transition-all ${
                  selected.pinned
                    ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]'
                    : 'border-white/10 text-gray-500 hover:bg-white/5 hover:text-[#f59e0b]'
                }`}>
                {selected.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Color picker */}
            {selected && (
              <div className="relative">
                <button onClick={() => setColorPickerFor(colorPickerFor ? null : selected.id)}
                  title="Cor da nota"
                  className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:bg-white/5 transition-all">
                  <Palette className="w-3.5 h-3.5" />
                </button>
                {colorPickerFor === selected.id && (
                  <div className="absolute top-full mt-1 right-0 z-30 flex gap-1 p-1.5 rounded-xl border border-white/10 bg-[#0d0d1a] shadow-xl">
                    <button onClick={() => handleColor(selected.id, null)}
                      className="w-5 h-5 rounded-full border border-white/20 bg-white/5 hover:scale-110 transition-transform" title="Sem cor" />
                    {NOTE_COLORS.map(c => (
                      <button key={c.value} onClick={() => handleColor(selected.id, c.value)}
                        className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${selected.color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d0d1a]' : ''}`}
                        style={{ background: c.value }} title={c.label} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save */}
            <button onClick={handleSave} disabled={saving || !isDirty}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isDirty
                  ? 'border-[#00f3ff]/40 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/20'
                  : 'border-white/8 text-gray-600 cursor-default'
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </button>

            {/* Delete */}
            {selected && (
              confirmDel ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleDelete} disabled={deleting}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all">
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                  </button>
                  <button onClick={() => setConfirmDel(false)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-600 hover:border-red-500/30 hover:text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>

          {/* Editor / Preview body */}
          {title === '' && selected === null && !loading ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,243,255,0.06)', border: '1px solid rgba(0,243,255,0.15)' }}>
                <BookOpen className="w-8 h-8 text-[#00f3ff]/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400">Selecione um documento</p>
                <p className="text-xs text-gray-600 mt-1">ou crie um novo com o botão "Nova Nota"</p>
              </div>
              <button onClick={() => newNote()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff]/10 transition-all">
                <Plus className="w-4 h-4" /> Criar novo documento
              </button>
            </div>
          ) : (
            <div className={`flex-1 min-h-0 flex ${mode === 'split' ? 'divide-x divide-white/6' : ''}`}>
              {/* Editor */}
              {(mode === 'edit' || mode === 'split') && (
                <div className={`flex flex-col ${mode === 'split' ? 'w-1/2' : 'flex-1'}`}>
                  <div className="px-2 py-1 bg-white/2 border-b border-white/5">
                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Markdown</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Escreva em Markdown... Suporte a tabelas, listas, código e imagens."
                    className="flex-1 resize-none bg-transparent text-sm text-gray-300 placeholder-gray-700 p-4 focus:outline-none font-mono leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              )}
              {/* Preview */}
              {(mode === 'preview' || mode === 'split') && (
                <div className={`flex flex-col ${mode === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto`}>
                  {mode === 'split' && (
                    <div className="px-2 py-1 bg-white/2 border-b border-white/5">
                      <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Preview</span>
                    </div>
                  )}
                  <div className="p-4 overflow-y-auto">
                    {content.trim() ? (
                      <DocPreview content={content} />
                    ) : (
                      <p className="text-gray-700 text-sm italic">Nenhum conteúdo ainda...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
