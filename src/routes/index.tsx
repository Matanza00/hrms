import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { homePathForRole } from "@/lib/auth/RequireRole";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { status, role } = useAuth();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen-safe place-items-center bg-canvas">
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" />;
  }

  return <Navigate to={homePathForRole(role)} />;
}
