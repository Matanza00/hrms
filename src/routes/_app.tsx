import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/lib/auth/RequireRole";

export const Route = createFileRoute("/_app")({
  component: () => (
    <RequireRole role="Admin">
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireRole>
  ),
});
