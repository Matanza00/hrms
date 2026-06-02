import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { employees } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Sun } from "lucide-react";

export const Route = createFileRoute("/_app/special-working-days")({
  component: () => (
    <div>
      <PageHeader title="Special working days" description="Override holidays for selected employees when work is required."
        actions={
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Schedule day</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign employees</DialogTitle></DialogHeader>
              <div className="max-h-80 overflow-y-auto divide-y">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                    <Checkbox />
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-muted">{e.name.split(" ").map((s) => s[0]).join("")}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.department}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button>Assign</Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">June 2026 calendar</h3>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-[11px] font-medium text-muted-foreground py-1.5">{d}</div>)}
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`aspect-square grid place-items-center rounded-lg text-xs ${i === 6 ? "bg-accent text-accent-foreground font-semibold" : i % 7 === 0 || i % 7 === 6 ? "bg-muted/50 text-muted-foreground" : "hover:bg-muted"}`}>{i + 1}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Sun className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />Assigned employees</h3>
          <ul className="space-y-3">
            {employees.slice(0, 3).map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-muted">{e.name.split(" ").map((s) => s[0]).join("")}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="text-sm font-medium">{e.name}</p><p className="text-xs text-muted-foreground">June 7 · Eid override</p></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  ),
});
