import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Search, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { useAuth } from "@/lib/auth/AuthContext";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState<boolean | null>(null);
  const { open: paletteOpen, setOpen: setPaletteOpen, toggle: togglePalette } =
    useCommandPalette();

  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();
  const accountName = employee?.name || user?.username || "Admin";
  const accountRole = user?.role === "Admin" ? "Administrator" : "Employee";

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

            {/* Spotlight trigger — a clearly clickable search box with a ⌘K hint.
                Opens the command palette (pages + employees). */}
            <button
              type="button"
              onClick={togglePalette}
              className="group hidden md:flex max-w-md flex-1 items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-card"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">
                Search pages, employees, codes…
              </span>
              <kbd className="pointer-events-none hidden items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              aria-label="Search"
              onClick={togglePalette}
            >
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

              <NotificationBell />

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

              <Button
                variant="outline"
                size="sm"
                aria-label="Sign out"
                className="ml-1 h-11 px-3 sm:h-8"
                onClick={() => {
                  logout();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <FeedbackWidget />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </SidebarProvider>
  );
}