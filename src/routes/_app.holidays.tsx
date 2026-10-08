import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CalendarHeart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHoliday, getHolidays, type Holiday } from "@/lib/api/holidays";
import { useState } from "react";

export const Route = createFileRoute("/_app/holidays")({
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

  return date.toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
  });
}

function HolidaysPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    holidayDate: "",
    holidayType: "",
  });
  const [error, setError] = useState("");

  const {
    data: holidays = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["holidays"],
    queryFn: getHolidays,
  });

  const createMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      setOpen(false);
      setForm({
        title: "",
        holidayDate: "",
        holidayType: "",
      });
    },
  });

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

      await createMutation.mutateAsync({
        title: form.title.trim(),
        holidayDate: form.holidayDate,
        holidayType: form.holidayType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save holiday.");
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Holidays"
          description="Public, religious and company holidays for the year."
        />
        <div className="rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
          Loading holidays...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <PageHeader
          title="Holidays"
          description="Public, religious and company holidays for the year."
        />
        <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
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
    .sort(
      (a, b) =>
        new Date(a.holidayDate).getTime() -
        new Date(b.holidayDate).getTime()
    )
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Holidays"
        description="Public, religious and company holidays for the year."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add holiday
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add holiday</DialogTitle>
              </DialogHeader>

              {error && (
                <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-[oklch(0.5_0.23_27)] dark:text-[oklch(0.78_0.23_27)]">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={form.holidayDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, holidayDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={form.holidayType}
                    onValueChange={(value) =>
                      setForm((p) => ({ ...p, holidayType: value }))
                    }
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

              <Button onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <h3 className="text-sm font-semibold mb-3">Upcoming</h3>

      {upcoming.length === 0 ? (
        <div className="mb-8 rounded-2xl border bg-card shadow-xs p-6 text-sm text-muted-foreground">
          No upcoming holidays.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {upcoming.map((h) => (
            <div key={h.holidayId} className="rounded-2xl border bg-card shadow-xs p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[oklch(0.62_0.19_259/0.12)] text-[oklch(0.5_0.19_259)]">
                  <CalendarHeart className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {h.holidayType}
                  </p>
                  <p className="text-sm font-semibold">{h.title}</p>
                </div>
              </div>

              <p className="mt-4 text-2xl font-semibold">
                {formatCardDay(h.holidayDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCardMeta(h.holidayDate)}
              </p>
            </div>
          ))}
        </div>
      )}

      <DataTable<Holiday>
        rowKey={(r) => r.holidayId}
        data={holidays}
        columns={[
          {
            key: "title",
            header: "Holiday",
            render: (r) => (
              <span className="font-medium">{r.title || "—"}</span>
            ),
          },
          {
            key: "holidayDate",
            header: "Date",
            render: (r) => formatDate(r.holidayDate),
          },
          {
            key: "holidayType",
            header: "Type",
            render: (r) => (
              <span className="capitalize rounded-full bg-muted px-2 py-0.5 text-[11px]">
                {r.holidayType || "—"}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}