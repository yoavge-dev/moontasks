"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, CheckSquare, Users, FlaskConical, FolderKanban, Map, Menu, LogOut, Settings, UserPlus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/team", label: "Team", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/ab-tests", label: "All Experiments", icon: FlaskConical, exact: true },
  { href: "/roadmaps", label: "Roadmaps", icon: Map },
];

function initials(name?: string | null, email?: string | null) {
  if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function AvatarCircle({ name, email, size = "md" }: { name?: string | null; email?: string | null; size?: "sm" | "md" }) {
  const text = initials(name, email);
  const colors = [
    "bg-violet-500", "bg-indigo-500", "bg-sky-500",
    "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  ];
  const colorIdx = (name ?? email ?? "?").charCodeAt(0) % colors.length;
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", colors[colorIdx], sz)}>
      {text}
    </div>
  );
}

export function TopNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const router = useRouter();
  const user = session?.user;

  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 z-20">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r border-sidebar-border">
          <div className="px-5 py-5 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm">M</span>
              </div>
              <div className="leading-tight">
                <p className="font-bold text-[13px] text-sidebar-foreground">MoonTasks</p>
                <p className="text-[10px] text-sidebar-foreground/40">Moonshoot Marketing LTD</p>
              </div>
            </div>
          </div>
          <nav className="p-3 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive(href, exact)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/8"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
          <span className="text-white font-black text-xs">M</span>
        </div>
        <span className="font-bold text-sm">MoonTasks</span>
      </div>

      <div className="flex-1" />

      {/* Right side: Notifications + Settings + User menu */}
      <div className="flex items-center gap-1">
        <NotificationBell />
        <Link
          href="/settings"
          className={cn(
            "p-2 rounded-md transition-colors",
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Settings"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger className="flex items-center gap-2 h-auto px-2 py-1.5 rounded-lg hover:bg-muted transition-colors outline-none">
            <AvatarCircle name={user?.name} email={user?.email} />
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-foreground">{user?.name ?? "Account"}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-2 border-b border-border mb-1">
              <p className="font-semibold text-sm">{user?.name ?? "Account"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => { setMenuOpen(false); router.push("/settings"); }}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const name = user?.name ?? user?.email ?? "";
                const url = `${window.location.origin}/join${name ? `?from=${encodeURIComponent(name)}` : ""}`;
                navigator.clipboard.writeText(url);
                setMenuOpen(false);
                toast.success("Invite link copied!");
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite a colleague
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
