"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    NotebookPen, Plus, Trash2, Save,
    Search, X, FileText, AlertTriangle, CheckCircle,
    Columns2, AlignLeft, Eye,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Note {
    id: string; title: string; content: string;
    createdAt: string; updatedAt: string;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ── Obsidian Minimal markdown renderer ────────────────────────────── */
function ObsidianPreview({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // headings
                h1: ({ children }) => (
                    <h1 className="obs-h1">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="obs-h2">{children}</h2>
                ),
                h3: ({ children }) => (
                    <h3 className="obs-h3">{children}</h3>
                ),
                h4: ({ children }) => (
                    <h4 className="obs-h4">{children}</h4>
                ),
                h5: ({ children }) => (
                    <h5 className="obs-h5">{children}</h5>
                ),
                h6: ({ children }) => (
                    <h6 className="obs-h6">{children}</h6>
                ),
                // links — sempre nova aba
                a: ({ href, children }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="obs-link"
                    >
                        {children}
                    </a>
                ),
                // tabelas
                table: ({ children }) => (
                    <div className="obs-table-wrap">
                        <table className="obs-table">{children}</table>
                    </div>
                ),
                thead: ({ children }) => <thead className="obs-thead">{children}</thead>,
                th: ({ children }) => <th className="obs-th">{children}</th>,
                td: ({ children }) => <td className="obs-td">{children}</td>,
                tr: ({ children }) => <tr className="obs-tr">{children}</tr>,
                // code
                code: ({ inline, children }: any) =>
                    inline
                        ? <code className="obs-code-inline">{children}</code>
                        : <code className="obs-code-block">{children}</code>,
                pre: ({ children }) => <pre className="obs-pre">{children}</pre>,
                // blockquote
                blockquote: ({ children }) => (
                    <blockquote className="obs-blockquote">{children}</blockquote>
                ),
                // list
                ul: ({ children }) => <ul className="obs-ul">{children}</ul>,
                ol: ({ children }) => <ol className="obs-ol">{children}</ol>,
                li: ({ children }) => <li className="obs-li">{children}</li>,
                // hr
                hr: () => <hr className="obs-hr" />,
                // paragraph
                p: ({ children }) => <p className="obs-p">{children}</p>,
                // strong / em
                strong: ({ children }) => <strong className="obs-strong">{children}</strong>,
                em: ({ children }) => <em className="obs-em">{children}</em>,
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function LinksUteisPage() {
    const [notes, setNotes]       = useState<Note[]>([]);
    const [loading, setLoading]   = useState(true);
    const [selected, setSelected] = useState<Note | null>(null);
    const [title, setTitle]       = useState('');
    const [content, setContent]   = useState('');
    const [mode, setMode]         = useState<'preview' | 'edit' | 'split'>('preview');
    const [search, setSearch]     = useState('');
    const [saving, setSaving]     = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [confirmDel, setConfirmDel] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isDirty = selected
        ? title !== selected.title || content !== selected.content
        : title.trim() !== '' || content.trim() !== '';

    const showMsg = (type: 'ok' | 'err', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    const loadNotes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/links-uteis');
            if (res.ok) setNotes(await res.json());
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadNotes(); }, [loadNotes]);

    const handleSelect = (note: Note) => {
        setSelected(note); setTitle(note.title); setContent(note.content);
        setConfirmDel(false);
        setMode('preview');  // abre sempre em visualização full-screen
    };

    const handleNew = () => {
        setSelected(null); setTitle(''); setContent('');
        setConfirmDel(false);
        setMode('edit');     // nova nota abre no editor
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const handleSave = async () => {
        if (!title.trim()) { showMsg('err', 'O título é obrigatório.'); return; }
        setSaving(true);
        try {
            const body = selected ? { id: selected.id, title, content } : { title, content };
            const res = await fetch('/api/links-uteis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) { showMsg('err', 'Erro ao salvar.'); return; }
            const saved: Note = await res.json();
            setNotes(prev => {
                const idx = prev.findIndex(n => n.id === saved.id);
                if (idx !== -1) { const u = [...prev]; u[idx] = saved; return u; }
                return [saved, ...prev];
            });
            if (selected) { setSelected(saved); } else {
                setSelected(null); setTitle(''); setContent('');
            }
            showMsg('ok', 'Salvo.');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!selected) return;
        if (!confirmDel) { setConfirmDel(true); return; }
        setDeleting(true);
        try {
            const res = await fetch(`/api/links-uteis?id=${selected.id}`, { method: 'DELETE' });
            if (!res.ok) { showMsg('err', 'Erro ao deletar.'); return; }
            setNotes(prev => prev.filter(n => n.id !== selected.id));
            setSelected(null); setTitle(''); setContent(''); setConfirmDel(false);
            showMsg('ok', 'Nota deletada.');
        } finally { setDeleting(false); }
    };

    const filtered = notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            {/* ── Obsidian Minimal styles ──────────────────────────────── */}
            <style>{`
                /* Layout */
                .obs-root { display:flex; height:calc(100vh - 80px); overflow:hidden; background:#0d0d0d; border-radius:12px; border:1px solid rgba(255,255,255,0.06); font-family:'Inter',system-ui,sans-serif; }

                /* Sidebar */
                .obs-sidebar { width:240px; flex-shrink:0; display:flex; flex-direction:column; border-right:1px solid rgba(255,255,255,0.06); background:#111; }
                .obs-sidebar-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); }
                .obs-sidebar-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,0.5); }
                .obs-new-btn { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.4); cursor:pointer; border:none; background:transparent; transition:background .15s,color .15s; }
                .obs-new-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.9); }
                .obs-search { margin:8px; }
                .obs-search-inner { display:flex; align-items:center; gap:6px; padding:5px 8px; background:rgba(255,255,255,0.05); border-radius:6px; border:1px solid rgba(255,255,255,0.08); }
                .obs-search-input { background:transparent; border:none; outline:none; font-size:12px; color:rgba(255,255,255,0.7); width:100%; }
                .obs-search-input::placeholder { color:rgba(255,255,255,0.2); }
                .obs-note-list { flex:1; overflow-y:auto; padding:4px; }
                .obs-note-item { width:100%; text-align:left; padding:7px 10px; border-radius:6px; cursor:pointer; border:1px solid transparent; background:transparent; transition:background .12s; margin-bottom:2px; display:block; }
                .obs-note-item:hover { background:rgba(255,255,255,0.05); }
                .obs-note-item.active { background:rgba(124,58,237,0.15); border-color:rgba(124,58,237,0.3); }
                .obs-note-name { font-size:12px; font-weight:500; color:rgba(255,255,255,0.75); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
                .obs-note-item.active .obs-note-name { color:#a78bfa; }
                .obs-note-date { font-size:10px; color:rgba(255,255,255,0.25); margin-top:2px; display:block; }
                .obs-sidebar-footer { padding:8px 12px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:rgba(255,255,255,0.2); font-variant-numeric:tabular-nums; }

                /* Editor pane */
                .obs-editor-pane { flex:1; display:flex; flex-direction:column; min-width:0; background:#0d0d0d; }
                .obs-toolbar { display:flex; align-items:center; gap:8px; padding:8px 14px; border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
                .obs-title-input { flex:1; background:transparent; border:none; outline:none; font-size:14px; font-weight:600; color:rgba(255,255,255,0.9); min-width:0; }
                .obs-title-input::placeholder { color:rgba(255,255,255,0.2); }
                .obs-btn { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.45); transition:all .15s; white-space:nowrap; }
                .obs-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); }
                .obs-btn.active { background:rgba(124,58,237,0.15); border-color:rgba(124,58,237,0.4); color:#a78bfa; }
                .obs-btn.save-active { background:rgba(16,185,129,0.12); border-color:rgba(16,185,129,0.35); color:#10b981; }
                .obs-btn.danger { color:rgba(239,68,68,0.6); }
                .obs-btn.danger:hover { background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.35); color:#f87171; }
                .obs-btn.danger-confirm { background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.4); color:#f87171; }
                .obs-btn:disabled { opacity:0.35; cursor:not-allowed; }

                /* Split content */
                .obs-content { flex:1; display:flex; overflow:hidden; }
                .obs-textarea-wrap { flex:1; min-width:0; position:relative; border-right:1px solid rgba(255,255,255,0.06); }
                .obs-textarea { position:absolute; inset:0; width:100%; height:100%; background:transparent; border:none; outline:none; resize:none; font-family:'JetBrains Mono','Fira Code','Cascadia Code',monospace; font-size:13px; line-height:1.7; color:rgba(255,255,255,0.82); padding:20px 24px; tab-size:4; }
                .obs-preview-wrap { flex:1; min-width:0; overflow-y:auto; padding:20px 28px; }
                .obs-preview-wrap.full { flex:1; }

                /* Status bar */
                .obs-statusbar { display:flex; align-items:center; justify-content:space-between; padding:4px 14px; border-top:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
                .obs-status-left, .obs-status-right { display:flex; align-items:center; gap:10px; font-size:10px; font-family:monospace; color:rgba(255,255,255,0.2); }
                .obs-dot { width:6px; height:6px; border-radius:50%; display:inline-block; margin-right:4px; }

                /* Toast */
                .obs-toast { position:fixed; top:20px; right:20px; z-index:9999; display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; font-size:12px; font-weight:600; box-shadow:0 4px 24px rgba(0,0,0,0.5); }
                .obs-toast.ok { background:#0d1f1a; border:1px solid rgba(16,185,129,0.4); color:#10b981; }
                .obs-toast.err { background:#1f0d0d; border:1px solid rgba(239,68,68,0.4); color:#f87171; }

                /* Obsidian Minimal typography */
                .obs-p { font-size:14px; line-height:1.75; color:rgba(255,255,255,0.78); margin:0 0 12px; }
                .obs-h1 { font-size:22px; font-weight:700; color:rgba(255,255,255,0.95); margin:24px 0 10px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); }
                .obs-h2 { font-size:18px; font-weight:700; color:rgba(255,255,255,0.9); margin:20px 0 8px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06); }
                .obs-h3 { font-size:15px; font-weight:600; color:rgba(255,255,255,0.85); margin:16px 0 6px; }
                .obs-h4 { font-size:13px; font-weight:600; color:#a78bfa; margin:12px 0 4px; text-transform:uppercase; letter-spacing:.06em; }
                .obs-h5 { font-size:12px; font-weight:600; color:rgba(255,255,255,0.5); margin:10px 0 4px; }
                .obs-h6 { font-size:11px; font-weight:600; color:rgba(255,255,255,0.35); margin:8px 0 4px; text-transform:uppercase; letter-spacing:.1em; }
                .obs-link { color:#7c9ef8; text-decoration:none; border-bottom:1px solid rgba(124,158,248,0.3); transition:border-color .15s; }
                .obs-link:hover { border-bottom-color:#7c9ef8; }
                .obs-strong { color:rgba(255,255,255,0.95); font-weight:700; }
                .obs-em { color:rgba(255,255,255,0.7); font-style:italic; }
                .obs-code-inline { font-family:monospace; font-size:12px; background:rgba(255,255,255,0.08); color:#e2c08d; padding:1px 5px; border-radius:4px; }
                .obs-pre { background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 16px; margin:12px 0; overflow-x:auto; }
                .obs-code-block { font-family:monospace; font-size:12px; color:#a8d0a8; white-space:pre; display:block; }
                .obs-blockquote { border-left:3px solid #7c3aed; padding:4px 14px; margin:12px 0; background:rgba(124,58,237,0.06); border-radius:0 6px 6px 0; }
                .obs-blockquote .obs-p { color:rgba(255,255,255,0.55); font-style:italic; margin:0; }
                .obs-ul { list-style:disc; padding-left:22px; margin:8px 0 12px; }
                .obs-ol { list-style:decimal; padding-left:22px; margin:8px 0 12px; }
                .obs-li { font-size:14px; line-height:1.7; color:rgba(255,255,255,0.75); margin-bottom:3px; }
                .obs-hr { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:20px 0; }

                /* Tables */
                .obs-table-wrap { overflow-x:auto; margin:14px 0; border-radius:8px; border:1px solid rgba(255,255,255,0.08); }
                .obs-table { width:100%; border-collapse:collapse; font-size:13px; }
                .obs-thead { background:rgba(255,255,255,0.04); }
                .obs-th { padding:8px 14px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:rgba(255,255,255,0.5); border-bottom:1px solid rgba(255,255,255,0.08); white-space:nowrap; }
                .obs-td { padding:8px 14px; color:rgba(255,255,255,0.72); border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
                .obs-tr:last-child .obs-td { border-bottom:none; }
                .obs-tr:hover .obs-td { background:rgba(255,255,255,0.02); }

                /* Scrollbars */
                .obs-note-list::-webkit-scrollbar, .obs-preview-wrap::-webkit-scrollbar { width:4px; }
                .obs-note-list::-webkit-scrollbar-thumb, .obs-preview-wrap::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }

                /* Empty state */
                .obs-empty { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; pointer-events:none; }
                .obs-empty-icon { width:56px; height:56px; border-radius:16px; background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.15); display:flex; align-items:center; justify-content:center; }
                .obs-empty-title { font-size:13px; font-weight:600; color:rgba(255,255,255,0.35); }
                .obs-empty-sub { font-size:11px; color:rgba(255,255,255,0.18); margin-top:2px; }
            `}</style>

            <div className="obs-root">

                {/* ── Sidebar ─────────────────────────────────────────── */}
                <aside className="obs-sidebar">
                    <div className="obs-sidebar-header">
                        <span className="obs-sidebar-title">Links Úteis</span>
                        <button className="obs-new-btn" onClick={handleNew} title="Nova nota">
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="obs-search">
                        <div className="obs-search-inner">
                            <Search size={11} color="rgba(255,255,255,0.25)" />
                            <input
                                className="obs-search-input"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Pesquisar..."
                            />
                            {search && (
                                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                    <X size={11} color="rgba(255,255,255,0.3)" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="obs-note-list">
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                                <div style={{ width: 16, height: 16, border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : filtered.length === 0 ? (
                            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '24px 0', fontFamily: 'monospace' }}>
                                {search ? 'Nenhum resultado' : 'Nenhuma nota'}
                            </p>
                        ) : (
                            filtered.map(note => (
                                <button
                                    key={note.id}
                                    className={`obs-note-item ${selected?.id === note.id ? 'active' : ''}`}
                                    onClick={() => handleSelect(note)}
                                >
                                    <span className="obs-note-name">{note.title}</span>
                                    <span className="obs-note-date">{fmtDate(note.updatedAt)}</span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="obs-sidebar-footer">{notes.length} nota{notes.length !== 1 ? 's' : ''}</div>
                </aside>

                {/* ── Editor pane ──────────────────────────────────────── */}
                <div className="obs-editor-pane">

                    {/* toast */}
                    {msg && (
                        <div className={`obs-toast ${msg.type}`}>
                            {msg.type === 'ok' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                            {msg.text}
                        </div>
                    )}

                    {/* toolbar */}
                    <div className="obs-toolbar">
                        <input
                            className="obs-title-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Título..."
                            onKeyDown={e => e.key === 'Enter' && textareaRef.current?.focus()}
                        />

                        {/* mode toggles */}
                        <button
                            className={`obs-btn ${mode === 'preview' ? 'active' : ''}`}
                            onClick={() => setMode('preview')}
                            title="Visualização"
                        >
                            <Eye size={12} /> Ver
                        </button>
                        <button
                            className={`obs-btn ${mode === 'edit' ? 'active' : ''}`}
                            onClick={() => { setMode('edit'); setTimeout(() => textareaRef.current?.focus(), 50); }}
                            title="Editar"
                        >
                            <AlignLeft size={12} /> Editar
                        </button>
                        <button
                            className={`obs-btn ${mode === 'split' ? 'active' : ''}`}
                            onClick={() => setMode('split')}
                            title="Split"
                        >
                            <Columns2 size={12} /> Split
                        </button>

                        {/* save */}
                        <button
                            className={`obs-btn ${isDirty && !saving ? 'save-active' : ''}`}
                            onClick={handleSave}
                            disabled={saving || !isDirty}
                        >
                            <Save size={12} />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>

                        {/* delete */}
                        {selected && (
                            <button
                                className={`obs-btn ${confirmDel ? 'danger-confirm' : 'danger'}`}
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                <Trash2 size={12} />
                                {confirmDel ? 'Confirmar?' : 'Deletar'}
                            </button>
                        )}
                    </div>

                    {/* content */}
                    <div className="obs-content">
                        {/* textarea — visível em edit e split */}
                        {(mode === 'edit' || mode === 'split') && (
                            <div className="obs-textarea-wrap" style={{ flex: 1, borderRight: mode === 'split' ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                                <textarea
                                    ref={textareaRef}
                                    className="obs-textarea"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    spellCheck={false}
                                    placeholder={`# Título\n\nEscreva em Markdown...\n\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| valor | valor |\n\n[Link](https://exemplo.com)`}
                                    onKeyDown={e => {
                                        if (e.key === 'Tab') {
                                            e.preventDefault();
                                            const s = e.currentTarget.selectionStart;
                                            const end = e.currentTarget.selectionEnd;
                                            const v = content.substring(0, s) + '  ' + content.substring(end);
                                            setContent(v);
                                            requestAnimationFrame(() => {
                                                if (textareaRef.current) {
                                                    textareaRef.current.selectionStart = s + 2;
                                                    textareaRef.current.selectionEnd = s + 2;
                                                }
                                            });
                                        }
                                        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                                            e.preventDefault();
                                            handleSave();
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* preview — visível em preview e split */}
                        {(mode === 'preview' || mode === 'split') && (
                            <div className="obs-preview-wrap" style={{ flex: 1 }}>
                                {content || title ? (
                                    <>
                                        {title && <h1 className="obs-h1" style={{ marginTop: 0 }}>{title}</h1>}
                                        <ObsidianPreview content={content} />
                                    </>
                                ) : (
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', textAlign: 'center', marginTop: 60 }}>
                                        Preview aparece aqui...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* status bar */}
                    <div className="obs-statusbar">
                        <div className="obs-status-left">
                            {isDirty
                                ? <><span className="obs-dot" style={{ background: '#f59e0b' }} />Não salvo</>
                                : selected
                                ? <><span className="obs-dot" style={{ background: '#10b981' }} />Salvo</>
                                : null
                            }
                        </div>
                        <div className="obs-status-right">
                            {content && <span>{content.split(/\s+/).filter(Boolean).length} palavras</span>}
                            <span>Markdown · Ctrl+S</span>
                        </div>
                    </div>
                </div>

                {/* empty state */}
                {!selected && !title && !content && (
                    <div className="obs-empty" style={{ left: 240 }}>
                        <div className="obs-empty-icon">
                            <NotebookPen size={24} color="rgba(124,58,237,0.5)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p className="obs-empty-title">Selecione uma nota ou crie uma nova</p>
                            <p className="obs-empty-sub">Markdown · Tabelas · Links nova aba · Ctrl+S</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
