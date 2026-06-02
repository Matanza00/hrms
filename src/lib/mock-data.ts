// Mock data layer. Replace with Google Sheets / Apps Script services later.

export type EmployeeStatus = "active" | "on_leave" | "terminated" | "probation";

export interface Employee {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  dob: string;
  joiningDate: string;
  permanentDate?: string;
  endDate?: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  basicSalary: number;
  fuelAllowance: number;
  opdAllowance: number;
  address: string;
  emergencyContact: string;
  avatar?: string;
}

export const employees: Employee[] = [
  { id: "1", code: "NEX-001", name: "Ayesha Khan", email: "ayesha@nexus.co", phone: "+92 300 1234567", cnic: "35202-1234567-1", dob: "1994-03-12", joiningDate: "2022-01-15", permanentDate: "2022-07-15", department: "Engineering", designation: "Senior Frontend Engineer", status: "active", basicSalary: 220000, fuelAllowance: 15000, opdAllowance: 5000, address: "DHA Phase 5, Lahore", emergencyContact: "+92 301 9876543" },
  { id: "2", code: "NEX-002", name: "Bilal Ahmed", email: "bilal@nexus.co", phone: "+92 321 2345678", cnic: "35202-2345678-2", dob: "1990-08-22", joiningDate: "2021-06-01", permanentDate: "2021-12-01", department: "Engineering", designation: "Tech Lead", status: "active", basicSalary: 320000, fuelAllowance: 20000, opdAllowance: 7000, address: "Bahria Town, Lahore", emergencyContact: "+92 302 1112233" },
  { id: "3", code: "NEX-003", name: "Hira Saleem", email: "hira@nexus.co", phone: "+92 333 3456789", cnic: "35202-3456789-3", dob: "1996-11-05", joiningDate: "2023-02-10", department: "Design", designation: "Product Designer", status: "active", basicSalary: 180000, fuelAllowance: 12000, opdAllowance: 5000, address: "Gulberg, Lahore", emergencyContact: "+92 303 4445566" },
  { id: "4", code: "NEX-004", name: "Usman Tariq", email: "usman@nexus.co", phone: "+92 345 4567890", cnic: "35202-4567890-4", dob: "1988-05-19", joiningDate: "2020-03-20", permanentDate: "2020-09-20", department: "Accounts", designation: "Finance Manager", status: "active", basicSalary: 280000, fuelAllowance: 18000, opdAllowance: 6000, address: "Model Town, Lahore", emergencyContact: "+92 304 7778899" },
  { id: "5", code: "NEX-005", name: "Sana Mirza", email: "sana@nexus.co", phone: "+92 312 5678901", cnic: "35202-5678901-5", dob: "1997-01-30", joiningDate: "2023-08-01", department: "HR", designation: "HR Executive", status: "probation", basicSalary: 120000, fuelAllowance: 8000, opdAllowance: 4000, address: "Johar Town, Lahore", emergencyContact: "+92 305 1231231" },
  { id: "6", code: "NEX-006", name: "Imran Yousaf", email: "imran@nexus.co", phone: "+92 322 6789012", cnic: "35202-6789012-6", dob: "1992-09-14", joiningDate: "2022-04-05", permanentDate: "2022-10-05", department: "Engineering", designation: "Backend Engineer", status: "on_leave", basicSalary: 240000, fuelAllowance: 15000, opdAllowance: 5000, address: "Wapda Town, Lahore", emergencyContact: "+92 306 4564564" },
  { id: "7", code: "NEX-007", name: "Mahnoor Sheikh", email: "mahnoor@nexus.co", phone: "+92 334 7890123", cnic: "35202-7890123-7", dob: "1995-07-08", joiningDate: "2024-01-15", department: "Marketing", designation: "Marketing Lead", status: "active", basicSalary: 200000, fuelAllowance: 14000, opdAllowance: 5000, address: "DHA Phase 6, Lahore", emergencyContact: "+92 307 7897897" },
  { id: "8", code: "NEX-008", name: "Zain Abbas", email: "zain@nexus.co", phone: "+92 346 8901234", cnic: "35202-8901234-8", dob: "1993-12-25", joiningDate: "2021-11-10", permanentDate: "2022-05-10", department: "Operations", designation: "Operations Manager", status: "active", basicSalary: 260000, fuelAllowance: 16000, opdAllowance: 6000, address: "Cantt, Lahore", emergencyContact: "+92 308 1471471" },
];

