import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
  type Employee,
} from "@/lib/api/employees";

export const useEmployees = () =>
  useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

export const useEmployee = (employeeId: string) =>
  useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: !!employeeId,
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    // The create form shows the error itself.
    meta: { inlineErrors: true, success: "Employee added" },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: Partial<Employee> }) =>
      updateEmployee(employeeId, data),
    // The edit form shows the error itself.
    meta: { inlineErrors: true, success: "Employee saved" },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee", variables.employeeId] });
    },
  });
};

export const useDeactivateEmployee = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deactivateEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
};
