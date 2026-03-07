"use client";
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users, CheckCircle, XCircle, Shield } from 'lucide-react';

type Guest = {
    id: string;
    email: string;
    name: string | null;
    active: boolean;
    createdAt: string;
};

export default function ConvidadosPage() {
    const { data: session, status } = useSession();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

    const fetchGuests = async () => {
        const res = await fetch('/api/admin/guests');
        if (res.ok) setGuests(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchGuests(); }, []);

    const showFeedback = (msg: string, ok: boolean) => {
        setFeedback({ msg, ok });
        setTimeout(() => setFeedback(null), 3000);
    };

    const addGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        const res = await fetch('/api/admin/guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name }),
        });
        if (res.ok) {
            showFeedback(`Convidado ${email} adicionado!`, true);
            setEmail(''); setName('');
            fetchGuests();
        } else {
            showFeedback('Erro ao adicionar convidado.', false);
        }
    };

    const removeGuest = async (guestEmail: string) => {
        const res = await fetch('/api/admin/guests', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: guestEmail }),
        });
        if (res.ok) { showFeedback('Acesso revogado.', true); fetchGuests(); }
    };

    if (status === 'loading' || loading) {
        return <div className="text-center mt-20 text-[#bc13fe] animate-pulse">Carregando...</div>;
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
        <div className="mt-8 pb-20 max-w-2xl mx-auto space-y-10">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold" style={{ textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>
                    GERENCIAR CONVIDADOS
                </h2>
                <p className="text-gray-400 text-sm">Emails convidados terão acesso ao portal em branco (sem seus arquivos)</p>
            </div>

            {/* Add form */}
            <div className="glass-panel p-8 rounded-2xl" style={{ border: '1px solid rgba(188,19,254,0.3)' }}>
                <h3 className="text-xl font-bold text-[#bc13fe] mb-6 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Adicionar Convidado
                </h3>
                <form onSubmit={addGuest} className="space-y-4">
                    <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#bc13fe] transition"
                    />
                    <input
                        type="text"
                        placeholder="Nome (opcional)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#bc13fe] transition"
                    />
                    <button
                        type="submit"
                        className="w-full py-3 font-bold rounded-xl transition flex items-center justify-center gap-2 text-white"
                        style={{ background: 'rgba(188,19,254,0.2)', border: '1px solid rgba(188,19,254,0.5)' }}
                    >
                        <UserPlus className="w-4 h-4" /> Adicionar Acesso
                    </button>
                </form>
                {feedback && (
                    <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${feedback.ok ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                        {feedback.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {feedback.msg}
                    </div>
                )}
            </div>

            {/* Guest list */}
            <div className="glass-panel p-8 rounded-2xl" style={{ border: '1px solid rgba(188,19,254,0.2)' }}>
                <h3 className="text-xl font-bold text-[#bc13fe] mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Convidados ({guests.filter(g => g.active).length} ativos)
                </h3>
                {guests.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum convidado cadastrado ainda.</p>
                ) : (
                    <ul className="space-y-3">
                        {guests.map(g => (
                            <li key={g.id} className={`flex items-center justify-between p-4 rounded-xl ${g.active ? 'bg-gray-900/60 border border-gray-800' : 'bg-gray-900/30 border border-gray-800/50 opacity-50'}`}>
                                <div>
                                    <p className="font-semibold text-white">{g.email}</p>
                                    {g.name && <p className="text-gray-500 text-xs mt-0.5">{g.name}</p>}
                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${g.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {g.active ? 'Ativo' : 'Revogado'}
                                    </span>
                                </div>
                                {g.active && (
                                    <button
                                        onClick={() => removeGuest(g.email)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                                        title="Revogar acesso"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
