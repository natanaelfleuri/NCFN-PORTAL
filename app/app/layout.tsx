export const dynamic = "force-dynamic";
import type { Metadata } from 'next'
import './globals.css'
import Navigation from './components/Navigation'
import AuthProvider from './components/AuthProvider'
import GuestHeartbeat from './components/GuestHeartbeat'
import LoadingOverlay from './components/LoadingOverlay'
import BiometricSecurity from './components/BiometricSecurity'
import SpotlightSearch from './components/SpotlightSearch'
import PolicyGuard from './components/PolicyGuard'
import ToastProvider from './components/ToastProvider'
import ServiceWorkerRegister from './components/ServiceWorkerRegister'
import HashBackground from './components/HashBackground'
import VpsMonitor from './components/VpsMonitor'
import BottomNav from './components/BottomNav'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NCFN | Portal Pessoal',
  description: 'Portal de Arquivos Futurista - NCFN',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NCFN Portal',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" style={{ background: '#03030b' }}>
      <body style={{ background: '#03030b' }}>
        <AuthProvider>
          <ServiceWorkerRegister />
          <ToastProvider />
          <LoadingOverlay />
          <SpotlightSearch />
          <GuestHeartbeat />
          <BiometricSecurity>
            <VpsMonitor />
            <div className="min-h-screen flex flex-col items-center ml-auto mr-auto military-hardened relative overflow-hidden">
              <div className="scanline-overlay absolute inset-0 z-0 opacity-10 pointer-events-none"></div>
              <HashBackground />
              
              {/* Global Watermark */}
              <div 
                className="fixed inset-0 pointer-events-none opacity-[0.03] grayscale z-0"
                style={{
                  backgroundImage: 'url("/branding/logo.png")',
                  backgroundSize: '400px',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              ></div>

              <header className="w-full max-w-6xl py-3 lg:py-5 px-4 flex justify-between items-center border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50 shadow-[0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.4)]">
                <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 relative shrink-0">
                    <img
                      src="/branding/logo.png"
                      alt="NCFN Logo"
                      className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(0,243,255,0.5)] group-hover:drop-shadow-[0_0_16px_rgba(0,243,255,0.8)] transition-all"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base lg:text-lg font-black text-white tracking-widest uppercase leading-none">NCFN</h1>
                    <p className="text-[8px] text-[#00f3ff]/50 font-mono uppercase tracking-[0.12em] leading-none mt-0.5 hidden lg:block">Nexus Cyber Forensic Network</p>
                  </div>
                </Link>
                <Navigation />
              </header>

              <main className="w-full max-w-6xl p-4 pb-20 md:pb-4 flex-grow relative z-10">
                <PolicyGuard>
                  {children}
                </PolicyGuard>
              </main>
              <BottomNav />

              <footer className="w-full text-center py-8 text-gray-500 text-[10px] sm:text-xs border-t border-white/5 mt-12 bg-black/40 relative z-10">
                <div className="flex flex-col items-center gap-2">
                  <p className="font-mono tracking-[0.2em] uppercase">Security Level: Grade A | Neural Multi-Layer Active</p>
                  <p className="font-bold opacity-60">NCFN: Nexus Cloud Forensic Network | CopyLeft 2026</p>
                  <div className="flex items-center gap-4 text-[#00f3ff] opacity-80 mt-2">
                    <span>ncfn@ncfn.net</span>
                    <span className="opacity-30">|</span>
                    <Link href="/politica" className="hover:underline transition-all font-bold">Política de Uso</Link>
                  </div>
                </div>
              </footer>
            </div>
          </BiometricSecurity>
        </AuthProvider>
      </body>
    </html>
  )
}
