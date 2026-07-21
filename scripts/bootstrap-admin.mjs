// Create the first admin login.
//   node scripts/bootstrap-admin.mjs [username] [password] [employeeCode?]
//
// Local dev: just run it. Cloud: export SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// first. The admin logs in with `username` (default "admin").
import { adminCreateUser, adminFindUserByEmail, rest, authEmailFor } from "./_supa.mjs";

const username = process.argv[2] || "admin";
const password = process.argv[3] || "admin12345";
const employeeCode = process.argv[4] || null;

let employeeId = null;
if (employeeCode) {
  const emp = await rest(`employees?employee_code=eq.${encodeURIComponent(employeeCode)}&select=employee_id`);
  employeeId = emp?.[0]?.employee_id ?? null;
  if (!employeeId) console.warn(`! No employee found for code ${employeeCode}; creating admin without an employee link.`);
}

const email = authEmailFor(username);
let user;
try {
  user = await adminCreateUser({ email, password });
} catch (err) {
  // Re-run friendly: reuse the existing Auth user if it already exists.
  const existing = await adminFindUserByEmail(email);
  if (!existing) throw err;
  user = existing;
  console.warn(`! Auth user already existed; reusing ${email}.`);
}

await rest("users", {
  method: "POST",
  prefer: "resolution=merge-duplicates,return=representation",
  body: [{ id: user.id, username, role: "Admin", employee_id: employeeId, active: true }],
});

console.log(`\n✅ Admin ready`);
console.log(`   username: ${username}`);
console.log(`   password: ${password}`);
console.log(`   login with the username (not the ${email} address).\n`);
