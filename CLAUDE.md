# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Prime Air Condition is a full-stack HVAC field service management (FSM) platform — a Workyard clone extended with work orders, estimates, invoicing, customer/asset management, smart dispatch, and a customer portal. It targets HVAC companies with 3–50 technicians.

## Repository Structure (Pre-Code Phase)

```
primeair-app/
├── docs/                    # Technical planning documents
│   ├── 01-technical-scope.md   # Full feature inventory, user roles, user flows
│   ├── 02-tech-stack.md        # Full stack decisions with rationale
│   ├── 03-data-models.md       # Complete Prisma schema
│   ├── 04-api-endpoints.md     # All tRPC procedures + REST webhooks
│   └── 05-project-timeline.md  # Phase-by-phase build plan + budget
├── mockups/
│   └── index.html           # Browser-viewable UI mockups (open in browser)
├── marketing/
│   ├── 01-landing-page-copy.md
│   ├── 02-pricing-strategy.md
│   └── 03-go-to-market.md
└── training/
    ├── 01-field-technician-guide.md + .docx
    ├── 02-dispatcher-guide.md + .docx
    ├── 03-admin-guide.md + .docx
    └── 04-onboarding-checklist.md + .docx
```

## Planned Tech Stack (from docs/02-tech-stack.md)

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Mobile:** Expo (React Native), Expo Router, TypeScript
- **API:** tRPC (end-to-end type safety, shared by web and mobile)
- **Database:** PostgreSQL 16 + PostGIS (Supabase-hosted), Prisma ORM
- **Cache/Realtime:** Redis (Upstash) + Socket.io for live crew map and chat
- **Auth:** NextAuth.js v5 — SMS OTP (Twilio) for field workers, email/password + 2FA for admins
- **File Storage:** Cloudflare R2 (photos, PDFs, form submissions)
- **Payments:** Stripe (subscriptions, invoices, Tap-to-Pay terminal)
- **Maps:** Google Maps Platform (Maps SDK, Geocoding, Directions)
- **Push Notifications:** Expo Push → APNs (iOS) / FCM (Android)
- **Email:** Resend | **SMS:** Twilio
- **Background Jobs:** BullMQ (Redis-backed)
- **Hosting:** Vercel (web) + Railway (background workers)

## Key Architectural Decisions

**Shared tRPC router:** The same tRPC router serves both the Next.js web app and the Expo mobile app. Business logic lives once in `packages/api/`.

**Offline-first mobile:** React Native (Expo) stores all time entries, form submissions, and photos in expo-sqlite locally and syncs to the server when connectivity returns. Clock-in/out must work without internet.

**Company data isolation:** Every database query is scoped to `companyId` extracted from the JWT at the middleware layer. The client never sends a companyId — it is never trusted from the client.

**GPS only while clocked in:** `expo-location startLocationUpdatesAsync` runs only when a time entry is active. Location data stops completely on clock-out. This is both a privacy requirement and an Apple App Store approval requirement.

## User Roles

`TECHNICIAN` → `CREW_LEAD` → `DISPATCHER` → `OFFICE_ADMIN` → `OWNER`

Each role has strictly additive permissions. See `docs/01-technical-scope.md` Section 1 for the full permission matrix.

## Work Order Status Machine

```
NEW → SCHEDULED → DISPATCHED → EN_ROUTE → IN_PROGRESS → COMPLETE → INVOICED → PAID → CLOSED
```
Status transitions are validated server-side. Only allowed transitions proceed; invalid transitions return a `BAD_REQUEST` error.

## Build Commands (once scaffolded)

```bash
pnpm install              # Install all workspace dependencies
pnpm db:push              # Push Prisma schema to local DB
pnpm db:seed              # Seed demo company + users + jobs
pnpm dev                  # Start web (port 3000) + API
pnpm dev:mobile           # Start Expo dev server
pnpm test                 # Run Vitest tests
pnpm typecheck            # tsc --noEmit across all packages
pnpm lint                 # ESLint + Prettier check
pnpm db:studio            # Open Prisma Studio
```

## Viewing the Mockups

Open `mockups/index.html` in any browser. Sections: Mobile App, Admin Dashboard, Dispatch Board, Work Order Detail, Invoice Builder, Reports.

## Data Model Key Facts

- All entities have a `companyId` — never fetch without it
- `TimeEntry` stores GPS coordinates at clock-in; `LocationPing` table stores continuous GPS trail
- `Form.schema` is JSONB — the dynamic form engine renders fields from this schema at runtime
- `WorkOrder.number` is a per-company auto-incrementing integer (WO-001, WO-002...), not the primary key
- `Estimate` can have multiple `EstimateTier` rows (Good/Better/Best); only one gets approved
- `Invoice` is always linked to either a `WorkOrder` or created manually; never both
