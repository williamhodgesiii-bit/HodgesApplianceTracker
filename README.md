# Appliance Tracker

A small, production-ready web app for an orthodontic office to track appliances
sent to outside labs and make sure each one comes back **before** the patient's
appointment. It replaces a Google Sheets / Excel workflow with a clear,
color-coded dashboard, fast data entry, a printable doctor report, and a
spreadsheet importer.

Built with **Next.js 14 (App Router) + TypeScript**, **Postgres (Neon) + Prisma**,
**Tailwind CSS**, and **Auth.js (NextAuth v5)** email/password login.

---

## Features

- **Dashboard** — the "clear-cut report": 🔴 Overdue, 🟡 Due Soon, 🟢 On Track,
  each with one-click **Mark Received**. Today's date is always shown.
- **Add Appliance** — fast, keyboard-friendly entry. The **expected return date
  fills in live** as you pick the delivery date, with a note explaining the rule
  applied (e.g. _"rolled back from Sunday to Friday"_). Override it if needed.
- **All Appliances** — searchable / filterable table (patient, lab, status, sent
  date range) with inline editing. Late arrivals (received after expected) are
  flagged in red.
- **Report** — a clean, **print-friendly** view (Print → Save as PDF looks tidy)
  with lab and date-range filters and a **CSV export** for the doctor.
- **Import** — upload the legacy `.xlsx`. Every monthly sheet is parsed, delivery
  dates are extracted from the Notes column (`DD 7/9`, `DD7/9`, `dd 6/25`, …),
  and anything ambiguous (e.g. a typo like `DD723`) is **flagged for review**
  before committing.
- **Labs are user-manageable** — add a new lab from the dropdown on the fly.
- **Auth** — email/password (bcrypt) with no public sign-up. All pages require
  login. Includes a change-password page and a CLI to create users.

### The expected-return rule (core business logic)

> `expected_return_date = delivery_date − 3 calendar days`, then adjusted
> **backward** until it lands on a business day (Mon–Fri).

| Delivery date (DD) | −3 days lands on | Expected return |
| ------------------ | ---------------- | --------------- |
| Friday             | Tuesday          | Tuesday         |
| Monday             | Friday (prev wk) | that Friday     |
| Tuesday            | Saturday         | rolls back to Friday |
| Wednesday          | Sunday           | rolls back to Friday |

This lives in [`lib/expectedReturn.ts`](lib/expectedReturn.ts) as a pure,
unit-tested function. Status (Overdue / Due Soon / On Track) is **always derived
from dates, never stored** ([`lib/status.ts`](lib/status.ts)).

---

## Run locally

