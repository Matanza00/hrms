import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Check, FileText, Download, Trash2, UploadCloud, X } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  deleteEmployeeDocument,
  getEmployeeDocuments,
  reviewEmployeeDocument,
  uploadEmployeeDocument,
  type EmployeeDocument,
} from "@/lib/api/documents";

const CATEGORIES = ["CNIC", "Educational Certificates", "Medical Documents", "Contract", "Other"];

const MAX_BYTES = 8 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Refresh every list a document change can affect. */
function useInvalidateDocuments(employeeId?: string) {
  const qc = useQueryClient();
  return () => {
    if (employeeId) qc.invalidateQueries({ queryKey: ["employeeDocuments", employeeId] });
    else qc.invalidateQueries({ queryKey: ["employeeDocuments"] });
    qc.invalidateQueries({ queryKey: ["pendingDocuments"] });
  };
}

/** Admin: Approve, or Reject with a reason the employee will see. */
export function ReviewDocumentButtons({
  doc,
  employeeId,
}: {
  doc: EmployeeDocument;
  employeeId?: string;
}) {
  const invalidate = useInvalidateDocuments(employeeId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const review = useMutation({
    mutationFn: reviewEmployeeDocument,
    onSuccess: () => {
      invalidate();
      setRejectOpen(false);
      setNote("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save the review."),
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7"
        disabled={review.isPending}
        onClick={() => review.mutate({ documentId: doc.documentId, status: "Approved" })}
      >
        <Check className="h-3 w-3" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-danger-ink"
        disabled={review.isPending}
        onClick={() => {
          setError("");
          setRejectOpen(true);
        }}
      >
        <X className="h-3 w-3" />
        Reject
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document?</DialogTitle>
            <DialogDescription>
              “{doc.title}” will be marked rejected. Tell the employee what to fix so they can
              upload it again.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[13px] text-danger-ink"
            >
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`reject-${doc.documentId}`}>Reason</Label>
            <Textarea
              id={`reject-${doc.documentId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. The CNIC photo is blurry; please upload a clearer scan."
            />
          </div>
          <Button
            disabled={review.isPending || !note.trim()}
            onClick={() =>
              review.mutate({ documentId: doc.documentId, status: "Rejected", note: note.trim() })
            }
          >
            {review.isPending ? "Saving..." : "Reject document"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Upload + list of an employee's documents.
 *  - mode "admin": admin's view of any employee; uploads are approved at once,
 *    pending uploads can be approved or rejected, anything can be deleted.
 *  - mode "self": the employee's own portal; uploads wait for admin review and
 *    only documents that aren't approved yet can be removed.
 */
export function EmployeeDocuments({
  employeeId,
  mode = "admin",
}: {
  employeeId: string;
  mode?: "admin" | "self";
}) {
  const isAdmin = mode === "admin";
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CNIC");
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["employeeDocuments", employeeId],
    queryFn: () => getEmployeeDocuments(employeeId),
    enabled: !!employeeId,
  });

  const invalidate = useInvalidateDocuments(employeeId);

  const uploadMutation = useMutation({
    mutationFn: uploadEmployeeDocument,
    onSuccess: () => {
      invalidate();
      setFile(null);
      setTitle("");
      setUploaded(true);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployeeDocument,
    onSuccess: invalidate,
  });

  async function handleUpload() {
    setError("");
    setUploaded(false);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is larger than 8 MB. Please upload a smaller file.");
      return;
    }
    try {
      const dataBase64 = await fileToDataUrl(file);
      await uploadMutation.mutateAsync({
        employeeId,
        title: title.trim() || file.name,
        category,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
            <UploadCloud className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Upload a document</h4>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Stored privately in Supabase. Max 8 MB (PDF or image works best)."
                : "Max 8 MB (PDF or image works best). Your admin reviews each document."}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-3 rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-xs text-danger-ink"
          >
            {error}
          </div>
        )}
        {uploaded && !isAdmin && (
          <div
            role="status"
            className="mb-3 rounded-lg border border-success-line bg-success-tint px-3 py-2 text-xs text-success-ink"
          >
            Uploaded. It shows as Pending until your admin approves it.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">File</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file?.name || "e.g. CNIC front"}
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleUpload} disabled={uploadMutation.isPending}>
            <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
            {uploadMutation.isPending ? "Uploading…" : isAdmin ? "Upload" : "Upload for review"}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border bg-card p-5">
        <h4 className="mb-3 text-sm font-semibold">Documents</h4>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="divide-y">
            {docs.map((d: EmployeeDocument) => {
              const status = d.status ?? "Approved";
              const canDelete = isAdmin || status !== "Approved";
              return (
                <li key={d.documentId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{d.title}</span>
                      <StatusBadge status={status} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.category}
                      {d.sizeBytes ? ` · ${formatSize(d.sizeBytes)}` : ""} · {d.fileName}
                    </p>
                    {status === "Rejected" && d.reviewNote && (
                      <p className="mt-0.5 text-xs text-danger-ink">Reason: {d.reviewNote}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {isAdmin && status === "Pending" && (
                      <ReviewDocumentButtons doc={d} employeeId={employeeId} />
                    )}

                    {d.url && (
                      <Button size="sm" variant="outline" className="h-7" asChild>
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-3 w-3" />
                          {isAdmin && status === "Pending" ? "View" : "Download"}
                        </a>
                      </Button>
                    )}

                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-danger-ink"
                            aria-label={`Delete ${d.title}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes “{d.title}”. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(d.documentId)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