export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  breakStart?: string;
  breakEnd?: string;
  workingHours: number;
  deficitHours: number;
  status: AttendanceStatus;
  isLate: boolean;
  location?: string;
  ipAddress?: string;
}

export const attendanceRecords: AttendanceRecord[] = employees.map((e, i) => ({
  id: `att-${e.id}`,
  employeeId: e.id,
  employeeName: e.name,
  date: new Date().toISOString().slice(0, 10),
  checkIn: i % 5 === 0 ? undefined : `09:${(i * 7) % 60}`.padEnd(5, "0"),
  checkOut: i % 5 === 0 ? undefined : `18:${(i * 11) % 60}`.padEnd(5, "0"),
  breakStart: "13:00",
  breakEnd: "14:00",
  workingHours: i % 5 === 0 ? 0 : 8 + (i % 3) * 0.25,
  deficitHours: i % 5 === 0 ? 8 : Math.max(0, 0.5 - i * 0.1),
  status: (i % 5 === 0 ? "absent" : i % 4 === 0 ? "late" : "present") as AttendanceStatus,
  isLate: i % 4 === 0,
  location: "Office HQ",
  ipAddress: `192.168.1.${20 + i}`,
}));

export type LeaveType = "annual" | "casual" | "sick" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
}

export const leaveRequests: LeaveRequest[] = [
  { id: "lv-1", employeeId: "3", employeeName: "Hira Saleem", type: "annual", startDate: "2026-06-10", endDate: "2026-06-14", days: 5, reason: "Family vacation", status: "pending", appliedOn: "2026-06-01" },
  { id: "lv-2", employeeId: "6", employeeName: "Imran Yousaf", type: "sick", startDate: "2026-06-02", endDate: "2026-06-04", days: 3, reason: "Flu and fever", status: "approved", appliedOn: "2026-06-01" },
  { id: "lv-3", employeeId: "5", employeeName: "Sana Mirza", type: "casual", startDate: "2026-06-08", endDate: "2026-06-08", days: 1, reason: "Personal errand", status: "pending", appliedOn: "2026-06-02" },
  { id: "lv-4", employeeId: "1", employeeName: "Ayesha Khan", type: "annual", startDate: "2026-05-20", endDate: "2026-05-22", days: 3, reason: "Wedding", status: "approved", appliedOn: "2026-05-10" },
  { id: "lv-5", employeeId: "7", employeeName: "Mahnoor Sheikh", type: "unpaid", startDate: "2026-04-15", endDate: "2026-04-18", days: 4, reason: "Personal", status: "rejected", appliedOn: "2026-04-10" },
];

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  status: "paid" | "pending" | "processing";
}

export const payrollRecords: PayrollRecord[] = employees.map((e) => ({
  id: `pr-${e.id}`,
  employeeId: e.id,
  employeeName: e.name,
  month: "June 2026",
  basicSalary: e.basicSalary,
  allowances: e.fuelAllowance + e.opdAllowance,
  bonuses: Math.round(e.basicSalary * 0.05),
  deductions: Math.round(e.basicSalary * 0.08),
  netSalary: e.basicSalary + e.fuelAllowance + e.opdAllowance + Math.round(e.basicSalary * 0.05) - Math.round(e.basicSalary * 0.08),
  status: (Number(e.id) % 3 === 0 ? "pending" : "paid") as "paid" | "pending",
}));

export interface Revenue {
  id: string;
  date: string;
  source: string;
  client: string;
  amount: number;
  status: "received" | "invoiced";
}

