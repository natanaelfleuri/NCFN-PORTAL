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
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <ServiceWorkerRegister />
          <ToastProvider />
          <LoadingOverlay />
          <SpotlightSearch />
          <GuestHeartbeat />
          <BiometricSecurity>
            <div className="min-h-screen flex flex-col items-center ml-auto mr-auto military-hardened relative overflow-hidden">
              <div className="scanline-overlay absolute inset-0 z-0 opacity-10 pointer-events-none"></div>

              <header className="w-full max-w-6xl py-4 lg:py-6 px-4 flex justify-between items-center border-b border-gray-800 bg-black/40 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#bc13fe] to-[#00f3ff] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(188,19,254,0.3)] shrink-0">
                    <span className="text-white font-black text-sm italic">N</span>
                  </div>
                  <h1 className="text-xl lg:text-2xl font-black text-white tracking-widest uppercase italic truncate">NCFN.NET</h1>
                </div>
                <Navigation />
              </header>

              <main className="w-full max-w-6xl p-4 flex-grow relative z-10">
                <PolicyGuard>
                  {children}
                </PolicyGuard>
              </main>

              <footer className="w-full text-center py-8 text-gray-500 text-[10px] sm:text-xs border-t border-gray-800 mt-12 bg-black/40 relative z-10">
                <div className="flex flex-col items-center gap-2">
                  <p className="font-mono tracking-[0.2em] uppercase">Security Level: Grade A | Neural Multi-Layer Active</p>
                  <p className="font-bold opacity-60">NCFN: Neural Computing & Future Networks | CopyLeft 2026</p>
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
