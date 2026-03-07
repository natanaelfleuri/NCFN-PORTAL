"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, FileText, Calendar, HardDrive, Shield } from 'lucide-react';

type TrashItem = {
    id: string;
    filename: string;
    originalPath: string;
    folder: string;
    deletedAt: string;
    size: number;
};

function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dt: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(dt));
}

export default function LixeiraPage() {
    const { data: session, status } = useSession();
    const [items, setItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrash = async () => {
        const res = await fetch('/api/trash');
        if (res.ok) setItems(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchTrash(); }, []);

    const restoreFile = async (id: string) => {
        if (!confirm('Deseja restaurar este arquivo para a pasta original?')) return;
        const res = await fetch('/api/trash', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) fetchTrash();
    };

    const deletePermanent = async (id: string) => {
        if (!confirm('TEM CERTEZA? Esta ação não pode ser desfeita.')) return;
        const res = await fetch('/api/trash', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) fetchTrash();
    };

    if (status === 'loading' || loading) {
        return <div className="text-center mt-20 text-[#bc13fe] animate-pulse">Acessando Lixeira Segura...</div>;
    }

    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
        return (
            <div className="text-center mt-20 text-red-500">
                <Shield className="w-16 h-16 mx-auto mb-4" />
                <p className="text-2xl font-bold">Acesso Restrito ao Admin</p>
            </div>
        );
    }

    return (
        <div className="mt-8 pb-20 max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold text-white flex items-center justify-center gap-3" style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>
                    <Trash2 className="w-9 h-9 text-[#bc13fe]" />
                    LIXEIRA VIRTUAL
                </h2>
                <p className="text-gray-400 text-sm">Arquivos aqui serão excluídos permanentemente de forma automática em 10 dias.</p>
            </div>

            {items.length === 0 ? (
                <div className="glass-panel p-20 rounded-2xl text-center text-gray-600" style={{ border: '1px solid rgba(188,19,254,0.2)' }}>
                    <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xl">Lixeira vazia.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="glass-panel p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-white/5"
                            style={{ border: '1px solid rgba(188,19,254,0.15)' }}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-3 bg-[#bc13fe]/10 rounded-lg">
                                    <FileText className="text-[#bc13fe] w-6 h-6" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <p className="text-white font-bold truncate text-lg break-all">{item.originalPath}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-1 uppercase tracking-wider">
                                            <HardDrive className="w-3 h-3 text-[#bc13fe]/70" /> {item.folder.replace(/_/g, ' ')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-[#bc13fe]/70" /> Apagado em: {formatDate(item.deletedAt)}
                                        </span>
                                        <span>Tamanho: {formatSize(item.size)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 shrink-0">
                                <button
                                    onClick={() => restoreFile(item.id)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all font-semibold"
                                >
                                    <RotateCcw className="w-4 h-4" /> Restaurar
                                </button>
                                <button
                                    onClick={() => deletePermanent(item.id)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all font-semibold"
                                >
                                    <Trash2 className="w-4 h-4" /> Excluir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
