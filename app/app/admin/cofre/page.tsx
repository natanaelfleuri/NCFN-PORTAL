"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, ChevronDown, File, Folder, FolderOpen, Eye, EyeOff, Search, X, ChevronsDown, ChevronsUp, Shield, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TreeNode = {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: TreeNode[];
};

const EDITABLE_EXTS = new Set(['.md', '.txt']);

function isEditable(name: string) {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    return EDITABLE_EXTS.has(ext);
}

// ─── Tree Node Component ───────────────────────────────────────────────────
function TreeItem({
    node,
    selected,
    onSelect,
    depth = 0,
    forceOpen,
}: {
    node: TreeNode;
    selected: string;
    onSelect: (n: TreeNode) => void;
    depth?: number;
    forceOpen?: boolean | null;
}) {
    const [open, setOpen] = useState(false);
    useEffect(() => { if (forceOpen !== null && forceOpen !== undefined) setOpen(!!forceOpen); }, [forceOpen]);

    if (node.type === 'folder') {
        return (
            <div>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left hover:bg-white/5 transition-colors group"
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                >
                    <span className="text-gray-500 w-3 h-3 flex-shrink-0">
                        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                    {open
                        ? <FolderOpen className="w-3.5 h-3.5 text-[#8b5cf6] flex-shrink-0" />
                        : <Folder className="w-3.5 h-3.5 text-[#8b5cf6] flex-shrink-0" />}
                    <span className="text-xs text-gray-300 truncate font-medium">{node.name}</span>
                </button>
                {open && node.children?.map(child => (
                    <TreeItem key={child.path} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} forceOpen={forceOpen} />
                ))}
            </div>
        );
    }

    const editable = isEditable(node.name);
    const isSelected = selected === node.path;

    return (
        <button
            onClick={() => editable && onSelect(node)}
            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left transition-colors ${
                isSelected
                    ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40'
                    : editable
                    ? 'hover:bg-white/5'
                    : 'opacity-40 cursor-default'
            }`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            title={editable ? node.name : `${node.name} (somente leitura)`}
        >
            <span className="w-3 h-3 flex-shrink-0" />
            <File className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#8b5cf6]' : 'text-gray-500'}`} />
            <span className={`text-xs truncate ${isSelected ? 'text-[#8b5cf6] font-semibold' : 'text-gray-400'}`}>{node.name}</span>
        </button>
    );
}

