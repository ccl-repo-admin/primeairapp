# Prime Air Condition — Technology Stack

## Decision Principles

1. **Shared codebase where possible** — React Native (Expo) on mobile + Next.js on web means one language (TypeScript) and shared business logic packages
2. **Managed services over self-hosted** — minimize ops burden for a small team
3. **Mobile-first, offline-capable** — HVAC techs work in basements, attics, and rural areas with poor connectivity
4. **Scale on demand** — start cheap, scale without re-architecting

---

## Stack Overview

| Layer | Technology | Rationale |
|---|---|---|
| Web Frontend | Next.js 14 (App Router) | Full-stack React, SSR for customer portal SEO, API routes |
| Web UI | Tailwind CSS + shadcn/ui | Utility-first, accessible components, fast development |
| Mobile | Expo (React Native) | iOS + Android from one codebase, managed build service |
| Language | TypeScript (everywhere) | Type safety across web, mobile, and backend |
| API | Next.js API Routes + tRPC | End-to-end type safety from DB to client |
| Real-time | Socket.io | WebSocket for live crew map, chat, job status updates |
| Database | PostgreSQL 16 + PostGIS | Relational + geospatial queries for GPS data |
| ORM | Prisma | Type-safe database client, migrations |
| Cache / Sessions | Redis (Upstash) | Session storage, pub/sub for Socket.io scaling, rate limiting |
| Auth | NextAuth.js v5 | Session management; custom SMS OTP + email providers |
| File Storage | Cloudflare R2 | S3-compatible, no egress fees (photos, PDFs, forms) |
| SMS | Twilio | OTP, customer notifications, tech alerts |
| Email | Resend | Transactional email, branded templates |
| Push Notifications | Expo Push + APNs/FCM | Single API for iOS and Android push |
| Payments | Stripe | Invoicing, Tap-to-Pay, payment links, webhooks |
| Maps | Google Maps Platform | Maps SDK for React Native, Geocoding, Directions API |
| PDF Generation | React PDF (server-side) | Invoices, service reports, estimates, timecards |
| Background Jobs | BullMQ (Redis-backed) | Scheduled notifications, report emails, sync jobs |
| Search | Postgres full-text search | Customer/work order search (no separate search service needed at scale) |
| Hosting — Web | Vercel | Zero-config Next.js deploy, edge functions, preview URLs |
| Hosting — DB | Supabase (PostgreSQL) | Managed Postgres, backups, connection pooling (PgBouncer) |
| Hosting — Jobs | Railway | Background worker process (BullMQ) |
| CI/CD | GitHub Actions | Automated tests, lint, build, deploy on PR merge |
| Monitoring | Sentry | Error tracking on web and mobile |
| Analytics | PostHog | Product analytics, feature flags, session recording |
| App Distribution | EAS (Expo Application Services) | OTA updates, app store builds |

---

## Web Frontend (Next.js 14)

### Project Structure
```
apps/web/
├── app/
│   ├── (auth)/              # Sign in, register, invite accept
│   ├── (admin)/             # Admin dashboard, protected routes
│   │   ├── dashboard/
│   │   ├── dispatch/        # Live map + dispatch board
│   │   ├── work-orders/
│   │   ├── schedule/
│   │   ├── customers/
│   │   ├── estimates/
│   │   ├── invoices/
│   │   ├── inventory/
│   │   ├── reports/
│   │   ├── team/
│   │   └── settings/
│   ├── portal/              # Customer portal (public-facing)
│   └── api/                 # API routes (tRPC handler, webhooks)
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── dispatch/            # Map, crew pins, job cards
│   ├── work-orders/
│   ├── time-tracking/
│   └── shared/
├── lib/
│   ├── auth.ts
│   ├── db.ts                # Prisma client
│   ├── trpc/
│   └── utils/
└── hooks/
```

