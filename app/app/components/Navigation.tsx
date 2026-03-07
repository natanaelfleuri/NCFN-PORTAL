"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Home, Shield, Users, LogOut, Activity, Trash2, BookOpen, Menu, X, Globe, Search, Radar, FileText, Bot } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");
    const isAuditor = pathname?.startsWith("/auditor");
    const isAdmin_role = (session?.user as any)?.role === 'admin';
    const isSuperAdmin = isAdmin_role; // SuperAdmin is just Admin for now

    // Fecha o menu ao mudar de rota
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const NavLinks = () => (
        <>
            <Link
                href="/"
                className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1.5 ${pathname === "/" ? "text-white bg-white/10 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "text-gray-400 hover:text-white"}`}
            >
                <Home className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> Mestre Hub
            </Link>
            <Link
                href="/vitrine"
                className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1.5 ${pathname?.startsWith("/vitrine") || pathname?.startsWith("/pasta/") ? "text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30 shadow-[0_0_10px_rgba(0,243,255,0.1)]" : "text-gray-400 hover:text-[#00f3ff]"}`}
            >
                <Globe className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> Vitrine
            </Link>
            <Link
                href="/admin"
                className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1.5 ${isAdmin ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30 shadow-[0_0_10px_rgba(188,19,254,0.1)]" : "text-gray-400 hover:text-[#bc13fe]"}`}
            >
                <Shield className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> Admin
            </Link>
            {isAdmin_role && (
                <>
                    <Link
                        href="/admin/convidados"
                        className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/admin/convidados") ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30" : "text-gray-400 hover:text-[#bc13fe]"}`}
                    >
                        <Users className="w-4 h-4 lg:w-3 lg:h-3" /> Convidados
                    </Link>
                    <Link
                        href="/admin/lixeira"
                        className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/admin/lixeira") ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30" : "text-gray-400 hover:text-[#bc13fe]"}`}
                    >
                        <Trash2 className="w-4 h-4 lg:w-3 lg:h-3" /> Lixeira
                    </Link>
                    <Link
                        href="/admin/logs"
                        className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/admin/logs") ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30" : "text-gray-400 hover:text-[#bc13fe]"}`}
                    >
                        <Activity className="w-4 h-4 lg:w-3 lg:h-3" /> Logs
                    </Link>
                    <Link
                        href="/admin/investigar"
                        className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/admin/investigar") ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30 shadow-[0_0_8px_rgba(188,19,254,0.2)]" : "text-gray-400 hover:text-[#bc13fe]"}`}
                    >
                        <Search className="w-4 h-4 lg:w-3 lg:h-3" /> Investigar
                    </Link>
                    <Link
                        href="/admin/relatorios"
                        className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/admin/relatorios") ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30 shadow-[0_0_8px_rgba(188,19,254,0.2)]" : "text-gray-400 hover:text-[#bc13fe]"}`}
                    >
                        <FileText className="w-4 h-4 lg:w-3 lg:h-3" /> Relatórios
                    </Link>
                    {isSuperAdmin && (
                        <Link
                            href="/admin/ia-config"
                            className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/admin/ia-config") ? "text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30 shadow-[0_0_12px_rgba(188,19,254,0.3)]" : "text-gray-400 hover:text-[#bc13fe]"}`}
                        >
                            <Bot className="w-4 h-4 lg:w-3 lg:h-3" /> Config IA
                        </Link>
                    )}
                </>
            )}
            <Link
                href="/auditor"
                className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium ${isAuditor ? "text-[#ff9900] bg-[#ff9900]/10 border border-[#ff9900]/30" : "text-gray-400 hover:text-[#ff9900]"}`}
            >
                Auditor
            </Link>
            <Link
                href="/doc"
                className={`transition px-4 py-2 lg:px-3 lg:py-1 rounded-md text-sm font-medium flex items-center gap-2 lg:gap-1 ${pathname?.startsWith("/doc") ? "text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30" : "text-gray-400 hover:text-[#00f3ff]"}`}
            >
                <BookOpen className="w-4 h-4 lg:w-3.5 lg:h-3.5" /> Guia
            </Link>
            {session ? (
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 lg:gap-1 text-sm font-bold px-4 py-2 lg:px-3 lg:py-1 rounded-md text-gray-400 hover:text-red-400 transition border border-gray-800 lg:border-transparent hover:border-red-500/40"
                    title={session.user?.email || ''}
                >
                    <LogOut className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    Sair
                </button>
            ) : (
                <Link
                    href="/login"
                    className="text-sm font-bold px-4 py-2 lg:px-3 lg:py-1 rounded-md text-gray-400 hover:text-[#bc13fe] transition border border-gray-800 lg:border-transparent hover:border-[#bc13fe]/40"
                >
                    Entrar
                </Link>
            )}
        </>
    );

    return (
        <div className="relative">
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-all bg-gray-900/50 rounded-lg border border-gray-800 focus:outline-none focus:border-[#bc13fe]/50"
            >
                {isOpen ? <X className="w-6 h-6 border-[#bc13fe]" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex gap-1 items-center justify-center flex-1">
                <NavLinks />
            </nav>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md lg:hidden"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="fixed right-0 top-0 h-full w-full sm:w-80 bg-black border-l border-white/10 p-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-right duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                            <span className="text-xl font-bold neon-text">MENU</span>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-3">
                            <NavLinks />
                        </nav>
                        <div className="mt-auto pt-6 border-t border-gray-800 text-[10px] text-gray-600 text-center uppercase tracking-widest">
                            NCFN Portal v2.0
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
