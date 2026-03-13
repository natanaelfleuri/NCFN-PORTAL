"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FileText, Image as ImageIcon, Download, ArrowLeft, Search, Archive, CheckCircle, Lock, Unlock, UploadCloud, Loader2, Eye, X, Save, Edit3, Fingerprint, Copy, Trash2, Trash, FileDown, PackageOpen, Bot } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import SecurePreview from '../../../components/SecurePreview';
import Simulated2FA from '../../../components/Simulated2FA';
import AiAnalysisModal from '../../../components/AiAnalysisModal';
import { formatBytes, formatDate } from '../../../utils';

type FileItem = { folder: string; filename: string; isPublic: boolean; size: number; mtime: string; };

export default function AdminFolderView({ params }: { params: { folder: string } }) {
    const folderName = params.folder;
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Filtros
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'NEWEST'>('NEWEST');
    const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'DOC'>('ALL');

    // Preview e Toasts
    const [securePreview, setSecurePreview] = useState<{ url: string; filename: string; type: 'image' | 'text'; textContent?: string } | null>(null);
    const [editingMarkdown, setEditingMarkdown] = useState<{ folder: string, filename: string, content: string } | null>(null);
    const [cryptoModal, setCryptoModal] = useState<{ filename: string, action: 'encrypt' | 'decrypt' } | null>(null);
    const [hashModal, setHashModal] = useState<{ filename: string, hashResult: string } | null>(null);
    const [cryptoPassword, setCryptoPassword] = useState('');
    const [cryptoLoading, setCryptoLoading] = useState(false);
    const [downloadModal, setDownloadModal] = useState<string | null>(null);
    const [downloadPassword, setDownloadPassword] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [encReceiptModal, setEncReceiptModal] = useState<{ filename: string; password: string } | null>(null);
    // toastMessage replaced by react-hot-toast
    const [isDragging, setIsDragging] = useState(false);
    const [is2FAOpen, setIs2FAOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [actionTitle, setActionTitle] = useState('');
    const [bundleLoading, setBundleLoading] = useState<string | null>(null);
    const [aiTarget, setAiTarget] = useState<string | null>(null);

    const isForensicFolder = folderName === '_ACESSO_TEMPORARIO';

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = () => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => {
                const folderFiles = data.filter((f: FileItem) => f.folder === folderName && f.filename !== 'vazio.txt');
                setFiles(folderFiles);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchFiles();
    }, [folderName]);

    const showToast = (msg: string) => toast(msg, {
        style: { background: '#1a0530', border: '1px solid rgba(188,19,254,0.4)', color: '#fff', fontWeight: 'bold', fontSize: '13px' },
        iconTheme: { primary: '#bc13fe', secondary: '#fff' },
    });

    const togglePublic = async (filename: string, isPublic: boolean) => {
        setFiles(files.map(f => f.filename === filename ? { ...f, isPublic: !isPublic } : f));
        await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderName, filename, isPublic: !isPublic })
        });
    };

    const saveMarkdown = async () => {
        if (!editingMarkdown) return;
        setLoading(true);
        try {
            const res = await fetch('/api/edit-markdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingMarkdown)
            });
            if (res.ok) {
                showToast('Nota Markdown sincronizada com sucesso!');
                setEditingMarkdown(null);
                fetchFiles();
            } else {
                showToast('Falha na gravação criptográfica do arquivo.');
            }
        } catch (err) {
            console.error(err);
            showToast('Erro interno no servidor de Salvamento.');
        } finally {
            setLoading(false);
        }
    };

    const handleCryptoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cryptoModal || !cryptoPassword) return;
        setCryptoLoading(true);

        try {
            const endpoint = cryptoModal.action === 'encrypt' ? '/api/encrypt' : '/api/decrypt';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: folderName, filename: cryptoModal.filename, password: cryptoPassword })
            });
            const data = await res.json().catch(() => ({ message: 'Erro inexperado na resposta.' }));

            if (res.ok) {
                showToast(data.message || 'Operação criptográfica concluída.');
                setCryptoModal(null);
                setCryptoPassword('');
                fetchFiles();
            } else {
                showToast(data.message || 'Falha na autorização criptográfica.');
            }
        } catch {
            showToast('Erro interno no Motor Criptográfico.');
        } finally {
            setCryptoLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folderName);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                fetchFiles();
                if (data.encPassword) {
                    setEncReceiptModal({ filename: file.name, password: data.encPassword });
                } else {
                    showToast('Sucesso no Upload!');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length === 0) return;

        setUploading(true);

        // Parallel upload for better performance
        const uploadPromises = droppedFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folderName);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    return { ok: true, password: data.encPassword, name: file.name };
                }
                return null;
            } catch (err) {
                console.error(`Erro ao subir ${file.name}:`, err);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r !== null) as Array<{ ok: boolean; password?: string; name: string }>;
        const successCount = successful.filter(r => r.ok).length;

        setUploading(false);
        if (successCount > 0) {
            fetchFiles();
            // Show first enc password if any
            const withPass = successful.find(r => r.ok && r.password);
            if (withPass) {
                setEncReceiptModal({ filename: withPass.name, password: withPass.password! });
            } else {
                showToast(`${successCount} Ativo(s) sincronizado(s) via DropZone!`);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const moveToTrash = async (filename: string) => {
        if (!confirm(`Mover "${filename}" para a lixeira?`)) return;
        const res = await fetch('/api/trash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderName, filename, permanent: false })
        });
        if (res.ok) {
            showToast('Arquivo movido para a lixeira.');
            fetchFiles();
        }
    };

    const deletePermanent = async (filename: string) => {
        setActionTitle(`EXCLUSÃO PERMANENTE: ${filename}`);
        setPendingAction(() => async () => {
            const res = await fetch('/api/trash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: folderName, filename, permanent: true })
            });
            if (res.ok) {
                showToast('Arquivo excluído permanentemente.');
                fetchFiles();
            }
        });
        setIs2FAOpen(true);
    };

    const handleDeleteAll = async () => {
        setActionTitle(`DESTRUIÇÃO TOTAL: ${folderName}`);
        setPendingAction(() => async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/delete-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder: folderName })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || 'Limpeza concluída.');
                    fetchFiles();
                } else {
                    showToast(data.error || 'Falha na destruição.');
                }
            } catch {
                showToast('Erro interno no servidor.');
            } finally {
                setLoading(false);
            }
        });
        setIs2FAOpen(true);
    };

    const handleDownload = (filename: string) => {
        setDownloadPassword('');
        setDownloadModal(filename);
    };

    const handleDownloadSubmit = async () => {
        if (!downloadModal || !downloadPassword) return;
        setDownloadLoading(true);
        const tid = toast.loading('Gerando ZIP criptografado...', {
            style: { background: '#0a0020', border: '1px solid rgba(0,243,255,0.4)', color: '#fff' },
        });
        try {
            const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: folderName, filename: downloadModal, password: downloadPassword }),
            });
            if (!res.ok) { toast.error('Erro ao gerar ZIP.', { id: tid }); return; }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `NCFN_${downloadModal}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('ZIP forense baixado!', { id: tid, style: { background: '#001a0a', border: '1px solid rgba(0,243,255,0.4)', color: '#fff' } });
            setDownloadModal(null);
            setDownloadPassword('');
        } catch {
            toast.error('Falha ao baixar.', { id: tid });
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleBundleDownload = async (filename: string) => {
        setBundleLoading(filename);
        const tid = toast.loading('Gerando bundle forense...', {
            style: { background: '#0a0020', border: '1px solid rgba(188,19,254,0.4)', color: '#fff' },
        });
        try {
            const url = `/api/download-bundle?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(filename)}`;
            const res = await fetch(url);
            if (!res.ok) { toast.error('Erro ao gerar bundle.', { id: tid }); return; }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `bundle_${filename}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('Bundle forense gerado!', { id: tid, style: { background: '#001a0a', border: '1px solid rgba(0,243,255,0.4)', color: '#fff' } });
        } catch {
            toast.error('Falha ao gerar bundle.', { id: tid });
        } finally {
            setBundleLoading(null);
        }
    };

    const getIcon = (filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon className="text-[#bc13fe] w-5 h-5" />;
        if (filename.match(/\.(zip|rar|7z)$/i)) return <Archive className="text-yellow-400 w-5 h-5" />;
        return <FileText className="text-[#00f3ff] w-5 h-5" />;
    };

    const getFileType = (filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'IMAGE';
        return 'DOC';
    };

    const filteredAndSortedFiles = useMemo(() => {
        let result = [...files];
        if (search) result = result.filter(f => f.filename.toLowerCase().includes(search.toLowerCase()));
        if (filterType !== 'ALL') result = result.filter(f => getFileType(f.filename) === filterType);

        result.sort((a, b) => {
            if (sortOrder === 'NEWEST') return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
            const cmp = a.filename.localeCompare(b.filename);
            return sortOrder === 'A-Z' ? cmp : -cmp;
        });
        return result;
    }, [files, search, filterType, sortOrder]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center mt-24 gap-4">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/40 animate-spin" />
                <div className="absolute inset-4 rounded-full bg-[#bc13fe]/20" />
            </div>
            <p className="text-[#bc13fe] font-mono text-sm animate-pulse tracking-widest uppercase">Carregando Diretório Restrito...</p>
        </div>
    );

    return (
        <div
            className="mt-8 space-y-8 max-w-5xl mx-auto relative min-h-[500px]"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Overlay de Dropzone */}
            {isDragging && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md border-2 border-dashed border-[#bc13fe] rounded-3xl flex flex-col items-center justify-center p-8 pointer-events-none animate-in fade-in duration-300">
                    <div className="relative">
                        <UploadCloud className="w-24 h-24 text-[#bc13fe] animate-bounce mb-4" />
                        <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#00f3ff] rounded-full animate-ping opacity-50"></div>
                    </div>
                    <h2 className="text-4xl font-black uppercase text-white tracking-widest text-center drop-shadow-[0_0_15px_rgba(188,19,254,0.8)] italic">Neural Dropzone</h2>
                    <p className="text-[#00f3ff] font-mono text-xs mt-4 uppercase tracking-[0.3em] opacity-80 animate-pulse">Aguardando Ingestão de Dados...</p>
                </div>
            )}

            {/* Toast via react-hot-toast — renderizado pelo ToastProvider no layout */}

            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Link href="/admin" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition" style={{ border: '1px solid rgba(188, 19, 254, 0.3)' }}>
                        <ArrowLeft className="text-[#bc13fe] w-5 h-5 sm:w-6 sm:h-6" />
                    </Link>
                    <div className="flex-grow min-w-0">
                        <h2 className="text-xl sm:text-3xl font-bold text-white capitalize truncate">{folderName.replace(/_/g, ' ')}</h2>
                        <p className="text-gray-400 text-xs sm:text-sm">Controle Restrito / {filteredAndSortedFiles.length} documentos</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full sm:w-auto flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-grow sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#bc13fe]/20 hover:bg-[#bc13fe]/40 text-white font-bold rounded-xl border border-[#bc13fe]/50 transition shadow-[0_0_15px_rgba(188,19,254,0.3)] disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                        <span className="text-sm">{uploading ? 'Enviando...' : 'Upload'}</span>
                    </button>

                    <a
                        href={`/api/generate-report?folder=${encodeURIComponent(folderName)}`}
                        title="Baixar Relatório Forense"
                        className="p-3 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/30 border border-[#00f3ff]/30 rounded-xl transition shadow-[0_0_15px_rgba(0,243,255,0.1)]"
                    >
                        <FileDown className="w-6 h-6" />
                    </a>

                    <button
                        onClick={handleDeleteAll}
                        title="Limpar pasta (Destruir todos os arquivos)"
                        className="p-3 bg-red-950/40 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-xl transition shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {isForensicFolder && (
                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center text-center shadow-[0_0_30px_rgba(239,68,68,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500 animate-pulse"></div>
                    <h3 className="text-red-400 font-bold text-xl uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                        Aviso: Acesso Temporário e Único
                    </h3>
                    <p className="text-gray-300 max-w-2xl text-sm">
                        Todo arquivo nesta pasta está sujeito à trava de download único. <b>Dados de rede do destinatário serão rastreados e registrados na &quot;Certidão Contábil&quot;</b> gerada durante a primeira transferência. O arquivo em si será bloqueado pelo backend para o mundo em seguida.
                    </p>
                </div>
            )}

            <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between" style={{ border: '1px solid rgba(188, 19, 254, 0.2)' }}>
                <div className="relative w-full lg:w-1/2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar arquivo no vault..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#bc13fe] transition text-sm"
                    />
                </div>
                <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                    <select
                        className="flex-1 lg:flex-none bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:border-[#bc13fe] text-xs sm:text-sm"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as 'ALL' | 'IMAGE' | 'DOC')}
                    >
                        <option value="ALL">Tipos: Todos</option>
                        <option value="IMAGE">Imagens</option>
                        <option value="DOC">Docs</option>
                    </select>
                    <select
                        className="flex-1 lg:flex-none bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:border-[#bc13fe] text-xs sm:text-sm"
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as 'A-Z' | 'Z-A' | 'NEWEST')}
                    >
                        <option value="NEWEST">Recentes</option>
                        <option value="A-Z">A-Z</option>
                        <option value="Z-A">Z-A</option>
                    </select>
                </div>
            </div>

            <div className="bg-gray-900/40 rounded-2xl border border-gray-800/50 overflow-hidden relative">
                {filteredAndSortedFiles.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-gray-800 m-4 rounded-xl flex flex-col items-center justify-center text-gray-500">
                        <UploadCloud className="w-12 h-12 mb-3 opacity-20" />
                        A pasta está vazia. Arraste e solte arquivos aqui para enviar.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-800/50 relative z-10">
                        {filteredAndSortedFiles.map(file => {
                            const isImage = getFileType(file.filename) === 'IMAGE';
                            const isSystemFile = file.filename === '_hashes_vps.txt' || file.filename === '_registros_acesso.txt';
                            const isMarkdown = file.filename.toLowerCase().endsWith('.md');
                            const isTextFile = file.filename.toLowerCase().endsWith('.txt');

                            return (
                                <li key={file.filename}>
                                    <div className="flex flex-col p-4 sm:p-5 hover:bg-white/5 transition group gap-4">
                                        {/* Linha Superior: Ícone, Nome e Metadados */}
                                        <div className="flex items-start gap-4 overflow-hidden w-full">
                                            <div className="p-2 sm:p-3 bg-gray-900 rounded-lg group-hover:bg-gray-800 transition shrink-0">
                                                {getIcon(file.filename)}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-grow">
                                                <span className={`text-sm sm:text-base truncate ${isSystemFile ? 'text-[#00f3ff] font-bold' : 'text-gray-200 group-hover:text-white font-medium'} transition`}>
                                                    {file.filename}
                                                </span>
                                                <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 mt-1">
                                                    <span className="bg-gray-800 px-1.5 py-0.5 rounded">{formatBytes(file.size)}</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="opacity-80">{formatDate(file.mtime)}</span>
                                                </div>
                                            </div>

                                            {!isSystemFile && (
                                                <button
                                                    onClick={() => togglePublic(file.filename, file.isPublic)}
                                                    className={`shrink-0 flex items-center justify-center p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${file.isPublic ? 'bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                                                    title={file.isPublic ? 'Tornar Privado' : 'Tornar Público'}
                                                >
                                                    {file.isPublic ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Barra de Ações Responsiva */}
                                        <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar py-1">
                                            {isImage && !isSystemFile && (
                                                <button
                                                    onClick={() => setSecurePreview({ url: `/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`, filename: file.filename, type: 'image' })}
                                                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs transition"
                                                    title="Visualizar Seguro"
                                                >
                                                    <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Ver</span>
                                                </button>
                                            )}

                                            {(isTextFile || isMarkdown) && (
                                                <button
                                                    onClick={() => {
                                                        fetch(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)
                                                            .then(res => res.text())
                                                            .then(text => setSecurePreview({ url: '', filename: file.filename, type: 'text', textContent: text }));
                                                    }}
                                                    className={`shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs font-semibold transition ${isSystemFile ? 'text-[#00f3ff] hover:border-[#00f3ff]/50' : 'text-green-400 hover:border-green-500/50'}`}
                                                    title="Visualizar Online Seguro"
                                                >
                                                    <Eye className="w-4 h-4" /> {isSystemFile ? 'Ver Log' : 'Ler'}
                                                </button>
                                            )}

                                            {/* Botão para Exibir Hash SHA-256 Sênior */}
                                            {!isSystemFile && (
                                                <button
                                                    onClick={() => {
                                                        const tid = toast.loading('Computando hash...', { style: { background: '#0a0020', border: '1px solid rgba(0,243,255,0.3)', color: '#fff' } });
                                                        fetch(`/api/hash?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                toast.dismiss(tid);
                                                                if (data.hash) {
                                                                    setHashModal({ filename: file.filename, hashResult: data.hash });
                                                                } else {
                                                                    toast.error('Falha ao obter hash.');
                                                                }
                                                            })
                                                            .catch(() => { toast.dismiss(tid); toast.error('Erro no motor hash.'); });
                                                    }}
                                                    className="shrink-0 p-2 bg-gray-800 text-[#00f3ff] hover:bg-[#00f3ff]/20 border border-gray-700 hover:border-[#00f3ff]/30 rounded-lg transition"
                                                    title="Hash SHA-256"
                                                >
                                                    <Fingerprint className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Botão de compartilhamento desativado no momento */}

                                            {isMarkdown && (
                                                <button
                                                    onClick={() => {
                                                        fetch(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)
                                                            .then(res => res.text())
                                                            .then(text => setEditingMarkdown({ folder: folderName, filename: file.filename, content: text }));
                                                    }}
                                                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 text-yellow-500 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500/50 rounded-lg text-xs font-semibold transition"
                                                    title="Editar Nota"
                                                >
                                                    <Edit3 className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
                                                </button>
                                            )}

                                            {/* ── Botão Perito Sansão (IA) ── */}
                                            {!isSystemFile && (
                                                <button
                                                    onClick={() => setAiTarget(file.filename)}
                                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition border ${
                                                        aiTarget === file.filename
                                                            ? 'bg-[#bc13fe]/30 text-[#bc13fe] border-[#bc13fe]/60'
                                                            : 'bg-[#bc13fe]/8 text-[#bc13fe]/70 hover:bg-[#bc13fe]/20 hover:text-[#bc13fe] border-[#bc13fe]/20 hover:border-[#bc13fe]/50'
                                                    }`}
                                                    title="Analisar com IA — Perito Sansão"
                                                >
                                                    <Bot className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Perito IA</span>
                                                </button>
                                            )}

                                            {/* Botão Encriptar removido — upload já gera .enc.bin automaticamente */}

                                            <div className="flex-grow"></div>

                                            <button
                                                onClick={() => handleDownload(file.filename)}
                                                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition border ${(isForensicFolder && !isSystemFile)
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/50'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-[#bc13fe]/20 hover:text-[#bc13fe] border-gray-700 hover:border-[#bc13fe]/30'
                                                    }`}
                                                title="Baixar"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="text-[10px] font-bold sm:text-xs">{(isForensicFolder && !isSystemFile) ? "Único" : (isSystemFile ? "Log" : "Baixar")}</span>
                                            </button>

                                            {!isSystemFile && (
                                                <button
                                                    onClick={() => handleBundleDownload(file.filename)}
                                                    disabled={bundleLoading === file.filename}
                                                    title="Bundle Forense (ZIP + Criptografado + Relatório PDF)"
                                                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition border bg-[#00f3ff]/5 text-[#00f3ff]/60 hover:bg-[#00f3ff]/15 hover:text-[#00f3ff] border-[#00f3ff]/20 hover:border-[#00f3ff]/40 disabled:opacity-40"
                                                >
                                                    {bundleLoading === file.filename
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <PackageOpen className="w-3.5 h-3.5" />
                                                    }
                                                    <span className="text-[9px] font-bold hidden sm:inline">ZIP</span>
                                                </button>
                                            )}

                                            {!isSystemFile && (
                                                <div className="flex gap-1 shrink-0">
                                                    <button
                                                        onClick={() => moveToTrash(file.filename)}
                                                        className="p-2 bg-gray-800 text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-500 border border-gray-700 rounded-lg transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deletePermanent(file.filename)}
                                                        className="p-2 bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-500 border border-gray-700 rounded-lg transition"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Separador entre Arquivos */}
                                    <hr className="border-gray-800/60 mx-4" />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* SecurePreview Modal (Zero-Trust Viewer) */}
            {securePreview && (
                <SecurePreview
                    url={securePreview.url}
                    filename={securePreview.filename}
                    type={securePreview.type}
                    textContent={securePreview.textContent}
                    onClose={() => setSecurePreview(null)}
                />
            )}

            {/* Modal Editor Zettelkasten (Markdowns) */}
            {editingMarkdown && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 lg:p-12 bg-black/90 backdrop-blur-sm" onClick={() => setEditingMarkdown(null)}>
                    <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col bg-gray-900 border border-gray-700/50 rounded-2xl shadow-[0_0_80px_rgba(234,179,8,0.15)] overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800/80 bg-gray-950/50">
                            <h3 className="text-yellow-500 font-bold flex items-center gap-2">
                                <Edit3 className="w-5 h-5" /> Editor Zettelkasten: <span className="text-white font-normal">{editingMarkdown.filename}</span>
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={saveMarkdown}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/40 border border-yellow-500/50 rounded-lg text-sm font-bold transition shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                >
                                    <Save className="w-4 h-4" /> Salvar Sincronização
                                </button>
                                <button className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-red-500/20 rounded-lg transition" onClick={() => setEditingMarkdown(null)}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {/* Area de Texto Sênior */}
                        <textarea
                            value={editingMarkdown.content}
                            onChange={(e) => setEditingMarkdown({ ...editingMarkdown, content: e.target.value })}
                            className="flex-grow w-full p-6 bg-gray-950 text-gray-200 font-mono text-sm sm:text-base leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500/30 transition-shadow"
                            placeholder="Escreva sua documentação ou notas aqui (Sintaxe Markdown suportada)..."
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}

            {/* Modal de Criptografia (AES-256) */}
            {cryptoModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => !cryptoLoading && setCryptoModal(null)}>
                    <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(249,115,22,0.15)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-orange-500 mb-4 flex items-center gap-2">
                            {cryptoModal.action === 'encrypt' ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                            {cryptoModal.action === 'encrypt' ? 'Blindar Arquivo (AES-256)' : 'Destrancar Arquivo'}
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Digite a Chave de Alta Entropia para {cryptoModal.action === 'encrypt' ? 'encapsular' : 'revelar'} o arquivo <b className="text-white">{cryptoModal.filename}</b>.
                        </p>
                        <form onSubmit={handleCryptoSubmit}>
                            <input
                                type="password"
                                value={cryptoPassword}
                                onChange={e => setCryptoPassword(e.target.value)}
                                placeholder="******"
                                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-orange-500 transition font-mono tracking-widest text-center"
                                autoFocus
                                required
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setCryptoModal(null)} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition" disabled={cryptoLoading}>Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-orange-500/20 text-orange-500 border border-orange-500/50 rounded-lg hover:bg-orange-500/30 transition font-bold disabled:opacity-50" disabled={cryptoLoading}>
                                    {cryptoLoading ? 'Processando...' : 'Executar Motor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Hash (AES-256) SHA */}
            {hashModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setHashModal(null)}>
                    <div className="bg-gray-900 border border-[#00f3ff]/30 rounded-2xl p-6 w-full max-w-xl shadow-[0_0_50px_rgba(0,243,255,0.15)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-[#00f3ff] flex items-center gap-2 mb-1">
                                    <Fingerprint className="w-6 h-6" /> Identidade Hash (SHA-256)
                                </h3>
                                <p className="text-gray-400 text-xs truncate max-w-sm">{hashModal.filename}</p>
                            </div>
                            <button className="text-gray-500 hover:text-white transition" onClick={() => setHashModal(null)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="bg-black/50 p-4 rounded-xl border border-gray-800 relative group overflow-hidden">
                            <p className="font-mono text-gray-300 text-sm break-all leading-relaxed">
                                {hashModal.hashResult}
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(hashModal.hashResult);
                                    showToast('Hash copiado para Transferência Segura!');
                                }}
                                className="absolute top-2 right-2 p-2 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/20 rounded-lg opacity-0 group-hover:opacity-100 transition border border-[#00f3ff]/20 flex items-center gap-2 text-xs font-bold"
                            >
                                <Copy className="w-4 h-4" /> Copiar Hash
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 text-center">
                            * O arquivo foi validado e registrado no Report_Log de Hashes na máquina hospedeira.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal 2FA Simulado */}
            <Simulated2FA
                isOpen={is2FAOpen}
                onClose={() => setIs2FAOpen(false)}
                onSuccess={() => pendingAction && pendingAction()}
                actionName={actionTitle}
            />

            {/* Modal IA — Perito Sansão (caixa flutuante) */}
            {aiTarget && (
                <AiAnalysisModal
                    folder={folderName}
                    filename={aiTarget}
                    onClose={() => setAiTarget(null)}
                />
            )}

            {/* Modal — Senha para Download ZIP Criptografado */}
            {downloadModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => !downloadLoading && setDownloadModal(null)}>
                    <div className="bg-[#06070a] border border-[#00f3ff]/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(0,243,255,0.15)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#00f3ff]/10 border border-[#00f3ff]/20 flex items-center justify-center">
                                <Download className="w-5 h-5 text-[#00f3ff]" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">Download Seguro</h3>
                                <p className="text-[10px] text-gray-500 font-mono truncate max-w-[260px]">{downloadModal}</p>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-950/20 border border-amber-700/20 rounded-xl mb-5 text-xs text-amber-300/80 flex items-start gap-2">
                            <span className="mt-0.5">⚠️</span>
                            <div>
                                O arquivo será baixado em formato <strong className="text-amber-200">ZIP</strong> contendo a cópia criptografada (<code>.enc.bin</code>) e o relatório forense.
                                <br /><br />
                                <strong className="text-white">GUARDE A SENHA SOB 7 CHAVES.</strong> Sem ela não será possível recuperar o arquivo criptografado.
                            </div>
                        </div>

                        <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Senha de Criptografia</label>
                        <input
                            type="password"
                            value={downloadPassword}
                            onChange={e => setDownloadPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleDownloadSubmit()}
                            placeholder="Insira uma senha forte..."
                            autoFocus
                            className="w-full bg-black/60 border border-gray-700 text-white rounded-xl px-4 py-3 mb-5 focus:outline-none focus:border-[#00f3ff]/60 font-mono text-sm transition"
                        />

                        <div className="flex gap-3">
                            <button onClick={() => setDownloadModal(null)} disabled={downloadLoading} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition text-sm">Cancelar</button>
                            <button onClick={handleDownloadSubmit} disabled={!downloadPassword || downloadLoading} className="flex-1 py-3 bg-[#00f3ff]/15 text-[#00f3ff] border border-[#00f3ff]/40 rounded-xl hover:bg-[#00f3ff]/25 transition font-black text-sm disabled:opacity-40">
                                {downloadLoading ? 'Gerando ZIP...' : 'Baixar ZIP'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal — Recibo de Criptografia (mostrado após upload) */}
            {encReceiptModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                    <div className="bg-[#06070a] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(52,211,153,0.15)]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">Upload Concluído — Arquivo Criptografado</h3>
                                <p className="text-[10px] text-gray-500 font-mono truncate max-w-[260px]">{encReceiptModal.filename}</p>
                            </div>
                        </div>

                        <div className="p-3 bg-red-950/30 border border-red-700/30 rounded-xl mb-4 text-xs text-red-300/90 flex items-start gap-2">
                            <span className="mt-0.5 text-base">🔐</span>
                            <div>
                                <strong className="text-red-200 text-sm block mb-1">SALVE ESTA SENHA IMEDIATAMENTE!</strong>
                                O arquivo foi criptografado com AES-256. A senha abaixo <strong>não está armazenada no servidor</strong>.
                                Sem ela, a recuperação é <strong>IMPOSSÍVEL</strong>.
                            </div>
                        </div>

                        <div className="relative group mb-5">
                            <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Senha de Criptografia</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-black/70 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 font-mono text-sm break-all">
                                    {encReceiptModal.password}
                                </code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(encReceiptModal.password); showToast('Senha copiada!'); }}
                                    className="px-3 py-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/25 transition"
                                    title="Copiar senha"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-600 font-mono mb-4">
                            Arquivo criptografado salvo como: <span className="text-gray-400">{encReceiptModal.filename}.enc.bin</span>
                        </p>

                        <button
                            onClick={() => setEncReceiptModal(null)}
                            className="w-full py-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/25 transition font-black text-sm"
                        >
                            Confirmei — Guardei a Senha
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
