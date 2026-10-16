import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { breakEnd, breakStart, checkIn, checkOut, getAttendance } from "@/lib/api/attendance";

export const useAttendance = () =>
  useQuery({
    queryKey: ["attendance"],
    queryFn: getAttendance,
  });

export const useCheckIn = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: checkIn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
};

export const useBreakStart = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: breakStart,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
};

export const useBreakEnd = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: breakEnd,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
};

export const useCheckOut = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: checkOut,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
};
