"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, ArrowLeft, Search, Archive, CheckCircle, Lock, Loader2, Eye, X, Save, Edit3, Fingerprint, Copy, Trash2, Trash, FileDown, PackageOpen, Bot, ChevronDown, ExternalLink, Info, ShieldCheck, ShieldAlert, FolderOpen, Download, PenLine, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import SecurePreview from '../../../components/SecurePreview';
import Simulated2FA from '../../../components/Simulated2FA';
import AiAnalysisModal from '../../../components/AiAnalysisModal';
import { formatBytes, formatDate } from '../../../utils';

type FileItem = { folder: string; filename: string; isPublic: boolean; size: number; mtime: string; };
type SansaoStatus = Record<string, { status: 'ÍNTEGRO' | 'SUSPEITO'; lastCheck: string }>;

const SANSAO_STATUS_FILE = '_sansao_status.json';

const VAULT_FOLDERS = [
    '0_NCFN-ULTRASECRETOS',
    '1_NCFN-PROVAS-SENSÍVEIS',
    '2_NCFN-ELEMENTOS-DE-PROVA',
    '3_NCFN-DOCUMENTOS-GERENTE',
    '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS',
    '5_NCFN-GOVERNOS-EMPRESAS',
    '6_NCFN-FORNECIDOS_sem_registro_de_coleta',
    '7_NCFN-CAPTURAS-WEB_OSINT',
    '8_NCFN-VIDEOS',
    '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS',
    '10_NCFN-ÁUDIO',
    '11_NCFN- COMPARTILHAMENTO-COM-TERCEIROS',
    '12_NCFN-METADADOS-LIMPOS',
];

const AUTHORIZED_EDITOR = 'fleuriengenharia@gmail.com';
const COMANDOS_FOLDER   = 'COMANDOS - PERITO SANSÃO';

