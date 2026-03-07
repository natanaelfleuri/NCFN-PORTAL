"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Activity, Mail, Clock, Wifi, Timer, Shield } from 'lucide-react';

type LogEntry = {
    id: string;
    email: string;
    ip: string | null;
    loginAt: string;
    lastSeenAt: string;
    sessionMins: number;
};

function formatDate(dt: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(dt));
}

function formatDuration(mins: number) {
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}min`;
}

export default function GuestLogsPage() {
    const { data: session } = useSession();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/logs')
            .then(r => r.json())
            .then(data => { setLogs(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
        return (
            <div className="text-center mt-20 text-red-500">
                <Shield className="w-16 h-16 mx-auto mb-4" />
                <p className="text-2xl font-bold">Acesso Restrito ao Admin</p>
            </div>
        );
    }

    if (loading) return <div className="text-center mt-20 text-[#bc13fe] animate-pulse">Carregando logs...</div>;

    return (
        <div className="mt-8 pb-20 max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold flex items-center justify-center gap-3" style={{ textShadow: '0 0 10px rgba(188,19,254,0.5)' }}>
                    <Activity className="w-9 h-9 text-[#bc13fe]" />
                    LOGS DE ACESSO
                </h2>
                <p className="text-gray-400 text-sm">Registro de todos os acessos de convidados ao portal</p>
            </div>

            {logs.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center text-gray-500" style={{ border: '1px solid rgba(188,19,254,0.2)' }}>
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum acesso de convidados registrado ainda.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map(log => (
                        <div
                            key={log.id}
                            className="glass-panel p-5 rounded-xl"
                            style={{ border: '1px solid rgba(188,19,254,0.15)' }}
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-start gap-2">
                                    <Mail className="w-4 h-4 text-[#bc13fe] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                                        <p className="text-white text-sm font-medium break-all">{log.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Clock className="w-4 h-4 text-[#bc13fe] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Horário de Acesso</p>
                                        <p className="text-white text-sm">{formatDate(log.loginAt)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Wifi className="w-4 h-4 text-[#bc13fe] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">IP</p>
                                        <p className="text-white text-sm font-mono">{log.ip || '—'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Timer className="w-4 h-4 text-[#bc13fe] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Tempo de Sessão</p>
                                        <p className={`text-sm font-semibold ${log.sessionMins > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                                            {formatDuration(log.sessionMins)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-center text-gray-700 text-xs">
                Exibindo os últimos 200 acessos · Atualização em tempo real por heartbeat
            </p>
        </div>
    );
}
