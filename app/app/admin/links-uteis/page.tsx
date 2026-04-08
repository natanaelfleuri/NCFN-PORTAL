"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    NotebookPen, Plus, Trash2, Save,
    Search, X, AlertTriangle, CheckCircle,
    Columns2, AlignLeft, Eye, ChevronRight, ChevronDown,
    FolderOpen, Folder as FolderIcon, FolderPlus,
    Pin, PinOff, Copy, Download, ChevronUp, ArrowRight,
    Highlighter, Sparkles, Palette, MoveRight, Pencil,
    Maximize2, ExternalLink, Archive, BarChart2, FolderTree,
    BookOpen, TrendingUp, Hash, Clock, Cloud, Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FolderItem {
    id: string;
    name: string;
    createdAt: string;
}

interface Note {
    id: string; title: string; content: string;
    folderId?: string | null;
    createdAt: string; updatedAt: string;
    highlights?: string[];
    pinned?: boolean;
    color?: string | null;
}

const NOTE_COLORS: { value: string; label: string; bg: string; border: string; text: string }[] = [
    { value: '#f59e0b', label: 'Âmbar',   bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  text: '#f59e0b' },
    { value: '#ef4444', label: 'Vermelho', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   text: '#ef4444' },
    { value: '#3b82f6', label: 'Azul',     bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  text: '#3b82f6' },
    { value: '#4ade80', label: 'Verde',    bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)',  text: '#4ade80' },
    { value: '#a78bfa', label: 'Roxo',     bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', text: '#a78bfa' },
];

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ── Obsidian Minimal markdown renderer ────────────────────────────── */
function ObsidianPreview({
    content,
    highlights = [],
    onRowClick,
}: {
    content: string;
    highlights?: string[];
    onRowClick?: (cells: string[], fingerprint: string, rect: DOMRect) => void;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const highlightSet = useMemo(() => new Set(highlights), [highlights]);
    const onRowClickRef = useRef(onRowClick);
    onRowClickRef.current = onRowClick;

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const cleanups: (() => void)[] = [];

        const tables = el.querySelectorAll('table');
        tables.forEach((table) => {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row) => {
                const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
                const fingerprint = cells.join('||').slice(0, 120);
                (row as HTMLElement).style.cursor = 'pointer';
                (row as HTMLElement).title = 'Clique para selecionar esta linha';
                if (highlightSet.has(fingerprint)) {
                    row.setAttribute('data-hl', 'true');
                } else {
                    row.removeAttribute('data-hl');
                }
                const handler = (e: Event) => {
                    e.stopPropagation();
                    onRowClickRef.current?.(cells, fingerprint, (row as HTMLElement).getBoundingClientRect());
                };
                row.addEventListener('click', handler as EventListener);
                cleanups.push(() => row.removeEventListener('click', handler as EventListener));
            });
        });

        return () => cleanups.forEach(c => c());
    }, [content, highlightSet]);

    return (
        <div ref={wrapRef}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <h1 className="obs-h1">{children}</h1>,
                    h2: ({ children }) => <h2 className="obs-h2">{children}</h2>,
                    h3: ({ children }) => <h3 className="obs-h3">{children}</h3>,
                    h4: ({ children }) => <h4 className="obs-h4">{children}</h4>,
                    h5: ({ children }) => <h5 className="obs-h5">{children}</h5>,
                    h6: ({ children }) => <h6 className="obs-h6">{children}</h6>,
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="obs-link">{children}</a>
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

/* ── Main page ─────────────────────────────────────────────────────── */
export default function LinksUteisPage() {
    const [notes, setNotes]           = useState<Note[]>([]);
    const [folders, setFolders]       = useState<FolderItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [selected, setSelected]     = useState<Note | null>(null);
    const [title, setTitle]           = useState('');
    const [content, setContent]       = useState('');
    const [folderId, setFolderId]     = useState<string | null>(null);
    const [mode, setMode]             = useState<'preview' | 'edit' | 'split'>('preview');
    const [search, setSearch]         = useState('');
    const [saving, setSaving]         = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [msg, setMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [confirmDel, setConfirmDel] = useState(false);

    // folders UI
    const [openFolders, setOpenFolders]       = useState<Set<string>>(new Set());
    const [addingFolder, setAddingFolder]     = useState(false);
    const [newFolderName, setNewFolderName]   = useState('');
    const [folderDropdown, setFolderDropdown] = useState(false);
    const [confirmDelFld, setConfirmDelFld]   = useState<string | null>(null);
    const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
    const [renameFolderVal, setRenameFolderVal] = useState('');

    // row highlight toolbar
    const [rowToolbar, setRowToolbar] = useState<{
        cells: string[]; fingerprint: string; rect: DOMRect;
    } | null>(null);

    // move note modal
    const [moveModal, setMoveModal] = useState<{ noteId: string; currentFolderId: string | null } | null>(null);

    // color picker
    const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

    // full-screen preview
    const [fullScreen, setFullScreen] = useState(false);

    // drag & drop
    const [dragNoteId, setDragNoteId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    // notebook-level actions
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);

    // master directories (localStorage-backed)
    const [masterDirs, setMasterDirs] = useState<Array<{ id: string; name: string; folderIds: string[] }>>([]);
    const [showMasterDirModal, setShowMasterDirModal] = useState(false);
    const [editingMasterDirId, setEditingMasterDirId] = useState<string | null>(null);
    const [newMasterDirName, setNewMasterDirName] = useState('');
    const [masterDirFolderSel, setMasterDirFolderSel] = useState<string[]>([]);

    // analytics
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    const textareaRef   = useRef<HTMLTextAreaElement>(null);
    const folderDropRef = useRef<HTMLDivElement>(null);
    const newFolderRef  = useRef<HTMLInputElement>(null);
    const importRef     = useRef<HTMLInputElement>(null);
    const autoSaveRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saved'>('idle');
    const [templatesOpen, setTemplatesOpen]   = useState(false);
    const [syncing, setSyncing]               = useState<'push' | 'pull' | null>(null);

    const isDirty = selected
        ? title !== selected.title || content !== selected.content || folderId !== (selected.folderId ?? null)
        : title.trim() !== '' || content.trim() !== '';

    const showMsg = (type: 'ok' | 'err', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    /* ── Auto-save (debounced 2s) ── */
    useEffect(() => {
        if (!isDirty || !title.trim()) { setAutoSaveStatus('idle'); return; }
        setAutoSaveStatus('pending');
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(async () => {
            if (!title.trim()) return;
            try {
                const body = selected
                    ? { id: selected.id, title, content, folderId }
                    : { title, content, folderId };
                const res = await fetch('/api/links-uteis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (res.ok) {
                    const saved: Note = await res.json();
                    setNotes(prev => {
                        const idx = prev.findIndex(n => n.id === saved.id);
                        if (idx !== -1) { const u = [...prev]; u[idx] = saved; return u; }
                        return [saved, ...prev];
                    });
                    setSelected(saved);
                    setTitle(saved.title);
                    setContent(saved.content);
                    setFolderId(saved.folderId ?? null);
                    setAutoSaveStatus('saved');
                    setTimeout(() => setAutoSaveStatus('idle'), 2000);
                }
            } catch {}
        }, 2000);
        return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, content, folderId]);

    /* ── Markdown formatting helper ── */
    const wrapText = useCallback((before: string, after: string = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const sel = content.substring(start, end);
        const replacement = before + (sel || (after ? 'texto' : '')) + after;
        const newContent = content.substring(0, start) + replacement + content.substring(end);
        setContent(newContent);
        requestAnimationFrame(() => {
            ta.focus();
            const newCursor = sel ? start + replacement.length : start + before.length;
            ta.selectionStart = newCursor;
            ta.selectionEnd   = sel ? newCursor : start + before.length + (after ? 5 : 0);
        });
    }, [content]);

    const insertLine = useCallback((prefix: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = content.indexOf('\n', start);
        const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
        const hasPrefix = line.startsWith(prefix);
        const newLine = hasPrefix ? line.slice(prefix.length) : prefix + line;
        const newContent = content.substring(0, lineStart) + newLine + (lineEnd === -1 ? '' : content.substring(lineEnd));
        setContent(newContent);
        requestAnimationFrame(() => { ta.focus(); });
    }, [content]);

    const insertSnippet = useCallback((snippet: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const newContent = content.substring(0, start) + snippet + content.substring(start);
        setContent(newContent);
        requestAnimationFrame(() => {
            ta.focus();
            ta.selectionStart = start + snippet.length;
            ta.selectionEnd   = start + snippet.length;
        });
    }, [content]);

    /* ── Sync com Nextcloud ── */
    const handleSyncPush = async () => {
        setSyncing('push');
        try {
            const res = await fetch('/api/nextcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync-notes-push' }),
            });
            const d = await res.json();
            showMsg(d.ok ? 'ok' : 'err', d.ok ? `${d.pushed}/${d.total} notas enviadas ao Nextcloud` : `Erro: ${d.error ?? 'falha'}`);
        } catch { showMsg('err', 'Erro de rede ao sincronizar'); }
        setSyncing(null);
    };

    const handleSyncPull = async () => {
        setSyncing('pull');
        try {
            const res = await fetch('/api/nextcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync-notes-pull' }),
            });
            const d = await res.json();
            if (d.ok) { await loadData(); showMsg('ok', `${d.pulled}/${d.total} notas recebidas do Nextcloud`); }
            else showMsg('err', `Erro: ${d.error ?? 'falha'}`);
        } catch { showMsg('err', 'Erro de rede ao sincronizar'); }
        setSyncing(null);
    };

    /* ── Import .md file ── */
    const handleImportMd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const text = ev.target?.result as string;
            const titleLine = text.split('\n')[0].replace(/^#+\s*/, '').trim();
            const body = text.split('\n').slice(1).join('\n').trim();
            setSelected(null);
            setTitle(titleLine || file.name.replace('.md', ''));
            setContent(body);
            setFolderId(folderId);
            setMode('edit');
            showMsg('ok', `Importado: ${file.name}`);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    /* ── Templates ── */
    const TEMPLATES = [
        { label: 'Nota em branco', icon: '📄', title: '', content: '' },
        { label: 'Ata de Reunião', icon: '📋', title: 'Ata — ', content: `## Participantes\n\n- \n\n## Pauta\n\n1. \n\n## Decisões\n\n- \n\n## Ações\n\n| Ação | Responsável | Prazo |\n| --- | --- | --- |\n| | | |\n\n## Observações\n\n` },
        { label: 'Investigação', icon: '🔍', title: 'INV — ', content: `## Objetivo\n\n\n\n## Escopo\n\n\n\n## Evidências\n\n| # | Evidência | Fonte | Hash |\n| --- | --- | --- | --- |\n| 1 | | | |\n\n## Linha do Tempo\n\n| Data | Evento |\n| --- | --- |\n| | |\n\n## Conclusões\n\n\n\n## Referências\n\n- ` },
        { label: 'Perfil de Suspeito', icon: '🎯', title: 'SUSPEITO — ', content: `## Identificação\n\n| Campo | Valor |\n| --- | --- |\n| Nome | |\n| Codinome | |\n| CPF/Doc | |\n| Localização | |\n\n## Vínculos\n\n- \n\n## Atividade\n\n\n\n## Risco\n\n> **Nível:** BAIXO / MÉDIO / ALTO / CRÍTICO\n\n## Notas\n\n` },
        { label: 'Relatório Técnico', icon: '📊', title: 'REL — ', content: `## Sumário Executivo\n\n\n\n## Metodologia\n\n\n\n## Resultados\n\n### Achado 1\n\n\n\n## Vulnerabilidades\n\n| CVE | Severidade | Descrição | Status |\n| --- | --- | --- | --- |\n| | | | |\n\n## Recomendações\n\n1. \n\n## Conclusão\n\n` },
        { label: 'Checklist', icon: '✅', title: 'Checklist — ', content: `## Itens\n\n- [ ] \n- [ ] \n- [ ] \n- [ ] \n- [ ] \n\n## Notas\n\n` },
    ];

    /* ── Load ── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/links-uteis');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setNotes(data); setFolders([]);
                } else {
                    setNotes(data.notes ?? []);
                    setFolders(data.folders ?? []);
                }
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Master dirs (localStorage) ── */
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ncfn-master-dirs');
            if (saved) setMasterDirs(JSON.parse(saved));
        } catch {}
    }, []);

    const saveMasterDirs = (dirs: typeof masterDirs) => {
        setMasterDirs(dirs);
        localStorage.setItem('ncfn-master-dirs', JSON.stringify(dirs));
    };

    const handleAddMasterDir = () => {
        if (!newMasterDirName.trim()) return;
        if (editingMasterDirId) {
            saveMasterDirs(masterDirs.map(d => d.id === editingMasterDirId
                ? { ...d, name: newMasterDirName.trim(), folderIds: masterDirFolderSel }
                : d));
            showMsg('ok', 'Diretório atualizado.');
        } else {
            const nd = { id: Date.now().toString(), name: newMasterDirName.trim(), folderIds: masterDirFolderSel };
            saveMasterDirs([...masterDirs, nd]);
            showMsg('ok', `Diretório "${nd.name}" criado.`);
        }
        setNewMasterDirName(''); setMasterDirFolderSel([]); setEditingMasterDirId(null); setShowMasterDirModal(false);
    };

    const handleDeleteMasterDir = (id: string) => {
        saveMasterDirs(masterDirs.filter(d => d.id !== id));
        showMsg('ok', 'Diretório mestre removido.');
    };

    /* ── Full-screen / New-window ── */
    const handleOpenWindow = () => {
        if (!title && !content) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title || 'Nota'}</title>
