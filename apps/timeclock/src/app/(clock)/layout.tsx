"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Briefcase, ClipboardList, LogOut } from "lucide-react";
import { cn } from "@primeair/ui";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

const tabs = [
  { href: "/clock", label: "Clock", icon: Clock },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/timecards", label: "Timecards", icon: ClipboardList },
];

export default function ClockLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">
          {session?.user?.name ?? "Prime Air"}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>

      <nav className="sticky bottom-0 border-t bg-white safe-area-pb">
        <div className="flex">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
