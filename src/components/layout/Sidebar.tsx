"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, FlaskConical, FolderKanban, Map, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/weekly-summary", label: "Weekly Summary", icon: ClipboardList },
  { href: "/team", label: "Team", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

const abNavItems = [
  { href: "/ab-tests", label: "All Experiments", icon: FlaskConical, exact: true },
  { href: "/roadmaps", label: "Roadmaps", icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const linkClass = (href: string, exact?: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
      isActive(href, exact)
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
    );

  return (
    <aside className="hidden md:flex flex-col w-58 border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
            <span className="text-white font-black text-sm">M</span>
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-[13px] tracking-tight text-sidebar-foreground">MoonTasks</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">Moonshoot Marketing LTD</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4 pb-1.5 px-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
            Experiments
          </p>
        </div>

        {abNavItems.map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href} className={linkClass(href, exact)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
