"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Search, FileText, Image as ImageIcon, Archive, Folder, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

type SearchResultItem = { folder: string; filename: string; size: number; mtime: string; type: 'file' | 'folder' | 'forensic_log'; id?: string; taskName?: string; status?: string; createdAt?: string };

export default function SpotlightSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [allFiles, setAllFiles] = useState<SearchResultItem[]>([]);
    const [forensicResults, setForensicResults] = useState<SearchResultItem[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Load all files for local search
            fetch('/api/files')
                .then(res => res.json())
                .then(data => {
                    const formatted: SearchResultItem[] = data
                        .filter((f: any) => f.filename !== 'vazio.txt')
                        .map((f: any) => ({ ...f, type: 'file' }));
                    setAllFiles(formatted);

                    // Se não tiver query, não mostra nada
                    if (query) {
                        filterResults(query, formatted);
                    }
                })
                .catch(console.error);

            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults([]);
            setForensicResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && query.trim()) {
            filterResults(query, allFiles);
            // Search forensics from server
            fetch(`/api/search/forensics?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => setForensicResults(data))
                .catch(console.error);
        } else {
            setForensicResults([]);
        }
    }, [query, allFiles, isOpen]);

    const filterResults = (searchQuery: string, dataToSearch: SearchResultItem[]) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const q = searchQuery.toLowerCase();

        // Pesquisa pseudo-fuzzy nos arquivos
        const fileMatches = dataToSearch.filter(f =>
            f.filename.toLowerCase().includes(q) ||
            f.folder.toLowerCase().includes(q)
        );

        // Identifica pastas únicas que batem com a busca para sugerir a pasta inteira
        const folderNames = Array.from(new Set(dataToSearch.map(f => f.folder)));
        const folderMatches = folderNames
            .filter(folder => folder.toLowerCase().includes(q))
            .map(folder => ({ folder, filename: folder, size: 0, mtime: new Date().toISOString(), type: 'folder' as const }));

        // Combine categories
        setResults([...folderMatches, ...fileMatches].slice(0, 15)); 
    };

    const getIcon = (item: SearchResultItem) => {
        if (item.type === 'folder') return <Folder className="text-[#ffdd00] w-5 h-5" />;
        if (item.type === 'forensic_log') return <Search className="text-[#00ff41] w-5 h-5 animate-pulse" />;
        if (item.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon className="text-[#bc13fe] w-5 h-5" />;
        if (item.filename.match(/\.(zip|rar|7z)$/i)) return <Archive className="text-yellow-400 w-5 h-5" />;
        return <FileText className="text-[#00f3ff] w-5 h-5" />;
    };

    if (!isOpen) return null;

    const allCombined = [...results, ...forensicResults];

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[10vh] p-4 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 py-4 border-b border-gray-800 bg-black/50">
                    <Search className="w-6 h-6 text-[#bc13fe] mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Pesquisar ativos, processos ou materialidade Ciber-Gaeco..."
                        className="flex-grow bg-transparent text-white text-lg focus:outline-none placeholder-gray-600"
                    />
                    <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 hover:text-white rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {query && allCombined.length === 0 && (
                        <div className="p-8 text-center text-gray-500 font-mono text-sm">
                            Nenhum ativo logado sob o parâmetro &quot;{query}&quot;.
                        </div>
                    )}

                    {!query && (
                        <div className="p-8 text-center text-gray-700 font-mono text-xs uppercase tracking-widest flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-2 border-[#bc13fe] border-t-transparent rounded-full animate-spin flex items-center justify-center">
                                <Search className="w-6 h-6 text-[#bc13fe]" />
                            </div>
                            <span className="border border-gray-800 px-3 py-1 rounded bg-black">CTRL + K</span>
                            Spotlight Motor Ativado. Aguardando query operacional.
                        </div>
                    )}

                    {allCombined.length > 0 && (
                        <ul className="p-2">
                            {allCombined.map((res, i) => (
                                <li key={i}>
                                    <Link
                                        href={
                                            res.type === 'folder' ? `/admin/pasta/${res.folder}` : 
                                            res.type === 'forensic_log' ? `/admin/investigator` :
                                            `/api/download?folder=${encodeURIComponent(res.folder)}&filename=${encodeURIComponent(res.filename)}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition group"
                                    >
                                        <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 group-hover:border-gray-700 transition">
                                            {getIcon(res)}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h4 className={`truncate ${
                                                res.type === 'folder' ? 'text-[#ffdd00] font-bold uppercase tracking-wider text-sm' : 
                                                res.type === 'forensic_log' ? 'text-[#00ff41] font-bold text-sm' :
                                                'text-gray-200 group-hover:text-white font-medium'
                                            }`}>
                                                {res.type === 'forensic_log' ? `PROC: ${res.taskName}` : res.filename}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest truncate">
                                                {res.type === 'forensic_log' 
                                                  ? `Status: ${res.status} | Data: ${new Date(res.createdAt!).toLocaleString('pt-BR')}`
                                                  : `Caminho: /${res.folder} ${res.type === 'file' && ` | ${(res.size / 1024).toFixed(1)} KB`}`
                                                }
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#bc13fe] transition -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-3 border-t border-gray-800/50 bg-black/80 flex items-center justify-between text-[10px] uppercase font-mono tracking-widest text-gray-600">
                    <span>NCFN Global Indexed Search + Moltbot Forensics</span>
                    <span>ESC para sair</span>
                </div>
            </div>
        </div>
    );
}