### Key Libraries
```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "typescript": "^5.5.0",
  "@trpc/server": "^11.0.0",
  "@trpc/client": "^11.0.0",
  "@trpc/react-query": "^11.0.0",
  "@tanstack/react-query": "^5.0.0",
  "prisma": "^5.15.0",
  "@prisma/client": "^5.15.0",
  "next-auth": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "latest",   
  "react-hook-form": "^7.52.0",
  "zod": "^3.23.0",
  "socket.io-client": "^4.7.0",
  "@react-pdf/renderer": "^3.4.0",
  "@vis.gl/react-google-maps": "^1.1.0",
  "recharts": "^2.12.0",
  "date-fns": "^3.6.0",
  "stripe": "^16.0.0",
  "@dnd-kit/core": "^6.1.0",
  "react-big-calendar": "^1.13.0"
}
```

---

## Mobile App (Expo / React Native)

### Why Expo over bare React Native
- Managed build service (EAS Build) eliminates macOS requirement for Android/iOS builds
- Over-the-air (OTA) JavaScript updates without App Store review for hotfixes
- First-class libraries for GPS, camera, offline storage, push notifications
- Single `expo` CLI vs. managing both Xcode and Android Studio build configs

### Project Structure
```
apps/mobile/
├── app/                     # Expo Router (file-based routing)
│   ├── (auth)/              # Login, OTP verification
│   ├── (tech)/              # Field technician screens
│   │   ├── index.tsx        # Home / Clock In
│   │   ├── job/[id].tsx     # Job detail
│   │   ├── schedule.tsx     # My schedule
│   │   ├── timecards.tsx    # My time cards
│   │   └── forms/           # Form submission
│   ├── (supervisor)/        # Crew lead screens
│   │   ├── crew-map.tsx     # Live crew map
│   │   └── bulk-clock.tsx   # Bulk clock in/out
│   ├── (admin)/             # Admin mobile screens
│   ├── chat/                # Internal messaging
│   └── _layout.tsx
├── components/
│   ├── ClockInButton.tsx
│   ├── JobCard.tsx
│   ├── CrewMap.tsx
│   └── FormRenderer.tsx     # Dynamic form engine
├── lib/
│   ├── api.ts               # tRPC client
│   ├── offline.ts           # SQLite sync queue
│   └── location.ts          # GPS background tracking
└── stores/                  # Zustand stores
    ├── auth.ts
    ├── jobStore.ts
    └── locationStore.ts
```

### Key Libraries
```json
{
  "expo": "^51.0.0",
  "expo-router": "^3.5.0",
  "expo-location": "^17.0.0",
  "expo-camera": "^15.0.0",
  "expo-sqlite": "^13.4.0",
  "expo-file-system": "^17.0.0",
  "expo-notifications": "^0.28.0",
  "expo-local-authentication": "^14.0.0",
  "expo-image-picker": "^15.0.0",
  "@stripe/stripe-react-native": "^0.38.0",
  "react-native-maps": "^1.14.0",
  "zustand": "^4.5.0",
  "@tanstack/react-query": "^5.0.0",
  "@trpc/client": "^11.0.0",
  "react-native-signature-canvas": "^4.7.0",
  "socket.io-client": "^4.7.0",
  "zod": "^3.23.0",
  "date-fns": "^3.6.0"
}
```

### Offline Architecture
```
User action (clock in, form submit, photo)
  → Zustand store (immediate UI update)
  → expo-sqlite queue (persist locally)
  → Network check
    ├── Online → tRPC mutation → server → success → remove from queue
    └── Offline → remain in queue → background sync when online
                                    (expo-background-fetch, 15-min intervals)
```

### GPS Background Tracking
- `expo-location` with `LocationAccuracy.High` and `timeInterval: 30000` (30s) while clocked in
- Background location: `expo-location startLocationUpdatesAsync` with foreground service notification ("Prime Air is tracking your location for this shift")
- Stops completely on clock-out (no passive tracking)
- Drive detection: speed > 15 mph for > 30 seconds = driving segment

### Push Notifications
- `expo-notifications` manages token registration
- Expo Push Notification Service routes to APNs (iOS) and FCM (Android)
- Notification types and deep link targets:

