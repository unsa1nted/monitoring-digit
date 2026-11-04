# Monitoring Digit

Nuxt dashboard + Elysia API + MySQL database.

Panduan deployment: [VPS Ubuntu, Nginx, HTTPS, dan systemd](docs/deploy-vps-ubuntu.md).

## Requirements

- Node.js 20+
- MySQL 8+ running locally

## Development

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Before running the migrations, create the database and user in MySQL:

```sql
CREATE DATABASE monitoring_digit;
CREATE USER 'monitoring'@'localhost' IDENTIFIED BY 'monitoring';
GRANT ALL PRIVILEGES ON monitoring_digit.* TO 'monitoring'@'localhost';
FLUSH PRIVILEGES;
```

- Dashboard: http://localhost:3000
- API health: http://localhost:4001/health

Browser requests use `/api/*` on the dashboard origin, forwarded by Nuxt to
`http://127.0.0.1:4001`. Leave `NUXT_PUBLIC_API_BASE` empty for this setup.
Set `NUXT_API_UPSTREAM` on the web server if the API runs at another address.
Restart the web server after changing these settings. Run `npm run dev` to start
both services; `npm run dev:web` alone does not start the API.

The API uses Drizzle ORM and exposes `/api/services` and `/api/overview`. Add seed data directly to MySQL or extend the API with service-management routes as the next step.

## Authentication

There is no public registration. Set `AUTH_SECRET` in `.env`, then run `npm run db:seed` to create or update the admin and 38 province accounts in MySQL. Every seed run resets these accounts' passwords to `digit123`; do not run it during routine updates. Authentication reads the username, password hash, role, and province from the `users` table. Sessions use an HTTP-only, same-site cookie and expire after 8 hours. See [province accounts](docs/akun-provinsi.md) for usernames and scope rules.

## User management

Admin can open **Kelola User** (`/users`) to create Admin/Dinas/Internal accounts and change
any account's password, including their own. Dinas accounts require a valid
province. New passwords must be 8–128 characters. Password changes invalidate
the account's existing sessions; changing your own password returns you to login.
User creation and password changes are recorded in Activity Log without passwords.
The **Logout** button at the bottom of the sidebar is available to all roles.

Internal accounts land on `/bapp-fisik` and can access **Bapp Fisik**, **Rekap Scan
BAPP**, and Logout. Other dashboard pages and monitoring/admin APIs are blocked.

Admin and Internal can open **Rekap Scan BAPP** (`/rekap-scan`) to view scans across
all storages. Filter by storage, vendor, school completion, and transaction/NPSN/
school/label search, then click **Terapkan Filter**. The report refreshes every 15
seconds. **Export Excel** exports every matching scan to a genuine `.xlsx` workbook
with Ringkasan, Transaksi, and Rekap Sekolah sheets, including storage locations.

PID summaries deduplicate schools by vendor/NPSN. One unique Hisense transaction
represents one PID: the school total is split into BAPP already scanned and BAPP
still missing. School progress includes all Hisense storages even when filtering
to one storage. Pending/unverified and unsupported vendor data are shown separately
as unknown, not silently classified as incomplete or counted as zero PID. Export
uses the applied filters, and duplicate scan rows remain visible without inflating
PID totals. Run `npx tsx apps/api/scripts/test-bapp-report.ts` to verify access,
filters, counters, pagination, and the workbook using temporary test records.
Bapp Fisik starts with **Pilih Penyimpanan**: create a label or select an existing
storage. Labels support Dus, Kontainer, and Penyimpanan Lainnya with a required
vendor (Hisense, Skylink, or PLN) and are saved in
MySQL (shared across Internal accounts). Label names must be unique. Printed labels
show `Berkas BAPP Fisik - <vendor>`, `Jumlah Dokumen __________` for handwriting,
and a small print timestamp in WIB. Existing storage records use Hisense, matching
the previous integration. Continuing to scan selects that
storage and focuses the barcode input. Enter or **Simpan Scan** saves each scan to
MySQL and adds it to the live table. The large count shows distinct transaction
numbers in the selected storage; repeat scans are retained and flagged across all
storages. The smaller count includes all scans, including repeats and invalid IDs.
Hisense storage validation runs in a background worker using a durable database queue;
pending checks resume after an API restart. Skylink and PLN scans are saved with
**Pengecekan belum tersedia** until their vendor integrations are configured; they
are not looked up in Hisense. Upstream failures appear as **Perlu cek
ulang**, separate from confirmed missing transactions (**Tidak valid**). Use **Cek
ulang** to retry verification. Retrying an unconfirmed save uses the same request ID
to avoid an accidental duplicate insert. The table refreshes every three seconds
and shows 50 scans per page, latest first.

**Jumlah BAPP** shows unique, verified `id_transaksi` scanned for that NPSN across
all Hisense storages / all unique transaction IDs returned by Hisense for that
school. The school lookup traverses every result page and matches the NPSN exactly.
Duplicates count once; other vendors and invalid scans do not contribute. A full
ratio (for example `3/3`) is marked **Lengkap**. School totals are cached for ten
minutes; missing totals load in the background and failed lookups can be retried
with **Cek jumlah BAPP**, without marking an unknown total as zero.

Run `npx tsx apps/api/scripts/test-bapp-school-progress.ts --live` to check school
progress, duplicate handling, cross-storage counts, API errors, and an actual
Hisense NPSN lookup using temporary test records. Omit `--live` for deterministic checks.

Run `npx tsx apps/api/scripts/test-bapp-scans.ts` with the local app running to verify
scan persistence, permissions, duplicates, counters, retry safety, and validation
outcomes using temporary test data. Add `--live` to verify a real Hisense transaction.
Run `npm run db:migrate` then `npm run db:seed:internal` to create the example
`internal` account. The command prints a generated initial password once (or uses
`INTERNAL_INITIAL_PASSWORD` if provided), and never resets an existing account.

With both services running locally, run `npx tsx apps/api/scripts/test-user-management.ts`
to verify authorization, validation, session invalidation, and logout. The check
creates temporary accounts and removes them afterwards; existing accounts are untouched.

## Hisense GET integration

Set the Direktorat SMK credentials in `.env` using `HISENSE_SMK_USERNAME` and `HISENSE_SMK_PASSWORD`. The `/hisense` page only reads the Hisense SMK list and detail data; no approve, reject, webhook, or other POST action is exposed. Admin sees all returned SMK data, while Dinas users are filtered by their `province` value in MySQL.
