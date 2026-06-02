import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { holidays, type Holiday } from "@/lib/mock-data";
import { Plus, CalendarHeart } from "lucide-react";

export const Route = createFileRoute("/_app/holidays")({
  component: () => (
    <div>
      <PageHeader title="Holidays" description="Public, religious and company holidays for the year."
        actions={
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add holiday</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add holiday</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5"><Label className="text-xs">Name</Label><Input /></div>
                <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="religious">Religious</SelectItem><SelectItem value="company">Company</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button>Save</Button>
            </DialogContent>
          </Dialog>
        }
      />

      <h3 className="text-sm font-semibold mb-3">Upcoming</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {holidays.map((h) => (
          <div key={h.id} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[oklch(0.62_0.19_259/0.12)] text-[oklch(0.5_0.19_259)]"><CalendarHeart className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground capitalize">{h.type}</p>
                <p className="text-sm font-semibold">{h.name}</p>
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold">{new Date(h.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p>
            <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric" })}</p>
          </div>
        ))}
      </div>

      <DataTable<Holiday>
        rowKey={(r) => r.id}
        data={holidays}
        columns={[
          { key: "name", header: "Holiday", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "date", header: "Date" },
          { key: "type", header: "Type", render: (r) => <span className="capitalize rounded-full bg-muted px-2 py-0.5 text-[11px]">{r.type}</span> },
        ]}
      />
    </div>
  ),
});
