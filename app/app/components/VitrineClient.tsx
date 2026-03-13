"use client";

import { useState, useEffect } from "react";
import { Folder, FileText, Globe, Search, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

type FileItem = {
    folder: string;
    filename: string;
    isPublic: boolean;
    size: number;
    mtime: string;
};

export default function VitrinePage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await fetch('/api/files');
            const data = await res.json();
            // Somente arquivos marcados como públicos aparecem na vitrine
            setFiles(data.filter((f: FileItem) => f.isPublic));
        } catch (err) {
            console.error("Erro ao carregar vitrine:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFiles = files.filter(f =>
        f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.folder.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header Section */}
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
                        placeholder="BUSCAR ATIVO FORENSE, PASTA OU HASH..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 backdrop-blur-xl border border-white/10 focus:border-[#00f3ff]/50 rounded-2xl py-6 pl-16 pr-6 text-white font-mono tracking-widest focus:outline-none transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none text-xs font-mono text-[#00f3ff]">NCFN://QUERY_ENGINE</div>
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredFiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFiles.map((file, idx) => (
                            <div
                                key={idx}
                                className="group relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 hover:border-[#00f3ff]/40 rounded-3xl p-6 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,243,255,0.15)] hover:-translate-y-2"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ShieldCheck className="w-5 h-5 text-[#00f3ff]" />
                                </div>
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-white/5 rounded-2xl text-gray-500 group-hover:text-[#00f3ff] transition-colors">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="text-white font-bold text-lg truncate mb-1" title={file.filename}>{file.filename}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono uppercase">
                                            <Folder className="w-3 h-3" /> {file.folder}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                                        Size: {(file.size / 1024).toFixed(1)}KB
                                    </div>
                                    <Link
                                        href={`/pasta/${file.folder}`}
                                        className="inline-flex items-center gap-2 text-xs font-black text-[#00f3ff] uppercase tracking-widest hover:gap-4 transition-all"
                                    >
                                        Ver Detalhes <ArrowRight className="w-4 h-4" />
                                    </Link>
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

                {/* Footer Security Note */}
                <div className="mt-24 pt-12 border-t border-white/5 flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center gap-2 text-[#00f3ff]/40 text-xs font-mono uppercase tracking-[0.4em]">
                        NCFN Zero-Trust Global Delivery
                    </div>
                    <p className="text-gray-700 text-[9px] uppercase tracking-widest max-w-xl font-mono">
                        Todos os downloads na vitrine pública são monitorados e as identidades de rede registradas para fins forenses conforme o protocolo NCFN de custódia digital.
                    </p>
                </div>
        </div>
    );
}
