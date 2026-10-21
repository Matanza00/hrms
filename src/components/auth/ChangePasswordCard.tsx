import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/api/auth";
import { getToken } from "@/lib/auth/session";

const empty = { current: "", next: "", confirm: "" };

/** The signed-in user changes their own password (current one is checked). */
export function ChangePasswordCard() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changePassword(getToken() ?? "", form.current, form.next),
    onSuccess: () => {
      setForm(empty);
      setDone(true);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not change password."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (!form.current) return setError("Enter your current password.");
    if (form.next.length < 6) return setError("New password must be at least 6 characters.");
    if (form.next !== form.confirm) return setError("The new passwords don't match.");
    if (form.next === form.current)
      return setError("New password must be different from the current one.");
    mutation.mutate();
  }

  const field = (key: keyof typeof empty, label: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pw-${key}`}>{label}</Label>
      <Input
        id={`pw-${key}`}
        type="password"
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <ChartCard title="Change password" icon={Lock} tone="violet" bodyClassName="">
      <form onSubmit={submit} className="max-w-md space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
          >
            {error}
          </div>
        )}
        {done && (
          <div
            role="status"
            className="rounded-lg border border-success-line bg-success-tint px-3 py-2 text-[13px] text-success-ink"
          >
            Password changed. Use the new one next time you sign in.
          </div>
        )}
        {field("current", "Current password", "current-password")}
        {field("next", "New password", "new-password")}
        {field("confirm", "Confirm new password", "new-password")}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Change password"}
        </Button>
      </form>
    </ChartCard>
  );
}
