import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { ResetPasswordDialog } from "@/components/employees/ResetPasswordDialog";
import { dismissPasswordResetRequest, getPasswordResetRequests } from "@/lib/api/employees";

function formatWhen(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-PK", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
}

/**
 * Employees who asked for a password reset from the login page. Hidden when
 * there are none. Setting a password resolves the request; Dismiss closes it.
 */
export function PasswordResetRequests() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["passwordResetRequests"],
    queryFn: getPasswordResetRequests,
  });

  const dismiss = useMutation({
    mutationFn: dismissPasswordResetRequest,
    meta: { success: "Request dismissed" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passwordResetRequests"] }),
  });

  if (requests.length === 0) return null;

  return (
    <div className="mb-4">
      <ChartCard
        icon={KeyRound}
        tone="warning"
        title="Password reset requests"
        description="Set a new password and share it with the employee."
        bodyClassName=""
      >
        <ul className="-my-2.5 divide-y divide-divider">
          {requests.map((r) => (
            <li
              key={r.requestId}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-medium">{r.employeeName || "Employee"}</p>
                <p className="text-muted-foreground">
                  <span className="font-mono">{r.employeeCode || "—"}</span> · requested{" "}
                  {formatWhen(r.requestedAt)}
                </p>
              </div>
              <div className="flex gap-1.5">
                <ResetPasswordDialog
                  employeeId={r.employeeId}
                  employeeName={r.employeeName || "this employee"}
                  loginId={r.employeeCode || ""}
                  size="sm"
                  label="Set password"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={dismiss.isPending}
                  onClick={() => dismiss.mutate(r.requestId)}
                >
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}
