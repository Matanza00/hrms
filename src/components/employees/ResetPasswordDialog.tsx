import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setEmployeePassword } from "@/lib/api/employees";

const empty = { next: "", confirm: "" };

/** Admin sets a new password on an employee's login. */
export function ResetPasswordDialog({
  employeeId,
  employeeName,
  loginId,
  size,
  label = "Reset password",
}: {
  employeeId: string;
  employeeName: string;
  loginId: string;
  size?: "sm" | "default";
  label?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => setEmployeePassword(employeeId, form.next),
    onSuccess: () => {
      setForm(empty);
      setDone(true);
      // Setting the password resolves the employee's open reset request.
      qc.invalidateQueries({ queryKey: ["passwordResetRequests"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not set password."),
  });

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o) {
      setForm(empty);
      setError("");
      setDone(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (form.next.length < 6) return setError("Password must be at least 6 characters.");
    if (form.next !== form.confirm) return setError("The passwords don't match.");
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>
          <KeyRound />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {employeeName}. They sign in with Login ID{" "}
            <span className="font-mono font-medium text-foreground">{loginId}</span>.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-lg border border-success-line bg-success-tint px-3 py-2 text-[13px] text-success-ink"
            >
              Password updated. Share the new password with {employeeName}.
            </div>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
              >
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reset-next">New password</Label>
              <Input
                id="reset-next"
                type="password"
                autoComplete="new-password"
                value={form.next}
                onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">Confirm new password</Label>
              <Input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Set password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
