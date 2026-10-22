import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmployeeDocuments } from "@/components/employees/EmployeeDocuments";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/employee/documents")({
  head: () => ({ meta: [{ title: "Documents — LDS HRMS" }] }),
  component: MyDocumentsPage,
});

function MyDocumentsPage() {
  const { employeeId } = useAuth();

  return (
    <div>
      <PageHeader
        icon={FolderOpen}
        title="My documents"
        description="Upload your CNIC, certificates and medical documents for your admin to verify."
      />

      {employeeId ? (
        <EmployeeDocuments employeeId={employeeId} mode="self" />
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Your account is not linked to an employee record.
        </p>
      )}
    </div>
  );
}