export default function AdminFolderView({ params }: { params: { folder: string } }) {
    const router = useRouter();
    const { data: session } = useSession();
    const folderName = decodeURIComponent(params.folder);
    const isComandos = folderName === COMANDOS_FOLDER;

    const [files, setFiles]           = useState<FileItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [search2, setSearch2]       = useState('');
    const [sortOrder, setSortOrder]   = useState<'A-Z' | 'Z-A' | 'NEWEST'>('NEWEST');
    const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'DOC'>('ALL');
    const [folderSelectorOpen, setFolderSelectorOpen] = useState(false);
    const [sansaoStatus, setSansaoStatus] = useState<SansaoStatus>({});

    // Modals
    const [securePreview, setSecurePreview]     = useState<{ url: string; filename: string; type: 'image' | 'text'; textContent?: string } | null>(null);
    const [editingMarkdown, setEditingMarkdown] = useState<{ folder: string; filename: string; content: string } | null>(null);
    const [hashModal, setHashModal]             = useState<{ filename: string; hashResult: string } | null>(null);
    const [metaModal, setMetaModal]             = useState<{ filename: string; loading: boolean; content: string | null } | null>(null);
    const [cryptoModal, setCryptoModal]         = useState<{ filename: string; action: 'encrypt' | 'decrypt' } | null>(null);
    const [cryptoPassword, setCryptoPassword]   = useState('');
    const [cryptoLoading, setCryptoLoading]     = useState(false);
    const [is2FAOpen, setIs2FAOpen]             = useState(false);
    const [pendingAction, setPendingAction]     = useState<(() => void) | null>(null);
    const [actionTitle, setActionTitle]         = useState('');
    const [aiTarget, setAiTarget]               = useState<string | null>(null);
    const [downloadModal, setDownloadModal]     = useState<string | null>(null);
    const [downloadPassword, setDownloadPassword] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [bundleLoading, setBundleLoading]     = useState<string | null>(null);
    const [encReceiptModal, setEncReceiptModal] = useState<{ filename: string; password: string } | null>(null);

    const isForensicFolder = folderName === '_ACESSO_TEMPORARIO';

    const showToast = (msg: string) => toast(msg, {
        style: { background: '#1a0530', border: '1px solid rgba(188,19,254,0.4)', color: '#fff', fontWeight: 'bold', fontSize: '13px' },
        iconTheme: { primary: '#bc13fe', secondary: '#fff' },
    });

    const fetchFiles = useCallback(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => {
                setFiles(data.filter((f: FileItem) => f.folder === folderName && f.filename !== 'vazio.txt' && !f.filename.endsWith('.RECIBO.txt') && f.filename !== '_sansao_status.json'));
                setLoading(false);
            });
    }, [folderName]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    // Load Perito Sansão status for this folder
    useEffect(() => {
        fetch(`/api/admin/sansao-status?folder=${encodeURIComponent(folderName)}`)
            .then(r => r.json())
            .then(setSansaoStatus)
            .catch(() => {});
    }, [folderName]);

    const saveMarkdown = async () => {
        if (!editingMarkdown) return;
        setLoading(true);
        try {
            const res = await fetch('/api/edit-markdown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingMarkdown) });
            if (res.ok) { showToast('Nota sincronizada!'); setEditingMarkdown(null); fetchFiles(); }
            else showToast('Falha na gravação.');
        } catch { showToast('Erro interno.'); }
        finally { setLoading(false); }
    };

    const handleCryptoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cryptoModal || !cryptoPassword) return;
        setCryptoLoading(true);
        try {
            const endpoint = cryptoModal.action === 'encrypt' ? '/api/encrypt' : '/api/decrypt';
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: folderName, filename: cryptoModal.filename, password: cryptoPassword }) });
            const data = await res.json().catch(() => ({ message: 'Erro.' }));
            if (res.ok) { showToast(data.message || 'Operação concluída.'); setCryptoModal(null); setCryptoPassword(''); fetchFiles(); }
            else showToast(data.message || 'Falha na autorização.');
        } catch { showToast('Erro no motor criptográfico.'); }
        finally { setCryptoLoading(false); }
    };

    const moveToTrash = async (filename: string) => {
        if (!confirm(`Mover "${filename}" para a lixeira?`)) return;
        const res = await fetch('/api/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: folderName, filename, permanent: false }) });
        if (res.ok) { showToast('Arquivo movido para a lixeira.'); fetchFiles(); }
    };

    const deletePermanent = (filename: string) => {
        setActionTitle(`EXCLUSÃO PERMANENTE: ${filename}`);
        setPendingAction(() => async () => {
            const res = await fetch('/api/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: folderName, filename, permanent: true }) });
            if (res.ok) { showToast('Arquivo excluído permanentemente.'); fetchFiles(); }
        });
        setIs2FAOpen(true);
    };

    const handleDownloadSubmit = async () => {
        if (!downloadModal || !downloadPassword) return;
        setDownloadLoading(true);
        const tid = toast.loading('Gerando ZIP criptografado...', { style: { background: '#0a0020', border: '1px solid rgba(0,243,255,0.4)', color: '#fff' } });
        try {
            const res = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: folderName, filename: downloadModal, password: downloadPassword }) });
            if (!res.ok) { toast.error('Erro ao gerar ZIP.', { id: tid }); return; }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `NCFN_${downloadModal}.zip`;
            a.click(); URL.revokeObjectURL(a.href);
            toast.success('ZIP forense baixado!', { id: tid, style: { background: '#001a0a', border: '1px solid rgba(0,243,255,0.4)', color: '#fff' } });
            setDownloadModal(null); setDownloadPassword('');
        } catch { toast.error('Falha ao baixar.', { id: tid }); }
        finally { setDownloadLoading(false); }
    };

    const handleBundleDownload = async (filename: string) => {
        setBundleLoading(filename);
        const tid = toast.loading('Gerando bundle forense...', { style: { background: '#0a0020', border: '1px solid rgba(188,19,254,0.4)', color: '#fff' } });
        try {
            const url = `/api/download-bundle?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(filename)}`;
            const res = await fetch(url);
            if (!res.ok) { toast.error('Erro ao gerar bundle.', { id: tid }); return; }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `bundle_${filename}.zip`;
            a.click(); URL.revokeObjectURL(a.href);
            toast.success('Bundle forense gerado!', { id: tid, style: { background: '#001a0a', border: '1px solid rgba(0,243,255,0.4)', color: '#fff' } });
        } catch { toast.error('Falha ao gerar bundle.', { id: tid }); }
        finally { setBundleLoading(null); }
    };

    const openMeta = async (filename: string) => {
        setMetaModal({ filename, loading: true, content: null });
        try {
            const res = await fetch(`/api/admin/file-meta?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(filename)}`);
            const data = await res.json();
            const content = data.recibo
                ? `METADADOS ORIGINAIS NO MOMENTO DA CUSTÓDIA\n${'─'.repeat(50)}\n\n${data.recibo}`
                : `Nenhum recibo de custódia encontrado para este arquivo.\n\nTamanho atual: ${formatBytes(data.size ?? 0)}\nData de modificação: ${data.mtime ? new Date(data.mtime).toLocaleString('pt-BR') : '—'}\nData de criação: ${data.birthtime ? new Date(data.birthtime).toLocaleString('pt-BR') : '—'}`;
            setMetaModal({ filename, loading: false, content });
        } catch { setMetaModal({ filename, loading: false, content: 'Erro ao carregar metadados.' }); }
    };

    const getIcon = (filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon className="text-[#bc13fe] w-4 h-4" />;
        if (filename.match(/\.(zip|rar|7z)$/i)) return <Archive className="text-yellow-400 w-4 h-4" />;
        return <FileText className="text-[#00f3ff] w-4 h-4" />;
    };

    const getFileType = (filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'IMAGE';
        return 'DOC';
    };

    const filteredAndSortedFiles = useMemo(() => {
        let result = [...files];
        if (search)  result = result.filter(f => f.filename.toLowerCase().includes(search.toLowerCase()));
        if (search2) result = result.filter(f => f.filename.toLowerCase().includes(search2.toLowerCase()));
        if (filterType !== 'ALL') result = result.filter(f => getFileType(f.filename) === filterType);
        result.sort((a, b) => {
            if (sortOrder === 'NEWEST') return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
            const cmp = a.filename.localeCompare(b.filename);
            return sortOrder === 'A-Z' ? cmp : -cmp;
        });
        return result;
    }, [files, search, search2, filterType, sortOrder]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center mt-24 gap-4">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/40 animate-spin" />
            </div>
            <p className="text-[#bc13fe] font-mono text-sm animate-pulse tracking-widest uppercase">Carregando Diretório Restrito...</p>
        </div>
    );

    // ── Modo especial: COMANDOS - PERITO SANSÃO ──────────────────────────────
    if (isComandos) {
        return <ComandosSansaoView files={filteredAndSortedFiles} folderName={folderName} userEmail={session?.user?.email ?? null} editingMarkdown={editingMarkdown} setEditingMarkdown={setEditingMarkdown} saveMarkdown={saveMarkdown} />;
    }

    return (
        <div className="mt-8 space-y-6 max-w-5xl mx-auto">

            {/* ─── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Link href="/admin" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition border border-[#bc13fe]/30 flex-shrink-0">
                        <ArrowLeft className="text-[#bc13fe] w-5 h-5" />
                    </Link>
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-white capitalize truncate">{folderName.replace(/_/g, ' ')}</h2>
                        <p className="text-gray-500 text-xs">{filteredAndSortedFiles.length} documentos</p>
                    </div>
                </div>

                {/* SELECIONAR PASTA DO COFRE */}
                <div className="relative w-full sm:w-auto">
                    <button
                        onClick={() => setFolderSelectorOpen(o => !o)}
                        className="w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 bg-[#bc13fe]/15 hover:bg-[#bc13fe]/25 text-[#bc13fe] font-bold rounded-xl border border-[#bc13fe]/40 transition text-sm"
                    >
                        <FolderOpen className="w-4 h-4" />
                        SELECIONAR PASTA DO COFRE
                        <ChevronDown className={`w-4 h-4 transition-transform ${folderSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {folderSelectorOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-gray-950 border border-[#bc13fe]/30 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden min-w-[280px]">
                            {VAULT_FOLDERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => { setFolderSelectorOpen(false); router.push(`/admin/pasta/${encodeURIComponent(f)}`); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-[#bc13fe]/10 transition border-b border-gray-900 last:border-0 ${f === folderName ? 'text-[#bc13fe] bg-[#bc13fe]/5' : 'text-gray-300'}`}
                                >
                                    {f.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isForensicFolder && (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-2xl text-center">
                    <p className="text-red-400 font-bold text-sm uppercase tracking-widest">⚠️ Pasta de Acesso Temporário</p>
                    <p className="text-gray-400 text-xs mt-1">Arquivos aqui possuem trava de download único. Dados de rede do destinatário serão registrados.</p>
                </div>
            )}

            {/* ─── Barra de busca dupla ─────────────────────────────── */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3 border border-[#bc13fe]/20">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar no vault..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#bc13fe] transition text-sm"
                        />
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bc13fe]/50 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar arquivo nesta pasta..."
                            value={search2}
                            onChange={e => setSearch2(e.target.value)}
                            className="w-full bg-gray-900/80 border border-[#bc13fe]/20 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#bc13fe] transition text-sm"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <select className="flex-1 bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#bc13fe] text-xs" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                        <option value="ALL">Todos</option>
                        <option value="IMAGE">Imagens</option>
                        <option value="DOC">Documentos</option>
                    </select>
                    <select className="flex-1 bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#bc13fe] text-xs" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
                        <option value="NEWEST">Mais Recentes</option>
                        <option value="A-Z">A-Z</option>
                        <option value="Z-A">Z-A</option>
                    </select>
                </div>
            </div>

            {/* ─── Lista de Arquivos ────────────────────────────────── */}
            <div className="bg-gray-900/40 rounded-2xl border border-gray-800/50 overflow-hidden">
                {filteredAndSortedFiles.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-600 gap-3">
                        <FileText className="w-10 h-10 opacity-20" />
                        <p className="text-sm font-mono">Nenhum arquivo encontrado nesta pasta.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-800/50">
                        {filteredAndSortedFiles.map(file => {
                            const isImage    = getFileType(file.filename) === 'IMAGE';
                            const isSystem   = file.filename === '_hashes_vps.txt' || file.filename === '_registros_acesso.txt' || file.filename === SANSAO_STATUS_FILE;
                            const isMarkdown = file.filename.toLowerCase().endsWith('.md');
                            const isTextFile = file.filename.toLowerCase().endsWith('.txt');
                            const status     = sansaoStatus[file.filename];

                            return (
                                <li key={file.filename} className="p-4 hover:bg-white/[0.03] transition">
                                    <div className="flex items-start gap-3">
                                        {/* Ícone */}
                                        <div className="p-2 bg-gray-900 rounded-lg shrink-0 mt-0.5">
                                            {getIcon(file.filename)}
                                        </div>

                                        {/* Info principal */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {/* Nome + Status */}
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                                <span className={`text-sm font-medium truncate ${isSystem ? 'text-[#00f3ff]' : 'text-gray-200'}`}>
                                                    {file.filename}
                                                </span>
                                                {/* Status badge */}
                                                {!isSystem && (
                                                    <span className={`flex-shrink-0 flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                        status?.status === 'ÍNTEGRO'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                            : status?.status === 'SUSPEITO'
                                                                ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                                                                : 'bg-gray-800 text-gray-600 border-gray-700'
                                                    }`}>
                                                        {status?.status === 'ÍNTEGRO' ? <ShieldCheck className="w-2.5 h-2.5" /> : status?.status === 'SUSPEITO' ? <ShieldAlert className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                                        {status?.status ?? 'NÃO VERIFICADO'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metadados de custódia */}
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 font-mono">
                                                <span>{formatBytes(file.size)}</span>
                                                <span>•</span>
                                                <span>Data de entrada: {formatDate(file.mtime)}</span>
                                                {status?.lastCheck && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Últ. perícia: {new Date(status.lastCheck).toLocaleString('pt-BR')}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Ações */}
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                {/* Metadados originais */}
                                                {!isSystem && (
                                                    <button
                                                        onClick={() => openMeta(file.filename)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 text-gray-400 hover:text-[#bc13fe] hover:bg-[#bc13fe]/10 border border-gray-700 hover:border-[#bc13fe]/30 rounded-lg text-[10px] font-bold transition"
                                                        title="Metadados Originais — Momento da Custódia"
                                                    >
                                                        <Info className="w-3.5 h-3.5" />
                                                        METADADOS
                                                    </button>
                                                )}

                                                {/* IR PARA O COFRE CENTRAL */}
                                                {!isSystem && (
                                                    <Link
                                                        href={`/vault?folder=${encodeURIComponent(folderName)}&file=${encodeURIComponent(file.filename)}`}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#bc13fe]/8 text-[#bc13fe]/70 hover:text-[#bc13fe] hover:bg-[#bc13fe]/20 border border-[#bc13fe]/20 hover:border-[#bc13fe]/50 rounded-lg text-[10px] font-bold transition"
                                                        title="Ir para o Cofre Central"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        IR PARA O COFRE CENTRAL
                                                    </Link>
                                                )}

                                                {/* Perito IA */}
                                                {!isSystem && (
                                                    <button
                                                        onClick={() => setAiTarget(file.filename)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 text-[#bc13fe]/60 hover:text-[#bc13fe] hover:bg-[#bc13fe]/10 border border-gray-700 hover:border-[#bc13fe]/30 rounded-lg text-[10px] font-bold transition"
                                                        title="Perito Sansão IA"
                                                    >
                                                        <Bot className="w-3.5 h-3.5" />
                                                        PERITO IA
                                                    </button>
                                                )}

                                                {/* Lixeira + Exclusão (system files hidden) */}
                                                {!isSystem && (
                                                    <div className="flex gap-1 ml-auto">
                                                        <button onClick={() => moveToTrash(file.filename)} className="p-1.5 bg-gray-800 text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/10 border border-gray-700 rounded-lg transition" title="Mover para lixeira">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => deletePermanent(file.filename)} className="p-1.5 bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-500/10 border border-gray-700 rounded-lg transition" title="Excluir permanentemente">
                                                            <Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hash SHA-256 — canto direito */}
                                        {!isSystem && (
                                            <button
                                                onClick={() => {
                                                    const tid = toast.loading('Computando hash...', { style: { background: '#0a0020', border: '1px solid rgba(0,243,255,0.3)', color: '#fff' } });
                                                    fetch(`/api/hash?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)
                                                        .then(r => r.json())
                                                        .then(data => {
                                                            toast.dismiss(tid);
                                                            data.hash ? setHashModal({ filename: file.filename, hashResult: data.hash }) : toast.error('Falha ao obter hash.');
                                                        })
                                                        .catch(() => { toast.dismiss(tid); toast.error('Erro no motor hash.'); });
                                                }}
                                                className="shrink-0 p-2 bg-gray-900 text-[#00f3ff]/50 hover:text-[#00f3ff] hover:bg-[#00f3ff]/10 border border-gray-800 hover:border-[#00f3ff]/30 rounded-lg transition"
                                                title="Hash SHA-256"
                                            >
                                                <Fingerprint className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* ─── Modal Metadados ────────────────────────────────── */}
            {metaModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setMetaModal(null)}>
                    <div className="bg-gray-950 border border-[#bc13fe]/30 rounded-2xl p-6 w-full max-w-2xl shadow-[0_0_50px_rgba(188,19,254,0.15)] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[#bc13fe] font-bold flex items-center gap-2">
                                <Info className="w-5 h-5" /> METADADOS ORIGINAIS — MOMENTO DA CUSTÓDIA
                            </h3>
                            <button onClick={() => setMetaModal(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono mb-4 truncate">{metaModal.filename}</p>
                        {metaModal.loading ? (
                            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-[#bc13fe] animate-spin" /></div>
                        ) : (
                            <pre className="flex-1 overflow-y-auto text-xs text-gray-300 font-mono whitespace-pre-wrap bg-black/40 p-4 rounded-xl border border-gray-800 leading-relaxed">
                                {metaModal.content}
                            </pre>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Modal Hash SHA-256 ────────────────────────────── */}
            {hashModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setHashModal(null)}>
                    <div className="bg-gray-900 border border-[#00f3ff]/30 rounded-2xl p-6 w-full max-w-xl shadow-[0_0_50px_rgba(0,243,255,0.15)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-[#00f3ff] flex items-center gap-2 mb-1"><Fingerprint className="w-6 h-6" /> Hash SHA-256</h3>
                                <p className="text-gray-400 text-xs truncate max-w-sm">{hashModal.filename}</p>
                            </div>
                            <button className="text-gray-500 hover:text-white transition" onClick={() => setHashModal(null)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="bg-black/50 p-4 rounded-xl border border-gray-800 relative group">
                            <p className="font-mono text-gray-300 text-sm break-all leading-relaxed">{hashModal.hashResult}</p>
                            <button onClick={() => { navigator.clipboard.writeText(hashModal.hashResult); showToast('Hash copiado!'); }}
                                className="absolute top-2 right-2 p-2 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/20 rounded-lg opacity-0 group-hover:opacity-100 transition border border-[#00f3ff]/20 flex items-center gap-1 text-xs font-bold">
                                <Copy className="w-4 h-4" /> Copiar
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-4 text-center">* Hash registrado no log de verificação da máquina hospedeira.</p>
                    </div>
                </div>
            )}

            {/* ─── Modal Editor Markdown ────────────────────────── */}
            {editingMarkdown && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 lg:p-12 bg-black/90 backdrop-blur-sm" onClick={() => setEditingMarkdown(null)}>
                    <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col bg-gray-900 border border-gray-700/50 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/50">
                            <h3 className="text-yellow-500 font-bold flex items-center gap-2"><Edit3 className="w-5 h-5" /> Editor: <span className="text-white font-normal">{editingMarkdown.filename}</span></h3>
                            <div className="flex gap-3">
                                <button onClick={saveMarkdown} className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/40 border border-yellow-500/50 rounded-lg text-sm font-bold transition"><Save className="w-4 h-4" /> Salvar</button>
                                <button onClick={() => setEditingMarkdown(null)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <textarea value={editingMarkdown.content} onChange={e => setEditingMarkdown({ ...editingMarkdown, content: e.target.value })}
                            className="flex-grow p-6 bg-gray-950 text-gray-200 font-mono text-sm leading-relaxed resize-none focus:outline-none" spellCheck={false} />
                    </div>
                </div>
            )}

            {/* ─── Modal Criptografia ────────────────────────────── */}
            {cryptoModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => !cryptoLoading && setCryptoModal(null)}>
                    <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-orange-500 mb-4 flex items-center gap-2">
                            {cryptoModal.action === 'encrypt' ? <Lock className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            {cryptoModal.action === 'encrypt' ? 'Blindar Arquivo' : 'Destrancar Arquivo'}
                        </h3>
                        <form onSubmit={handleCryptoSubmit}>
                            <input type="password" value={cryptoPassword} onChange={e => setCryptoPassword(e.target.value)} placeholder="Chave AES-256" autoFocus required
                                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-orange-500 font-mono tracking-widest text-center" />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setCryptoModal(null)} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition" disabled={cryptoLoading}>Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-orange-500/20 text-orange-500 border border-orange-500/50 rounded-lg hover:bg-orange-500/30 font-bold disabled:opacity-50" disabled={cryptoLoading}>
                                    {cryptoLoading ? 'Processando...' : 'Executar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Modal Download ZIP ────────────────────────────── */}
            {downloadModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => !downloadLoading && setDownloadModal(null)}>
                    <div className="bg-[#06070a] border border-[#00f3ff]/30 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-black text-white mb-1">Download Seguro</h3>
                        <p className="text-[10px] text-gray-500 font-mono mb-5 truncate">{downloadModal}</p>
                        <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Senha de Criptografia</label>
                        <input type="password" value={downloadPassword} onChange={e => setDownloadPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDownloadSubmit()} autoFocus
                            className="w-full bg-black/60 border border-gray-700 text-white rounded-xl px-4 py-3 mb-5 focus:outline-none focus:border-[#00f3ff]/60 font-mono text-sm transition" />
                        <div className="flex gap-3">
                            <button onClick={() => setDownloadModal(null)} disabled={downloadLoading} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition text-sm">Cancelar</button>
                            <button onClick={handleDownloadSubmit} disabled={!downloadPassword || downloadLoading} className="flex-1 py-3 bg-[#00f3ff]/15 text-[#00f3ff] border border-[#00f3ff]/40 rounded-xl hover:bg-[#00f3ff]/25 font-black text-sm disabled:opacity-40">
                                {downloadLoading ? 'Gerando...' : 'Baixar ZIP'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal Recibo de Criptografia ─────────────────── */}
            {encReceiptModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                    <div className="bg-[#06070a] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-base font-black text-white mb-1">Upload Concluído — Arquivo Criptografado</h3>
                        <p className="text-[10px] text-gray-500 font-mono mb-4">{encReceiptModal.filename}</p>
                        <p className="text-xs text-red-300 bg-red-950/30 border border-red-700/30 rounded-xl p-3 mb-4">🔐 SALVE ESTA SENHA IMEDIATAMENTE! Sem ela, a recuperação é IMPOSSÍVEL.</p>
                        <div className="flex gap-2 mb-5">
                            <code className="flex-1 bg-black/70 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 font-mono text-sm break-all">{encReceiptModal.password}</code>
                            <button onClick={() => { navigator.clipboard.writeText(encReceiptModal.password); showToast('Senha copiada!'); }}
                                className="px-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/25 transition">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={() => setEncReceiptModal(null)} className="w-full py-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/25 font-black text-sm">
                            Confirmei — Guardei a Senha
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Modals auxiliares ─────────────────────────────── */}
            {securePreview && <SecurePreview url={securePreview.url} filename={securePreview.filename} type={securePreview.type} textContent={securePreview.textContent} onClose={() => setSecurePreview(null)} />}
            <Simulated2FA isOpen={is2FAOpen} onClose={() => setIs2FAOpen(false)} onSuccess={() => pendingAction && pendingAction()} actionName={actionTitle} />
            {aiTarget && <AiAnalysisModal folder={folderName} filename={aiTarget} onClose={() => setAiTarget(null)} />}
        </div>
    );
}

// ── Componente especial: COMANDOS - PERITO SANSÃO ─────────────────────────────
function ComandosSansaoView({ files, folderName, userEmail, editingMarkdown, setEditingMarkdown, saveMarkdown }: {
    files: FileItem[];
    folderName: string;
    userEmail: string | null;
    editingMarkdown: { folder: string; filename: string; content: string } | null;
    setEditingMarkdown: (v: any) => void;
    saveMarkdown: () => Promise<void>;
}) {
    const isAuthorized = userEmail === AUTHORIZED_EDITOR;
    const [editMode, setEditMode]       = useState(false);
    const [contents, setContents]       = useState<Record<string, string>>({});
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    // Load all file contents
    useEffect(() => {
        const mdFiles = files.filter(f => f.filename.endsWith('.md'));
        if (mdFiles.length === 0) { setLoadingFiles(false); return; }

        Promise.all(
            mdFiles.map(f =>
                fetch(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(f.filename)}`)
                    .then(r => r.text())
                    .then(text => [f.filename, text] as [string, string])
                    .catch(() => [f.filename, '(erro ao carregar)'] as [string, string])
            )
        ).then(results => {
            setContents(Object.fromEntries(results));
            setLoadingFiles(false);
        });
    }, [files, folderName]);

    const handleEditClick = () => {
        if (!isAuthorized) { setAccessDenied(true); setTimeout(() => setAccessDenied(false), 3000); return; }
        setEditMode(true);
    };

    const mdFiles = files.filter(f => f.filename.endsWith('.md')).sort((a, b) => a.filename.localeCompare(b.filename));

    return (
        <div className="mt-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-[#bc13fe]/20 pb-6">
                <Link href="/admin" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition border border-[#bc13fe]/30">
                    <ArrowLeft className="text-[#bc13fe] w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">COMANDOS — PERITO SANSÃO</h2>
                    <p className="text-[10px] text-[#bc13fe]/60 font-mono mt-0.5 uppercase tracking-widest">Protocolos forenses por tipo de arquivo · Somente Leitura</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={handleEditClick}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition border ${
                            isAuthorized
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                                : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'
                        }`}
                    >
                        <PenLine className="w-4 h-4" />
                        FAZER ALTERAÇÕES
                    </button>
                    {accessDenied && (
                        <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse">
                            <ShieldX className="w-3 h-3" /> Acesso negado — credencial não autorizada
                        </span>
                    )}
                    {!isAuthorized && !accessDenied && (
                        <span className="text-[9px] text-gray-600 font-mono">Requer: {AUTHORIZED_EDITOR}</span>
                    )}
                </div>
            </div>

            {/* Modo de leitura */}
            {!editMode && (
                <div className="space-y-4">
                    {loadingFiles ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-[#bc13fe] animate-spin" />
                        </div>
                    ) : mdFiles.length === 0 ? (
                        <p className="text-center text-gray-600 py-10 font-mono text-sm">Nenhum protocolo encontrado.</p>
                    ) : (
                        mdFiles.map(f => (
                            <div key={f.filename} className="glass-panel rounded-2xl border border-[#bc13fe]/15 overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-3 bg-[#bc13fe]/5 border-b border-[#bc13fe]/10">
                                    <div className="w-7 h-7 rounded-lg bg-[#bc13fe]/15 border border-[#bc13fe]/30 flex items-center justify-center">
                                        <FileText className="w-3.5 h-3.5 text-[#bc13fe]" />
                                    </div>
                                    <span className="text-xs font-black text-white uppercase tracking-wider">{f.filename.replace('.md', '')}</span>
                                    <span className="ml-auto text-[9px] text-gray-600 font-mono">{formatBytes(f.size)}</span>
                                </div>
                                <pre className="p-5 text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-black/20">
                                    {contents[f.filename] ?? ''}
                                </pre>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modo de edição — apenas para autorizado */}
            {editMode && isAuthorized && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                        <PenLine className="w-4 h-4 flex-shrink-0" />
                        <span>Modo de edição ativo — <strong>{userEmail}</strong>. Alterações afetam os protocolos do Perito Sansão.</span>
                        <button onClick={() => setEditMode(false)} className="ml-auto text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {mdFiles.map(f => (
                        <div key={f.filename} className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/5 border-b border-amber-500/15">
                                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">{f.filename.replace('.md', '')}</span>
                                <button
                                    onClick={() => setEditingMarkdown({ folder: folderName, filename: f.filename, content: contents[f.filename] ?? '' })}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold hover:bg-amber-500/25 transition"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Editar
                                </button>
                            </div>
                            <pre className="p-5 text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto bg-black/20">
                                {contents[f.filename] ?? ''}
                            </pre>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Editor Markdown */}
            {editingMarkdown && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 lg:p-12 bg-black/90 backdrop-blur-sm" onClick={() => setEditingMarkdown(null)}>
                    <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col bg-gray-900 border border-amber-700/50 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/50">
                            <h3 className="text-amber-400 font-bold flex items-center gap-2"><Edit3 className="w-5 h-5" /> Editando: <span className="text-white font-normal">{editingMarkdown.filename}</span></h3>
                            <div className="flex gap-3">
                                <button onClick={saveMarkdown} className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/50 rounded-lg text-sm font-bold transition">
                                    <Save className="w-4 h-4" /> Salvar
                                </button>
                                <button onClick={() => setEditingMarkdown(null)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <textarea
                            value={editingMarkdown.content}
                            onChange={e => setEditingMarkdown({ ...editingMarkdown, content: e.target.value })}
                            className="flex-grow p-6 bg-gray-950 text-gray-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