### Prerequisites
- Node.js 18.18+ (Node 20+ recommended)
- A Postgres database (use [Neon](https://neon.tech) — see below — or any local Postgres)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env and set DATABASE_URL and AUTH_SECRET (see below)

# 3. Create the database schema
npx prisma migrate dev      # creates tables from prisma/schema.prisma

# 4. Seed the initial user + starter labs + ~10 sample appliances
npm run db:seed
#    Default login:  assistant@office.test  /  password123
#    (override with SEED_USER_EMAIL / SEED_USER_PASSWORD env vars)

# 5. Start the dev server
npm run dev                 # http://localhost:3000
```

### Run the tests

```bash
npm test
```

Unit tests cover the expected-return-date rule, the "DD" notes parser, status
derivation, and the spreadsheet parser:
- [`lib/expectedReturn.test.ts`](lib/expectedReturn.test.ts)
- [`lib/ddParser.test.ts`](lib/ddParser.test.ts)
- [`lib/status.test.ts`](lib/status.test.ts)
- [`lib/import.test.ts`](lib/import.test.ts)

---

## Environment variables

| Variable        | Required | Description                                                                 |
| --------------- | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`  | yes      | Postgres connection string. Use the **pooled** Neon URL for the app.        |
| `AUTH_SECRET`   | yes      | Secret used to sign session cookies. Generate with `openssl rand -base64 32`. |

`.env` is git-ignored. `.env.example` documents the format.

---

## Set up the Neon database (Vercel's integrated Postgres)

1. In the **Vercel dashboard** → your project → **Storage** → **Create Database**
   → **Neon (Postgres)**. Vercel provisions it on the free tier and adds
   `DATABASE_URL` (and related vars) to your project's environment automatically.
   - Or create a database directly at [neon.tech](https://neon.tech) and copy the
     connection string into `DATABASE_URL`.
2. Pull the env vars locally if you used Vercel's integration:
   ```bash
   npx vercel link
   npx vercel env pull .env
   ```
3. Apply the schema to the database:
   ```bash
   npx prisma migrate deploy     # for an existing/production DB
   # or, for local development:
   npx prisma migrate dev
   ```

> **Tip:** Neon provides both a **pooled** and a **direct** connection string.
> Use the pooled one for `DATABASE_URL` (the app runs on serverless functions).
> Migrations work fine over the pooled URL too.

---

## Create the first user (and more users)

There is **no public sign-up**. Seed one, or use the CLI:

```bash
# Seeds the default user + sample data
npm run db:seed

# Or create/update a specific user:
npm run user:create -- --email you@office.com --password "a-strong-password" --name "Jane"

# Non-interactive via env vars also works:
USER_EMAIL=you@office.com USER_PASSWORD="a-strong-password" npm run user:create
```

Users can change their own password from the **Account** page after logging in.

---

## Import the spreadsheet

1. Log in and go to **Import**.
2. Upload the office `.xlsx`. Sheets named like `June26`, `July26` are parsed
   (one sheet per month); the year is inferred from the sheet name.
3. Expected columns: `LAB, LAST NAME, FIRST NAME, SENT, EXPECTED, RECEIVED, Notes`.
   Delivery dates are read from the **Notes** column (`DD 7/9`, `DD7/9`,
   `dd 6/25`, …). Typos like `DD723` are flagged for review with a best guess.
4. Review the preview table — amber rows need attention. Fix any field inline
   (or uncheck a row to skip it), then click **Import**.

Want a file to try it with? Generate a realistic sample:

```bash
npm run sample:xlsx        # writes sample-import.xlsx
```

---

## Push to GitHub & deploy to Vercel

```bash
# Push the code
git add -A
git commit -m "Appliance Tracker"
git push origin main         # or your branch
```

1. Go to [vercel.com/new](https://vercel.com/new) and **import the GitHub repo**.
2. Add the environment variables in **Project Settings → Environment Variables**:
   - `DATABASE_URL` (added automatically if you create the Neon DB via Vercel Storage)
   - `AUTH_SECRET`
3. **Deploy.** The build runs `prisma generate && next build` (see `package.json`).
4. After the first deploy, apply the schema to the production database:
   ```bash
   npx prisma migrate deploy
   ```
   (run locally against the production `DATABASE_URL`, or as a one-off command).
5. Create your real login user against the production DB:
   ```bash
   npm run user:create -- --email you@office.com --password "..."
   ```

---

## Project structure

```
app/
  (authed)/            Pages that require login (share the nav layout)
    page.tsx           Dashboard (default landing page)
    add/               Add Appliance
    appliances/        All Appliances (search / filter / inline edit)
    report/            Printable report + CSV export
    import/            Spreadsheet import wizard
    account/           Change password
  login/               Login page (+ server action)
  api/auth/[...nextauth]  Auth.js route handler
components/             UI components (forms, tables, badges)
lib/
  dates.ts             Timezone-safe calendar-date helpers
  expectedReturn.ts    The expected-return-date rule (unit tested)
  ddParser.ts          "DD" notes parser (unit tested)
  status.ts            Derived status logic (unit tested)
  import.ts            Workbook parsing (unit tested)
  queries.ts           Data access + serializable DTOs
  *-actions.ts         Server actions (mutations)
  auth.ts / prisma.ts  Auth.js and Prisma singletons
prisma/
  schema.prisma        users, labs, appliances
  seed.ts              Seed user + labs + sample appliances
scripts/
  create-user.ts       CLI to add/update a login user
  make-sample-xlsx.ts  Generate a sample import file
```

---

## Notes & design decisions

- **Dates are calendar dates.** All business dates are stored as Postgres `DATE`
  and handled at UTC midnight in code to avoid timezone off-by-one bugs. They are
  always displayed with the weekday, e.g. **"Mon, Jul 7"**, because the day of
  the week matters a lot in this workflow.
- **Status is derived, never stored**, so it's always correct relative to today.
- **Soft validations warn, don't block**: a delivery date before the sent date, a
  received date before sent, or a duplicate patient name all surface a warning but
  still let you save.
