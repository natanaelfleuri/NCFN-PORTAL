"use client";
import { useEffect, useState } from 'react';
import { Folder, ShieldAlert, HardDrive, Database, Eye, Activity, Bot } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBytes } from '../utils';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), { ssr: false });

type FileItem = {
    folder: string;
    filename: string;
    isPublic: boolean;
    size: number;
    mtime: string;
};

export default function AdminDashboard() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => {
                setFiles(data);
                setLoading(false);
            })
            .catch(_err => {
                console.error("Failed to fetch files:", _err);
                setLoading(false);
            });
    }, []);

    const groupedFiles = files.reduce((acc, file) => {
        if (file.filename === 'vazio.txt') return acc;
        if (!acc[file.folder]) acc[file.folder] = [];
        acc[file.folder].push(file);
        return acc;
    }, {} as Record<string, FileItem[]>);

    const folders = Object.keys(groupedFiles);

    // Calc Dashboard Stats
    const totalFiles = files.filter(f => f.filename !== 'vazio.txt').length;
    const totalSize = files.reduce((acc, f) => f.filename !== 'vazio.txt' ? acc + f.size : acc, 0);
    const recentFilesCount = files.filter(f => {
        const fileDate = new Date(f.mtime);
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return fileDate > dayAgo && f.filename !== 'vazio.txt';
    }).length;

    if (loading) return <div className="text-center mt-20 text-[#bc13fe] animate-pulse">Acessando Centro de Comando...</div>;

    return (
        <div className="mt-8 space-y-12 pb-20 max-w-7xl mx-auto">
            <div className="text-center mb-10 lg:mb-12 space-y-2 px-4">
                <div className="inline-flex items-center justify-center p-3 bg-red-900/20 border border-red-500/50 rounded-full mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <Activity className="text-red-500 w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-3xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bc13fe] tracking-tighter" style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.4)' }}>
                    CÉREBRO FORENSE
                </h2>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-400 text-xs lg:text-sm uppercase tracking-widest font-mono">Monitoramento Global de Ativos e Diretórios</p>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full opacity-50">
                        <span className="text-[10px] font-mono text-gray-500">Pressione</span>
                        <kbd className="text-[10px] font-mono text-[#bc13fe] bg-black px-1.5 py-0.5 rounded border border-[#bc13fe]/30">⌘ K</kbd>
                        <span className="text-[10px] font-mono text-gray-500">para busca global</span>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-2 lg:px-0">
                <div className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/30 flex flex-col items-center text-center">
                    <Database className="w-8 h-8 text-[#bc13fe] mb-3" />
                    <span className="text-2xl font-black text-white">{totalFiles}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Arquivos Operacionais</span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-[#00f3ff]/30 flex flex-col items-center text-center">
                    <HardDrive className="w-8 h-8 text-[#00f3ff] mb-3" />
                    <span className="text-2xl font-black text-white">{formatBytes(totalSize)}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Cópia Alocada</span>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-yellow-500/30 flex flex-col items-center text-center">
                    <Activity className="w-8 h-8 text-yellow-500 mb-3" />
                    <span className="text-2xl font-black text-white">{recentFilesCount}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Novos (24H)</span>
                </div>
                <Link href="/admin/forensics" className="glass-panel p-6 rounded-2xl border border-green-500/30 flex flex-col items-center text-center hover:bg-green-500/5 transition group">
                    <Eye className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition" />
                    <span className="text-2xl font-black text-white">Ativo</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Status Zero-Trust</span>
                </Link>
                <Link href="/admin/security" className="glass-panel p-6 rounded-2xl border border-red-500/30 flex flex-col items-center text-center hover:bg-red-500/5 transition group">
                    <ShieldAlert className="w-8 h-8 text-red-500 mb-3 group-hover:scale-110 transition animate-pulse" />
                    <span className="text-2xl font-black text-white">Crise</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Protocolo Terminal</span>
                </Link>
                <Link href="/admin/moltbot" className="glass-panel p-6 rounded-2xl border border-[#bc13fe]/30 flex flex-col items-center text-center hover:bg-[#bc13fe]/5 transition group">
                    <Bot className="w-8 h-8 text-[#bc13fe] mb-3 group-hover:scale-110 transition shadow-[0_0_15px_rgba(188,19,254,0.3)]" />
                    <span className="text-2xl font-black text-white">Moltbot</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Agente Autônomo</span>
                </Link>
            </div>

            <div className="flex items-center gap-4 py-4 px-2">
                <h3 className="text-xl font-bold uppercase tracking-wider text-gray-300">Setores de Armazenamento</h3>
                <div className="h-px bg-gray-800 flex-grow"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8 px-2 lg:px-0 mt-4">
                {folders.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 py-10">Nenhum diretório local detectado.</p>
                ) : (
                    folders.map(folder => {
                        const isSystem = folder.startsWith('_');
                        return (
                            <Link key={folder} href={`/admin/pasta/${folder}`}>
                                <div
                                    className={`glass-panel p-6 lg:p-8 rounded-2xl cursor-pointer h-full flex flex-col items-center justify-center gap-3 lg:gap-4 transition-all hover:scale-[1.02] ${isSystem ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}`}
                                    style={{ border: isSystem ? undefined : '1px solid rgba(188, 19, 254, 0.3)' }}
                                >
                                    {isSystem ? (
                                        <ShieldAlert className="text-red-500 w-12 h-12 lg:w-20 lg:h-20 mb-1 lg:mb-2 animate-pulse" />
                                    ) : (
                                        <Folder className="text-[#bc13fe] w-12 h-12 lg:w-20 lg:h-20 mb-1 lg:mb-2" />
                                    )}
                                    <h3 className={`text-xl lg:text-2xl font-bold capitalize text-center truncate w-full ${isSystem ? 'text-red-400' : 'text-white opacity-90'}`}>
                                        {folder.replace(/_/g, ' ')}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs lg:text-sm px-3 py-1.5 rounded-full font-semibold ${isSystem ? 'bg-red-500/20 text-red-500' : 'bg-[#bc13fe]/10 text-[#bc13fe]'}`}>
                                            {groupedFiles[folder].length} {groupedFiles[folder].length === 1 ? 'Arquivo' : 'Arquivos'}
                                        </span>
                                        {isSystem && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter shadow-lg">System</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Central Forense - Dashboard Map */}
            <hr className="border-[#bc13fe]/20 my-16" />
            <MapDashboard />
        </div>
    );
}
