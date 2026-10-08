import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/employee/documents")({
  component: () => (
    <div>
      <h1 className="text-3xl font-bold">My Documents</h1>
      <p className="text-muted-foreground">CNIC, certificates and medical documents.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {["CNIC", "Educational Certificates", "Medical Documents"].map((d) => (
          <div key={d} className="rounded-2xl border bg-card shadow-xs p-5">
            <FileText className="mb-3 h-5 w-5 text-muted-foreground" />
            <p className="font-medium">{d}</p>
            <p className="text-xs text-muted-foreground">Google Drive upload pending</p>
          </div>
        ))}
      </div>
    </div>
  ),
});