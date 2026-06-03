import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState<boolean | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    // Auto-collapse sidebar on tablet (<1280) for more content space.
    setDefaultOpen(window.innerWidth >= 1280);
  }, []);

  if (defaultOpen === null) return null;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-3 border-b bg-background/80 px-3 sm:px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="relative hidden md:flex max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees, payslips…"
                className="h-9 pl-9 bg-muted/40 border-transparent focus-visible:bg-card"
              />
            </div>
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDark((v) => !v)}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[oklch(0.62_0.23_27)]" />
              </Button>
              <div className="ml-1 flex items-center gap-2 pl-2 sm:border-l">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">AK</AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-xs font-medium">Ayesha Khan</span>
                  <span className="text-[10px] text-muted-foreground">Admin</span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
