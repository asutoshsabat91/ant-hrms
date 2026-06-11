# AntBox HRMS

Production-grade Human Resource Management System for [AntBox](https://theantbox.com) — Talent-Tech ecosystem bridging academia to SaaS careers.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Auth:** NextAuth.js v5 (credentials + Google OAuth)
- **Database:** PostgreSQL via Supabase + Prisma ORM
- **Deployment:** Vercel + Supabase

## Quick start

```bash
cd antbox-hrms
cp .env.example .env.local
# Add your Supabase DATABASE_URL and AUTH_SECRET

npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in:

- **Email:** `admin@theantbox.com`
- **Password:** `AntBox@2025`

## Project structure

| Path | Purpose |
|------|---------|
| `app/(auth)/` | Login & registration |
| `app/(dashboard)/` | HRMS modules (employees, onboarding, payroll, …) |
| `prisma/schema.prisma` | Full data model |
| `components/` | UI by domain |
| `lib/` | Auth, Prisma, payroll engine, utilities |

## Implementation roadmap

- **Sprint 1 (done):** Scaffold, Prisma schema, auth, layout, employees, dashboard
- **Sprint 2:** Onboarding wizard, offboarding, notifications, IT ops
- **Sprint 3:** Attendance, leave, calendar
- **Sprint 4:** Payroll, payslip PDFs, document generation
- **Sprint 5:** Grievances, reimbursements, reports, settings

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:seed      # Seed departments, admin, holidays
npx prisma studio    # Database GUI
```

---

Built for AntBox — Bhubaneswar, Odisha | people@theantbox.com
