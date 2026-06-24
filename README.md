# Appliance Tracker

A small, production-ready web app for an orthodontic office to track appliances
sent to outside labs and make sure each one comes back **before** the patient's
appointment. It replaces a Google Sheets / Excel workflow with a clear,
color-coded dashboard, fast data entry, and a printable doctor report.

Built with **Next.js 14 (App Router) + TypeScript**, **Postgres (Neon) + Prisma**,
and **Tailwind CSS**.

> **Note:** Authentication is temporarily disabled. Every page is open — there
> is no login screen for now. (The user model and `create-user` CLI are still
> in place, so login can be re-added later.)

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
- **Labs are user-manageable** — add a new lab from the dropdown on the fly.

### The expected-return rule (core business logic)

> `expected_return_date = delivery_date − 4 calendar days` (a suggested
> default). If that lands on a Saturday or Sunday it moves forward to the
> following Monday.

The expected date auto-fills on the Add/Edit form as soon as you pick a
delivery date, and can be **manually entered or adjusted** on any case (a
"Reset to auto" link puts it back to the default).

This lives in [`lib/expectedReturn.ts`](lib/expectedReturn.ts) as a pure,
unit-tested function. Status (Overdue / Due Soon / On Track) is **always derived
from dates, never stored** ([`lib/status.ts`](lib/status.ts)).

Appliance types are a managed list (Settings → Appliance types) that powers the
picker on the Add/Edit form; you can also add a new type inline while entering a
case.

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
#    then edit .env and set DATABASE_URL (see below)

# 3. Create the database schema
npx prisma migrate dev      # creates tables from prisma/schema.prisma

# 4. Seed starter labs + ~10 sample appliances
npm run db:seed

# 5. Start the dev server
npm run dev                 # http://localhost:3000
```

### Run the tests

```bash
npm test
```

Unit tests cover the expected-return-date rule and status derivation:
- [`lib/expectedReturn.test.ts`](lib/expectedReturn.test.ts)
- [`lib/status.test.ts`](lib/status.test.ts)

---

## Environment variables

| Variable        | Required | Description                                                                 |
| --------------- | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`  | yes      | Postgres connection string. Use the **pooled** Neon URL for the app.        |

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
3. **Deploy.** The build runs `prisma generate && next build` (see `package.json`).
4. After the first deploy, apply the schema to the production database:
   ```bash
   npx prisma migrate deploy
   ```
   (run locally against the production `DATABASE_URL`, or as a one-off command).

---

## Project structure

```
app/
  (authed)/            App pages (share the nav layout)
    page.tsx           Dashboard (default landing page)
    add/               Add Appliance
    appliances/        All Appliances (search / filter / inline edit)
    report/            Printable report + CSV export
    settings/          Manage the appliance-type list
components/             UI components (forms, tables, badges)
lib/
  dates.ts             Timezone-safe calendar-date helpers
  expectedReturn.ts    The expected-return-date rule (unit tested)
  status.ts            Derived status logic (unit tested)
  queries.ts           Data access + serializable DTOs
  *-actions.ts         Server actions (mutations)
  prisma.ts            Prisma client singleton
prisma/
  schema.prisma        users, labs, appliances
  seed.ts              Seed labs + sample appliances
scripts/
  create-user.ts       CLI to add/update a login user (for re-enabling auth)
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