| Notification | Deep Link |
|---|---|
| New job assigned | `/job/[id]` |
| Clock-in reminder (geofence) | `/clock-in?jobId=[id]` |
| Break reminder | `/timeclock` |
| Message received | `/chat/[threadId]` |
| Timecard approved | `/timecards` |
| Time-off decision | `/time-off` |

---

## Backend API

### tRPC Router Structure
```
server/routers/
├── auth.ts            # Login, OTP, session
├── company.ts         # Company settings, billing
├── users.ts           # User management, invites
├── locations.ts       # GPS position ingestion, history
├── timeclock.ts       # Clock in/out, breaks, timecard CRUD
├── jobs.ts            # Work orders CRUD, status transitions
├── customers.ts       # Customer + asset CRM
├── schedule.ts        # Calendar, task assignment
├── estimates.ts       # Quote builder, approval flow
├── invoices.ts        # Invoice CRUD, payment initiation
├── inventory.ts       # Parts catalog, truck stock, POs
├── forms.ts           # Form builder, submission, templates
├── reports.ts         # All report queries
├── chat.ts            # Messages, channels
├── notifications.ts   # Push, SMS, email triggers
└── integrations.ts    # QuickBooks, payroll exports
```

### WebSocket Events (Socket.io)
```
# Server → Client
location:update        { userId, lat, lng, timestamp, jobId }
job:status-changed     { jobId, status, techId, timestamp }
chat:message           { threadId, message, sender }
timecard:updated       { timecardId, change }
dispatch:new-job       { jobId, techId } (alert sound)

# Client → Server
location:ping          { lat, lng, accuracy, speed, bearing }
job:accept             { jobId }
chat:send              { threadId, content, type }
```

### Background Jobs (BullMQ)
```
queues/
├── notifications      # SMS/email/push send jobs
├── gps-processing     # Segment GPS trails into drive/on-site
├── payroll-sync       # Scheduled QBO export jobs
├── pm-scheduler       # Generate recurring work orders from agreements
├── invoice-reminders  # Send past-due invoice reminders
├── agreement-renewals # 60/30/7 day renewal alerts
└── report-delivery    # Scheduled report emails
```

---

## Database (PostgreSQL + PostGIS)

### Why PostgreSQL + PostGIS
- Full relational integrity across all entities
- PostGIS extensions: `ST_DWithin` for geofence detection, `ST_Distance` for nearest-tech queries, `ST_MakeLine` for GPS trail storage
- JSONB columns for flexible form schema storage
- Full-text search with `pg_trgm` for customer/work order search

### Connection Management
- Supabase-hosted Postgres (managed, daily backups, PITR)
- PgBouncer connection pooling (max 25 connections from server, pooled to 200)
- Separate read replica for reporting queries (prevents heavy reports from blocking ops DB)

---

## Third-Party Services Configuration

### Stripe Setup
```
Products:
  - Prime Air Starter ($79/mo base + $8/tech/mo)
  - Prime Air Pro ($149/mo base + $15/tech/mo)
  - Prime Air Enterprise (custom)

Payment features used:
  - Subscriptions (company billing)
  - Payment Intents (customer invoice payments)
  - Stripe Terminal (Tap-to-Pay on iPhone, Reader S700)
  - Connect (future: marketplace for franchises)
```

### Twilio Setup
- One phone number per company (Twilio sub-account per company)
- SMS templates registered (10DLC compliance)
- Programmable SMS: customer outbound, tech alerts
- Voice: future (customer calls route to dispatcher)

### Google Maps Platform APIs Used
- Maps JavaScript API (web dispatch map)
- Maps SDK for Android + iOS (mobile)
- Geocoding API (address → coordinates on work order creation)
- Directions API (ETA calculation for "en route" SMS)
- Places API (address autocomplete on work order form)

