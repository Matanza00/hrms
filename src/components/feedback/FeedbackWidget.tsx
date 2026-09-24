import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, MessageSquarePlus, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/AuthContext";
import { submitFeedback, type FeedbackType } from "@/lib/api/feedback";

const TYPES: FeedbackType[] = [
  "Bug / Something broken",
  "Missing feature",
  "Improvement",
  "Other",
];

/** Max width (px) we downscale screenshots to before uploading. */
const MAX_SCREENSHOT_WIDTH = 1600;

/**
 * Downscale + re-encode an image file/blob to a JPEG data URL so screenshot
 * payloads stay small enough for the Apps Script backend.
 */
function fileToCompressedDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SCREENSHOT_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FeedbackWidget() {
  const { role, user, employee } = useAuth();
  const pagePath = useRouterState({ select: (s) => s.location.pathname });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [screenshot, setScreenshot] = useState<string>("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reporterName =
    employee?.name || user?.username || "Unknown user";
  const reporterEmail = (employee?.email as string) || "";
  const reporterCode = employee?.employeeCode || user?.username || "";

  function resetForm() {
    setType("");
    setReason("");
    setScreenshot("");
    setError("");
    setDone(false);
  }

  const mutation = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => setDone(true),
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to send feedback."),
  });

  async function handleFile(file: File | Blob | undefined | null) {
    if (!file) return;
    try {
      setError("");
      const dataUrl = await fileToCompressedDataUrl(file);
      setScreenshot(dataUrl);
    } catch {
      setError("Could not read that image. Try a PNG or JPG.");
    }
  }

  // Allow pasting a screenshot straight from the clipboard while the dialog is open.
  useEffect(() => {
    if (!open) return;
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items || []).find((i) =>
        i.type.startsWith("image/")
      );
      if (item) {
        e.preventDefault();
        handleFile(item.getAsFile());
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open]);

  function handleSubmit() {
    setError("");
    if (!type) {
      setError("Please choose what kind of feedback this is.");
      return;
    }
    if (!reason.trim()) {
      setError("Please describe the issue or what you'd like changed.");
      return;
    }

    mutation.mutate({
      type,
      reason: reason.trim(),
      pageUrl: typeof window !== "undefined" ? window.location.href : pagePath,
      pagePath,
      role: role || "",
      reporterName,
      reporterEmail,
      reporterCode,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "",
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : "",
      screenshot,
      createdAt: new Date().toISOString(),
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  return (
    <>
      {/* Floating trigger — visible on every page for admins and employees. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send feedback to the developer</DialogTitle>
            <DialogDescription>
              Found something broken or missing? Tell us what happened and
              attach a screenshot so it can be fixed faster.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-700">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Thanks — feedback sent!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The developer has received your report.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Send another
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Type of feedback</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="What is this about?" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  What's the issue / what should change?
                </Label>
                <Textarea
                  rows={4}
                  placeholder="Describe what's missing, broken, or what you'd like the developer to update…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Screenshot (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />

                {screenshot ? (
                  <div className="relative overflow-hidden rounded-xl border">
                    <img
                      src={screenshot}
                      alt="Attached screenshot"
                      className="max-h-48 w-full object-contain bg-muted/40"
                    />
                    <button
                      type="button"
                      onClick={() => setScreenshot("")}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
                      aria-label="Remove screenshot"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center transition hover:bg-muted/40"
                  >
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Click to upload — or press{" "}
                      <kbd className="rounded border bg-muted px-1 text-[10px]">
                        Ctrl/⌘ + V
                      </kbd>{" "}
                      to paste a screenshot
                    </span>
                  </button>
                )}
              </div>

              <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                We'll automatically include the page you're on
                (<span className="font-medium">{pagePath}</span>) and your
                account so the developer has full context.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                  {mutation.isPending ? "Sending…" : "Send feedback"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
