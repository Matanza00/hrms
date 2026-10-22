import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { IconTile } from "@/components/shared/IconTile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getMySeparation, submitResignation } from "@/lib/api/separations";
import { formatDay } from "@/lib/formatDay";

/**
 * Employee portal: hand in a resignation (the admin accepts it and sets the
 * last working day) and see where it stands.
 */
export function ResignationApplication() {
  const qc = useQueryClient();
  const { data: sep } = useQuery({ queryKey: ["mySeparation"], queryFn: getMySeparation });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [lastDay, setLastDay] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => submitResignation({ reason: reason.trim(), requestedLastDay: lastDay }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySeparation"] });
      setOpen(false);
      setReason("");
      setLastDay("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not submit."),
  });

  const open_ = sep && (sep.status === "Pending" || sep.status === "Approved");
  const subtitle = !sep
    ? "Hand in your resignation"
    : sep.status === "Pending"
      ? `Sent ${formatDay(sep.noticeDate)} · waiting for your admin`
      : sep.status === "Approved"
        ? `Accepted · last working day ${formatDay(sep.lastWorkingDay)}`
        : sep.status === "Rejected"
          ? `Not accepted${sep.adminNote ? `: ${sep.adminNote}` : ""}`
          : "Hand in your resignation";

  const tile = (
    <div className="flex min-h-11 w-full items-center gap-3 rounded-2xl border bg-card p-5 text-left transition-colors hover:bg-subtle">
      <IconTile icon={LogOut} tone={open_ ? "warning" : "neutral"} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-[-0.2px]">
          Resignation
          {sep && sep.status !== "Cancelled" && sep.status !== "Completed" && (
            <StatusBadge
              status={sep.status}
              label={sep.status === "Approved" ? "Accepted" : undefined}
            />
          )}
        </p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );

  // While a resignation is waiting or accepted there's nothing more to submit.
  if (open_) return tile;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError("");
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="w-full">
          {tile}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hand in your resignation</DialogTitle>
          <DialogDescription>
            Your admin reviews it and confirms your last working day. You keep access until then.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!reason.trim()) return setError("Please give a reason.");
            if (!lastDay) return setError("Choose your proposed last working day.");
            mutation.mutate();
          }}
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
            >
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="resign-reason">Reason</Label>
            <Textarea
              id="resign-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resign-last">Proposed last working day</Label>
            <Input
              id="resign-last"
              type="date"
              value={lastDay}
              onChange={(e) => setLastDay(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Submit resignation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
