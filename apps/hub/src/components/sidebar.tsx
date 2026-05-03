"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@primeair/ui";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarOff,
  ClipboardList,
  MapPin,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ShoppingCart,
  Upload,
} from "lucide-react";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "ClockHQ";
const LOGO_URL = process.env.NEXT_PUBLIC_COMPANY_LOGO_URL ?? null;

const navItems = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/team",        label: "Team",        icon: Users },
  {
    href: "/timecards",   label: "Timecards",   icon: Clock,
    children: [
      { href: "/timecards/time-off", label: "Time Off", icon: CalendarOff },
    ],
  },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
  {
    href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart,
    children: [
      { href: "/purchase-orders/import", label: "Import POs", icon: Upload },
    ],
  },
  { href: "/dispatch",    label: "Dispatch",    icon: MapPin },
  { href: "/customers",   label: "Customers",   icon: FileText },
  { href: "/reports",     label: "Reports",     icon: BarChart3 },
  { href: "/admin",       label: "Admin",       icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r bg-[#1B3A6B] min-h-screen flex flex-col">
      <div className="px-4 py-4 border-b border-white/10">
        <Link href="/dashboard" className="block">
          {LOGO_URL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={LOGO_URL}
              alt={COMPANY_NAME}
              className="h-9 w-auto object-contain object-left"
            />
          ) : (
            <span className="text-white font-bold text-xl tracking-tight">{COMPANY_NAME}</span>
          )}
        </Link>
        <p className="text-white/50 text-xs mt-1.5 px-0.5">Hub</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, children }) => {
          const active = pathname === href || (pathname.startsWith(href + "/") && !children?.some(c => pathname.startsWith(c.href)));
          const parentActive = pathname === href || pathname.startsWith(href + "/");

          return (
            <div key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
              {children && parentActive && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {children.map(({ href: cHref, label: cLabel, icon: CIcon }) => {
                    const cActive = pathname === cHref || pathname.startsWith(cHref + "/");
                    return (
                      <Link
                        key={cHref}
                        href={cHref}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                          cActive
                            ? "bg-white/20 text-white"
                            : "text-white/60 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <CIcon className="h-3.5 w-3.5 shrink-0" />
                        {cLabel}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