export const revenues: Revenue[] = [
  { id: "r1", date: "2026-06-01", source: "Project", client: "Acme Corp", amount: 1250000, status: "received" },
  { id: "r2", date: "2026-05-28", source: "Retainer", client: "Globex", amount: 850000, status: "received" },
  { id: "r3", date: "2026-05-20", source: "Project", client: "Initech", amount: 620000, status: "invoiced" },
  { id: "r4", date: "2026-05-12", source: "Consulting", client: "Umbrella", amount: 410000, status: "received" },
  { id: "r5", date: "2026-05-05", source: "Project", client: "Stark Inc", amount: 1800000, status: "received" },
];

export interface Expense {
  id: string;
  date: string;
  category: "Salary" | "Utilities" | "Tools" | "Emergency" | "Misc" | "Reserve";
  description: string;
  amount: number;
}

export const expenses: Expense[] = [
  { id: "e1", date: "2026-06-01", category: "Salary", description: "June payroll", amount: 2400000 },
  { id: "e2", date: "2026-05-30", category: "Utilities", description: "Office electricity & internet", amount: 145000 },
  { id: "e3", date: "2026-05-25", category: "Tools", description: "Figma, GitHub, Linear", amount: 95000 },
  { id: "e4", date: "2026-05-18", category: "Emergency", description: "AC repair", amount: 38000 },
  { id: "e5", date: "2026-05-10", category: "Misc", description: "Team lunch", amount: 52000 },
  { id: "e6", date: "2026-05-02", category: "Reserve", description: "Reserve transfer", amount: 500000 },
];

export interface ReserveTxn {
  id: string;
  date: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  balance: number;
}

export const reserveTransactions: ReserveTxn[] = [
  { id: "rt1", date: "2026-06-01", type: "credit", description: "Monthly reserve transfer", amount: 500000, balance: 4800000 },
  { id: "rt2", date: "2026-05-01", type: "credit", description: "Monthly reserve transfer", amount: 500000, balance: 4300000 },
  { id: "rt3", date: "2026-04-15", type: "debit", description: "Emergency equipment", amount: 180000, balance: 3800000 },
  { id: "rt4", date: "2026-04-01", type: "credit", description: "Monthly reserve transfer", amount: 500000, balance: 3980000 },
];

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "public" | "company" | "religious";
}

export const holidays: Holiday[] = [
  { id: "h1", name: "Eid ul Adha", date: "2026-06-07", type: "religious" },
  { id: "h2", name: "Independence Day", date: "2026-08-14", type: "public" },
  { id: "h3", name: "Company Foundation Day", date: "2026-09-01", type: "company" },
  { id: "h4", name: "Iqbal Day", date: "2026-11-09", type: "public" },
];

export const attendanceTrend = Array.from({ length: 12 }).map((_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  present: 85 + Math.round(Math.random() * 12),
  absent: 5 + Math.round(Math.random() * 6),
  late: 3 + Math.round(Math.random() * 5),
}));

export const payrollTrend = Array.from({ length: 6 }).map((_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun"][i],
  payroll: 2100000 + i * 80000 + Math.round(Math.random() * 100000),
}));

export const revenueExpenseTrend = Array.from({ length: 6 }).map((_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun"][i],
  revenue: 3500000 + i * 200000 + Math.round(Math.random() * 400000),
  expense: 2800000 + i * 100000 + Math.round(Math.random() * 200000),
}));

export const profitDistribution = [
  { name: "Sadqah", percent: 5, amount: 240000, color: "var(--color-chart-3)" },
  { name: "Partner A", percent: 30, amount: 1440000, color: "var(--color-chart-1)" },
  { name: "Partner B", percent: 25, amount: 1200000, color: "var(--color-chart-2)" },
  { name: "Partner C", percent: 25, amount: 1200000, color: "var(--color-chart-5)" },
  { name: "Reserve", percent: 15, amount: 720000, color: "var(--color-chart-4)" },
];

export function formatPKR(n: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
}
