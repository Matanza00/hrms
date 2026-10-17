import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Laptop, Printer, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import {
  addEmployeeIp,
  getEmployeeIps,
  removeEmployeeIp,
  whereAmI,
  type EmployeeIp,
} from "@/lib/api/ips";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getAttendanceQr,
  getEmployeeDevices,
  resetEmployeeDevice,
  rotateAttendanceQr,
  type EmployeeDevice,
} from "@/lib/api/devices";

export const Route = createFileRoute("/_app/attendance/qr")({
  head: () => ({ meta: [{ title: "QR & Devices — LDS HRMS" }] }),
  component: AttendanceQr,
});

function formatDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Print just the poster, without the surrounding admin screen. */
function printPoster(imageDataUrl: string) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Attendance QR</title>
    <style>
      body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      p { color: #555; font-size: 14px; margin-top: 0; }
      img { width: 460px; max-width: 90%; margin: 24px auto; display: block; }
      ol { text-align: left; max-width: 460px; margin: 0 auto; color: #333; font-size: 13px; line-height: 1.7; }
    </style></head><body>
    <h1>LDS Attendance</h1>
    <p>Scan with your phone camera to check in and out</p>
    <img src="${imageDataUrl}" alt="Attendance QR code" />
    <ol>
      <li>Open your phone camera and point it at this code.</li>
      <li>Sign in once with your employee code — your phone is then registered to you.</li>
      <li>Scan when you arrive to check in, and again when you leave to check out.</li>
    </ol>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/** Card with a plain 16px icon + 14px title row, as in the Figma frame. */
function Panel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">{title}</h3>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AttendanceQr() {
  const qc = useQueryClient();
  const [image, setImage] = useState("");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [ipEmployee, setIpEmployee] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [ipLabel, setIpLabel] = useState("");

  const qrQuery = useQuery({ queryKey: ["attendanceQr"], queryFn: getAttendanceQr });
  const devicesQuery = useQuery({ queryKey: ["employeeDevices"], queryFn: getEmployeeDevices });

  const { data: employeesRaw = [] } = useEmployees();
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  const myIpQuery = useQuery({ queryKey: ["whereAmI"], queryFn: whereAmI });
  const ipsQuery = useQuery({ queryKey: ["employeeIps"], queryFn: getEmployeeIps });

  const addIp = useMutation({
    mutationFn: addEmployeeIp,
    onSuccess: () => {
      setIpAddress("");
      setIpLabel("");
      qc.invalidateQueries({ queryKey: ["employeeIps"] });
    },
  });

  const removeIp = useMutation({
    mutationFn: removeEmployeeIp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employeeIps"] }),
  });

  const rotate = useMutation({
    mutationFn: rotateAttendanceQr,
    onSuccess: () => {
      setConfirmRotate(false);
      qc.invalidateQueries({ queryKey: ["attendanceQr"] });
    },
  });

  const reset = useMutation({
    mutationFn: resetEmployeeDevice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employeeDevices"] }),
  });

  const code = qrQuery.data?.code ?? "";
  // Built from the browser's own origin, so a poster printed from the live site
  // points at the live site.
  const scanUrl =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/scan?c=${encodeURIComponent(code)}`
      : "";

  useEffect(() => {
    if (!scanUrl) return setImage("");
    let cancelled = false;
    QRCode.toDataURL(scanUrl, { width: 512, margin: 2 })
      .then((url) => !cancelled && setImage(url))
      .catch(() => !cancelled && setImage(""));
    return () => {
      cancelled = true;
    };
  }, [scanUrl]);

  const error =
    qrQuery.error ||
    devicesQuery.error ||
    rotate.error ||
    reset.error ||
    addIp.error ||
    removeIp.error ||
    ipsQuery.error;
  const devices = Array.isArray(devicesQuery.data) ? devicesQuery.data : [];
  const ips = Array.isArray(ipsQuery.data) ? ipsQuery.data : [];
  const myIp = myIpQuery.data?.ip ?? "";

  // The /24 this computer sits in. An ISP reconnect usually changes only the
  // last number, so registering the block outlasts the address itself.
  const myBlock = /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(myIp)
    ? `${myIp.split(".").slice(0, 3).join(".")}.0/24`
    : "";

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-tint p-4 text-[13px] text-danger-ink"
        >
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-card p-5 text-center">
          <h3 className="text-sm font-semibold leading-5 tracking-[-0.2px]">Office QR poster</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Print this and put it up in the office.
          </p>

          {qrQuery.isLoading ? (
            <p className="py-16 text-[13px] text-muted-foreground">Loading...</p>
          ) : image ? (
            <img
              src={image}
              alt="Attendance QR code"
              className="mx-auto mt-4 w-full max-w-[200px] rounded-lg border"
            />
          ) : (
            <div className="mt-4">
              <EmptyState title="No QR code yet." />
            </div>
          )}

          <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{scanUrl}</p>

          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              onClick={() => image && printPoster(image)}
              disabled={!image}
            >
              <Printer />
              Print poster
            </Button>

            <Button
              variant="ghost"
              className="w-full text-danger-ink hover:bg-danger-tint hover:text-danger-ink"
              onClick={() => setConfirmRotate(true)}
            >
              <RefreshCw />
              Generate new code
            </Button>
          </div>
        </section>

        <Panel
          icon={Smartphone}
          title="Registered phones"
          description="The first phone an employee scans with becomes theirs. Reset it when someone changes phone — their next scan registers the new one."
        >
          {devicesQuery.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading...</p>
          ) : devices.length === 0 ? (
            <EmptyState icon={Smartphone} title="No phones registered yet." />
          ) : (
            <DataTable<EmployeeDevice>
              rowKey={(r) => r.deviceId}
              data={devices}
              columns={[
                {
                  key: "employee",
                  header: "Employee",
                  render: (r) => <span className="font-medium">{r.employeeName || "—"}</span>,
                },
                { key: "label", header: "Phone", render: (r) => r.label || "—" },
                {
                  key: "registeredAt",
                  header: "Registered",
                  render: (r) => (
                    <span className="whitespace-nowrap">{formatDateTime(r.registeredAt)}</span>
                  ),
                },
                {
                  key: "lastSeenAt",
                  header: "Last scan",
                  render: (r) => (
                    <span className="whitespace-nowrap">{formatDateTime(r.lastSeenAt)}</span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (r) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reset.mutate(r.employeeId)}
                      disabled={reset.isPending}
                    >
                      Reset
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </Panel>
      </div>

      <Panel
        icon={Laptop}
        title="Desktop networks"
        description={
          <>
            A desktop has no GPS, so the office radius alone can never let one through. Register the
            network an employee&apos;s computer connects from and they can check in and out on it.
            Everyone else still has to be inside the {"‘"}office radius{"’"} on their phone.
          </>
        }
      >
        <div className="rounded-lg border bg-subtle px-3 py-2.5 text-xs leading-[18px] text-text-secondary">
          This computer is reaching the server from{" "}
          <span className="font-mono font-medium text-foreground">{myIp || "…"}</span>. If the
          office computers share this internet connection, that is the address to register.
          {myBlock && (
            <>
              {" "}
              Most connections are handed a new address whenever the router reconnects, and only the
              last number changes. Registering the block{" "}
              <span className="font-mono font-medium text-foreground">{myBlock}</span> instead keeps
              working through those changes, at the cost of also admitting anyone else your
              provider puts in the same block.
            </>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={ipEmployee} onValueChange={setIpEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.employeeId} value={e.employeeId}>
                    {e.name} ({e.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>IP address or block</Label>
            <Input
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g. 103.12.34.56 or 119.73.96.0/24"
              inputMode="decimal"
              className="font-mono"
            />
            <div className="flex flex-wrap gap-x-3">
              {myIp && ipAddress !== myIp && (
                <button
                  type="button"
                  onClick={() => setIpAddress(myIp)}
                  className="cursor-pointer text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Use this computer&apos;s address
                </button>
              )}
              {myBlock && ipAddress !== myBlock && (
                <button
                  type="button"
                  onClick={() => setIpAddress(myBlock)}
                  className="cursor-pointer text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Use its whole block ({myBlock})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Label (optional)</Label>
            <Input
              value={ipLabel}
              onChange={(e) => setIpLabel(e.target.value)}
              placeholder="e.g. Reception PC"
            />
          </div>

          <Button
            className="h-9 sm:mt-6"
            disabled={!ipEmployee || !ipAddress.trim() || addIp.isPending}
            onClick={() =>
              addIp.mutate({
                employeeId: ipEmployee,
                ipAddress: ipAddress.trim(),
                label: ipLabel.trim() || undefined,
              })
            }
          >
            {addIp.isPending ? "Adding..." : "Add"}
          </Button>
        </div>

        <div className="mt-5">
          {ipsQuery.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading...</p>
          ) : ips.length === 0 ? (
            <EmptyState
              icon={Laptop}
              title="No networks registered yet"
              description="Attendance is phone-only until a network is added."
            />
          ) : (
            <DataTable<EmployeeIp>
              rowKey={(r) => r.ipId}
              data={ips}
              columns={[
                {
                  key: "employee",
                  header: "Employee",
                  render: (r) => <span className="font-medium">{r.employeeName || "—"}</span>,
                },
                {
                  key: "ipAddress",
                  header: "Network",
                  render: (r) => (
                    <span className="break-all font-mono text-[13px]">{r.ipAddress}</span>
                  ),
                },
                { key: "label", header: "Label", render: (r) => r.label || "—" },
                {
                  key: "lastUsedAt",
                  header: "Last used",
                  render: (r) => (
                    <span className="whitespace-nowrap">{formatDateTime(r.lastUsedAt)}</span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (r) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeIp.mutate(r.ipId)}
                      disabled={removeIp.isPending}
                    >
                      <Trash2 />
                      Remove
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Panel>

      <Dialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-danger-line bg-danger-tint text-danger-ink">
              <RefreshCw className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle>Generate a new QR code?</DialogTitle>
              <DialogDescription>
                Every poster you&apos;ve already printed will stop working immediately. Employees
                won&apos;t be able to check in until you print and put up the new poster.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setConfirmRotate(false)}>
              Keep current code
            </Button>
            <Button
              variant="destructive"
              onClick={() => rotate.mutate()}
              disabled={rotate.isPending}
            >
              <RefreshCw />
              {rotate.isPending ? "Working..." : "Generate new code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
