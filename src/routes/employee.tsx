import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Wallet,
  FolderOpen,
  FileStack,
  ClipboardCheck,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/Logo";
import { RequireRole } from "@/lib/auth/RequireRole";
import { useAuth } from "@/lib/auth/AuthContext";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

const nav = [
  { url: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { url: "/employee/attendance", label: "Attendance", icon: Clock },
  { url: "/employee/corrections", label: "Corrections", icon: ClipboardCheck },
  { url: "/employee/leaves", label: "Leaves", icon: CalendarDays },
  { url: "/employee/payroll", label: "Payroll", icon: Wallet },
  { url: "/employee/documents", label: "Documents", icon: FolderOpen },
  { url: "/employee/applications", label: "Applications", icon: FileStack },
  { url: "/employee/profile", label: "Profile", icon: User },
];

function initials(name?: string) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function EmployeeLayout() {
  return (
    <RequireRole role="Employee">
      <EmployeeShell />
    </RequireRole>
  );
}

function EmployeeShell() {
  const { employee, user, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const name = employee?.name || user?.username || "Employee";

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-svh">
      {/* Thin glass bar: the page scrolls underneath it. Side padding clears
          the notch in landscape. */}
      <header className="material-bar sticky top-0 z-10 border-b border-divider pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8 rounded-md" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-5">LDS</span>
              <span className="text-xs leading-4 text-muted-foreground">Employee Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="size-7">
                <AvatarFallback className="bg-foreground text-xs font-medium text-background">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-medium leading-[18px]">{name}</span>
                <span className="text-[11px] leading-4 text-muted-foreground">
                  {employee?.designation || "Employee"}
                </span>
              </div>
            </div>

            <FeedbackWidget variant="toolbar" />
            <Button variant="outline" className="shadow-none max-sm:h-11" onClick={handleLogout}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-0.5 overflow-x-auto overscroll-x-contain pb-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => {
            const active = path === item.url || path.startsWith(item.url + "/");

            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex h-[34px] shrink-0 select-none items-center gap-2 rounded-md border px-2.5 text-sm transition-colors [-webkit-touch-callout:none] max-sm:min-h-11 ${
                  active
                    ? "border-border bg-card font-medium text-foreground shadow-xs"
                    : "border-transparent text-text-secondary hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl py-6 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <Outlet />
      </main>
    </div>
  );
}
