import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, FileCheck } from "lucide-react";
import { ChartCard } from "@/components/shared/ChartCard";
import { Button } from "@/components/ui/button";
import { ReviewDocumentButtons } from "@/components/employees/EmployeeDocuments";
import { getPendingDocuments } from "@/lib/api/documents";

/** Employees page: documents employees uploaded that still need verifying. */
export function PendingDocuments() {
  const { data: docs = [] } = useQuery({
    queryKey: ["pendingDocuments"],
    queryFn: getPendingDocuments,
  });
  if (docs.length === 0) return null;

  return (
    <div className="mb-4">
      <ChartCard
        icon={FileCheck}
        tone="info"
        title="Documents to verify"
        description="Open each file, then approve or reject it."
        bodyClassName=""
      >
        <ul className="-my-2.5 divide-y divide-divider">
          {docs.map((d) => (
            <li
              key={d.documentId}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-medium">
                  <Link
                    to="/employees/$id"
                    params={{ id: d.employeeId }}
                    className="hover:underline"
                  >
                    {d.employeeName || "Employee"}
                  </Link>{" "}
                  · {d.title}
                </p>
                <p className="truncate text-muted-foreground">
                  {d.category} · {d.fileName}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.url && (
                  <Button size="sm" variant="outline" className="h-7" asChild>
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3 w-3" />
                      View
                    </a>
                  </Button>
                )}
                <ReviewDocumentButtons doc={d} employeeId={d.employeeId} />
              </div>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}