// ─── Filter tree by search ─────────────────────────────────────────────────
function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
    if (!q) return nodes;
    const lower = q.toLowerCase();
    return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.type === 'folder') {
            const filtered = filterTree(node.children ?? [], q);
            if (filtered.length > 0) acc.push({ ...node, children: filtered });
        } else {
            if (node.name.toLowerCase().includes(lower)) acc.push(node);
        }
        return acc;
    }, []);
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CofrePage() {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(true);
    const [search, setSearch] = useState('');
    const [forceOpen, setForceOpen] = useState<boolean | null>(null);

    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
    const [content, setContent] = useState('');
    const [savedContent, setSavedContent] = useState('');
    const [loadingFile, setLoadingFile] = useState(false);
    const [preview, setPreview] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ── load tree ──────────────────────────────────────────────────────────
    const loadTree = useCallback(async () => {
        setLoadingTree(true);
        try {
            const res = await fetch('/api/vault?action=tree');
            if (res.ok) setTree(await res.json());
        } finally {
            setLoadingTree(false);
        }
    }, []);

    useEffect(() => { loadTree(); }, [loadTree]);

    // ── select file ────────────────────────────────────────────────────────
    const handleSelect = useCallback(async (node: TreeNode) => {
        if (!isEditable(node.name)) return;
        setSelectedNode(node);
        setLoadingFile(true);
        setPreview(false);
        try {
            const res = await fetch(`/api/vault?action=read&path=${encodeURIComponent(node.path)}`);
            if (res.ok) {
                const data = await res.json();
                setContent(data.content);
                setSavedContent(data.content);
            }
        } finally {
            setLoadingFile(false);
        }
    }, []);

    const filteredTree = filterTree(tree, search);

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-[#8b5cf6]/20 bg-black/40 backdrop-blur-xl">

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-white/5">
                {/* header */}
                <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#8b5cf6]" />
                        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Dados e Informações</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setForceOpen(true)}
                            title="Expandir todas as pastas"
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#8b5cf6]/20 transition-colors"
                        >
                            <ChevronsDown className="w-3.5 h-3.5 text-[#8b5cf6]" />
                        </button>
                        <button
                            onClick={() => setForceOpen(false)}
                            title="Fechar todas as pastas"
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#8b5cf6]/20 transition-colors"
                        >
                            <ChevronsUp className="w-3.5 h-3.5 text-[#8b5cf6]" />
                        </button>
                    </div>
                </div>

                {/* search */}
                <div className="px-2 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filtrar notas..."
                            className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}>
                                <X className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                            </button>
                        )}
                    </div>
                </div>

                {/* tree */}
                <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10">
                    {loadingTree ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-4 h-4 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
                        </div>
                    ) : filteredTree.length === 0 ? (
                        <p className="text-center text-xs text-gray-600 py-8 font-mono">
                            {search ? 'Nenhum resultado' : 'Cofre vazio'}
                        </p>
                    ) : (
                        filteredTree.map(node => (
                            <TreeItem key={node.path} node={node} selected={selectedNode?.path ?? ''} onSelect={handleSelect} forceOpen={forceOpen} />
                        ))
                    )}
                </div>
            </aside>

            {/* ── Editor Panel ──────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedNode ? (
                    <>
                        {/* toolbar */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <File className="w-4 h-4 text-[#8b5cf6] flex-shrink-0" />
                                <span className="text-sm font-semibold text-white/90 truncate">{selectedNode.name}</span>
                                <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30 uppercase tracking-wider flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> somente leitura
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setPreview(p => !p)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                        preview
                                            ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#8b5cf6]'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {preview ? 'Raw' : 'Preview'}
                                </button>
                            </div>
                        </div>

                        {/* content area */}
                        {loadingFile ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-[#8b5cf6]/40 border-t-[#8b5cf6] rounded-full animate-spin" />
                            </div>
                        ) : preview ? (
                            <div className="flex-1 overflow-y-auto p-6 relative">
                                {/* Watermark */}
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rotate-[-30deg] select-none">
                                    <span className="text-5xl font-black text-white/5 uppercase tracking-widest whitespace-nowrap">
                                        AUDITORIA — SOMENTE LEITURA
                                    </span>
                                </div>
                                <div className="relative max-w-3xl mx-auto prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-code:text-cyan-300 prose-pre:bg-black/40 prose-a:text-cyan-400 max-w-none">
                                    {content
                                        ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                                        : <span className="text-gray-600 italic">Arquivo vazio.</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex-1 overflow-hidden">
                                {/* Watermark */}
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rotate-[-30deg] select-none z-10">
                                    <span className="text-4xl font-black text-white/[0.04] uppercase tracking-widest whitespace-nowrap">
                                        AUDITORIA — SOMENTE LEITURA
                                    </span>
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    readOnly
                                    spellCheck={false}
                                    className="absolute inset-0 w-full h-full bg-transparent text-sm text-gray-200 font-mono p-6 outline-none resize-none leading-relaxed cursor-default select-text"
                                    style={{ tabSize: 4 }}
                                    placeholder="Arquivo vazio."
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-[#8b5cf6]/60" />
                        </div>
                        <div>
                            <p className="text-white/60 font-semibold text-sm">Nenhum arquivo selecionado</p>
                            <p className="text-gray-600 text-xs mt-1">Selecione um arquivo <code>.md</code> ou <code>.txt</code> na barra lateral</p>
                            <p className="text-[#8b5cf6]/50 text-[10px] mt-2 font-mono uppercase tracking-widest">Auditoria · Somente Leitura</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
