"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Archive, ShieldAlert, Globe, User, Home, Activity } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",        icon: Home,       label: "Hub",     exact: true },
  { href: "/vault",   icon: Archive,    label: "Vault",   exact: false },
  { href: "/vitrine", icon: Globe,      label: "Vitrine", exact: false },
  { href: "/auditor", icon: Activity,   label: "Auditor", exact: false },
  { href: "/admin",   icon: ShieldAlert, label: "Admin",  exact: false, adminOnly: true },
  { href: "/profile", icon: User,       label: "Perfil",  exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-black/95 backdrop-blur-xl border-t border-white/8 safe-area-bottom">
      <div className="flex items-stretch justify-around px-1">
        {items.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 px-2 min-w-0 flex-1 transition-all ${
                active ? "text-[#00f3ff]" : "text-gray-600 active:text-gray-400"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#00f3ff] rounded-full shadow-[0_0_8px_rgba(0,243,255,0.9)]" />
              )}
              <item.icon
                className={`w-[18px] h-[18px] shrink-0 ${active ? "drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" : ""}`}
              />
              <span className={`text-[8px] font-bold uppercase tracking-wide leading-none ${active ? "text-[#00f3ff]" : "text-gray-600"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
