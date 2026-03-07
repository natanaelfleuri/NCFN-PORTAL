"use client";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-20 h-20 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">404 - Documento Inexistente</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8 font-mono text-sm leading-relaxed">
                Este setor do portal não possui registros. Verifique a URL ou retorne ao centro de comando.
            </p>
            <Link
                href="/"
                className="px-6 py-3 bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white rounded-xl transition-all font-bold uppercase tracking-widest text-sm"
            >
                Retornar ao Hub
            </Link>
        </div>
    );
}
