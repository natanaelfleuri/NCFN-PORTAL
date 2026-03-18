"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Folder, FileText, Globe, Search, ArrowRight, ShieldCheck,
    Download, X, CheckSquare, Square, HardDrive, Upload,
    Shield, AlertCircle, Hash, Eye
} from "lucide-react";

type FileItem = {
    folder: string;
    filename: string;
    isPublic: boolean;
    size: number;
    mtime: string;
    hash?: string;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}

/* ── Local Hash Verifier (100% client-side, Web Crypto API) ── */
function LocalHashVerifier() {
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState<'MATCH' | 'NO_MATCH' | 'COMPUTED' | null>(null);
    const [computedHash, setComputedHash] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [referenceHash, setReferenceHash] = useState("");
    const dropRef = useRef<HTMLDivElement>(null);

    const computeHash = async (file: File) => {
        setResult(null);
        setComputedHash(null);
        setFileName(file.name);
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setComputedHash(hex);
        setResult('COMPUTED');
    };

    const verify = () => {
        if (!computedHash || !referenceHash) return;
        setResult(computedHash.toLowerCase() === referenceHash.trim().toLowerCase() ? 'MATCH' : 'NO_MATCH');
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) computeHash(f);
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
                <Hash className="w-4 h-4" /> Verificador de Hash Local
            </div>
            <p className="text-slate-400 text-xs">Verifique qualquer arquivo localmente — <strong className="text-white">100% no seu navegador, sem upload</strong>.</p>

            <div
                ref={dropRef}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-cyan-400 bg-cyan-400/5' : 'border-slate-700 hover:border-slate-500'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => {
                    const inp = document.createElement('input');
                    inp.type = 'file';
                    inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) computeHash(f); };
                    inp.click();
                }}
            >
                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-mono">
                    {fileName ? <span className="text-cyan-400">{fileName}</span> : 'Soltar arquivo aqui'}
                </p>
            </div>

            {computedHash && (
                <div className="space-y-3">
                    <div className="bg-black/40 rounded-lg p-3">
                        <p className="text-slate-500 text-[10px] font-mono uppercase mb-1">SHA-256 Calculado:</p>
                        <p className="text-cyan-300 font-mono text-xs break-all">{computedHash}</p>
                    </div>
                    <input
                        type="text"
                        placeholder="Cole hash de referência para comparar..."
                        value={referenceHash}
                        onChange={e => setReferenceHash(e.target.value)}
                        className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                    <button onClick={verify} disabled={!referenceHash} className="w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/50 disabled:opacity-40 border border-cyan-700/50 rounded-lg text-cyan-300 text-xs font-bold transition">
                        Verificar Integridade
                    </button>
                </div>
            )}

            {result === 'MATCH' && (
                <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/40 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-green-300 text-xs font-bold">MATCH — Arquivo íntegro e autêntico</span>
                </div>
            )}
            {result === 'NO_MATCH' && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/40 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-red-300 text-xs font-bold">ALTERADO / NÃO ENCONTRADO</span>
                </div>
            )}
        </div>
    );
}

