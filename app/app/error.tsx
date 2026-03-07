"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <AlertTriangle className="w-20 h-20 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Falha Crítica no Sistema</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8 font-mono text-sm leading-relaxed">
                O módulo responsável por esta área apresentou instabilidade. Tente recarregar ou contate o administrador.
            </p>
            <button
                onClick={() => reset()}
                className="px-6 py-3 bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white rounded-xl transition-all font-bold uppercase tracking-widest text-sm"
            >
                Tentar Novamente
            </button>
        </div>
    );
}
