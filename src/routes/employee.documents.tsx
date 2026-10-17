import { createFileRoute } from "@tanstack/react-router";
import { FileText, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { IconTile } from "@/components/shared/IconTile";

export const Route = createFileRoute("/employee/documents")({
  head: () => ({ meta: [{ title: "Documents — LDS HRMS" }] }),
  component: () => (
    <div>
      <PageHeader
        icon={FolderOpen}
        title="My documents"
        description="CNIC, certificates and medical documents."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {["CNIC", "Educational Certificates", "Medical Documents"].map((d) => (
          <div key={d} className="flex items-start gap-3 rounded-2xl border bg-card p-5">
            <IconTile icon={FileText} tone="neutral" size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-[-0.2px]">{d}</p>
              <p className="text-xs text-muted-foreground">Google Drive upload pending</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});
