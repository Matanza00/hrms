import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Wallet, Receipt,
  PartyPopper, BarChart3, Settings, User, TrendingUp, TrendingDown,
  PiggyBank, UserRound,
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";

type PageLink = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
};

const PAGES: PageLink[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Attendance", to: "/attendance", icon: Clock },
  { label: "Leaves", to: "/leaves", icon: CalendarDays },
  { label: "Payroll", to: "/payroll", icon: Wallet },
  { label: "Accounts", to: "/accounts", icon: Receipt, keywords: "money finance" },
  { label: "Revenue", to: "/accounts/revenue", icon: TrendingUp, keywords: "income client" },
  { label: "Expenses", to: "/accounts/expenses", icon: TrendingDown, keywords: "spend cost" },
  { label: "Reserve", to: "/accounts/reserve", icon: PiggyBank, keywords: "savings" },
  { label: "Profit Distribution", to: "/accounts/profit-distribution", icon: BarChart3, keywords: "partners sadqah" },
  { label: "Holidays", to: "/holidays", icon: PartyPopper },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Profile", to: "/profile", icon: User },
];

/**
 * A macOS/iOS-style spotlight. Opens on ⌘K / Ctrl+K (or from the header search
 * box) and jumps to any page or employee. Controlled by the parent so the
 * header's search affordance and the global shortcut share one dialog.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: employeesRaw = [] } = useEmployees();
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  function go(to: string, params?: Record<string, string>) {
    onOpenChange(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to, params } as any);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, employees, codes…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem
              key={p.to}
              value={`${p.label} ${p.keywords ?? ""}`}
              onSelect={() => go(p.to)}
            >
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {employees.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Employees">
              {employees.map((e) => (
                <CommandItem
                  key={e.employeeId}
                  value={`${e.name} ${e.employeeCode} ${e.email ?? ""} ${e.department ?? ""} ${e.designation ?? ""}`}
                  onSelect={() => go("/employees/$id", { id: e.employeeId })}
                >
                  <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{e.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {e.employeeCode}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Registers the global ⌘K / Ctrl+K shortcut and owns the open state. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useMemo(() => () => setOpen((v) => !v), []);
  return { open, setOpen, toggle };
}
