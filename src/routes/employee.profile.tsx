import { CURRENT_EMPLOYEE_CODE, CURRENT_EMPLOYEE_ID } from "@/lib/currentEmployee";
import { createFileRoute } from "@tanstack/react-router";
import { useEmployees } from "@/hooks/useEmployees";


export const Route = createFileRoute("/employee/profile")({
  component: EmployeeProfile,
});

function EmployeeProfile() {
  const { data: raw = [] } = useEmployees();
  const employees = Array.isArray(raw) ? raw : [];
  const emp = employees.find((e) => e.employeeId === CURRENT_EMPLOYEE_ID);

  return (
    <div>
      <h1 className="text-3xl font-bold">My Profile</h1>
      <p className="text-muted-foreground">Personal and employment details.</p>

      <div className="mt-6 grid gap-4 rounded-2xl border bg-card shadow-xs p-6 md:grid-cols-2">
        <p><b>Name:</b> {emp?.name || "—"}</p>
        <p><b>Employee Code:</b> {emp?.employeeCode || "—"}</p>
        <p><b>Email:</b> {emp?.email || "—"}</p>
        <p><b>Phone:</b> {emp?.phone || "—"}</p>
        <p><b>Department:</b> {emp?.department || "—"}</p>
        <p><b>Designation:</b> {emp?.designation || "—"}</p>
        <p><b>Status:</b> {emp?.status || "—"}</p>
        <p><b>Address:</b> {emp?.address || "—"}</p>
      </div>
    </div>
  );
}