### QuickBooks Online Integration
- OAuth 2.0 with QBO (company connects their QBO account)
- Scopes: `com.intuit.quickbooks.accounting`
- Sync: Customers, Items (parts), Time Activities, Invoices, Payments
- Webhook: receive QBO invoice payment events to mark invoice paid in Prime Air

---

## Infrastructure & DevOps

### Environments
| Environment | Web Host | Database | Notes |
|---|---|---|---|
| Development | localhost:3000 | Local Postgres | `.env.local` |
| Preview | Vercel Preview URL | Supabase staging project | Auto-deployed per PR |
| Staging | staging.primeair.app | Supabase staging | Manual deploy |
| Production | app.primeair.app | Supabase production | Auto-deploy on main merge |

### GitHub Actions Workflows
```yaml
# .github/workflows/ci.yml
on: [pull_request]
jobs:
  typecheck:    npx tsc --noEmit
  lint:         npx eslint . --max-warnings 0
  test:         npx vitest run
  build-web:    npx next build
  build-mobile: npx eas build --platform all --profile preview
```

### Secrets Management
- Vercel environment variables (web)
- EAS secrets (mobile)
- GitHub Actions secrets (CI/CD)
- No secrets in code; `.env.example` documents required variables

### Monitoring & Alerting
- Sentry: error tracking for web + mobile, performance monitoring
- Vercel Analytics: Core Web Vitals, page performance
- Uptime Robot: endpoint health checks every 60s, alert to Slack on downtime
- PostHog: feature flags for gradual rollout of new features

---

## Development Environment Setup

### Prerequisites
- Node.js 20 LTS
- pnpm 9 (workspace monorepo)
- Docker Desktop (local Postgres + Redis)
- Expo Go app on iPhone and Android for mobile testing
- Stripe CLI (webhook forwarding)

### Monorepo Structure
```
primeair-app/
├── apps/
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo React Native
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── api/          # tRPC router (shared by web + mobile)
│   ├── validators/   # Zod schemas shared across apps
│   └── ui/           # Shared React Native + Web UI tokens
├── docs/
├── mockups/
├── training/
├── marketing/
├── package.json      # pnpm workspace root
└── turbo.json        # Turborepo task graph
```

### Start Commands
```bash
pnpm install              # Install all workspace dependencies
pnpm db:push              # Push Prisma schema to local DB
pnpm db:seed              # Seed dev data (demo company, users, jobs)
pnpm dev                  # Start web (port 3000) + API (port 3001)
pnpm dev:mobile           # Start Expo dev server + open in Expo Go
pnpm test                 # Run all Vitest tests
pnpm test:watch           # Watch mode
pnpm typecheck            # tsc --noEmit across all packages
pnpm lint                 # ESLint + Prettier check
pnpm db:studio            # Open Prisma Studio (database GUI)
stripe listen --forward-to localhost:3000/api/webhooks/stripe  # Stripe webhooks
```

---

## Security Architecture

### Authentication Flow
```
Mobile (Tech):
  Phone number → Twilio OTP SMS → verify → issue JWT pair
  JWT stored in expo-secure-store (encrypted keychain)
  Refresh token: 30-day expiry, rotated on use

Web (Admin):
  Email/password → bcrypt hash compare → issue JWT pair
  OR: SMS OTP (same as mobile)
  JWT stored in HTTP-only cookie (web)
  2FA: TOTP via authenticator app (optional, required for Owner role)
```

### API Security
- All routes: JWT validated middleware (tRPC context)
- Company isolation: every query scoped to `companyId` from JWT — users cannot access other companies' data
- Rate limiting: Redis-backed, 100 req/min per user, 10 req/min for OTP endpoints
- Input validation: Zod on every tRPC input — no raw SQL, no injection possible
- File uploads: signed URLs only (R2 presigned PUT), size limit 25MB, MIME type validation

### Data Privacy
- GPS location stored only while employee is clocked in
- Tech can download all their own GPS data (GDPR-style data export)
- Customer data: isolated per company, never shared across companies
- Facial photos: stored in private R2 bucket, accessible only to company admins, auto-deleted after 90 days
