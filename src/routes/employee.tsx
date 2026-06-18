import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Wallet,
  FolderOpen,
  FileStack,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RequireRole } from "@/lib/auth/RequireRole";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/employee")({
  component: EmployeeLayout,
});

const nav = [
  { url: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { url: "/employee/attendance", label: "Attendance", icon: Clock },
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">LDS</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Employee Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium">{name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {employee?.designation || "Employee"}
                </span>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((item) => {
            const active =
              path === item.url || path.startsWith(item.url + "/");

            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
