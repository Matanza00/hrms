import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogOut, Moon, Search, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { useAuth } from "@/lib/auth/AuthContext";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";

/** Breadcrumb label for each top-level admin section. */
const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  attendance: "Attendance",
  leaves: "Leaves",
  payroll: "Payroll",
  accounts: "Accounts",
  holidays: "Holidays",
  "special-working-days": "Special Working Days",
  reports: "Reports",
  settings: "Settings",
  profile: "Profile",
};

const SUB_LABELS: Record<string, string> = {
  live: "Live Monitoring",
  corrections: "Corrections",
  qr: "QR & Devices",
  revenue: "Revenue",
  expenses: "Expenses",
  reserve: "Reserve",
  "profit-distribution": "Profit Distribution",
  payslips: "Payslips",
  request: "Request",
  create: "New Employee",
  edit: "Edit",
};

function initials(name?: string) {
  if (!name) return "AD";
  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState<boolean | null>(null);
  // The command palette owns the global ⌘K / Ctrl+K shortcut and searches
  // pages as well as employees.
  const { open: paletteOpen, setOpen: setPaletteOpen, toggle: togglePalette } =
    useCommandPalette();

  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const accountName = employee?.name || user?.username || "Admin";
  const accountRole = user?.role === "Admin" ? "Administrator" : "Employee";

  const crumbs = useMemo(() => {
    const [section, sub] = path.split("/").filter(Boolean);
    const list = [SECTION_LABELS[section] ?? "Dashboard"];
    if (sub && SUB_LABELS[sub]) list.push(SUB_LABELS[sub]);
    return list;
  }, [path]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    setDefaultOpen(window.innerWidth >= 1280);
    try {
      setDark(window.localStorage.getItem("lds_theme") === "dark");
    } catch {
      // Storage blocked (private mode): stay light.
    }
  }, []);

  const toggleTheme = () =>
    setDark((v) => {
      try {
        window.localStorage.setItem("lds_theme", v ? "light" : "dark");
      } catch {
        // Storage blocked: the toggle still works for this visit.
      }
      return !v;
    });

  if (defaultOpen === null) return null;

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="bg-sidebar">
      <AppSidebar />

      <SidebarInset className="min-w-0 overflow-hidden bg-card">
        {/* Figma "Top Bar": 56px, divider below, breadcrumbs left, tools right. */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-divider bg-card/90 pl-3 pr-3 backdrop-blur sm:pr-4">
          <SidebarTrigger className="size-8 rounded-md border border-border bg-card shadow-none hover:bg-muted" />

          <nav
            aria-label="Breadcrumb"
            className="hidden min-w-0 items-center gap-2 text-sm sm:flex"
          >
            <span className="text-muted-foreground">Workspace</span>
            {crumbs.map((c, i) => (
              <span key={c} className="flex min-w-0 items-center gap-2">
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                <span
                  className={
                    i === crumbs.length - 1
                      ? "truncate font-medium text-foreground"
                      : "truncate text-muted-foreground"
                  }
                >
                  {c}
                </span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Spotlight trigger — a clearly clickable search box with a ⌘K hint.
                Opens the command palette (pages + employees). */}
            <button
              type="button"
              onClick={togglePalette}
              className="hidden h-8 w-[300px] items-center gap-2 rounded-md border border-border bg-subtle pl-2.5 pr-1.5 text-left transition-colors hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 lg:flex"
            >
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] text-muted-foreground">
                Search pages, employees, codes…
              </span>
              <kbd className="pointer-events-none flex h-5 items-center rounded-[5px] border border-border bg-card px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <Button
              variant="outline"
              size="icon"
              className="shadow-none lg:hidden"
              aria-label="Search"
              onClick={togglePalette}
            >
              <Search className="!size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="shadow-none"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              {dark ? <Sun className="!size-4" /> : <Moon className="!size-4" />}
            </Button>

            {/* Pending leave requests and attendance corrections, as a dropdown. */}
            <NotificationBell />

            <FeedbackWidget variant="toolbar" />

            <div className="hidden h-5 w-px bg-border sm:block" />

            <Link to="/profile" className="flex items-center gap-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-foreground text-xs font-medium text-background">
                  {initials(accountName).slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col sm:flex">
                <span className="text-[13px] font-medium leading-[18px]">{accountName}</span>
                <span className="text-[11px] leading-4 text-muted-foreground">{accountRole}</span>
              </div>
            </Link>

            <Button
              variant="outline"
              aria-label="Sign out"
              className="h-8 px-2.5 shadow-none"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-16 md:p-6">{children}</main>
      </SidebarInset>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
}
