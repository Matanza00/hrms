import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  Receipt,
  PartyPopper,
  BarChart3,
  Settings,
  User,
  ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Leaves", url: "/leaves", icon: CalendarDays },
  { title: "Payroll", url: "/payroll", icon: Wallet },
  { title: "Accounts", url: "/accounts", icon: Receipt },
  { title: "Holidays", url: "/holidays", icon: PartyPopper },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];
const meta = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = (url: string) => path === url || path.startsWith(url + "/");

  const group = (label: string, items: typeof main) => (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={active(item.url)} tooltip={item.title}>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  // Figma "Sidebar": transparent on the canvas, a workspace card on top,
  // then mono-labelled nav groups. The active item is a white raised pill.
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="p-0 pb-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-card py-2 pl-2 pr-2.5 shadow-xs group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none">
          <img
            src="/brand/lds-logo.png"
            alt="LDS"
            className="size-8 shrink-0 rounded-md object-cover"
          />
          {!collapsed && (
            <>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold leading-5 text-foreground">LDS</span>
                <span className="truncate text-xs leading-4 text-muted-foreground">
                  HRMS & Accounts
                </span>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-6">
        {group("Workspace", main)}
        {group("Account", meta)}
      </SidebarContent>
    </Sidebar>
  );
}
