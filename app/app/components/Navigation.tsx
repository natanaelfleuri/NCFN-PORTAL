"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home, Shield, Users, LogOut, Activity, Trash2, BookOpen,
  Menu, X, Globe, FileText, User, Camera,
  ScanSearch, AlertTriangle, Sparkles, ChevronDown,
  Archive, Database, Eye, ShieldAlert
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import QuotaBar from "./QuotaBar";
import dynamic from "next/dynamic";

const NotificationBell = dynamic(() => import("./NotificationBell"), { ssr: false });

const ADMIN_LINKS = [
  { href: '/admin', icon: Home, label: 'Hub Central', color: '#00f3ff' },
  { href: '/vault', icon: Archive, label: 'Vault Forense', color: '#00f3ff' },
  { href: '/admin/convidados', icon: Users, label: 'Convidados', color: '#bc13fe' },
  { href: '/admin/lixeira', icon: Trash2, label: 'Lixeira', color: '#ef4444' },
  { href: '/admin/logs', icon: Database, label: 'Logs', color: '#bc13fe' },
  { href: '/admin/relatorios', icon: FileText, label: 'Laudos', color: '#bc13fe' },
  { href: '/admin/captura-web', icon: Camera, label: 'Captura Web', color: '#00f3ff' },
  { href: '/admin/pericia-arquivo', icon: ScanSearch, label: 'Perícia', color: '#34d399' },
  { href: '/admin/laudo-forense', icon: Sparkles, label: 'Laudo IA', color: '#bc13fe' },
  { href: '/admin/canary', icon: AlertTriangle, label: 'Canary', color: '#ef4444' },
  { href: '/admin/forensics', icon: Eye, label: 'Forense', color: '#34d399' },
  { href: '/admin/security', icon: ShieldAlert, label: 'Segurança', color: '#ef4444' },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  const isAdminRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");
  const isAuditor = pathname?.startsWith("/auditor");
  const isAdmin_role = (session?.user as any)?.role === 'admin';

  useEffect(() => { setIsOpen(false); setAdminOpen(false); }, [pathname]);

  // Close admin dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const linkBase = "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap";
  const linkActive = (color: string) => `${linkBase} text-white border` ;
  const linkIdle = `${linkBase} text-gray-400 hover:text-white hover:bg-white/5`;

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname?.startsWith(href);

  return (
    <div className="relative flex items-center gap-1">
      {/* ─── Hamburger (small mobile only) ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2.5 text-gray-300 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-[#bc13fe]/40 focus:outline-none"
        aria-label="Menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* ─── Desktop Navigation (md+) ─── */}
      <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
        {/* Main links */}
        <Link href="/vitrine" className={isActive('/vitrine') || isActive('/pasta/')
          ? `${linkBase} text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30`
          : linkIdle
        }>
          <Globe className="w-3.5 h-3.5" /> Vitrine
        </Link>

        {/* Admin Dropdown */}
        {isAdmin_role && (
          <div ref={adminRef} className="relative">
            <div className={`${linkBase} gap-1.5 ${isAdminRoute
              ? 'text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30'
              : 'text-gray-400 hover:text-[#bc13fe] hover:bg-[#bc13fe]/5 border border-transparent hover:border-[#bc13fe]/20'
            }`}>
              <Link href="/admin" className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
              <button onClick={() => setAdminOpen(!adminOpen)} className="ml-0.5">
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {adminOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-black/95 backdrop-blur-xl border border-[#bc13fe]/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(188,19,254,0.1)] overflow-hidden z-[200]">
                <div className="px-3 py-2 border-b border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#bc13fe]/60">Módulos Admin</span>
                </div>
                <div className="py-1.5 px-1.5 pb-1.5 space-y-0.5">
                  {/* Hub Central — full-width highlight */}
                  <Link
                    href="/admin"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full ${
                      isActive('/admin', true)
                        ? 'bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/40 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                        : 'bg-[#00f3ff]/8 text-[#00f3ff] border border-[#00f3ff]/20 hover:bg-[#00f3ff]/15 hover:shadow-[0_0_12px_rgba(0,243,255,0.15)]'
                    }`}
                  >
                    <Home className="w-4 h-4 flex-shrink-0 text-[#00f3ff]" />
                    Hub Central
                    <span className="ml-auto text-[8px] font-mono opacity-60">⌘ ADMIN</span>
                  </Link>
                  {/* Vault — segundo botão destaque */}
                  <Link
                    href="/vault"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full mb-1 ${
                      isActive('/vault')
                        ? 'bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/40 shadow-[0_0_15px_rgba(188,19,254,0.2)]'
                        : 'bg-[#bc13fe]/8 text-[#bc13fe] border border-[#bc13fe]/20 hover:bg-[#bc13fe]/15 hover:shadow-[0_0_12px_rgba(188,19,254,0.15)]'
                    }`}
                  >
                    <Archive className="w-4 h-4 flex-shrink-0 text-[#bc13fe]" />
                    Vault Forense
                    <span className="ml-auto text-[8px] font-mono opacity-60">COFRE</span>
                  </Link>
                  <div className="grid grid-cols-2 gap-0.5">
                  {ADMIN_LINKS.slice(2).map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive(link.href, link.href === '/admin')
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <link.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: link.color }} />
                      {link.label}
                    </Link>
                  ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Link href="/auditor" className={isActive('/auditor')
          ? `${linkBase} text-[#ff9900] bg-[#ff9900]/10 border border-[#ff9900]/30`
          : `${linkBase} text-gray-400 hover:text-[#ff9900] hover:bg-[#ff9900]/5`
        }>
          <Activity className="w-3.5 h-3.5" /> Auditor
        </Link>

        <Link href="/doc" className={isActive('/doc')
          ? `${linkBase} text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30`
          : linkIdle
        }>
          <BookOpen className="w-3.5 h-3.5" /> Guia
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Security status indicator */}
        {session && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-green-500/20 bg-green-500/5 select-none" title="Conexão autenticada com TLS · Sessão protegida">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            <span className="text-[9px] font-mono font-bold text-green-400/80 uppercase tracking-widest whitespace-nowrap">
              {isAdmin_role ? 'ADMIN · SEGURO' : 'SESSÃO SEGURA'}
            </span>
            <Shield className="w-2.5 h-2.5 text-green-400/60" />
          </div>
        )}

        {session && (
          <Link href="/profile" className={isActive('/profile', true)
            ? `${linkBase} text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30`
            : linkIdle
          }>
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[100px] truncate">{(session.user?.email || '').split('@')[0]}</span>
          </Link>
        )}

        {/* Notification Bell — admin only */}
        {isAdmin_role && session && <NotificationBell />}

        {session ? (
          <button
            onClick={() => signOut({ callbackUrl: '/login?logout=1' })}
            className={`${linkBase} text-gray-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20`}
            title={session.user?.email || ''}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Link href="/login" className={`${linkBase} text-gray-400 hover:text-[#bc13fe] hover:bg-[#bc13fe]/5 border border-white/10 hover:border-[#bc13fe]/30`}>
            Entrar
          </Link>
        )}
      </nav>

      {/* ─── Mobile Drawer ─── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[340px] z-[150] bg-[#030310]/98 backdrop-blur-xl border-l border-[#bc13fe]/20 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] flex flex-col md:hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
              <div>
                <p className="text-[10px] font-mono text-[#bc13fe]/60 uppercase tracking-[0.2em]">NCFN Portal</p>
                {session && (
                  <p className="text-sm font-bold text-white truncate max-w-[200px]">{session.user?.email}</p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-500 hover:text-white transition bg-white/5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
              {/* Principal */}
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 px-3 pb-1 pt-2">Principal</p>
              <MobileLink href="/vitrine" icon={Globe} label="Vitrine Pública" active={isActive('/vitrine')} color="#00f3ff" />
              <MobileLink href="/auditor" icon={Activity} label="Auditor" active={isActive('/auditor')} color="#ff9900" />
              <MobileLink href="/doc" icon={BookOpen} label="Guia / Protocolos" active={isActive('/doc')} color="#00f3ff" />

              {/* Admin */}
              {isAdmin_role && (
                <>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#bc13fe]/60 px-3 pb-1 pt-4">Administração</p>
                  {/* Hub Central e Vault — destaque full-width */}
                  <MobileLink href="/admin" icon={Home} label="Hub Central" active={isActive('/admin', true)} color="#00f3ff" />
                  <MobileLink href="/vault" icon={Archive} label="Vault Forense" active={isActive('/vault')} color="#bc13fe" />
                  {/* Restante em grid 2 colunas — toque mais fácil */}
                  <div className="grid grid-cols-2 gap-1 mt-1 px-0">
                    {ADMIN_LINKS.slice(2).map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-semibold transition-all min-h-[48px] ${
                          isActive(link.href, false)
                            ? 'text-white bg-white/10 border border-white/15'
                            : 'text-gray-400 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <link.icon className="w-4 h-4 flex-shrink-0" style={{ color: link.color }} />
                        <span className="text-[11px] leading-tight">{link.label}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {/* Conta */}
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 px-3 pb-1 pt-4">Conta</p>
              {session && (
                <MobileLink href="/profile" icon={User} label="Meu Perfil" active={isActive('/profile', true)} color="#00f3ff" />
              )}
            </nav>

            {/* Quota + Signout */}
            <div className="border-t border-white/5 px-3 py-4 space-y-3">
              {session && <QuotaBar />}
              {session ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/login?logout=1' })}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition"
                >
                  <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
              ) : (
                <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#bc13fe] bg-[#bc13fe]/5 border border-[#bc13fe]/20 hover:bg-[#bc13fe]/10 transition">
                  Entrar
                </Link>
              )}
              <p className="text-[9px] text-gray-700 font-mono text-center uppercase tracking-widest">Nexus Cloud Forensic Network v4.0</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileLink({ href, icon: Icon, label, active, color }: {
  href: string; icon: any; label: string; active: boolean; color: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] ${
        active
          ? 'text-white bg-white/10 border-l-2 border-white/60 pl-2.5'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      style={active ? { borderLeftColor: color } : {}}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}35` }}>
        <Icon className="w-4 h-4" style={{ color: active ? color : 'rgb(156,163,175)' }} />
      </div>
      <span className="flex-1">{label}</span>
      {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
    </Link>
  );
}
