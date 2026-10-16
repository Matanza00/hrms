import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CircleCheck,
  Loader2,
  LogIn,
  LogOut,
  QrCode,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/shared/IconTile";
import type { Tone } from "@/lib/tones";
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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}

/** Login-screen language: canvas, logo, then one centred 380px white card. */
function Panel({
  icon,
  tone = "info",
  spin,
  children,
}: {
  icon: LucideIcon;
  tone?: Tone;
  spin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen-safe place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-[380px]">
        <img
          src="/brand/lds-logo.png"
          alt="LDS"
          className="mx-auto mb-5 size-12 rounded-xl object-cover"
        />
        <div className="flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-xs">
          <IconTile
            icon={icon}
            tone={tone}
            size="lg"
            className={spin ? "[&_svg]:animate-spin" : undefined}
          />
          {children}
        </div>
      </div>
    </div>
  );
}

const title = "mt-4 text-base font-semibold leading-6 tracking-[-0.2px]";
const body = "mt-1 text-[13px] leading-[18px] text-muted-foreground";
const action = "h-11 w-full sm:h-9";

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
      <Panel icon={QrCode} tone="neutral">
        <h1 className={title}>Nothing to scan</h1>
        <p className={body}>Scan the attendance poster in the office with your phone camera.</p>
      </Panel>
    );
  }

  if (status === "loading") {
    return (
      <Panel icon={Loader2} tone="neutral" spin>
        <p className={`${body} mt-4`}>Checking your session...</p>
      </Panel>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Panel icon={LogIn}>
        <h1 className={title}>Sign in to mark attendance</h1>
        <p className={body}>Use your employee code. You only need to do this once on your phone.</p>
        <Button className={`mt-5 ${action}`} asChild>
          <Link to="/login" search={{ next: "/scan", c }}>
            Sign in
          </Link>
        </Button>
      </Panel>
    );
  }

  if (role === "Admin") {
    return (
      <Panel icon={ShieldAlert} tone="warning">
        <h1 className={title}>Admin account</h1>
        <p className={body}>Attendance is marked from an employee account, not the admin login.</p>
      </Panel>
    );
  }

  if (scan.isPending || scan.isIdle) {
    return (
      <Panel icon={Loader2} tone="neutral" spin>
        <p className={`${body} mt-4`}>Marking your attendance...</p>
      </Panel>
    );
  }

  if (scan.isError) {
    return (
      <Panel icon={AlertTriangle} tone="danger">
        <h1 className={title}>Not marked</h1>
        <p className="mt-3 w-full rounded-lg border border-danger-line bg-danger-tint px-3 py-2.5 text-left text-[13px] text-danger-ink">
          {scan.error instanceof Error ? scan.error.message : "Something went wrong"}
        </p>
        <Button
          className={`mt-5 ${action}`}
          variant="outline"
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
        >
          Try again
        </Button>
        <Button className={`mt-2 ${action}`} variant="ghost" asChild>
          <Link to="/employee/attendance">Open my attendance</Link>
        </Button>
      </Panel>
    );
  }

  const result = scan.data;
  const checkedIn = result.action === "checkIn";
  const time = formatTime(checkedIn ? result.attendance?.checkIn : result.attendance?.checkOut);

  return (
    <Panel icon={checkedIn ? LogIn : LogOut} tone="success">
      <h1 className="mt-4 text-xl font-semibold leading-7 tracking-[-0.4px]">
        {checkedIn ? "Checked in" : "Checked out"}
      </h1>
      {time && (
        <p className="mt-1 font-mono text-[26px] font-medium leading-8 tracking-[-0.8px]">{time}</p>
      )}
      <p className={body}>{result.employeeName}</p>

      {result.deviceRegistered && (
        <p className="mt-4 flex w-full items-start gap-2 rounded-lg border border-success-line bg-success-tint px-3 py-2.5 text-left text-xs text-success-ink">
          <Smartphone className="mt-px size-3.5 shrink-0" />
          This phone is now registered to you. Use it for future scans.
        </p>
      )}

      {checkedIn && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleCheck className="size-3.5 shrink-0 text-success-ink" />
          Scan the same poster at the end of your shift to check out.
        </p>
      )}

      <Button className={`mt-5 ${action}`} variant="outline" asChild>
        <Link to="/employee/attendance">Open my attendance</Link>
      </Button>
    </Panel>
  );
}
