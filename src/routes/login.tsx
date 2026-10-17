import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { homePathForRole } from "@/lib/auth/RequireRole";
import { Logo } from "@/components/shared/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — LDS HRMS" }] }),
  // `next` carries an interrupted destination — today only the QR scan page,
  // which passes its code along in `c` so the scan resumes after signing in.
  // Both optional, so every existing `to="/login"` link stays valid.
  validateSearch: (search: Record<string, unknown>): { next?: string; c?: string } => ({
    next: typeof search.next === "string" ? search.next : undefined,
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { status, role, login } = useAuth();
  const navigate = useNavigate();
  const { next, c } = Route.useSearch();
  const backToScan = next === "/scan" && !!c;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Already signed in — resume the scan, or go to the right panel.
  if (status === "authenticated") {
    return backToScan ? (
      <Navigate to="/scan" search={{ c }} />
    ) : (
      <Navigate to={homePathForRole(role)} />
    );
  }

  async function handleSubmit() {
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const session = await login(loginId.trim(), password);
      if (backToScan) navigate({ to: "/scan", search: { c } });
      else navigate({ to: homePathForRole(session.user.role) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen-safe place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-5 text-center">
          <Logo className="size-12 rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold leading-7 tracking-[-0.4px]">
              Sign in to LDS HRMS
            </h1>
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              Use your employee code or admin username.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="loginId">Login ID</Label>
              <Input
                id="loginId"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="EMP001 or admin"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-right text-xs font-medium text-text-secondary">
                Forgot password? Ask your admin to reset it.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full sm:h-9"
              disabled={submitting || !loginId.trim() || !password}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
