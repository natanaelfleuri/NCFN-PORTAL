export const dynamic = "force-dynamic";
import type { Metadata } from 'next'
import './globals.css'
import { Michroma } from 'next/font/google'
import Navigation from './components/Navigation'

const michroma = Michroma({ weight: '400', subsets: ['latin'], display: 'swap' })
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

              <header className="w-full py-2.5 lg:py-3.5 px-6 flex justify-between items-center border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50 shadow-[0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.4)]">
                <Link href="/" className="shrink-0 group flex items-center gap-3">
                  {/* Logo mark */}
                  <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg flex items-center justify-center border border-[#00f3ff]/40 bg-[#00f3ff]/5 group-hover:border-[#00f3ff]/70 group-hover:bg-[#00f3ff]/10 transition-all shadow-[0_0_12px_rgba(0,243,255,0.18)] group-hover:shadow-[0_0_24px_rgba(0,243,255,0.4)]" style={{userSelect:'none', flexShrink:0}}>
                    {/* Hexagon / circuit symbol */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" stroke="#00f3ff" strokeWidth="1.5" fill="rgba(0,243,255,0.06)" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" fill="#00f3ff" opacity="0.9"/>
                      <line x1="12" y1="2"  x2="12" y2="9"  stroke="#00f3ff" strokeWidth="1" opacity="0.4"/>
                      <line x1="12" y1="15" x2="12" y2="22" stroke="#00f3ff" strokeWidth="1" opacity="0.4"/>
                      <line x1="3"  y1="7"  x2="9"  y2="10.5" stroke="#00f3ff" strokeWidth="1" opacity="0.4"/>
                      <line x1="15" y1="13.5" x2="21" y2="17" stroke="#00f3ff" strokeWidth="1" opacity="0.4"/>
                      <line x1="21" y1="7"  x2="15" y2="10.5" stroke="#00f3ff" strokeWidth="1" opacity="0.4"/>
                      <line x1="9"  y1="13.5" x2="3"  y2="17" stroke="#00f3ff" strokeWidth="1" opacity="0.4"/>
                    </svg>
                  </div>
                  {/* Wordmark */}
                  <div className="flex flex-col leading-none gap-0.5">
                    <span className={`${michroma.className} text-white text-lg lg:text-xl tracking-wide`} style={{letterSpacing:'0.05em'}}>
                      NCFN<span style={{color:'#00f3ff', marginLeft:2}}>.</span>
                    </span>
                    <span className={`${michroma.className} hidden sm:block text-[#00f3ff]/40 text-[8px] lg:text-[9px] tracking-[0.18em] uppercase`}>
                      Nexus Cyber Forensic Network
                    </span>
                  </div>
                </Link>
                <Navigation />
              </header>

              <main className="w-full p-4 pb-20 md:pb-4 flex-grow relative z-10">
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
