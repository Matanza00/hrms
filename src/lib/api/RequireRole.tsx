import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { AuthRole } from "@/lib/api/auth";
import { useAuth } from "./AuthContext";

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export function homePathForRole(role: AuthRole | null) {
  return role === "Admin" ? "/dashboard" : "/employee/dashboard";
}

export function RequireRole({
  role,
  children,
}: {
  role: AuthRole;
  children: ReactNode;
}) {
  const { status, role: current } = useAuth();

  if (status === "loading") return <FullScreenLoader />;

  if (status === "unauthenticated") return <Navigate to="/login" />;

  // Logged in but wrong panel — bounce to their own home.
  if (current !== role) {
    return <Navigate to={homePathForRole(current)} />;
  }

  return <>{children}</>;
}
