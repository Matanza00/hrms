import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, PartyPopper, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { toneSoft, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
  type Holiday,
} from "@/lib/api/holidays";
import { useState } from "react";

export const Route = createFileRoute("/_app/holidays")({
  head: () => ({ meta: [{ title: "Holidays — LDS HRMS" }] }),
  component: HolidaysPage,
});

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const typeTone: Record<string, Tone> = {
  public: "success",
  religious: "neutral",
  company: "info",
};

/** Holiday type as a Figma badge: public green, religious neutral, company blue. */
function TypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-foreground">—</span>;
  const tone = typeTone[type.toLowerCase()] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-xs font-medium capitalize",
        toneSoft[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {type}
    </span>
  );
}

function formatCardDay(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });
}

function formatCardMeta(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  const year = date.toLocaleDateString("en-PK", { year: "numeric" });
  const weekday = date.toLocaleDateString("en-PK", { weekday: "long" });
  return `${year} · ${weekday}`;
}

const emptyForm = { title: "", holidayDate: "", holidayType: "" };

function HolidaysPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const {
    data: holidays = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["holidays"],
    queryFn: getHolidays,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["holidays"] });

  const createMutation = useMutation({
    mutationFn: createHoliday,
    meta: { inlineErrors: true, success: "Holiday added" },
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateHoliday,
    meta: { inlineErrors: true, success: "Holiday updated" },
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    meta: { success: "Holiday deleted" },
    onSuccess: invalidate,
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setOpen(true);
  }

  function openEdit(h: Holiday) {
    setEditing(h);
    setForm({
      title: h.title || "",
      holidayDate: toDateInput(h.holidayDate),
      holidayType: h.holidayType || "",
    });
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  }

  async function handleSave() {
    try {
      setError("");

      if (!form.title.trim()) {
        setError("Holiday name is required.");
        return;
      }
      if (!form.holidayDate) {
        setError("Holiday date is required.");
        return;
      }
      if (!form.holidayType) {
        setError("Holiday type is required.");
        return;
      }

      if (editing) {
        await updateMutation.mutateAsync({
          holidayId: editing.holidayId,
          title: form.title.trim(),
          holidayDate: form.holidayDate,
          holidayType: form.holidayType,
        });
      } else {
        await createMutation.mutateAsync({
          title: form.title.trim(),
          holidayDate: form.holidayDate,
          holidayType: form.holidayType,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save holiday.");
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          icon={PartyPopper}
          title="Holidays"
          description="Public, religious and company holidays for the year."
        />
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Loading holidays...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <PageHeader
          icon={PartyPopper}
          title="Holidays"
          description="Public, religious and company holidays for the year."
        />
        <div
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
        >
          {String(loadError.message)}
        </div>
      </div>
    );
  }

  const upcoming = [...holidays]
    .filter((h) => {
      const d = new Date(h.holidayDate);
      return !Number.isNaN(d.getTime()) && d >= new Date(new Date().toDateString());
    })
    .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime())
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        icon={PartyPopper}
        title="Holidays"
        description="Public, religious and company holidays for the year."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add holiday
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit holiday" : "Add holiday"}</DialogTitle>
            <DialogDescription>
              Holidays are skipped when working days and hours are counted.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink"
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.holidayDate}
                onChange={(e) => setForm((p) => ({ ...p, holidayDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.holidayType}
                onValueChange={(value) => setForm((p) => ({ ...p, holidayType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Religious">Religious</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <h3 className="mb-3 text-sm font-semibold leading-5 tracking-[-0.2px]">Upcoming</h3>

      {upcoming.length === 0 ? (
        <div className="mb-5">
          <EmptyState icon={CalendarDays} title="No upcoming holidays." />
        </div>
      ) : (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((h) => (
            <div key={h.holidayId} className="min-w-0 rounded-2xl border bg-card p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-md bg-info-tint text-info-ink">
                  <CalendarDays className="size-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs capitalize text-muted-foreground">{h.holidayType}</p>
                  <p className="truncate text-sm font-semibold leading-5 tracking-[-0.2px]">
                    {h.title}
                  </p>
                </div>
              </div>

              <p className="mt-4 font-mono text-[26px] font-medium leading-8 tracking-[-0.8px]">
                {formatCardDay(h.holidayDate)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatCardMeta(h.holidayDate)}
              </p>
            </div>
          ))}
        </div>
      )}

      <DataTable<Holiday>
        rowKey={(r) => r.holidayId}
        data={holidays}
        empty={<EmptyState icon={PartyPopper} title="No holidays added yet." />}
        columns={[
          {
            key: "title",
            header: "Holiday",
            render: (r) => <span className="font-medium">{r.title || "—"}</span>,
          },
          {
            key: "holidayDate",
            header: "Date",
            render: (r) => <span className="whitespace-nowrap">{formatDate(r.holidayDate)}</span>,
          },
          {
            key: "holidayType",
            header: "Type",
            render: (r) => <TypeBadge type={r.holidayType} />,
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r) => (
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  <Pencil />
                  Edit
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={deleteMutation.isPending}>
                      <Trash2 className="text-danger-ink" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete holiday?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes “{r.title}” ({formatDate(r.holidayDate)}) from the calendar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(r.holidayId)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
