"use client";
import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

export default function PublicAuth({ children }: { children: React.ReactNode }) {
    const [auth, setAuth] = useState(false);
    const [pwd, setPwd] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (sessionStorage.getItem('vitrine_auth') === 'true') {
            setAuth(true);
        }
        setLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pwd === 'ncfn') {
            sessionStorage.setItem('vitrine_auth', 'true');
            setAuth(true);
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000);
            setPwd('');
        }
    };

    if (loading) return null;
    if (auth) return <>{children}</>;

    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-md text-center border" style={{ borderColor: error ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 243, 255, 0.3)' }}>
                <Lock className={`w-16 h-16 mx-auto mb-6 transition-colors ${error ? 'text-red-500' : 'text-[#00f3ff]'}`} />
                <h2 className="text-3xl font-bold text-white mb-2">Acesso Restrito</h2>
                <p className="text-gray-400 mb-8">Insira a credencial para acessar a vitrine pública de arquivos.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="password"
                        placeholder="••••"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        className={`w-full bg-gray-900 border ${error ? 'border-red-500' : 'border-gray-700'} text-center text-3xl tracking-widest text-white rounded-xl px-4 py-4 focus:outline-none focus:border-[#00f3ff] transition`}
                        autoFocus
                    />
                    <button type="submit" className="w-full py-4 mt-2 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 rounded-xl font-bold transition flex justify-center items-center gap-2 text-lg">
                        <Unlock className="w-5 h-5" />
                        Válidar Credencial
                    </button>
                </form>
            </div>
        </div>
    );
}
