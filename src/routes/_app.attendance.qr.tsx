import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Printer, RefreshCw, Smartphone } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  getAttendanceQr,
  getEmployeeDevices,
  resetEmployeeDevice,
  rotateAttendanceQr,
  type EmployeeDevice,
} from "@/lib/api/devices";

export const Route = createFileRoute("/_app/attendance/qr")({
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

function AttendanceQr() {
  const qc = useQueryClient();
  const [image, setImage] = useState("");
  const [confirmRotate, setConfirmRotate] = useState(false);

  const qrQuery = useQuery({ queryKey: ["attendanceQr"], queryFn: getAttendanceQr });
  const devicesQuery = useQuery({ queryKey: ["employeeDevices"], queryFn: getEmployeeDevices });

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

  const error = qrQuery.error || devicesQuery.error || rotate.error || reset.error;
  const devices = Array.isArray(devicesQuery.data) ? devicesQuery.data : [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border bg-card p-6 text-center">
          <h3 className="text-sm font-semibold">Office QR poster</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Print this and put it up in the office.
          </p>

          {qrQuery.isLoading ? (
            <p className="py-16 text-sm text-muted-foreground">Loading...</p>
          ) : image ? (
            <img
              src={image}
              alt="Attendance QR code"
              className="mx-auto mt-4 w-full max-w-[240px] rounded-xl border"
            />
          ) : (
            <p className="py-16 text-sm text-muted-foreground">No QR code yet.</p>
          )}

          <p className="mt-3 break-all text-[11px] text-muted-foreground">{scanUrl}</p>

          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={() => image && printPoster(image)} disabled={!image}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print poster
            </Button>

            {confirmRotate ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-xs text-amber-800">
                  Every printed poster stops working and must be replaced. Continue?
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rotate.mutate()}
                    disabled={rotate.isPending}
                  >
                    {rotate.isPending ? "Working..." : "Yes, new code"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmRotate(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="w-full" variant="outline" onClick={() => setConfirmRotate(true)}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Generate new code
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Registered phones</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            The first phone an employee scans with becomes theirs. Reset it when
            someone changes phone — their next scan registers the new one.
          </p>

          {devicesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No phones registered yet.
            </p>
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
                  render: (r) => formatDateTime(r.registeredAt),
                },
                {
                  key: "lastSeenAt",
                  header: "Last scan",
                  render: (r) => formatDateTime(r.lastSeenAt),
                },
                {
                  key: "actions",
                  header: "",
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
        </div>
      </div>
    </div>
  );
}
