import { createFileRoute } from "@tanstack/react-router";
import { attendanceRecords, employees } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coffee, LogIn, LogOut, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/attendance/live")({
  component: Live,
});

function Column({ title, icon: Icon, color, items }: { title: string; icon: React.ComponentType<{ className?: string }>; color: string; items: { name: string; time: string; meta?: string }[] }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{items.length} employees</p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((i, idx) => (
          <li key={idx} className="relative flex items-start gap-3 pl-4 before:absolute before:left-1 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">
            <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-muted">{i.name.split(" ").map((s) => s[0]).join("")}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{i.name}</p>
              <p className="text-xs text-muted-foreground">{i.time}{i.meta ? ` · ${i.meta}` : ""}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Live() {
  const checkedIn = attendanceRecords.filter((a) => a.checkIn && !a.checkOut).map((a) => ({ name: a.employeeName, time: `In at ${a.checkIn}`, meta: a.location }));
  const onBreak = employees.slice(0, 2).map((e) => ({ name: e.name, time: "Break started 13:00", meta: "30 min" }));
  const checkedOut = attendanceRecords.filter((a) => a.checkOut).slice(0, 4).map((a) => ({ name: a.employeeName, time: `Out at ${a.checkOut}` }));
  const late = attendanceRecords.filter((a) => a.isLate).map((a) => ({ name: a.employeeName, time: `Late · ${a.checkIn}` }));

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Column title="Checked In" icon={LogIn} color="bg-[oklch(0.7_0.18_152/0.15)] text-[oklch(0.5_0.18_152)]" items={checkedIn} />
      <Column title="On Break" icon={Coffee} color="bg-[oklch(0.78_0.16_75/0.18)] text-[oklch(0.55_0.16_75)]" items={onBreak} />
      <Column title="Checked Out" icon={LogOut} color="bg-muted text-foreground" items={checkedOut} />
      <Column title="Late Arrivals" icon={AlertTriangle} color="bg-[oklch(0.62_0.23_27/0.12)] text-[oklch(0.55_0.23_27)]" items={late} />
    </div>
  );
}
