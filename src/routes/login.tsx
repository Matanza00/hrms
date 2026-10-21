import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { homePathForRole } from "@/lib/auth/RequireRole";
import { Logo } from "@/components/shared/Logo";
import { requestPasswordReset } from "@/lib/api/auth";

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

  // "Forgot password?": employees can't reset it themselves, so this sends a
  // request to the admin, who sets a new password and shares it.
  const [forgot, setForgot] = useState(false);
  const [resetId, setResetId] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSent, setResetSent] = useState("");

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

  async function handleResetRequest() {
    if (resetSending || !resetId.trim()) return;
    setResetError("");
    setResetSending(true);
    try {
      const res = await requestPasswordReset(resetId.trim());
      setResetSent(res.message);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Could not send the request.");
    } finally {
      setResetSending(false);
    }
  }

  if (forgot) {
    return (
      <div className="grid min-h-screen-safe place-items-center bg-canvas px-4 py-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex flex-col items-center gap-5 text-center">
            <Logo className="size-12 rounded-xl" />
            <div>
              <h1 className="text-xl font-semibold leading-7 tracking-[-0.4px]">
                Forgot your password?
              </h1>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                Only your admin can set a new password. Send them a request.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-xs">
            {resetSent ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="rounded-lg border border-success-line bg-success-tint px-3 py-2 text-xs text-success-ink"
                >
                  {resetSent}
                </div>
                <Button className="h-11 w-full sm:h-9" onClick={() => setForgot(false)}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetRequest();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="resetId">Login ID</Label>
                  <Input
                    id="resetId"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={resetId}
                    onChange={(e) => setResetId(e.target.value)}
                    placeholder="Your employee code, e.g. EMP001"
                  />
                </div>

                {resetError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink"
                  >
                    {resetError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full sm:h-9"
                  disabled={resetSending || !resetId.trim()}
                >
                  {resetSending ? "Sending…" : "Send request to admin"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full sm:h-9"
                  onClick={() => setForgot(false)}
                >
                  Back to sign in
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
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
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setResetId(loginId.trim());
                    setResetError("");
                    setResetSent("");
                    setForgot(true);
                  }}
                  className="text-xs font-medium text-text-secondary underline-offset-2 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink"
              >
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