/* ── Download Modal ── */
function DownloadModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
    const [accepted, setAccepted] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [done, setDone] = useState(false);

    const handleDownload = async () => {
        if (!accepted) return;
        setDownloading(true);
        try {
            const res = await fetch(`/api/vitrine/download?folder=${encodeURIComponent(file.folder)}&filename=${encodeURIComponent(file.filename)}`, {
                method: 'POST',
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${file.filename}_NCFN_CERTIFY.zip`;
                a.click();
                URL.revokeObjectURL(url);
                setDone(true);
            } else {
                // Fallback: direct download
                const a = document.createElement('a');
                a.href = `/api/download?folder=${encodeURIComponent(file.folder)}&filename=${encodeURIComponent(file.filename)}`;
                a.download = file.filename;
                a.click();
                setDone(true);
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-green-400 text-xs font-mono uppercase mb-2">
                            <ShieldCheck className="w-4 h-4" /> Cadeia de Custódia Ativa
                        </div>
                        <h3 className="text-white font-bold text-lg">{file.filename}</h3>
                        <p className="text-slate-500 text-xs font-mono mt-1">{file.folder}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Metadata */}
                <div className="bg-black/40 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-mono">Tamanho Real</span>
                        <span className="text-white font-mono">{formatBytes(file.size)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-mono">Data de Entrada</span>
                        <span className="text-white font-mono">{new Date(file.mtime).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {file.hash && (
                        <div className="pt-2 border-t border-slate-800">
                            <p className="text-slate-500 text-[10px] font-mono uppercase mb-1">Hash SHA-256</p>
                            <p className="text-cyan-400 font-mono text-xs break-all">{file.hash}</p>
                        </div>
                    )}
                </div>

                {/* Pacote ZIP info */}
                <div className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-4 text-xs text-slate-300">
                    <Download className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p>O download gerará um <strong>.zip</strong> contendo o arquivo original + <code className="bg-black/40 px-1 rounded">certificado_imutabilidade.pdf</code> + <code className="bg-black/40 px-1 rounded">leia-me_verificacao.txt</code></p>
                </div>

                {/* Termo de ciência */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <button onClick={() => setAccepted(!accepted)} className="mt-0.5 shrink-0">
                        {accepted
                            ? <CheckSquare className="w-5 h-5 text-cyan-400" />
                            : <Square className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition" />}
                    </button>
                    <span className="text-slate-400 text-xs leading-relaxed">
                        Declaro ciência de que este acesso, incluindo meu endereço IP e dados de conexão, será <strong className="text-white">registrado permanentemente</strong> nos logs de cadeia de custódia da auditoria para fins legais.
                    </span>
                </label>

                {/* Action */}
                {done ? (
                    <div className="text-center py-3 text-green-400 font-mono text-sm">
                        ✓ Download iniciado — acesso registrado no log de auditoria
                    </div>
                ) : (
                    <button
                        onClick={handleDownload}
                        disabled={!accepted || downloading}
                        className="w-full py-3 bg-cyan-900/40 hover:bg-cyan-800/60 disabled:opacity-30 disabled:cursor-not-allowed border border-cyan-700/50 hover:border-cyan-500/70 rounded-xl text-cyan-300 font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                        {downloading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-t-cyan-400 border-slate-700 rounded-full animate-spin" />
                                Compilando pacote forense...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                BAIXAR PACOTE FORENSE CERTIFICADO
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Main Vitrine Component ── */
export default function VitrinePage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

    useEffect(() => { fetchFiles(); }, []);

    const fetchFiles = async () => {
        try {
            const res = await fetch('/api/files');
            const data = await res.json();
            setFiles(data.filter((f: FileItem) => f.isPublic));
        } catch (err) {
            console.error("Erro ao carregar vitrine:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFiles = files.filter(f =>
        f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.folder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.hash && f.hash.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // If exactly 64 hex chars pasted → direct open modal
    useEffect(() => {
        if (/^[0-9a-f]{64}$/i.test(searchTerm)) {
            const match = files.find(f => f.hash?.toLowerCase() === searchTerm.toLowerCase());
            if (match) setSelectedFile(match);
        }
    }, [searchTerm, files]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Download Modal */}
            {selectedFile && (
                <DownloadModal file={selectedFile} onClose={() => setSelectedFile(null)} />
            )}

            {/* Header */}
            <div className="text-center mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-full text-[#00f3ff] text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
                    <Globe className="w-4 h-4" /> Canal de Distribuição Forense Certificada
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter italic">VITRINE PÚBLICA</h1>
                <p className="text-gray-500 font-mono text-sm max-w-2xl mx-auto uppercase tracking-widest opacity-80">
                    Repositório público de ativos forenses autorizados pelo protocolo NCFN — cada arquivo carrega cadeia de custódia verificável, hash SHA-256 e registro de acesso permanente.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-16 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#00f3ff] transition-colors" />
                <input
                    type="text"
                    placeholder="BUSCAR POR NOME, PASTA OU HASH SHA-256 (64 chars)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 backdrop-blur-xl border border-white/10 focus:border-[#00f3ff]/50 rounded-2xl py-6 pl-16 pr-6 text-white font-mono tracking-widest focus:outline-none transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none text-xs font-mono text-[#00f3ff]">NCFN://QUERY_ENGINE</div>
            </div>

            {/* Main grid: files + verifier */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Files column */}
                <div className="flex-1">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredFiles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredFiles.map((file, idx) => (
                                <div
                                    key={idx}
                                    className="group relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 hover:border-[#00f3ff]/40 rounded-3xl p-6 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,243,255,0.15)] hover:-translate-y-2 cursor-pointer"
                                    onClick={() => setSelectedFile(file)}
                                >
                                    {/* Custody badge */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-900/30 border border-green-500/30 rounded-full px-2 py-1">
                                        <ShieldCheck className="w-3 h-3 text-green-400" />
                                        <span className="text-green-400 text-[9px] font-mono uppercase">Custódia Ativa</span>
                                    </div>

                                    <div className="flex items-start gap-4 mb-6 mt-2">
                                        <div className="p-3 bg-white/5 rounded-2xl text-gray-500 group-hover:text-[#00f3ff] transition-colors">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1 overflow-hidden pr-20">
                                            <h3 className="text-white font-bold text-lg truncate mb-1" title={file.filename}>{file.filename}</h3>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono uppercase">
                                                <Folder className="w-3 h-3" /> {file.folder}
                                            </div>
                                        </div>
                                    </div>

                                    {file.hash && (
                                        <div className="mb-4 bg-black/30 rounded-lg px-3 py-2">
                                            <p className="text-[9px] text-slate-600 font-mono uppercase mb-0.5">SHA-256</p>
                                            <p className="text-cyan-700 font-mono text-[10px] truncate">{file.hash}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                                            {formatBytes(file.size)}
                                        </div>
                                        <div className="inline-flex items-center gap-2 text-xs font-black text-[#00f3ff] uppercase tracking-widest group-hover:gap-4 transition-all">
                                            <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
                            <div className="max-w-xs mx-auto space-y-6">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <Search className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Nenhuma Evidência</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Nenhum arquivo foi marcado como público para exibição na vitrine externa.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: Local Hash Verifier */}
                <div className="w-full lg:w-80 shrink-0">
                    <LocalHashVerifier />
                </div>
            </div>

            {/* Legal Footer */}
            <div className="mt-24 pt-12 border-t border-white/5 text-center">
                <div className="flex items-center justify-center gap-2 text-[#00f3ff]/40 text-xs font-mono uppercase tracking-[0.4em] mb-4">
                    <Shield className="w-4 h-4" /> NCFN Zero-Trust Global Delivery
                </div>
                <p className="text-slate-600 text-[10px] max-w-3xl mx-auto font-mono italic leading-relaxed">
                    Os ativos listados nesta vitrine são protegidos por algoritmos de integridade SHA-256 e estão em conformidade com o protocolo NCFN de preservação de materialidade digital. A alteração de qualquer bit nos arquivos aqui disponibilizados invalidará automaticamente a prova para fins judiciais.
                </p>
            </div>
        </div>
    );
}
