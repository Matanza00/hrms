// Import employees from a CSV export of your Google Sheet.
//   node scripts/import-employees.mjs <employees.csv> [--with-logins] [--password=admin12345]
//
// CSV headers may be camelCase (employeeCode, basicSalary) or snake_case. The
// only required column is `employeeCode` (or employee_code) + `name`.
// --with-logins also creates an Employee login per row (username = employeeCode).
import fs from "node:fs";
import { adminCreateUser, adminFindUserByEmail, rest, authEmailFor } from "./_supa.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const withLogins = args.includes("--with-logins");
const password = (args.find((a) => a.startsWith("--password=")) || "").split("=")[1] || "admin12345";

if (!file) {
  console.error("Usage: node scripts/import-employees.mjs <employees.csv> [--with-logins] [--password=...]");
  process.exit(1);
}

// --- minimal CSV parser (handles quoted fields, commas, escaped quotes) ------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

const toSnake = (s) => s.trim().replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const NUMERIC = new Set(["basic_salary", "fuel_allowance", "opd_allowance"]);
const DATES = new Set(["dob", "joining_date", "permanent_date", "end_date"]);
const ALLOWED = new Set([
  "employee_code", "name", "email", "phone", "cnic", "dob", "joining_date",
  "permanent_date", "end_date", "status", "department", "designation",
  "basic_salary", "fuel_allowance", "opd_allowance", "address",
  "emergency_contact", "active",
]);

const rows = parseCsv(fs.readFileSync(file, "utf8"));
const header = rows.shift().map(toSnake);

let imported = 0, logins = 0;
const created = [];

for (const raw of rows) {
  const rec = {};
  header.forEach((h, i) => {
    if (!ALLOWED.has(h)) return;
    let v = (raw[i] ?? "").trim();
    if (v === "") { rec[h] = h === "active" ? true : null; return; }
    if (NUMERIC.has(h)) v = Number(String(v).replace(/[,\s]/g, "")) || 0;
    else if (DATES.has(h)) v = v; // yyyy-mm-dd expected
    else if (h === "active") v = /^(true|1|yes)$/i.test(v);
    rec[h] = v;
  });
  if (!rec.employee_code || !rec.name) { console.warn("skip row (needs employeeCode + name):", raw.join(",")); continue; }

  const [emp] = await rest("employees", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [rec],
  });
  imported++;

  if (withLogins) {
    const email = authEmailFor(rec.employee_code);
    let user;
    try { user = await adminCreateUser({ email, password }); }
    catch { user = await adminFindUserByEmail(email); }
    if (user) {
      await rest("users", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: [{ id: user.id, username: rec.employee_code, role: "Employee", employee_id: emp.employee_id, active: true }],
      });
      logins++;
      created.push(rec.employee_code);
    }
  }
}

console.log(`\n✅ Imported/updated ${imported} employees.`);
if (withLogins) {
  console.log(`✅ Created/linked ${logins} logins (password: ${password}).`);
  console.log(`   Employees log in with their employee code: ${created.slice(0, 5).join(", ")}${created.length > 5 ? "…" : ""}`);
}
