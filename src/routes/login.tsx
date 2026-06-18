import {
  createFileRoute,
  Navigate,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { homePathForRole } from "@/lib/auth/RequireRole";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — LDS HRMS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { status, role, login } = useAuth();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — send to the right panel.
  if (status === "authenticated") {
    return <Navigate to={homePathForRole(role)} />;
  }

  async function handleSubmit() {
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const session = await login(loginId.trim(), password);
      navigate({ to: homePathForRole(session.user.role) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-xl font-bold">LDS</span>
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">
            Sign in to LDS HRMS
          </h1>
          <p className="text-xs text-muted-foreground">
            Use your employee code or admin username.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="loginId">
                Login ID
              </Label>
              <Input
                id="loginId"
                autoFocus
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="EMP001 or admin"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              disabled={submitting || !loginId.trim() || !password}
              onClick={handleSubmit}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
