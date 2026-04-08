"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldAlert, Globe, User, Home, Activity, Archive } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const leftItems = [
    { href: "/",        icon: Home,  label: "Hub",     exact: true  },
    { href: "/vitrine", icon: Globe, label: "Vitrine", exact: false },
  ];

  const rightItems = isAdmin
    ? [
        { href: "/admin",   icon: ShieldAlert, label: "Admin",  exact: false },
        { href: "/profile", icon: User,        label: "Perfil", exact: false },
      ]
    : [
        { href: "/auditor", icon: Activity, label: "Auditor", exact: false },
        { href: "/profile", icon: User,     label: "Perfil",  exact: false },
      ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href) && href !== "/";

  const vaultActive = pathname.startsWith("/vault");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-black/95 backdrop-blur-xl border-t border-white/8"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-[58px]">
        {/* ── Esquerda ── */}
        {leftItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all ${
                active ? "text-[#00f3ff]" : "text-gray-600 active:text-gray-400"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00f3ff] rounded-full shadow-[0_0_8px_rgba(0,243,255,0.9)]" />
              )}
              <item.icon
                className={`w-[20px] h-[20px] shrink-0 ${
                  active ? "drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" : ""
                }`}
              />
              <span
                className={`text-[9px] font-bold uppercase tracking-wide leading-none ${
                  active ? "text-[#00f3ff]" : "text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* ── Centro — VAULT FAB ── */}
        <div className="relative flex flex-col items-center justify-end flex-shrink-0 w-[72px] pb-2">
          <Link href="/vault" className="flex flex-col items-center gap-1">
            <div
              className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 -mt-6 ${
                vaultActive
                  ? "bg-[#bc13fe] shadow-[0_0_28px_rgba(188,19,254,0.75),0_4px_16px_rgba(0,0,0,0.4)]"
                  : "bg-[#bc13fe]/80 shadow-[0_4px_18px_rgba(188,19,254,0.5),0_2px_8px_rgba(0,0,0,0.4)] active:scale-95"
              }`}
            >
              <Archive className="w-[22px] h-[22px] text-white" />
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide leading-none ${
                vaultActive ? "text-[#bc13fe]" : "text-gray-500"
              }`}
            >
              Vault
            </span>
          </Link>
        </div>

        {/* ── Direita ── */}
        {rightItems.map((item) => {
          const active = isActive(item.href, false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all ${
                active ? "text-[#00f3ff]" : "text-gray-600 active:text-gray-400"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00f3ff] rounded-full shadow-[0_0_8px_rgba(0,243,255,0.9)]" />
              )}
              <item.icon
                className={`w-[20px] h-[20px] shrink-0 ${
                  active ? "drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" : ""
                }`}
              />
              <span
                className={`text-[9px] font-bold uppercase tracking-wide leading-none ${
                  active ? "text-[#00f3ff]" : "text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
