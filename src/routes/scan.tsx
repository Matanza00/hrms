import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { describeDevice, getDeviceToken } from "@/lib/device";
import { scanAttendance, type ScanResult } from "@/lib/api/devices";
import { OFFICE_TZ } from "@/lib/businessDate";

/**
 * Where the office QR poster points. The phone opens this page, proves it is
 * the employee's registered device and marks attendance: check in at the start
 * of the shift, check out at the end.
 */
export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Scan — LDS HRMS" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : "",
  }),
  component: ScanPage,
});

function formatTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OFFICE_TZ,
  });
}

/** Current position, or nothing — a missing fix must never block the scan. */
function currentPosition(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen-safe place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <span className="text-base font-bold">LDS</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function ScanPage() {
  const { c } = Route.useSearch();
  const { status, role } = useAuth();
  const qc = useQueryClient();
  const fired = useRef(false);

  const scan = useMutation({
    mutationFn: async (): Promise<ScanResult> => {
      const where = await currentPosition();
      return scanAttendance({
        qrCode: c,
        deviceToken: getDeviceToken(),
        deviceLabel: describeDevice(),
        ipAddress: "browser",
        ...where,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });

  // One scan per page open; the QR is opened fresh by the camera each time.
  useEffect(() => {
    if (status !== "authenticated" || !c || fired.current) return;
    fired.current = true;
    scan.mutate();
  }, [status, c, scan]);

  if (!c) {
    return (
      <Panel>
        <h1 className="mt-4 text-base font-semibold">Nothing to scan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the attendance poster in the office with your phone camera.
        </p>
      </Panel>
    );
  }

  if (status === "loading") {
    return (
      <Panel>
        <p className="mt-4 text-sm text-muted-foreground">Checking your session...</p>
      </Panel>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Panel>
        <h1 className="mt-4 text-base font-semibold">Sign in to mark attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your employee code. You only need to do this once on your phone.
        </p>
        <Button className="mt-4 w-full" asChild>
          <Link to="/login" search={{ next: "/scan", c }}>
            Sign in
          </Link>
        </Button>
      </Panel>
    );
  }

  if (role === "Admin") {
    return (
      <Panel>
        <h1 className="mt-4 text-base font-semibold">Admin account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendance is marked from an employee account, not the admin login.
        </p>
      </Panel>
    );
  }

  if (scan.isPending || scan.isIdle) {
    return (
      <Panel>
        <p className="mt-4 text-sm text-muted-foreground">Marking your attendance...</p>
      </Panel>
    );
  }

  if (scan.isError) {
    return (
      <Panel>
        <h1 className="mt-4 text-base font-semibold">Not marked</h1>
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scan.error instanceof Error ? scan.error.message : "Something went wrong"}
        </p>
        <Button
          className="mt-4 w-full"
          variant="outline"
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
        >
          Try again
        </Button>
        <Button className="mt-2 w-full" variant="ghost" asChild>
          <Link to="/employee/attendance">Open my attendance</Link>
        </Button>
      </Panel>
    );
  }

  const result = scan.data;
  const checkedIn = result.action === "checkIn";
  const time = formatTime(checkedIn ? result.attendance?.checkIn : result.attendance?.checkOut);

  return (
    <Panel>
      <h1 className="mt-4 text-lg font-semibold">
        {checkedIn ? "Checked in" : "Checked out"}
        {time ? ` at ${time}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{result.employeeName}</p>

      {result.deviceRegistered && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          This phone is now registered to you. Use it for future scans.
        </p>
      )}

      {checkedIn && (
        <p className="mt-3 text-xs text-muted-foreground">
          Scan the same poster at the end of your shift to check out.
        </p>
      )}

      <Button className="mt-4 w-full" variant="outline" asChild>
        <Link to="/employee/attendance">Open my attendance</Link>
      </Button>
    </Panel>
  );
}