<style>body{background:#0d0d0d;color:rgba(255,255,255,0.82);font-family:Inter,system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;line-height:1.7}
h1{font-size:22px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;margin-bottom:16px}
pre{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;overflow-x:auto}
code{background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#e2c08d;font-family:monospace}
a{color:#7c9ef8}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{padding:8px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.08)}
blockquote{border-left:3px solid #7c3aed;margin:12px 0;padding:4px 14px;background:rgba(124,58,237,0.06);border-radius:0 6px 6px 0}
p{margin:0 0 12px}strong{color:#4ade80}em{color:#c084fc;font-style:italic}
.content{white-space:pre-wrap;font-family:Inter,sans-serif;font-size:14px}</style>
</head><body><h1>${title.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h1>
<div class="content">${content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></body></html>`);
        win.document.close();
    };

    /* ── Save all notebook ── */
    const handleSaveAllNotebook = () => {
        const parts: string[] = [`# CADERNO NCFN — ${new Date().toLocaleDateString('pt-BR')}\n\n---\n\n`];
        const foldersWithNone = [...folders.map(f => ({ id: f.id as string | null, name: f.name })), { id: null, name: 'Sem pasta' }];
        foldersWithNone.forEach(folder => {
            const fNotes = folder.id === null ? notes.filter(n => !n.folderId) : notes.filter(n => n.folderId === folder.id);
            if (!fNotes.length) return;
            parts.push(`## 📁 ${folder.name}\n\n`);
            fNotes.forEach(note => { parts.push(`### ${note.title}\n\n${note.content}\n\n---\n\n`); });
        });
        const blob = new Blob([parts.join('')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `caderno-ncfn-${new Date().toISOString().slice(0,10)}.md`; a.click();
        URL.revokeObjectURL(url);
        showMsg('ok', `Caderno exportado — ${notes.length} notas.`);
    };

    /* ── Delete all notebook ── */
    const handleDeleteAllNotebook = async () => {
        if (!confirmDeleteAll) {
            setConfirmDeleteAll(true);
            setTimeout(() => setConfirmDeleteAll(false), 5000);
            return;
        }
        setDeletingAll(true);
        try {
            for (const note of notes) { await fetch(`/api/links-uteis?id=${note.id}`, { method: 'DELETE' }); }
            for (const folder of folders) { await fetch(`/api/links-uteis?id=${folder.id}&type=folder`, { method: 'DELETE' }); }
            setNotes([]); setFolders([]); setSelected(null); setTitle(''); setContent(''); setFolderId(null);
            setConfirmDeleteAll(false);
            showMsg('ok', 'Caderno apagado.');
        } catch { showMsg('err', 'Erro ao apagar caderno.'); }
        setDeletingAll(false);
    };

    /* ── Drag & drop ── */
    const handleDragStart = (noteId: string) => setDragNoteId(noteId);
    const handleDragEnd = () => { setDragNoteId(null); setDragOverFolderId(null); };
    const handleDragOverFolder = (e: React.DragEvent, fid: string | null) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        setDragOverFolderId(fid === null ? '__none__' : fid);
    };
    const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        if (!dragNoteId) return;
        const note = notes.find(n => n.id === dragNoteId);
        if (!note) return;
        const currentFid = note.folderId ?? null;
        if (currentFid === targetFolderId) { setDragNoteId(null); setDragOverFolderId(null); return; }
        await handleMoveNote(dragNoteId, targetFolderId);
        setDragNoteId(null); setDragOverFolderId(null);
    };

    /* ── Close dropdowns on outside click ── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (folderDropRef.current && !folderDropRef.current.contains(e.target as Node)) {
                setFolderDropdown(false);
            }
            // close row toolbar on click outside
            const target = e.target as HTMLElement;
            if (!target.closest('[data-row-toolbar]') && !target.closest('table')) {
                setRowToolbar(null);
            }
            // close color picker
            if (!target.closest('[data-color-picker]')) {
                setColorPickerFor(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── Note actions ── */
    const handleSelect = (note: Note) => {
        setSelected(note);
        setTitle(note.title);
        setContent(note.content);
        setFolderId(note.folderId ?? null);
        setConfirmDel(false);
        setMode('preview');
        setRowToolbar(null);
    };

    const handleNew = (presetFolderId?: string | null, presetTitle?: string, presetContent?: string) => {
        setSelected(null);
        setTitle(presetTitle ?? '');
        setContent(presetContent ?? '');
        setFolderId(presetFolderId ?? null);
        setConfirmDel(false);
        setMode('edit');
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const handleSave = async () => {
        if (!title.trim()) { showMsg('err', 'O título é obrigatório.'); return; }
        setSaving(true);
        try {
            const body = selected
                ? { id: selected.id, title, content, folderId }
                : { title, content, folderId };
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
            setSelected(saved);
            setTitle(saved.title);
            setContent(saved.content);
            setFolderId(saved.folderId ?? null);
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
            setSelected(null); setTitle(''); setContent(''); setFolderId(null); setConfirmDel(false);
            showMsg('ok', 'Nota deletada.');
        } finally { setDeleting(false); }
    };

    const handleDuplicate = async () => {
        if (!selected) return;
        const body = {
            title: `${selected.title} (cópia)`,
            content: selected.content,
            folderId: selected.folderId ?? null,
        };
        const res = await fetch('/api/links-uteis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) { showMsg('err', 'Erro ao duplicar.'); return; }
        const saved: Note = await res.json();
        setNotes(prev => [saved, ...prev]);
        showMsg('ok', 'Nota duplicada.');
    };

    const handleExport = () => {
        if (!selected) return;
        const md = `# ${selected.title}\n\n${selected.content}`;
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selected.title.replace(/[^a-z0-9]/gi, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('ok', 'Exportado como .md');
    };

    /* ── Folder actions ── */
    const handleAddFolder = async () => {
        if (!newFolderName.trim()) { newFolderRef.current?.focus(); return; }
        try {
            const res = await fetch('/api/links-uteis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'folder', name: newFolderName.trim() }),
            });
            if (!res.ok) { showMsg('err', 'Erro ao criar pasta.'); return; }
            const folder: FolderItem = await res.json();
            setFolders(prev => [...prev, folder]);
            setOpenFolders(prev => new Set([...prev, folder.id]));
            setNewFolderName('');
            setAddingFolder(false);
            showMsg('ok', `Pasta "${folder.name}" criada.`);
        } catch { showMsg('err', 'Erro ao criar pasta.'); }
    };

    const handleDeleteFolder = async (id: string) => {
        if (confirmDelFld !== id) { setConfirmDelFld(id); return; }
        try {
            const res = await fetch(`/api/links-uteis?id=${id}&type=folder`, { method: 'DELETE' });
            if (!res.ok) { showMsg('err', 'Erro ao remover pasta.'); return; }
            setFolders(prev => prev.filter(f => f.id !== id));
            setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: null } : n));
            if (folderId === id) setFolderId(null);
            setConfirmDelFld(null);
            showMsg('ok', 'Pasta removida.');
        } catch { showMsg('err', 'Erro ao remover pasta.'); }
    };

    const handleRenameFolder = async (id: string) => {
        if (!renameFolderVal.trim()) return;
        try {
            const res = await fetch('/api/links-uteis', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'rename-folder', id, name: renameFolderVal.trim() }),
            });
            if (!res.ok) { showMsg('err', 'Erro ao renomear pasta.'); return; }
            const updated: FolderItem = await res.json();
            setFolders(prev => prev.map(f => f.id === id ? updated : f));
            setRenamingFolder(null);
            showMsg('ok', 'Pasta renomeada.');
        } catch { showMsg('err', 'Erro ao renomear.'); }
    };

    const handleMoveFolderUp = async (id: string) => {
        const idx = folders.findIndex(f => f.id === id);
        if (idx <= 0) return;
        const newOrder = [...folders];
        [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        setFolders(newOrder);
        await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'reorder-folders', ids: newOrder.map(f => f.id) }),
        });
    };

    const handleMoveFolderDown = async (id: string) => {
        const idx = folders.findIndex(f => f.id === id);
        if (idx < 0 || idx >= folders.length - 1) return;
        const newOrder = [...folders];
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        setFolders(newOrder);
        await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'reorder-folders', ids: newOrder.map(f => f.id) }),
        });
    };

    const toggleFolder = (id: string) => {
        setOpenFolders(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    /* ── Pin / Color ── */
    const handleTogglePin = async (noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        const newPinned = !note.pinned;
        const res = await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'patch-note', id: noteId, pinned: newPinned }),
        });
        if (!res.ok) return;
        const updated: Note = await res.json();
        setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
        if (selected?.id === noteId) setSelected(updated);
        showMsg('ok', newPinned ? 'Nota fixada.' : 'Nota desafixada.');
    };

    const handleSetColor = async (noteId: string, color: string | null) => {
        const res = await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'patch-note', id: noteId, color }),
        });
        if (!res.ok) return;
        const updated: Note = await res.json();
        setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
        if (selected?.id === noteId) setSelected(updated);
        setColorPickerFor(null);
    };

    /* ── Move note ── */
    const handleMoveNote = async (noteId: string, newFolderId: string | null) => {
        const res = await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'patch-note', id: noteId, folderId: newFolderId }),
        });
        if (!res.ok) { showMsg('err', 'Erro ao mover nota.'); return; }
        const updated: Note = await res.json();
        setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
        if (selected?.id === noteId) {
            setSelected(updated);
            setFolderId(newFolderId);
        }
        setMoveModal(null);
        showMsg('ok', 'Nota movida.');
    };

    /* ── Row highlights ── */
    const handleRowClick = (cells: string[], fingerprint: string, rect: DOMRect) => {
        setRowToolbar({ cells, fingerprint, rect });
    };

    const handleHighlightRow = async (fingerprint: string) => {
        if (!selected) return;
        const current = selected.highlights ?? [];
        if (current.includes(fingerprint)) return;
        const newHighlights = [...current, fingerprint];
        const res = await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'patch-note', id: selected.id, highlights: newHighlights }),
        });
        if (!res.ok) return;
        const updated: Note = await res.json();
        setNotes(prev => prev.map(n => n.id === selected.id ? updated : n));
        setSelected(updated);
        showMsg('ok', 'Linha destacada.');
    };

    const handleRemoveHighlight = async (fingerprint: string) => {
        if (!selected) return;
        const newHighlights = (selected.highlights ?? []).filter(h => h !== fingerprint);
        const res = await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'patch-note', id: selected.id, highlights: newHighlights }),
        });
        if (!res.ok) return;
        const updated: Note = await res.json();
        setNotes(prev => prev.map(n => n.id === selected.id ? updated : n));
        setSelected(updated);
        showMsg('ok', 'Destaque removido.');
    };

    const handleClearAllHighlights = async () => {
        if (!selected) return;
        const res = await fetch('/api/links-uteis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'patch-note', id: selected.id, highlights: [] }),
        });
        if (!res.ok) return;
        const updated: Note = await res.json();
        setNotes(prev => prev.map(n => n.id === selected.id ? updated : n));
        setSelected(updated);
        setRowToolbar(null);
        showMsg('ok', 'Todos os destaques removidos.');
    };

    const handleNewNoteFromRow = (cells: string[]) => {
        if (!cells.length) return;
        const newTitle = cells[0] || 'Nova nota';
        // Format as a single-row table
        const header = cells.map((_, i) => `Coluna ${i + 1}`).join(' | ');
        const sep = cells.map(() => '---').join(' | ');
        const row = cells.join(' | ');
        const newContent = `| ${header} |\n| ${sep} |\n| ${row} |`;
        handleNew(folderId, newTitle, newContent);
        setRowToolbar(null);
    };

    /* ── Filtered notes ── */
    const filtered = useMemo(() => notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    ), [notes, search]);

    // Pinned first, then by updatedAt desc
    const sortedFiltered = useMemo(() => [
        ...filtered.filter(n => n.pinned),
        ...filtered.filter(n => !n.pinned),
    ], [filtered]);

    const notesInFolder = (fid: string) => sortedFiltered.filter(n => n.folderId === fid);
    const uncategorized = sortedFiltered.filter(n => !n.folderId);

    const currentFolderName = folders.find(f => f.id === folderId)?.name ?? null;
    const currentHighlights = selected?.highlights ?? [];
    const isRowHighlighted = rowToolbar ? currentHighlights.includes(rowToolbar.fingerprint) : false;

    /* ── Analytics ── */
    const analytics = useMemo(() => {
        if (!notes.length) return null;
        const allText = notes.map(n => `${n.title} ${n.content}`).join(' ');
        const words = allText.toLowerCase().match(/[a-záàâãéèêíïóôõöúüçñ]+/g) ?? [];
        const wordFreq: Record<string, number> = {};
        words.forEach(w => { if (w.length > 3) wordFreq[w] = (wordFreq[w] ?? 0) + 1; });
        const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([word, count]) => ({ word, count }));
        const maxCount = topWords[0]?.count ?? 1;
        const totalWords = notes.reduce((acc, n) => acc + (n.content.split(/\s+/).filter(Boolean).length), 0);
        const totalChars = notes.reduce((acc, n) => acc + n.content.length, 0);
        const pinnedCount = notes.filter(n => n.pinned).length;
        const notesPerFolder = [
            ...folders.map(f => ({ name: f.name, count: notes.filter(n => n.folderId === f.id).length, color: '#4ade80' })),
            { name: 'Sem pasta', count: notes.filter(n => !n.folderId).length, color: 'rgba(255,255,255,0.2)' },
        ].filter(f => f.count > 0);
        const maxFolderCount = Math.max(...notesPerFolder.map(f => f.count), 1);
        const colorDist = NOTE_COLORS.map(c => ({ label: c.label, color: c.value, count: notes.filter(n => n.color === c.value).length })).filter(c => c.count > 0);
        const avgLength = Math.round(totalWords / notes.length);
        const recentNote = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        const withContent = notes.filter(n => n.content.trim().length > 50).length;
        const score = Math.min(100, Math.round((notes.length * 4) + (folders.length * 3) + (pinnedCount * 2) + Math.min(totalWords / 80, 25) + (withContent * 1.5)));
        return { topWords, maxCount, totalWords, totalChars, pinnedCount, notesPerFolder, maxFolderCount, colorDist, avgLength, recentNote, score, withContent };
    }, [notes, folders]);

    /* ── Folders grouped by master dir ── */
    const ungroupedFolders = useMemo(() => {
        const assignedIds = new Set(masterDirs.flatMap(d => d.folderIds));
        return folders.filter(f => !assignedIds.has(f.id));
    }, [folders, masterDirs]);

    return (
        <>
            {/* ── Styles ────────────────────────────────────────────── */}
            <style>{`
                /* Layout */
                .obs-root { display:flex; height:calc(100vh - 80px); overflow:hidden; background:#0d0d0d; border-radius:12px; border:1px solid rgba(255,255,255,0.06); font-family:'Inter',system-ui,sans-serif; }

                /* Sidebar */
                .obs-sidebar { width:252px; flex-shrink:0; display:flex; flex-direction:column; border-right:1px solid rgba(255,255,255,0.06); background:#111; }
                .obs-sidebar-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06); }
                .obs-sidebar-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,0.5); }
                .obs-icon-btn { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.4); cursor:pointer; border:none; background:transparent; transition:background .15s,color .15s; flex-shrink:0; }
                .obs-icon-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.9); }
                .obs-search { margin:8px; }
                .obs-search-inner { display:flex; align-items:center; gap:6px; padding:5px 8px; background:rgba(255,255,255,0.05); border-radius:6px; border:1px solid rgba(255,255,255,0.08); }
                .obs-search-input { background:transparent; border:none; outline:none; font-size:12px; color:rgba(255,255,255,0.7); width:100%; }
                .obs-search-input::placeholder { color:rgba(255,255,255,0.2); }
                .obs-note-list { flex:1; overflow-y:auto; padding:4px; }
                .obs-note-item { width:100%; text-align:left; padding:7px 10px; border-radius:6px; cursor:pointer; border:1px solid transparent; background:transparent; transition:background .12s; margin-bottom:2px; display:block; position:relative; }
                .obs-note-item:hover { background:rgba(255,255,255,0.05); }
                .obs-note-item.active { background:rgba(124,58,237,0.15); border-color:rgba(124,58,237,0.3); }
                .obs-note-item:hover .obs-note-actions { opacity:1; }
                .obs-note-actions { position:absolute; right:4px; top:50%; transform:translateY(-50%); display:flex; gap:2px; opacity:0; transition:opacity .15s; background:#1a1a1a; border-radius:5px; padding:2px; border:1px solid rgba(255,255,255,0.08); }
                .obs-note-action-btn { width:20px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; cursor:pointer; color:rgba(255,255,255,0.3); transition:all .12s; }
                .obs-note-action-btn:hover { background:rgba(255,255,255,0.1); color:white; }
                .obs-note-name { font-size:12px; font-weight:500; color:rgba(255,255,255,0.75); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; padding-right:62px; }
                .obs-note-item.active .obs-note-name { color:#a78bfa; }
                .obs-note-date { font-size:10px; color:rgba(255,255,255,0.25); margin-top:2px; display:block; }
                .obs-note-dot { width:6px; height:6px; border-radius:50%; display:inline-block; margin-right:4px; flex-shrink:0; }
                .obs-sidebar-footer { padding:8px 12px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:rgba(255,255,255,0.2); font-variant-numeric:tabular-nums; }

                /* Folders */
                .obs-section-label { display:flex; align-items:center; justify-content:space-between; padding:8px 10px 3px; }
                .obs-section-label-text { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:rgba(255,255,255,0.2); }
                .obs-folder-row { width:100%; display:flex; align-items:center; gap:4px; padding:5px 6px 5px 6px; border-radius:6px; cursor:pointer; border:none; background:transparent; transition:background .12s; text-align:left; }
                .obs-folder-row:hover { background:rgba(74,222,128,0.07); }
                .obs-folder-row.open { background:rgba(74,222,128,0.05); }
                .obs-folder-chevron { color:rgba(74,222,128,0.5); transition:transform .15s; flex-shrink:0; }
                .obs-folder-icon { color:#4ade80; flex-shrink:0; }
                .obs-folder-name { font-size:12px; font-weight:600; color:#4ade80; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .obs-folder-count { font-size:10px; color:rgba(74,222,128,0.45); font-variant-numeric:tabular-nums; margin-right:2px; }
                .obs-folder-actions { display:flex; gap:1px; opacity:0; transition:opacity .15s; }
                .obs-folder-row:hover .obs-folder-actions { opacity:1; }
                .obs-folder-act-btn { width:18px; height:18px; border-radius:4px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; cursor:pointer; color:rgba(255,255,255,0.25); transition:all .12s; }
                .obs-folder-act-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); }
                .obs-folder-act-btn.danger:hover { color:#f87171; }
                .obs-folder-act-btn.confirm { color:#f87171 !important; opacity:1 !important; }
                .obs-folder-notes { padding-left:20px; }
                .obs-add-folder-row { padding:4px 8px; }
                .obs-add-folder-input { width:100%; background:rgba(74,222,128,0.06); border:1px solid rgba(74,222,128,0.25); border-radius:6px; padding:4px 8px; font-size:12px; color:#4ade80; outline:none; }
                .obs-add-folder-input::placeholder { color:rgba(74,222,128,0.3); }
                .obs-rename-input { flex:1; background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.3); border-radius:4px; padding:2px 6px; font-size:12px; color:#4ade80; outline:none; min-width:0; }
                .obs-uncategorized-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:rgba(255,255,255,0.15); padding:8px 10px 3px; display:block; }

                /* Editor pane */
                .obs-editor-pane { flex:1; display:flex; flex-direction:column; min-width:0; background:#0d0d0d; }
                .obs-toolbar { display:flex; align-items:center; gap:6px; padding:8px 14px; border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; flex-wrap:wrap; }
                .obs-fmt-bar { display:flex; align-items:center; gap:2px; padding:4px 14px; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0; flex-wrap:wrap; background:rgba(255,255,255,0.02); }
                .obs-fmt-btn { width:26px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:rgba(255,255,255,0.4); cursor:pointer; font-size:11px; font-weight:700; font-family:monospace; transition:all .12s; flex-shrink:0; }
                .obs-fmt-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.9); }
                .obs-fmt-sep { width:1px; height:14px; background:rgba(255,255,255,0.08); margin:0 3px; flex-shrink:0; }
                .obs-autosave { font-size:10px; font-family:monospace; color:rgba(255,255,255,0.2); margin-left:auto; display:flex; align-items:center; gap:4px; }
                .obs-autosave.pending { color:rgba(245,158,11,0.6); }
                .obs-autosave.saved { color:rgba(16,185,129,0.7); }
                .obs-title-input { flex:1; background:transparent; border:none; outline:none; font-size:14px; font-weight:600; color:rgba(255,255,255,0.9); min-width:120px; }
                .obs-title-input::placeholder { color:rgba(255,255,255,0.2); }
                .obs-btn { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.45); transition:all .15s; white-space:nowrap; }
                .obs-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); }
                .obs-btn.active { background:rgba(124,58,237,0.15); border-color:rgba(124,58,237,0.4); color:#a78bfa; }
                .obs-btn.save-active { background:rgba(16,185,129,0.12); border-color:rgba(16,185,129,0.35); color:#10b981; }
                .obs-btn.danger { color:rgba(239,68,68,0.6); }
                .obs-btn.danger:hover { background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.35); color:#f87171; }
                .obs-btn.danger-confirm { background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.4); color:#f87171; }
                .obs-btn:disabled { opacity:0.35; cursor:not-allowed; }
                .obs-folder-btn { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid rgba(74,222,128,0.2); background:rgba(74,222,128,0.06); color:rgba(74,222,128,0.7); transition:all .15s; white-space:nowrap; position:relative; }
                .obs-folder-btn:hover { background:rgba(74,222,128,0.1); color:#4ade80; border-color:rgba(74,222,128,0.35); }
                .obs-folder-dropdown { position:absolute; top:calc(100% + 4px); left:0; min-width:160px; background:#1a1a1a; border:1px solid rgba(74,222,128,0.2); border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,0.6); z-index:200; overflow:hidden; }
                .obs-folder-dropdown-item { width:100%; display:flex; align-items:center; gap:8px; padding:7px 12px; background:transparent; border:none; cursor:pointer; font-size:12px; color:rgba(255,255,255,0.65); text-align:left; transition:background .12s; }
                .obs-folder-dropdown-item:hover { background:rgba(74,222,128,0.08); color:#4ade80; }
                .obs-folder-dropdown-item.selected { color:#4ade80; background:rgba(74,222,128,0.06); }

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

                /* Typography */
                .obs-p { font-size:14px; line-height:1.75; color:rgba(255,255,255,0.78); margin:0 0 12px; }
                .obs-h1 { font-size:22px; font-weight:700; color:rgba(255,255,255,0.95); margin:24px 0 10px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); }
                .obs-h2 { font-size:18px; font-weight:700; color:rgba(255,255,255,0.9); margin:20px 0 8px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06); }
                .obs-h3 { font-size:15px; font-weight:600; color:rgba(255,255,255,0.85); margin:16px 0 6px; }
                .obs-h4 { font-size:13px; font-weight:600; color:#a78bfa; margin:12px 0 4px; text-transform:uppercase; letter-spacing:.06em; }
                .obs-h5 { font-size:12px; font-weight:600; color:rgba(255,255,255,0.5); margin:10px 0 4px; }
                .obs-h6 { font-size:11px; font-weight:600; color:rgba(255,255,255,0.35); margin:8px 0 4px; text-transform:uppercase; letter-spacing:.1em; }
                .obs-link { color:#7c9ef8; text-decoration:none; border-bottom:1px solid rgba(124,158,248,0.3); transition:border-color .15s; }
                .obs-link:hover { border-bottom-color:#7c9ef8; }
                .obs-strong { color:#4ade80; font-weight:700; }
                .obs-em { color:#c084fc; font-style:italic; }
                .obs-code-inline { font-family:monospace; font-size:12px; background:rgba(255,255,255,0.08); color:#e2c08d; padding:1px 5px; border-radius:4px; }
                .obs-pre { background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 16px; margin:12px 0; overflow-x:auto; }
                .obs-code-block { font-family:monospace; font-size:12px; color:#a8d0a8; white-space:pre; display:block; }
                .obs-blockquote { border-left:3px solid #7c3aed; padding:4px 14px; margin:12px 0; background:rgba(124,58,237,0.06); border-radius:0 6px 6px 0; }
                .obs-blockquote .obs-p { color:rgba(255,255,255,0.55); font-style:italic; margin:0; }
                .obs-ul { list-style:disc; padding-left:22px; margin:8px 0 12px; }
                .obs-ol { list-style:decimal; padding-left:22px; margin:8px 0 12px; }
                .obs-li { font-size:14px; line-height:1.7; color:rgba(255,255,255,0.75); margin-bottom:3px; }
                .obs-hr { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:20px 0; }
                .obs-table-wrap { overflow-x:auto; margin:14px 0; border-radius:8px; border:1px solid rgba(255,255,255,0.08); }
                .obs-table { width:100%; border-collapse:collapse; font-size:13px; }
                .obs-thead { background:rgba(255,255,255,0.04); }
                .obs-th { padding:8px 14px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:rgba(255,255,255,0.5); border-bottom:1px solid rgba(255,255,255,0.08); white-space:nowrap; }
                .obs-td { padding:8px 14px; color:rgba(255,255,255,0.72); border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; transition:background .1s; }
                .obs-tr:last-child .obs-td { border-bottom:none; }
                .obs-tr:hover .obs-td { background:rgba(255,255,255,0.03); }
                .obs-tr[data-hl=true] .obs-td { background:rgba(250,204,21,0.07); border-left:none; }
                .obs-tr[data-hl=true] { border-left:3px solid rgba(250,204,21,0.6); }
                .obs-note-list::-webkit-scrollbar, .obs-preview-wrap::-webkit-scrollbar { width:4px; }
                .obs-note-list::-webkit-scrollbar-thumb, .obs-preview-wrap::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }
                .obs-empty { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; pointer-events:none; }
                .obs-empty-icon { width:56px; height:56px; border-radius:16px; background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.15); display:flex; align-items:center; justify-content:center; }
                .obs-empty-title { font-size:13px; font-weight:600; color:rgba(255,255,255,0.35); }
                .obs-empty-sub { font-size:11px; color:rgba(255,255,255,0.18); margin-top:2px; }

                /* Row toolbar */
                .obs-row-toolbar { position:fixed; z-index:500; background:#1c1c2e; border:1px solid rgba(167,139,250,0.3); border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,0.7); padding:6px; display:flex; gap:4px; align-items:center; }
                .obs-row-tb-btn { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer; border:1px solid transparent; background:transparent; color:rgba(255,255,255,0.5); transition:all .12s; white-space:nowrap; }
                .obs-row-tb-btn:hover { background:rgba(255,255,255,0.08); color:white; }
                .obs-row-tb-btn.hl { color:#facc15; border-color:rgba(250,204,21,0.25); background:rgba(250,204,21,0.08); }
                .obs-row-tb-btn.hl:hover { background:rgba(250,204,21,0.15); }
                .obs-row-tb-btn.remove { color:#f87171; border-color:rgba(248,113,113,0.25); }
                .obs-row-tb-btn.remove:hover { background:rgba(248,113,113,0.1); }
                .obs-row-tb-btn.new-note { color:#a78bfa; border-color:rgba(167,139,250,0.25); }
                .obs-row-tb-btn.new-note:hover { background:rgba(167,139,250,0.1); }
                .obs-row-tb-sep { width:1px; height:18px; background:rgba(255,255,255,0.08); flex-shrink:0; }

                /* Highlight indicator in toolbar */
                .obs-hl-badge { font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(250,204,21,0.15); color:#facc15; border:1px solid rgba(250,204,21,0.3); }
            `}</style>

            <div className="obs-root">

                {/* ── Sidebar ──────────────────────────────────────────── */}
                <aside className="obs-sidebar">
                    <div className="obs-sidebar-header">
                        <span className="obs-sidebar-title">Links Úteis</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                className="obs-icon-btn"
                                onClick={() => { setAddingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50); }}
                                title="Nova pasta (Ctrl+Shift+N)"
                                style={{ color: 'rgba(74,222,128,0.6)' }}
                            >
                                <FolderPlus size={13} />
                            </button>
                            <button className="obs-icon-btn" onClick={() => {
                                // Default to the first open folder if any
                                const openId = Array.from(openFolders)[0] ?? null;
                                handleNew(openId);
                            }} title="Nova nota (Ctrl+N)">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Hidden import input */}
                    <input ref={importRef} type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={handleImportMd} />

                    {/* Quick-action hint */}
                    <div style={{ padding: '4px 12px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => { setAddingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontWeight: 600 }}>
                            <FolderPlus size={10} /> Nova Pasta
                        </button>
                        <button onClick={() => setTemplatesOpen(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(167,139,250,0.5)', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontWeight: 600 }}>
                            <Sparkles size={10} /> Template
                        </button>
                        <button onClick={() => importRef.current?.click()}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontWeight: 600 }}>
                            <Download size={10} /> Importar .md
                        </button>
                        <button onClick={handleSyncPush} disabled={!!syncing}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontWeight: 600, opacity: syncing ? 0.5 : 1 }}>
                            {syncing === 'push' ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Cloud size={10} />} Push NC
                        </button>
                        <button onClick={handleSyncPull} disabled={!!syncing}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(0,243,255,0.5)', background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.15)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontWeight: 600, opacity: syncing ? 0.5 : 1 }}>
                            {syncing === 'pull' ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Cloud size={10} />} Pull NC
                        </button>
                    </div>

                    {/* Template picker */}
                    {templatesOpen && (
                        <div style={{ margin: '6px 12px 0', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, overflow: 'hidden' }}>
                            {TEMPLATES.map(t => (
                                <button key={t.label} onClick={() => {
                                    const openId = Array.from(openFolders)[0] ?? null;
                                    setSelected(null);
                                    setTitle(t.title);
                                    setContent(t.content);
                                    setFolderId(openId);
                                    setMode('edit');
                                    setTemplatesOpen(false);
                                    setTimeout(() => textareaRef.current?.focus(), 50);
                                }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .12s' }}
                                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                    <span>{t.icon}</span> {t.label}
                                </button>
                            ))}
                        </div>
                    )}

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
                                <div style={{ width: 16, height: 16, border: '2px solid rgba(74,222,128,0.2)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : (
                            <>
                                {/* ── New folder input ── */}
                                {addingFolder && (
                                    <div className="obs-add-folder-row">
                                        <input
                                            ref={newFolderRef}
                                            className="obs-add-folder-input"
                                            value={newFolderName}
                                            onChange={e => setNewFolderName(e.target.value)}
                                            placeholder="Nome da pasta..."
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleAddFolder();
                                                if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName(''); }
                                            }}
                                            onBlur={() => { if (!newFolderName.trim()) { setAddingFolder(false); setNewFolderName(''); } }}
                                        />
                                    </div>
                                )}

                                {/* ── Master Directories ── */}
                                {masterDirs.map(mdir => {
                                    const mdFolders = folders.filter(f => mdir.folderIds.includes(f.id));
                                    if (!mdFolders.length) return null;
                                    return (
                                        <div key={mdir.id}>
                                            <div className="obs-section-label" style={{ background: 'rgba(167,139,250,0.04)', borderRadius: 6, margin: '2px 0' }}>
                                                <span className="obs-section-label-text" style={{ color: 'rgba(167,139,250,0.5)' }}>
                                                    <FolderTree size={9} style={{ display: 'inline', marginRight: 4 }} />{mdir.name}
                                                </span>
                                                <div style={{ display: 'flex', gap: 2 }}>
                                                    <button className="obs-folder-act-btn" onClick={() => { setEditingMasterDirId(mdir.id); setNewMasterDirName(mdir.name); setMasterDirFolderSel(mdir.folderIds); setShowMasterDirModal(true); }} title="Editar"><Pencil size={9} /></button>
                                                    <button className="obs-folder-act-btn danger" onClick={() => handleDeleteMasterDir(mdir.id)} title="Remover"><X size={9} /></button>
                                                </div>
                                            </div>
                                            {mdFolders.map((folder, folderIdx) => {
                                                const isOpen = openFolders.has(folder.id);
                                                const fNotes = notesInFolder(folder.id);
                                                const isRenaming = renamingFolder === folder.id;
                                                const isDragTarget = dragOverFolderId === folder.id;
                                                return (
                                                    <div key={folder.id}
                                                        onDragOver={e => handleDragOverFolder(e, folder.id)}
                                                        onDrop={e => handleDropOnFolder(e, folder.id)}
                                                        style={{ borderRadius: 6, outline: isDragTarget ? '1px dashed rgba(74,222,128,0.5)' : 'none', background: isDragTarget ? 'rgba(74,222,128,0.04)' : 'transparent', transition: 'all .12s' }}
                                                    >
                                                        <button className={`obs-folder-row${isOpen ? ' open' : ''}`} onClick={() => !isRenaming && toggleFolder(folder.id)}>
                                                            {isOpen ? <ChevronDown size={10} className="obs-folder-chevron" /> : <ChevronRight size={10} className="obs-folder-chevron" />}
                                                            {isOpen ? <FolderOpen size={13} className="obs-folder-icon" /> : <FolderIcon size={13} className="obs-folder-icon" />}
                                                            {isRenaming ? (
                                                                <input className="obs-rename-input" value={renameFolderVal} onChange={e => setRenameFolderVal(e.target.value)} autoFocus onClick={e => e.stopPropagation()} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setRenamingFolder(null); }} onBlur={() => { if (renameFolderVal.trim()) handleRenameFolder(folder.id); else setRenamingFolder(null); }} />
                                                            ) : (<span className="obs-folder-name">{folder.name}</span>)}
                                                            <span className="obs-folder-count">{fNotes.length}</span>
                                                            <div className="obs-folder-actions" onClick={e => e.stopPropagation()}>
                                                                <button className="obs-folder-act-btn" onClick={() => { if (!isOpen) toggleFolder(folder.id); handleNew(folder.id); }} title="Nova nota nesta pasta" style={{ color: 'rgba(74,222,128,0.6)' }}><Plus size={9} /></button>
                                                                <button className="obs-folder-act-btn" onClick={() => { setRenamingFolder(folder.id); setRenameFolderVal(folder.name); }} title="Renomear"><Pencil size={9} /></button>
                                                                <button className={`obs-folder-act-btn danger${confirmDelFld === folder.id ? ' confirm' : ''}`} onClick={() => handleDeleteFolder(folder.id)} title={confirmDelFld === folder.id ? 'Confirmar?' : 'Remover'} onBlur={() => setConfirmDelFld(null)}><X size={9} /></button>
                                                            </div>
                                                        </button>
                                                        {isOpen && (
                                                            <div className="obs-folder-notes">
                                                                {fNotes.length === 0
                                                                    ? <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(74,222,128,0.3)', fontSize: 11, width: '100%' }} onClick={() => handleNew(folder.id)}><Plus size={10} /> Nova nota aqui</button>
                                                                    : <>
                                                                        {fNotes.map(note => (
                                                                            <NoteItem key={note.id} note={note} isActive={selected?.id === note.id} onSelect={() => handleSelect(note)} onPin={() => handleTogglePin(note.id)} onMove={() => setMoveModal({ noteId: note.id, currentFolderId: note.folderId ?? null })} onColorPick={() => setColorPickerFor(note.id)} colorPickerOpen={colorPickerFor === note.id} onSetColor={c => handleSetColor(note.id, c)} onDragStart={() => handleDragStart(note.id)} onDragEnd={handleDragEnd} />
                                                                        ))}
                                                                        <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(74,222,128,0.2)', fontSize: 10, width: '100%' }} onClick={() => handleNew(folder.id)}><Plus size={9} /> Nova nota</button>
                                                                    </>
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                                {/* ── Folders (ungrouped) ── */}
                                {ungroupedFolders.length > 0 && (
                                    <div className="obs-section-label">
                                        <span className="obs-section-label-text">Pastas</span>
                                    </div>
                                )}

                                {ungroupedFolders.map((folder, folderIdx) => {
                                    const isOpen = openFolders.has(folder.id);
                                    const fNotes = notesInFolder(folder.id);
                                    const isRenaming = renamingFolder === folder.id;
                                    const isDragTarget = dragOverFolderId === folder.id;
                                    return (
                                        <div key={folder.id}
                                            onDragOver={e => handleDragOverFolder(e, folder.id)}
                                            onDrop={e => handleDropOnFolder(e, folder.id)}
                                            style={{ borderRadius: 6, outline: isDragTarget ? '1px dashed rgba(74,222,128,0.5)' : 'none', background: isDragTarget ? 'rgba(74,222,128,0.04)' : 'transparent', transition: 'all .12s' }}
                                        >
                                            <button className={`obs-folder-row${isOpen ? ' open' : ''}`} onClick={() => !isRenaming && toggleFolder(folder.id)}>
                                                {isOpen ? <ChevronDown size={10} className="obs-folder-chevron" /> : <ChevronRight size={10} className="obs-folder-chevron" />}
                                                {isOpen ? <FolderOpen size={13} className="obs-folder-icon" /> : <FolderIcon size={13} className="obs-folder-icon" />}
                                                {isRenaming ? (
                                                    <input
                                                        className="obs-rename-input"
                                                        value={renameFolderVal}
                                                        onChange={e => setRenameFolderVal(e.target.value)}
                                                        autoFocus
                                                        onClick={e => e.stopPropagation()}
                                                        onKeyDown={e => {
                                                            e.stopPropagation();
                                                            if (e.key === 'Enter') handleRenameFolder(folder.id);
                                                            if (e.key === 'Escape') setRenamingFolder(null);
                                                        }}
                                                        onBlur={() => { if (renameFolderVal.trim()) handleRenameFolder(folder.id); else setRenamingFolder(null); }}
                                                    />
                                                ) : (
                                                    <span className="obs-folder-name">{folder.name}</span>
                                                )}
                                                <span className="obs-folder-count">{fNotes.length}</span>
                                                <div className="obs-folder-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="obs-folder-act-btn" onClick={() => { if (!isOpen) toggleFolder(folder.id); handleNew(folder.id); }} title="Nova nota nesta pasta" style={{ color: 'rgba(74,222,128,0.6)' }}><Plus size={9} /></button>
                                                    {folderIdx > 0 && (
                                                        <button className="obs-folder-act-btn" onClick={() => handleMoveFolderUp(folder.id)} title="Mover para cima"><ChevronUp size={9} /></button>
                                                    )}
                                                    {folderIdx < ungroupedFolders.length - 1 && (
                                                        <button className="obs-folder-act-btn" onClick={() => handleMoveFolderDown(folder.id)} title="Mover para baixo"><ChevronDown size={9} /></button>
                                                    )}
                                                    <button className="obs-folder-act-btn" onClick={() => { setRenamingFolder(folder.id); setRenameFolderVal(folder.name); }} title="Renomear"><Pencil size={9} /></button>
                                                    <button className={`obs-folder-act-btn danger${confirmDelFld === folder.id ? ' confirm' : ''}`} onClick={() => handleDeleteFolder(folder.id)} title={confirmDelFld === folder.id ? 'Confirmar remoção' : 'Remover pasta'} onBlur={() => setConfirmDelFld(null)}><X size={9} /></button>
                                                </div>
                                            </button>

                                            {isOpen && (
                                                <div className="obs-folder-notes">
                                                    {fNotes.length === 0
                                                        ? <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(74,222,128,0.3)', fontSize: 11, width: '100%' }} onClick={() => handleNew(folder.id)}><Plus size={10} /> Nova nota aqui</button>
                                                        : <>
                                                            {fNotes.map(note => (
                                                                <NoteItem key={note.id} note={note} isActive={selected?.id === note.id} onSelect={() => handleSelect(note)} onPin={() => handleTogglePin(note.id)} onMove={() => setMoveModal({ noteId: note.id, currentFolderId: note.folderId ?? null })} onColorPick={() => setColorPickerFor(note.id)} colorPickerOpen={colorPickerFor === note.id} onSetColor={(c) => handleSetColor(note.id, c)} onDragStart={() => handleDragStart(note.id)} onDragEnd={handleDragEnd} />
                                                            ))}
                                                            <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(74,222,128,0.2)', fontSize: 10, width: '100%' }} onClick={() => handleNew(folder.id)}><Plus size={9} /> Nova nota</button>
                                                        </>
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* ── Uncategorized (also a drop zone) ── */}
                                {(uncategorized.length > 0 || dragNoteId) && (
                                    <div
                                        onDragOver={e => handleDragOverFolder(e, null)}
                                        onDrop={e => handleDropOnFolder(e, null)}
                                        style={{ borderRadius: 6, outline: dragOverFolderId === '__none__' ? '1px dashed rgba(255,255,255,0.25)' : 'none', background: dragOverFolderId === '__none__' ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'all .12s' }}
                                    >
                                        {folders.length > 0 && uncategorized.length > 0 && <span className="obs-uncategorized-label">Sem pasta</span>}
                                        {dragNoteId && !uncategorized.find(n => n.id === dragNoteId) && (
                                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '4px 10px', fontFamily: 'monospace', display: dragOverFolderId === '__none__' ? 'block' : 'none' }}>
                                                ↓ Soltar aqui (sem pasta)
                                            </div>
                                        )}
                                        {uncategorized.map(note => (
                                            <NoteItem key={note.id} note={note} isActive={selected?.id === note.id} onSelect={() => handleSelect(note)} onPin={() => handleTogglePin(note.id)} onMove={() => setMoveModal({ noteId: note.id, currentFolderId: note.folderId ?? null })} onColorPick={() => setColorPickerFor(note.id)} colorPickerOpen={colorPickerFor === note.id} onSetColor={(c) => handleSetColor(note.id, c)} onDragStart={() => handleDragStart(note.id)} onDragEnd={handleDragEnd} />
                                        ))}
                                    </div>
                                )}

                                {!loading && notes.length === 0 && (
                                    <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '24px 0', fontFamily: 'monospace' }}>Nenhuma nota</p>
                                )}
                                {!loading && notes.length > 0 && filtered.length === 0 && search && (
                                    <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '24px 0', fontFamily: 'monospace' }}>Nenhum resultado</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Notebook actions */}
                    <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="obs-icon-btn" style={{ flex: 1, fontSize: 10, gap: 4, color: 'rgba(74,222,128,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto' }} onClick={() => setShowMasterDirModal(true)} title="Diretórios Mestres">
                            <FolderTree size={12} /> <span style={{ fontSize: 9, fontWeight: 700 }}>Dirs Mestres</span>
                        </button>
                        <button className="obs-icon-btn" style={{ flex: 1, fontSize: 10, gap: 4, color: 'rgba(167,139,250,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto' }} onClick={() => setAnalyticsOpen(v => !v)} title="Analytics">
                            <BarChart2 size={12} /> <span style={{ fontSize: 9, fontWeight: 700 }}>Analytics</span>
                        </button>
                        <button className="obs-icon-btn" style={{ flex: 1, fontSize: 10, gap: 4, color: 'rgba(59,130,246,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto' }} onClick={handleSaveAllNotebook} title="Salvar todo caderno">
                            <Archive size={12} /> <span style={{ fontSize: 9, fontWeight: 700 }}>Salvar tudo</span>
                        </button>
                        <button className={`obs-icon-btn${confirmDeleteAll ? '' : ''}`} style={{ flex: 1, fontSize: 10, gap: 4, color: confirmDeleteAll ? '#f87171' : 'rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto', background: confirmDeleteAll ? 'rgba(239,68,68,0.08)' : undefined }} onClick={handleDeleteAllNotebook} disabled={deletingAll} title="Apagar todo caderno">
                            <Trash2 size={12} /> <span style={{ fontSize: 9, fontWeight: 700 }}>{confirmDeleteAll ? 'Confirmar?' : 'Apagar tudo'}</span>
                        </button>
                    </div>
                    <div className="obs-sidebar-footer">{notes.length} nota{notes.length !== 1 ? 's' : ''} · {folders.length} pasta{folders.length !== 1 ? 's' : ''} · {notes.filter(n => n.pinned).length} fixada{notes.filter(n => n.pinned).length !== 1 ? 's' : ''}</div>
                </aside>

                {/* ── Editor pane ────────────────────────────────────────── */}
                <div className="obs-editor-pane">

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

                        {/* color dot if set */}
                        {selected?.color && (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected.color, flexShrink: 0 }} />
                        )}

                        {/* folder picker */}
                        <div ref={folderDropRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>Pasta:</span>
                            <button className="obs-folder-btn" onClick={() => setFolderDropdown(v => !v)} title="Selecionar pasta">
                                {folderId ? <FolderOpen size={12} /> : <FolderIcon size={12} />}
                                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {currentFolderName ?? 'Sem pasta'}
                                </span>
                                <ChevronDown size={10} style={{ opacity: 0.5 }} />
                            </button>
                            {folderDropdown && (
                                <div className="obs-folder-dropdown">
                                    <button className={`obs-folder-dropdown-item${!folderId ? ' selected' : ''}`} onClick={() => { setFolderId(null); setFolderDropdown(false); }}>
                                        <FolderIcon size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /> Sem pasta
                                    </button>
                                    {folders.map(f => (
                                        <button key={f.id} className={`obs-folder-dropdown-item${folderId === f.id ? ' selected' : ''}`} onClick={() => { setFolderId(f.id); setFolderDropdown(false); }}>
                                            <FolderIcon size={12} style={{ color: '#4ade80' }} /> {f.name}
                                        </button>
                                    ))}
                                    {folders.length === 0 && <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Nenhuma pasta criada</div>}
                                </div>
                            )}
                        </div>

                        {/* mode toggles */}
                        <button className={`obs-btn ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')} title="Visualização"><Eye size={12} /> Ver</button>
                        <button className={`obs-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => { setMode('edit'); setTimeout(() => textareaRef.current?.focus(), 50); }} title="Editar"><AlignLeft size={12} /> Editar</button>
                        <button className={`obs-btn ${mode === 'split' ? 'active' : ''}`} onClick={() => setMode('split')} title="Split"><Columns2 size={12} /> Split</button>

                        {/* save */}
                        <button className={`obs-btn ${isDirty && !saving ? 'save-active' : ''}`} onClick={handleSave} disabled={saving || !isDirty}>
                            <Save size={12} /> {saving ? 'Salvando...' : 'Salvar'}
                        </button>

                        {/* pin */}
                        {selected && (
                            <button className={`obs-btn ${selected.pinned ? 'active' : ''}`} onClick={() => handleTogglePin(selected.id)} title={selected.pinned ? 'Desafixar' : 'Fixar nota'} style={selected.pinned ? { color: '#facc15', borderColor: 'rgba(250,204,21,0.4)', background: 'rgba(250,204,21,0.08)' } : {}}>
                                {selected.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                            </button>
                        )}

                        {/* color */}
                        {selected && (
                            <div style={{ position: 'relative' }} data-color-picker>
                                <button className="obs-btn" onClick={() => setColorPickerFor(colorPickerFor === selected.id ? null : selected.id)} title="Cor da nota">
                                    <Palette size={12} />
                                </button>
                                {colorPickerFor === selected.id && (
                                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 6, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                                        <button onClick={() => handleSetColor(selected.id, null)} title="Sem cor" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <X size={10} color="rgba(255,255,255,0.3)" />
                                        </button>
                                        {NOTE_COLORS.map(c => (
                                            <button key={c.value} onClick={() => handleSetColor(selected.id, c.value)} title={c.label} style={{ width: 18, height: 18, borderRadius: '50%', background: c.value, border: selected.color === c.value ? `2px solid white` : '2px solid transparent', cursor: 'pointer', transition: 'transform .1s' }} onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.2)')} onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* duplicate */}
                        {selected && (
                            <button className="obs-btn" onClick={handleDuplicate} title="Duplicar nota"><Copy size={12} /></button>
                        )}

                        {/* export */}
                        {selected && (
                            <button className="obs-btn" onClick={handleExport} title="Exportar como .md"><Download size={12} /></button>
                        )}

                        {/* full-screen preview */}
                        {selected && (
                            <button className="obs-btn" onClick={() => setFullScreen(true)} title="Visualizar em tela cheia"><Maximize2 size={12} /></button>
                        )}

                        {/* open in new window */}
                        {selected && (
                            <button className="obs-btn" onClick={handleOpenWindow} title="Abrir em nova janela"><ExternalLink size={12} /></button>
                        )}

                        {/* highlights badge + clear */}
                        {selected && currentHighlights.length > 0 && (
                            <button className="obs-btn" onClick={handleClearAllHighlights} title="Remover todos os destaques" style={{ color: '#facc15', borderColor: 'rgba(250,204,21,0.3)', background: 'rgba(250,204,21,0.06)' }}>
                                <Highlighter size={12} /> {currentHighlights.length}
                            </button>
                        )}

                        {/* delete */}
                        {selected && (
                            <button className={`obs-btn ${confirmDel ? 'danger-confirm' : 'danger'}`} onClick={handleDelete} disabled={deleting}>
                                <Trash2 size={12} /> {confirmDel ? 'Confirmar?' : 'Deletar'}
                            </button>
                        )}
                    </div>

                    {/* ── Formatting toolbar (edit/split mode only) ── */}
                    {(mode === 'edit' || mode === 'split') && (
                        <div className="obs-fmt-bar">
                            <button className="obs-fmt-btn" title="Negrito (Ctrl+B)" onClick={() => wrapText('**', '**')}>B</button>
                            <button className="obs-fmt-btn" title="Itálico (Ctrl+I)" style={{ fontStyle: 'italic' }} onClick={() => wrapText('*', '*')}>I</button>
                            <button className="obs-fmt-btn" title="Tachado" style={{ textDecoration: 'line-through' }} onClick={() => wrapText('~~', '~~')}>S</button>
                            <button className="obs-fmt-btn obs-fmt-sep-btn" title="Código inline" style={{ fontFamily: 'monospace', fontSize: 12 }} onClick={() => wrapText('`', '`')}>{"`"}</button>
                            <div className="obs-fmt-sep" />
                            <button className="obs-fmt-btn" title="Título H1" onClick={() => insertLine('# ')} style={{ fontSize: 10 }}>H1</button>
                            <button className="obs-fmt-btn" title="Título H2" onClick={() => insertLine('## ')} style={{ fontSize: 10 }}>H2</button>
                            <button className="obs-fmt-btn" title="Título H3" onClick={() => insertLine('### ')} style={{ fontSize: 10 }}>H3</button>
                            <div className="obs-fmt-sep" />
                            <button className="obs-fmt-btn" title="Lista com marcadores" onClick={() => insertLine('- ')} style={{ fontSize: 14 }}>•</button>
                            <button className="obs-fmt-btn" title="Lista numerada" onClick={() => insertLine('1. ')} style={{ fontSize: 10 }}>1.</button>
                            <button className="obs-fmt-btn" title="Checkbox" onClick={() => insertLine('- [ ] ')} style={{ fontSize: 11 }}>☑</button>
                            <div className="obs-fmt-sep" />
                            <button className="obs-fmt-btn" title="Citação" onClick={() => insertLine('> ')} style={{ fontSize: 14 }}>"</button>
                            <button className="obs-fmt-btn" title="Separador horizontal" onClick={() => insertSnippet('\n\n---\n\n')} style={{ fontSize: 14 }}>—</button>
                            <div className="obs-fmt-sep" />
                            <button className="obs-fmt-btn" title="Link" style={{ fontSize: 10 }} onClick={() => {
                                const ta = textareaRef.current;
                                if (!ta) return;
                                const sel = content.substring(ta.selectionStart, ta.selectionEnd);
                                const snippet = `[${sel || 'texto'}](url)`;
                                const start = ta.selectionStart;
                                setContent(content.substring(0, start) + snippet + content.substring(ta.selectionEnd));
                                requestAnimationFrame(() => { ta.focus(); });
                            }}>🔗</button>
                            <button className="obs-fmt-btn" title="Bloco de código" style={{ fontSize: 10 }} onClick={() => insertSnippet('\n```\n\n```\n')}>{'</>'}</button>
                            <button className="obs-fmt-btn" title="Tabela" style={{ fontSize: 10 }} onClick={() => insertSnippet('\n| Coluna 1 | Coluna 2 | Coluna 3 |\n| --- | --- | --- |\n| | | |\n')}>⊞</button>
                            <div className="obs-autosave" style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace', color: autoSaveStatus === 'pending' ? 'rgba(245,158,11,0.6)' : autoSaveStatus === 'saved' ? 'rgba(16,185,129,0.7)' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {autoSaveStatus === 'pending' && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(245,158,11,0.7)', display: 'inline-block' }} /> salvando...</>}
                                {autoSaveStatus === 'saved' && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(16,185,129,0.7)', display: 'inline-block' }} /> salvo</>}
                                {autoSaveStatus === 'idle' && <span>auto-save</span>}
                            </div>
                        </div>
                    )}

                    {/* content */}
                    <div className="obs-content">
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
                                                if (textareaRef.current) { textareaRef.current.selectionStart = s + 2; textareaRef.current.selectionEnd = s + 2; }
                                            });
                                        }
                                        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); wrapText('**', '**'); }
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); wrapText('*', '*'); }
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); wrapText('`', '`'); }
                                    }}
                                />
                            </div>
                        )}

                        {(mode === 'preview' || mode === 'split') && (
                            <div className="obs-preview-wrap" style={{ flex: 1 }}>
                                {content || title ? (
                                    <>
                                        {title && <h1 className="obs-h1" style={{ marginTop: 0 }}>{title}</h1>}
                                        <ObsidianPreview
                                            content={content}
                                            highlights={currentHighlights}
                                            onRowClick={handleRowClick}
                                        />
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
                            {currentFolderName && (
                                <span style={{ color: 'rgba(74,222,128,0.4)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <FolderIcon size={9} /> {currentFolderName}
                                </span>
                            )}
                            {currentHighlights.length > 0 && (
                                <span className="obs-hl-badge">{currentHighlights.length} destaque{currentHighlights.length !== 1 ? 's' : ''}</span>
                            )}
                        </div>
                        <div className="obs-status-right">
                            {content && <span>{content.split(/\s+/).filter(Boolean).length} palavras</span>}
                            <span>Markdown · Ctrl+S · Tab=indent</span>
                        </div>
                    </div>
                </div>

                {/* empty state */}
                {!selected && !title && !content && (
                    <div className="obs-empty" style={{ left: 252 }}>
                        <div className="obs-empty-icon"><NotebookPen size={24} color="rgba(124,58,237,0.5)" /></div>
                        <div style={{ textAlign: 'center' }}>
                            <p className="obs-empty-title">Selecione uma nota ou crie uma nova</p>
                            <p className="obs-empty-sub">Markdown · Pastas · Tabelas · Ctrl+S · Destaques</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Analytics Dashboard ── */}
            {analyticsOpen && analytics && (
                <div style={{ marginTop: 16, background: '#0d0d0d', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12, padding: 24, fontFamily: 'Inter,system-ui,sans-serif' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BarChart2 size={18} color="#a78bfa" />
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Analytics do Caderno</span>
                        </div>
                        <button onClick={() => setAnalyticsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14} /></button>
                    </div>

                    {/* Score + KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
                        {[
                            { label: 'Score Geral', value: `${analytics.score}/100`, color: analytics.score >= 70 ? '#4ade80' : analytics.score >= 40 ? '#f59e0b' : '#f87171', icon: TrendingUp },
                            { label: 'Notas', value: notes.length, color: '#a78bfa', icon: BookOpen },
                            { label: 'Palavras', value: analytics.totalWords.toLocaleString(), color: '#00f3ff', icon: Hash },
                            { label: 'Caracteres', value: analytics.totalChars.toLocaleString(), color: '#7c9ef8', icon: Hash },
                            { label: 'Fixadas', value: analytics.pinnedCount, color: '#facc15', icon: Pin },
                            { label: 'Média palavras/nota', value: analytics.avgLength, color: 'rgba(255,255,255,0.5)', icon: BarChart2 },
                            { label: 'Com conteúdo', value: analytics.withContent, color: '#34d399', icon: CheckCircle },
                            { label: 'Última atualização', value: analytics.recentNote ? fmtDate(analytics.recentNote.updatedAt) : '—', color: 'rgba(255,255,255,0.3)', icon: Clock },
                        ].map(({ label, value, color, icon: Icon }) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <Icon size={12} color={color} />
                                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</span>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{String(value)}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Top words */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 12px' }}>Palavras mais usadas</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {analytics.topWords.map(({ word, count }) => (
                                    <div key={word} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', width: 100, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
                                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: 2, background: '#a78bfa', width: `${Math.round((count / analytics.maxCount) * 100)}%`, transition: 'width .3s' }} />
                                        </div>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', width: 24, textAlign: 'right' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes per folder */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 12px' }}>Notas por pasta</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {analytics.notesPerFolder.map(({ name, count, color }) => (
                                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', width: 100, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: 2, background: color, width: `${Math.round((count / analytics.maxFolderCount) * 100)}%` }} />
                                        </div>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', width: 24, textAlign: 'right' }}>{count}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Color distribution */}
                            {analytics.colorDist.length > 0 && (
                                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 8px' }}>Cores</p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {analytics.colorDist.map(c => (
                                            <div key={c.color} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
                                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{c.label} ({c.count})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Row Toolbar (floating) ── */}
            {rowToolbar && (
                <div
                    data-row-toolbar
                    className="obs-row-toolbar"
                    style={{
                        top: rowToolbar.rect.bottom + window.scrollY + 6,
                        left: Math.max(8, rowToolbar.rect.left + window.scrollX),
                    }}
                >
                    {isRowHighlighted ? (
                        <button className="obs-row-tb-btn remove" onClick={() => { handleRemoveHighlight(rowToolbar.fingerprint); setRowToolbar(null); }}>
                            <X size={11} /> Remover Destaque
                        </button>
                    ) : (
                        <button className="obs-row-tb-btn hl" onClick={() => handleHighlightRow(rowToolbar.fingerprint)}>
                            <Highlighter size={11} /> Destacar Linha
                        </button>
                    )}
                    <div className="obs-row-tb-sep" />
                    <button className="obs-row-tb-btn new-note" onClick={() => handleNewNoteFromRow(rowToolbar.cells)}>
                        <Sparkles size={11} /> Nova nota com este destaque
                    </button>
                    <div className="obs-row-tb-sep" />
                    <button className="obs-row-tb-btn" onClick={() => setRowToolbar(null)} title="Fechar"><X size={11} /></button>
                </div>
            )}

            {/* ── Full-screen Preview Modal ── */}
            {fullScreen && selected && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BookOpen size={16} color="#a78bfa" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{selected.title}</span>
                            {selected.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected.color, flexShrink: 0, display: 'inline-block' }} />}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleOpenWindow} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}>
                                <ExternalLink size={12} /> Nova janela
                            </button>
                            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}>
                                <Download size={12} /> .md
                            </button>
                            <button onClick={() => setFullScreen(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', fontSize: 11 }}>
                                <X size={12} /> Fechar
                            </button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '32px 10vw' }} className="obs-preview-wrap">
                        <h1 className="obs-h1" style={{ marginTop: 0, fontSize: 26 }}>{selected.title}</h1>
                        <ObsidianPreview content={selected.content} highlights={selected.highlights ?? []} />
                    </div>
                </div>
            )}

            {/* ── Master Directory Modal ── */}
            {showMasterDirModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 16, padding: 24, minWidth: 320, maxWidth: 420, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <FolderTree size={18} color="#a78bfa" />
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                {editingMasterDirId ? 'Editar Diretório Mestre' : 'Novo Diretório Mestre'}
                            </h3>
                        </div>
                        <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.45)', marginBottom: 16, lineHeight: 1.5, fontFamily: 'monospace' }}>
                            Diretórios Mestres agrupam pastas na barra lateral — como workspaces no Obsidian. Crie um para organizar pastas relacionadas sob um mesmo tema.
                        </p>
                        <input
                            value={newMasterDirName}
                            onChange={e => setNewMasterDirName(e.target.value)}
                            placeholder="Nome do diretório..."
                            autoFocus
                            style={{ width: '100%', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#a78bfa', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddMasterDir(); if (e.key === 'Escape') { setShowMasterDirModal(false); setEditingMasterDirId(null); setNewMasterDirName(''); setMasterDirFolderSel([]); } }}
                        />
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.08em' }}>Pastas incluídas neste diretório:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                            {folders.length === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>Nenhuma pasta criada ainda.</p>}
                            {folders.map(f => {
                                const checked = masterDirFolderSel.includes(f.id);
                                return (
                                    <button key={f.id} onClick={() => setMasterDirFolderSel(prev => checked ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, border: checked ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)', background: checked ? 'rgba(74,222,128,0.08)' : 'transparent', color: checked ? '#4ade80' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontWeight: checked ? 600 : 400, transition: 'all .12s' }}>
                                        <FolderIcon size={13} style={{ color: checked ? '#4ade80' : 'rgba(255,255,255,0.2)' }} />
                                        {f.name}
                                        {checked && <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.7 }}>✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleAddMasterDir} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                {editingMasterDirId ? 'Atualizar' : 'Criar Diretório'}
                            </button>
                            <button onClick={() => { setShowMasterDirModal(false); setEditingMasterDirId(null); setNewMasterDirName(''); setMasterDirFolderSel([]); }} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Move Note Modal ── */}
            {moveModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 16, padding: 24, minWidth: 280, maxWidth: 360, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <MoveRight size={18} color="#a78bfa" />
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '.06em' }}>Mover Nota</h3>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14, fontFamily: 'monospace' }}>
                            {notes.find(n => n.id === moveModal.noteId)?.title}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button
                                onClick={() => handleMoveNote(moveModal.noteId, null)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: moveModal.currentFolderId === null ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)', background: moveModal.currentFolderId === null ? 'rgba(74,222,128,0.08)' : 'transparent', color: moveModal.currentFolderId === null ? '#4ade80' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all .12s' }}
                            >
                                <FolderIcon size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> Sem pasta
                                {moveModal.currentFolderId === null && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4ade80' }}>atual</span>}
                            </button>
                            {folders.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => handleMoveNote(moveModal.noteId, f.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: moveModal.currentFolderId === f.id ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)', background: moveModal.currentFolderId === f.id ? 'rgba(74,222,128,0.08)' : 'transparent', color: moveModal.currentFolderId === f.id ? '#4ade80' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all .12s' }}
                                >
                                    <FolderIcon size={14} style={{ color: '#4ade80' }} /> {f.name}
                                    {moveModal.currentFolderId === f.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4ade80' }}>atual</span>}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setMoveModal(null)}
                            style={{ marginTop: 16, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Note item with hover actions ── */
function NoteItem({
    note, isActive, onSelect, onPin, onMove, onColorPick, colorPickerOpen, onSetColor, onDragStart, onDragEnd
}: {
    note: Note;
    isActive: boolean;
    onSelect: () => void;
    onPin: () => void;
    onMove: () => void;
    onColorPick: () => void;
    colorPickerOpen: boolean;
    onSetColor: (c: string | null) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}) {
    const colorInfo = note.color ? NOTE_COLORS.find(c => c.value === note.color) : null;
    return (
        <button
            className={`obs-note-item ${isActive ? 'active' : ''}`}
            onClick={onSelect}
            draggable
            onDragStart={e => { e.stopPropagation(); onDragStart?.(); }}
            onDragEnd={e => { e.stopPropagation(); onDragEnd?.(); }}
            style={{ ...(colorInfo ? { borderLeft: `3px solid ${colorInfo.value}` } : {}), cursor: 'grab' }}
        >
            <span className="obs-note-name">
                {note.pinned && <span style={{ color: '#facc15', marginRight: 4 }}>📌</span>}
                {note.highlights && note.highlights.length > 0 && <span style={{ marginRight: 3, fontSize: 9, color: 'rgba(250,204,21,0.6)' }}>◆</span>}
                {note.title}
            </span>
            <span className="obs-note-date">{fmtDate(note.updatedAt)}</span>
            <div className="obs-note-actions" onClick={e => e.stopPropagation()}>
                <button className="obs-note-action-btn" onClick={onPin} title={note.pinned ? 'Desafixar' : 'Fixar'} style={note.pinned ? { color: '#facc15' } : {}}>
                    {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                </button>
                <button className="obs-note-action-btn" onClick={onMove} title="Mover para pasta">
                    <MoveRight size={11} />
                </button>
                <div style={{ position: 'relative' }} data-color-picker>
                    <button className="obs-note-action-btn" onClick={onColorPick} title="Cor" style={note.color ? { color: note.color } : {}}>
                        <Palette size={11} />
                    </button>
                    {colorPickerOpen && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', display: 'flex', gap: 5, zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.8)' }}>
                            <button onClick={() => onSetColor(null)} style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={9} color="rgba(255,255,255,0.3)" />
                            </button>
                            {NOTE_COLORS.map(c => (
                                <button key={c.value} onClick={() => onSetColor(c.value)} style={{ width: 16, height: 16, borderRadius: '50%', background: c.value, border: note.color === c.value ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
