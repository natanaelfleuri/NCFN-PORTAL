"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    NotebookPen, Plus, Trash2, Save, Eye, EyeOff,
    Search, X, FileText, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ACCENT = '#10b981';

interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function LinksUteisPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [preview, setPreview] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [confirmDel, setConfirmDel] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isDirty = selected
        ? title !== selected.title || content !== selected.content
        : title.trim() !== '' || content.trim() !== '';

    const showMsg = (type: 'ok' | 'err', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    // ── load notes ──────────────────────────────────────────────────────────
    const loadNotes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/links-uteis');
            if (res.ok) setNotes(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadNotes(); }, [loadNotes]);

    // ── select note ─────────────────────────────────────────────────────────
    const handleSelect = (note: Note) => {
        setSelected(note);
        setTitle(note.title);
        setContent(note.content);
        setPreview(true);
        setConfirmDel(false);
    };

    // ── new note ────────────────────────────────────────────────────────────
    const handleNew = () => {
        setSelected(null);
        setTitle('');
        setContent('');
        setPreview(false);
        setConfirmDel(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    // ── save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!title.trim()) { showMsg('err', 'O título é obrigatório.'); return; }
        setSaving(true);
        try {
            const body = selected
                ? { id: selected.id, title, content }
                : { title, content };
            const res = await fetch('/api/links-uteis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) { showMsg('err', 'Erro ao salvar.'); return; }
            const saved: Note = await res.json();
            setNotes(prev => {
                const idx = prev.findIndex(n => n.id === saved.id);
                if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = saved;
                    return updated;
                }
                return [saved, ...prev];
            });
            if (selected) {
                // updating existing note — keep it selected
                setSelected(saved);
            } else {
                // new note created — reset form so next save creates another new note
                setSelected(null);
                setTitle('');
                setContent('');
                setPreview(false);
                setConfirmDel(false);
            }
            showMsg('ok', 'Nota salva com sucesso.');
        } finally {
            setSaving(false);
        }
    };

    // ── delete ───────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!selected) return;
        if (!confirmDel) { setConfirmDel(true); return; }
        setDeleting(true);
        try {
            const res = await fetch(`/api/links-uteis?id=${selected.id}`, { method: 'DELETE' });
            if (!res.ok) { showMsg('err', 'Erro ao deletar.'); return; }
            setNotes(prev => prev.filter(n => n.id !== selected.id));
            setSelected(null);
            setTitle('');
            setContent('');
            setConfirmDel(false);
            showMsg('ok', 'Nota deletada.');
        } finally {
            setDeleting(false);
        }
    };

    const filtered = notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-[#10b981]/20 bg-black/40 backdrop-blur-xl">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-white/5">

                {/* header */}
                <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <NotebookPen className="w-4 h-4" style={{ color: ACCENT }} />
                        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Links Úteis</span>
                    </div>
                    <button
                        onClick={handleNew}
                        title="Nova nota"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[#10b981]/20 border border-transparent hover:border-[#10b981]/30"
                    >
                        <Plus className="w-4 h-4" style={{ color: ACCENT }} />
                    </button>
                </div>

                {/* search */}
                <div className="px-2 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Pesquisar notas..."
                            className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}>
                                <X className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                            </button>
                        )}
                    </div>
                </div>

                {/* list */}
                <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-4 h-4 border-2 border-[#10b981]/40 border-t-[#10b981] rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-xs text-gray-600 py-8 font-mono">
                            {search ? 'Nenhum resultado' : 'Nenhuma nota ainda'}
                        </p>
                    ) : (
                        filtered.map(note => (
                            <button
                                key={note.id}
                                onClick={() => handleSelect(note)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg mx-1 mb-0.5 transition-colors group ${
                                    selected?.id === note.id
                                        ? 'bg-[#10b981]/15 border border-[#10b981]/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                }`}
                                style={{ width: 'calc(100% - 8px)' }}
                            >
                                <div className="flex items-start gap-2">
                                    <FileText className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${selected?.id === note.id ? 'text-[#10b981]' : 'text-gray-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-semibold truncate ${selected?.id === note.id ? 'text-[#10b981]' : 'text-gray-300'}`}>
                                            {note.title}
                                        </p>
                                        <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                                            <Clock className="w-2.5 h-2.5" />
                                            {fmtDate(note.updatedAt)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* stats */}
                <div className="px-3 py-2 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 font-mono">
                        {notes.length} nota{notes.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </aside>

            {/* ── Editor ──────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* toast */}
                {msg && (
                    <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shadow-lg ${
                        msg.type === 'ok'
                            ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                        {msg.type === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {msg.text}
                    </div>
                )}

                {/* toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0 gap-3">
                    {/* title input */}
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Título da nota..."
                        className="flex-1 bg-transparent text-sm font-semibold text-white placeholder-gray-600 outline-none min-w-0"
                        onKeyDown={e => { if (e.key === 'Enter') textareaRef.current?.focus(); }}
                    />

                    {/* actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* preview toggle */}
                        <button
                            onClick={() => setPreview(p => !p)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                preview
                                    ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                        >
                            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {preview ? 'Editar' : 'Preview'}
                        </button>

                        {/* save */}
                        <button
                            onClick={handleSave}
                            disabled={saving || !isDirty}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: isDirty && !saving ? 'rgba(16,185,129,0.15)' : undefined,
                                borderColor: isDirty && !saving ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
                                color: isDirty && !saving ? ACCENT : '#6b7280',
                            }}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>

                        {/* delete */}
                        {selected && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    confirmDel
                                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30'
                                }`}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {confirmDel ? 'Confirmar?' : 'Deletar'}
                            </button>
                        )}
                    </div>
                </div>

                {/* content area */}
                {preview ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        {title && (
                            <h1 className="text-2xl font-black mb-4 pb-3 border-b border-[#10b981]/20" style={{ color: '#10b981' }}>{title}</h1>
                        )}
                        <div className="prose prose-invert prose-p:text-gray-300 prose-code:text-[#10b981] prose-pre:bg-black/40 prose-a:text-[#10b981] max-w-none">
                            {content
                                ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                    h1: ({ children }) => <h1 style={{ color: '#10b981' }} className="text-2xl font-black mt-6 mb-3 pb-2 border-b border-[#10b981]/20">{children}</h1>,
                                    h2: ({ children }) => <h2 style={{ color: '#00f3ff' }} className="text-xl font-black mt-5 mb-2 pb-1 border-b border-[#00f3ff]/15">{children}</h2>,
                                    h3: ({ children }) => <h3 style={{ color: '#bc13fe' }} className="text-lg font-bold mt-4 mb-2">{children}</h3>,
                                    h4: ({ children }) => <h4 style={{ color: '#f97316' }} className="text-base font-bold mt-3 mb-1">{children}</h4>,
                                    h5: ({ children }) => <h5 style={{ color: '#f59e0b' }} className="text-sm font-bold mt-2 mb-1">{children}</h5>,
                                    h6: ({ children }) => <h6 style={{ color: '#8b5cf6' }} className="text-xs font-bold mt-2 mb-1 uppercase tracking-wider">{children}</h6>,
                                  }}>{content}</ReactMarkdown>
                                : <span className="text-gray-600 italic text-sm">Nenhum conteúdo ainda...</span>
                            }
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden relative">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            spellCheck={false}
                            placeholder={`# Título\n\nEscreva suas notas em Markdown...\n\n- [ ] Tarefa 1\n- [ ] Tarefa 2\n\n[Link útil](https://exemplo.com)`}
                            className="absolute inset-0 w-full h-full bg-transparent text-sm text-gray-200 font-mono p-6 outline-none resize-none leading-relaxed"
                            style={{ tabSize: 4 }}
                            onKeyDown={e => {
                                // Tab → insere 2 espaços
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    const start = e.currentTarget.selectionStart;
                                    const end = e.currentTarget.selectionEnd;
                                    const newVal = content.substring(0, start) + '  ' + content.substring(end);
                                    setContent(newVal);
                                    requestAnimationFrame(() => {
                                        if (textareaRef.current) {
                                            textareaRef.current.selectionStart = start + 2;
                                            textareaRef.current.selectionEnd = start + 2;
                                        }
                                    });
                                }
                                // Ctrl+S → salva
                                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                                    e.preventDefault();
                                    handleSave();
                                }
                            }}
                        />
                    </div>
                )}

                {/* status bar */}
                <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {isDirty && (
                            <span className="text-[10px] font-mono text-yellow-400/60 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 inline-block" />
                                Alterações não salvas
                            </span>
                        )}
                        {!isDirty && selected && (
                            <span className="text-[10px] font-mono text-[#10b981]/50 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]/50 inline-block" />
                                Salvo
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {content && (
                            <span className="text-[10px] text-gray-600 font-mono">
                                {content.split(/\s+/).filter(Boolean).length} palavras · {content.length} chars
                            </span>
                        )}
                        <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Markdown</span>
                    </div>
                </div>
            </div>

            {/* ── Empty state (nenhuma nota selecionada) ───────────────────── */}
            {!selected && title === '' && content === '' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none" style={{ left: 280 }}>
                    <div className="w-16 h-16 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
                        <NotebookPen className="w-8 h-8 text-[#10b981]/50" />
                    </div>
                    <div className="text-center">
                        <p className="text-white/50 font-semibold text-sm">Selecione uma nota ou crie uma nova</p>
                        <p className="text-gray-600 text-xs mt-1">Suporte completo a Markdown · Ctrl+S para salvar</p>
                    </div>
                </div>
            )}
        </div>
    );
}
