"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Archive, ShieldAlert, Globe, User, Home } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Hub", exact: true },
  { href: "/vault", icon: Archive, label: "Vault", exact: false },
  { href: "/vitrine", icon: Globe, label: "Vitrine", exact: false },
  { href: "/admin", icon: ShieldAlert, label: "Admin", exact: false, adminOnly: true },
  { href: "/profile", icon: User, label: "Perfil", exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[120] lg:hidden bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[52px] ${
                active
                  ? "text-[#00f3ff]"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${active ? "drop-shadow-[0_0_6px_rgba(0,243,255,0.8)]" : ""}`}
              />
              <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? "text-[#00f3ff]" : ""}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-[#00f3ff] rounded-full shadow-[0_0_6px_rgba(0,243,255,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
