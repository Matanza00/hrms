# LDS HRMS — Supabase backend

This replaces the Google Sheets + Apps Script backend with **Postgres + a single
Edge Function** (`api`). The React app is unchanged except its base URL: it still
speaks the same `{ action, data } → { success, data }` contract.

```
React app  ──►  Edge Function "api" (Deno)  ──►  Postgres (RLS) + Storage
                 action router + shared logic
```

## Layout

| Path | What |
|---|---|
| `migrations/` | Versioned SQL schema (tables, RLS, defaults). |
| `functions/api/index.ts` | The action router (maps every action → handler). |
| `functions/api/handlers/*` | One file per domain (auth, attendance, payroll…). |
| `functions/api/_shared/*` | Tricky logic: `businessDate.ts`, `geofence.ts`, `time.ts`, auth, case conversion. |
| `seed.sql` | Demo rows for local dev (`supabase db reset`). |
| `../scripts/*.mjs` | Admin bootstrap + employee CSV import. |

## First-time local run (needs Docker Desktop running)

```bash
# 1. Start the local stack (Postgres, Auth, Storage, Studio). Applies migrations.
npx supabase start

# 2. Serve the Edge Function (hot-reloads on save).
npx supabase functions serve api --no-verify-jwt

# 3. Create your first admin login.
node scripts/bootstrap-admin.mjs admin admin12345

# 4. Run the frontend (already pointed at the local function via .env).
npm run dev
```

Log in at the app with **username `admin`, password `admin12345`**.

> If `npx supabase start` prints an anon key different from the one in `.env`,
> copy it into `VITE_SUPABASE_ANON_KEY` and restart `npm run dev`.

Useful: Studio (DB browser) at http://127.0.0.1:54323, emails at
http://127.0.0.1:54324.

## Import your real employees

Export the Employees tab of your sheet to `employees.csv` (headers like
`employeeCode,name,email,department,designation,status,basicSalary,...`), then:

```bash
# Employees only:
node scripts/import-employees.mjs employees.csv

# Employees + a login each (username = employee code, one shared start password):
node scripts/import-employees.mjs employees.csv --with-logins --password=Welcome123
```

## Reset / iterate

```bash
npx supabase db reset      # re-run all migrations + seed.sql (wipes local data)
npx supabase migration new <name>   # scaffold a new migration file
```

## Deploy to a cloud project (later)

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push                       # apply migrations to the cloud DB
npx supabase functions deploy api          # deploy the function
# then point the app's .env at the cloud URL + anon key:
#   VITE_API_URL=https://<ref>.functions.supabase.co/api
#   VITE_SUPABASE_ANON_KEY=<cloud anon key>
```

## Notes & things to verify

- **Timezone**: all shift logic runs in Asia/Karachi (fixed UTC+5) in
  `_shared/time.ts` — independent of the server clock.
- **Business date**: `_shared/businessDate.ts` gives the 18:00→03:00 shift one
  date (noon rollover), fixing the "already checked in" midnight bug.
- **Payroll** (`handlers/payroll.ts`) is **reverse-engineered** — every rule is
  commented and tunable via `settings`. Verify against one known month; the
  `sandwichDays` rule is stubbed at 0 pending your policy.
- **Security upgrade**: RLS + per-action role checks mean employees can only
  read their own attendance/leaves/payroll (the old owner-runs-everything script
  had no such isolation).
