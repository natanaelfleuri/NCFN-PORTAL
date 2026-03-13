"use client";
import { useEffect, useState } from 'react';
import { Folder, ShieldAlert, HardDrive, Database, Eye, Activity, Bot, Search, FileSearch, Trash2, Users, FileText, Globe, Cpu, TrendingUp, Clock, BookOpen, Lock, KeyRound } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBytes } from '../utils';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), { ssr: false });
const AdminCharts  = dynamic(() => import('../components/AdminCharts'), { ssr: false });

type FileItem = {
    folder: string;
    filename: string;
    isPublic: boolean;
    size: number;
    mtime: string;
};

const MODULES = [
    { href: '/admin/pericia-arquivo', icon: FileSearch, label: 'Perícia de Arquivo', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)' },
    { href: '/admin/captura-web', icon: Globe, label: 'Captura Web', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
    { href: '/admin/investigar', icon: Search, label: 'Investigação OSINT', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
    { href: '/admin/relatorios', icon: FileText, label: 'Laudos & Relatórios', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
    { href: '/admin/convidados', icon: Users, label: 'Convidados', color: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)' },
    { href: '/admin/lixeira', icon: Trash2, label: 'Lixeira Forense', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
    { href: '/admin/logs', icon: Database, label: 'Logs do Sistema', color: '#14b8a6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.25)' },
    { href: '/admin/ia-config', icon: Bot, label: 'Config IA', color: '#00f3ff', bg: 'rgba(0,243,255,0.08)', border: 'rgba(0,243,255,0.25)' },
    { href: '/admin/forensics', icon: Eye, label: 'Painel Forense', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
    { href: '/admin/security', icon: ShieldAlert, label: 'Segurança', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
    { href: '/admin/laudo-forense', icon: TrendingUp, label: 'Laudo com IA', color: '#bc13fe', bg: 'rgba(188,19,254,0.08)', border: 'rgba(188,19,254,0.25)' },
    { href: '/admin/teste', icon: Cpu, label: 'Testes de Sistema', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)' },
    { href: '/admin/cofre', icon: BookOpen, label: 'Cofre Obsidian', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' },
    { href: '/admin/auditoria-sansao', icon: FileSearch, label: 'Auditoria Sansão', color: '#bc13fe', bg: 'rgba(188,19,254,0.08)', border: 'rgba(188,19,254,0.25)' },
    { href: '/vault', icon: Lock, label: 'Vault Forense NCFN', color: '#00f3ff', bg: 'rgba(0,243,255,0.08)', border: 'rgba(0,243,255,0.25)' },
    { href: '/admin/descriptar', icon: KeyRound, label: 'Descriptar Arquivo', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
];

export default function AdminDashboard() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => { setFiles(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const validFiles = files.filter(f => f.filename !== 'vazio.txt');
    const groupedFiles = validFiles.reduce((acc, file) => {
        if (!acc[file.folder]) acc[file.folder] = [];
        acc[file.folder].push(file);
        return acc;
    }, {} as Record<string, FileItem[]>);
    const folders = Object.keys(groupedFiles);
    const totalFiles = validFiles.length;
    const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
    const recentFilesCount = validFiles.filter(f => {
        const fileDate = new Date(f.mtime);
        const dayAgo = new Date(); dayAgo.setDate(dayAgo.getDate() - 1);
        return fileDate > dayAgo;
    }).length;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-[#bc13fe]/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-[#bc13fe]/60 animate-spin" />
                </div>
                <span className="text-[#bc13fe] font-mono text-sm animate-pulse">Acessando Centro de Comando...</span>
            </div>
        </div>
    );

    return (
        <div className="mt-6 space-y-10 pb-20 max-w-7xl mx-auto">
            {/* ─── Header ─── */}
            <div className="text-center space-y-3 px-2">
                <div className="inline-flex items-center justify-center p-3 bg-red-900/20 border border-red-500/30 rounded-2xl mb-2 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                    <Activity className="text-red-400 w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#bc13fe] tracking-tighter">
                    NÚCLEO DE INTELIGÊNCIA
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm uppercase tracking-widest font-mono">Monitoramento Global de Ativos e Diretórios</p>
                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-[10px] font-mono text-gray-500">Busca global</span>
                    <kbd className="text-[10px] font-mono text-[#bc13fe] bg-black px-1.5 py-0.5 rounded border border-[#bc13fe]/30">⌘ K</kbd>
                </div>
            </div>

            {/* ─── Stats Grid ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-1">
                <StatCard icon={Database} value={String(totalFiles)} label="Ativos sob Custódia" color="#bc13fe" />
                <StatCard icon={HardDrive} value={formatBytes(totalSize)} label="Volume Armazenado" color="#00f3ff" />
                <StatCard icon={Clock} value={String(recentFilesCount)} label="Novos (24h)" color="#f59e0b" />
                <Link href="/admin/forensics" className="group">
                    <StatCard icon={Eye} value="Ativo" label="Status Zero-Trust" color="#22c55e" hover />
                </Link>
                <Link href="/admin/security" className="group">
                    <StatCard icon={ShieldAlert} value="Contingência" label="Exclusão Permanente" color="#ef4444" hover pulse />
                </Link>
            </div>

            {/* ─── Charts ─── */}
            {validFiles.length > 0 && (
                <>
                    <SectionTitle title="Painel Analítico" subtitle="Métricas de custódia em tempo real" color="#00f3ff" />
                    <AdminCharts files={files} />
                </>
            )}

            {/* ─── Modules ─── */}
            <SectionTitle title="Módulos do Sistema" subtitle="Ferramentas operacionais" color="#bc13fe" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 px-1">
                {MODULES.map(mod => (
                    <Link key={mod.href} href={mod.href} className="group">
                        <div
                            className="rounded-2xl p-4 lg:p-5 cursor-pointer h-full flex flex-col items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border backdrop-blur-xl"
                            style={{ background: mod.bg, borderColor: mod.border, boxShadow: `0 0 0 0 ${mod.color}` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${mod.color}20`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                        >
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}30` }}>
                                <mod.icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: mod.color }} />
                            </div>
                            <h3 className="text-xs lg:text-sm font-bold text-center text-white/90 leading-tight">{mod.label}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ─── Custody Zones ─── */}
            <SectionTitle title="Zonas de Custódia Digital" subtitle={`${folders.length} diretórios ativos`} color="#9ca3af" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 px-1">
                {folders.length === 0 ? (
                    <p className="col-span-full text-center text-gray-600 py-10 font-mono text-sm">Nenhum diretório local detectado.</p>
                ) : (
                    folders.map(folder => {
                        const isSystem = folder.startsWith('_');
                        const count = groupedFiles[folder].length;
                        const size = groupedFiles[folder].reduce((a, f) => a + f.size, 0);
                        return (
                            <Link key={folder} href={`/admin/pasta/${folder}`}>
                                <div className={`glass-panel p-5 lg:p-7 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-3 lg:gap-4 transition-all duration-300 hover:scale-[1.02] ${isSystem ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-[#bc13fe]/25 hover:border-[#bc13fe]/50'}`}>
                                    <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center ${isSystem ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#bc13fe]/8 border border-[#bc13fe]/20'}`}>
                                        {isSystem
                                            ? <ShieldAlert className="text-red-400 w-8 h-8 lg:w-10 lg:h-10 animate-pulse" />
                                            : <Folder className="text-[#bc13fe] w-8 h-8 lg:w-10 lg:h-10" />
                                        }
                                    </div>
                                    <div className="text-center">
                                        <h3 className={`text-lg lg:text-xl font-bold capitalize truncate max-w-[180px] ${isSystem ? 'text-red-400' : 'text-white'}`}>
                                            {folder.replace(/_/g, ' ')}
                                        </h3>
                                        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{formatBytes(size)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${isSystem ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/20'}`}>
                                            {count} {count === 1 ? 'arquivo' : 'arquivos'}
                                        </span>
                                        {isSystem && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tight">Sistema</span>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* ─── Map ─── */}
            <hr className="border-[#bc13fe]/10 my-8" />
            <MapDashboard />
        </div>
    );
}

function StatCard({ icon: Icon, value, label, color, hover, pulse }: {
  icon: any; value: string; label: string; color: string; hover?: boolean; pulse?: boolean;
}) {
  return (
    <div
      className={`glass-panel p-4 lg:p-5 rounded-2xl flex flex-col items-center text-center gap-2 transition-all duration-300 ${hover ? 'hover:scale-[1.03] cursor-pointer' : ''}`}
      style={{ borderColor: `${color}30` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        <Icon className={`w-5 h-5 ${pulse ? 'animate-pulse' : ''}`} style={{ color }} />
      </div>
      <span className="text-xl lg:text-2xl font-black text-white leading-none">{value}</span>
      <span className="text-[9px] lg:text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">{label}</span>
    </div>
  );
}

function SectionTitle({ title, subtitle, color }: { title: string; subtitle?: string; color: string }) {
  return (
    <div className="flex items-center gap-4 px-1">
      <div>
        <h3 className="text-base lg:text-lg font-black uppercase tracking-wider" style={{ color }}>{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-px flex-grow" style={{ background: `linear-gradient(to right, ${color}30, transparent)` }} />
    </div>
  );
}
