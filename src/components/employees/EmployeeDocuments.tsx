import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FileText, Download, Trash2, UploadCloud } from "lucide-react";
import {
  deleteEmployeeDocument,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  type EmployeeDocument,
} from "@/lib/api/documents";

const CATEGORIES = [
  "CNIC",
  "Educational Certificates",
  "Medical Documents",
  "Contract",
  "Other",
];

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

export function EmployeeDocuments({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CNIC");
  const [error, setError] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["employeeDocuments", employeeId],
    queryFn: () => getEmployeeDocuments(employeeId),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["employeeDocuments", employeeId] });

  const uploadMutation = useMutation({
    mutationFn: uploadEmployeeDocument,
    onSuccess: () => {
      invalidate();
      setFile(null);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Upload failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployeeDocument,
    onSuccess: invalidate,
  });

  async function handleUpload() {
    setError("");
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
              Stored privately in Supabase. Max 8 MB (PDF or image works best).
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
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
            {uploadMutation.isPending ? "Uploading…" : "Upload"}
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
            {docs.map((d: EmployeeDocument) => (
              <li key={d.documentId} className="flex items-center gap-3 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.category}
                    {d.sizeBytes ? ` · ${formatSize(d.sizeBytes)}` : ""} · {d.fileName}
                  </p>
                </div>

                {d.url && (
                  <Button size="sm" variant="outline" className="h-7" asChild>
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </a>
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-red-600">
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
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(d.documentId)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
