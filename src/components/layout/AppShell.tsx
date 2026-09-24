import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { getLeaveRequests } from "@/lib/api/leaves";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { useAuth } from "@/lib/auth/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState<boolean | null>(null);
  const [q, setQ] = useState("");

  const { data: employeesRaw = [] } = useEmployees();

  const { data: leavesRaw = [] } = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: getLeaveRequests,
  });

  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const leaves = Array.isArray(leavesRaw) ? leavesRaw : [];

  const { user, employee } = useAuth();
  const accountName = employee?.name || user?.username || "Admin";
  const accountRole = user?.role === "Admin" ? "Administrator" : "Employee";

  const pendingLeaves = leaves.filter((l) => l.status === "Pending").length;

  const searchResults = useMemo(() => {
    if (!q.trim()) return [];

    const term = q.toLowerCase();

    return employees
      .filter((e) =>
        [
          e.name,
          e.employeeCode,
          e.email,
          e.department,
          e.designation,
          e.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 5);
  }, [q, employees]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    setDefaultOpen(window.innerWidth >= 1280);
  }, []);

  if (defaultOpen === null) return null;

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

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-3 border-b bg-background/80 px-3 sm:px-4 backdrop-blur">
            <SidebarTrigger className="h-11 w-11 sm:h-9 sm:w-9" />

            <div className="relative hidden md:flex max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search employees, codes, departments…"
                className="h-9 pl-9 bg-muted/40 border-transparent focus-visible:bg-card"
              />

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-11 z-50 rounded-xl border bg-card p-2 shadow-lg">
                  {searchResults.map((employee) => (
                    <Link
                      key={employee.employeeId}
                      to="/employees/$id"
                      params={{ id: employee.employeeId }}
                      onClick={() => setQ("")}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {initials(employee.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {employee.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {employee.employeeCode} · {employee.department || "—"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>

            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDark((v) => !v)}
              >
                {dark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                asChild
              >
                <Link to="/leaves">
                  <Bell className="h-4 w-4" />
                  {pendingLeaves > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[oklch(0.62_0.23_27)] px-1 text-[9px] font-semibold text-white">
                      {pendingLeaves}
                    </span>
                  )}
                </Link>
              </Button>

              <Link
                to="/profile"
                className="ml-1 flex items-center gap-2 pl-2 sm:border-l"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials(accountName)}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-xs font-medium">{accountName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {accountRole}
                  </span>
                </div>
              </Link>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <FeedbackWidget />
      </div>
    </SidebarProvider>
  );
}