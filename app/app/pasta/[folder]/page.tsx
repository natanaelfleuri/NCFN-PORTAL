"use client";
import { useEffect, useState, useMemo } from 'react';
import { FileText, Image as ImageIcon, Download, ArrowLeft, Search, Archive, Eye, X, Share2 } from 'lucide-react';
import Link from 'next/link';
import PublicAuth from '../../components/PublicAuth';
import ShareModal from '../../components/ShareModal';
import { formatBytes, formatDate } from '../../utils';

type FileItem = { folder: string; filename: string; isPublic: boolean; size: number; mtime: string; };

export default function PublicFolderView({ params }: { params: { folder: string } }) {
    const folderName = params.folder;
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'NEWEST'>('NEWEST');
    const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'DOC'>('ALL');

    // Lightbox e Feedback
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewText, setPreviewText] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [shareFile, setShareFile] = useState<string | null>(null);
    const [whoAvailable, setWhoAvailable] = useState<Record<string, string>>({});

    const isForensicFolder = folderName === '9_ACESSO_TEMPORARIO_E_UNICO';

    useEffect(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => {
                const folderFiles = data.filter((f: FileItem) => f.folder === folderName && f.isPublic && f.filename !== 'vazio.txt');
                setFiles(folderFiles);
                setLoading(false);
            });
    }, [folderName]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const getIcon = (filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon className="text-[#bc13fe] w-6 h-6" />;
        if (filename.match(/\.(zip|rar|7z)$/i)) return <Archive className="text-yellow-400 w-6 h-6" />;
        return <FileText className="text-[#00f3ff] w-6 h-6" />;
    };

    const getFileType = (filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'IMAGE';
        return 'DOC';
    };

    const handleDownload = async (filename: string) => {
        try {
            const res = await fetch(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(filename)}`);

            // If the response is HTML (like the 403 block we converted to 200), we should display it
            if (res.headers.get('content-type')?.includes('text/html')) {
                const html = await res.text();
                document.open();
                document.write(html);
                document.close();
                return;
            }

            if (!res.ok) {
                showToast("Erro ao baixar arquivo (Pode já ter sido consumido).");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Se for pasta forense, a certidão foi gerada, então recarregamos a lista
            if (isForensicFolder) {
                showToast("Arquivo consumido. Certidão gerada com sucesso.");
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error) {
            console.error(error);
            showToast("Erro na transação forense.");
        }
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

    if (loading) return <div className="text-center mt-20 text-[#00f3ff] animate-pulse">Carregando Diretório...</div>;

    return (
        <PublicAuth>
            <div className="mt-8 space-y-8 max-w-5xl mx-auto relative">

                {/* Toast Notification */}
                {toastMessage && (
                    <div className="fixed top-8 right-8 z-[200] bg-[#00f3ff]/90 text-gray-900 px-6 py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(0,243,255,0.5)] animate-bounce">
                        {toastMessage}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Link href="/" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition neon-border">
                            <ArrowLeft className="text-[#00f3ff] w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <div className="flex-grow min-w-0">
                            <h2 className="text-xl sm:text-3xl font-bold text-white capitalize truncate">{folderName.replace(/_/g, ' ')}</h2>
                            <p className="text-gray-400 text-xs sm:text-sm">Vitrine Pública ({filteredAndSortedFiles.length} arquivos)</p>
                        </div>
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
                            Ao fazer o download de qualquer arquivo contido nesta jurisdição, <b>seus dados de conexão (IP, Navegador, Data/Hora) serão capturados integralmente</b>.
                            Uma Certidão Jurídica oficial será lavrada de imediato anexada à pasta, e o arquivo em si será <b>INUTILIZADO E BLOQUEADO</b> para consultas futuras. <br /><br />
                            Prossiga com a descarga apenas se você for o destinatário primário autorizado.
                        </p>
                    </div>
                )}

                <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-1/2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar arquivo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-900/80 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#00f3ff] transition text-sm"
                        />
                    </div>
                    <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                        <select
                            className="flex-1 lg:flex-none bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:border-[#00f3ff] text-xs sm:text-sm"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value as 'ALL' | 'IMAGE' | 'DOC')}
                        >
                            <option value="ALL">Tipos: Todos</option>
                            <option value="IMAGE">Imagens</option>
                            <option value="DOC">Docs</option>
                        </select>
                        <select
                            className="flex-1 lg:flex-none bg-gray-900/80 border border-gray-700 text-white rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:border-[#00f3ff] text-xs sm:text-sm"
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as 'A-Z' | 'Z-A' | 'NEWEST')}
                        >
                            <option value="NEWEST">Recentes</option>
                            <option value="A-Z">A-Z</option>
                            <option value="Z-A">Z-A</option>
                        </select>
                    </div>
                </div>

                <div className="bg-gray-900/40 rounded-2xl border border-gray-800/50 overflow-hidden">
                    {filteredAndSortedFiles.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">Nenhum arquivo encontrado.</div>
                    ) : (
                        <ul className="divide-y divide-gray-800/50 relative z-10">
                            {filteredAndSortedFiles.map(file => {
                                const isImage = getFileType(file.filename) === 'IMAGE';
                                const isCertidao = file.filename.includes('_CERTIDAO_ACESSO');
                                const isTextFile = file.filename.toLowerCase().endsWith('.txt');

                                return (
                                    <li key={file.filename} className="flex flex-col p-4 sm:p-5 hover:bg-white/5 transition group gap-4">
                                        <div className="flex items-start gap-4 overflow-hidden w-full">
                                            <div className="p-2 sm:p-3 bg-gray-900 rounded-lg group-hover:bg-gray-800 transition shrink-0">
                                                {getIcon(file.filename)}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-grow">
                                                <button
                                                    onClick={() => {
                                                        if (isImage && !isCertidao) setPreviewImage(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`);
                                                        else if (isCertidao || isTextFile) {
                                                            fetch(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)
                                                                .then(res => res.text())
                                                                .then(text => setPreviewText(text));
                                                        }
                                                    }}
                                                    className={`truncate text-left focus:outline-none ${isCertidao ? 'text-red-400 font-bold' : 'text-gray-200 hover:text-[#00f3ff] group-hover:text-white font-medium'} transition text-base sm:text-lg`}
                                                    title="Visualizar"
                                                >
                                                    {file.filename}
                                                </button>
                                                <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 mt-1">
                                                    <span className="bg-gray-800 px-1.5 py-0.5 rounded">{formatBytes(file.size)}</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="opacity-80">{formatDate(file.mtime)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {folderName.includes('9_') && !isCertidao && (
                                            <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800 flex flex-col sm:flex-row sm:items-center gap-2">
                                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0">Destinatário:</span>
                                                <input
                                                    type="text"
                                                    placeholder="Identificação do recebedor"
                                                    className="bg-black/40 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#00f3ff] w-full transition"
                                                    onChange={(e) => setWhoAvailable(prev => ({ ...prev, [file.filename]: e.target.value }))}
                                                    value={whoAvailable[file.filename] || ''}
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar py-1">
                                            {(isImage && !isCertidao) && (
                                                <button
                                                    onClick={() => setPreviewImage(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)}
                                                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-semibold transition"
                                                >
                                                    <Eye className="w-4 h-4" /> Ver
                                                </button>
                                            )}

                                            {(isCertidao || isTextFile) && (
                                                <button
                                                    onClick={() => {
                                                        fetch(`/api/download?folder=${encodeURIComponent(folderName)}&filename=${encodeURIComponent(file.filename)}`)
                                                            .then(res => res.text())
                                                            .then(text => setPreviewText(text));
                                                    }}
                                                    className={`shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs font-semibold transition ${isCertidao ? 'text-red-400 hover:border-red-500/50' : 'text-green-400 hover:border-green-500/50'}`}
                                                >
                                                    <Eye className="w-4 h-4" /> {isCertidao ? 'Fiscalizar' : 'Ler'}
                                                </button>
                                            )}

                                            {!isCertidao && (
                                                <button
                                                    onClick={() => setShareFile(file.filename)}
                                                    className="shrink-0 p-2 bg-gray-800 text-[#00f3ff] hover:bg-[#00f3ff]/20 border border-gray-700 hover:border-[#00f3ff]/30 rounded-lg transition"
                                                    title="Share"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <div className="flex-grow"></div>

                                            <button
                                                onClick={() => handleDownload(file.filename)}
                                                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition border ${(isForensicFolder && !isCertidao)
                                                    ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                                    : 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff]/30 hover:bg-[#00f3ff]/20'
                                                    }`}
                                            >
                                                <Download className="w-4 h-4 shrink-0" />
                                                {(isForensicFolder && !isCertidao) ? "Único" : (isCertidao ? "Certidão" : "Baixar")}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Modal Lightbox (Image Preview) */}
                {previewImage && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
                        <button className="absolute top-6 right-6 text-gray-400 hover:text-white transition" onClick={() => setPreviewImage(null)}>
                            <X className="w-10 h-10" />
                        </button>
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-screen object-contain rounded-xl shadow-[0_0_50px_rgba(0,243,255,0.2)]" onClick={e => e.stopPropagation()} />
                    </div>
                )}

                {/* Modal Documento de Texto (Certidões/TXT) */}
                {previewText && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewText(null)}>
                        <button className="absolute top-6 right-6 text-gray-400 hover:text-white transition" onClick={() => setPreviewText(null)}>
                            <X className="w-10 h-10" />
                        </button>
                        <div
                            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-gray-950 border border-gray-800 rounded-xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.15)]"
                            onClick={e => e.stopPropagation()}
                        >
                            <pre className="text-green-400 font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                {previewText}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Modal de Compartilhamento (Sênior) */}
                <ShareModal
                    isOpen={!!shareFile}
                    onClose={() => setShareFile(null)}
                    filename={shareFile || ''}
                    folder={folderName}
                    showToast={showToast}
                />

            </div>
        </PublicAuth>
    );
}
