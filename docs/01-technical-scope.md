# Prime Air Condition — Full Technical Scope

## Executive Summary

Prime Air Condition is a full-stack field service management (FSM) platform purpose-built for HVAC companies. It combines the GPS time-tracking and workforce management strengths of Workyard with a complete HVAC business operations layer — work orders, estimates, invoicing, equipment tracking, customer portal, and smart dispatch — that Workyard entirely lacks.

**Target User:** HVAC companies with 5–150 technicians needing one platform to run dispatch, track labor, manage customers, and get paid — all from mobile.

---

## 1. User Roles & Permission Matrix

| Permission | Field Tech | Crew Lead | Dispatcher | Office Admin | Company Owner |
|---|---|---|---|---|---|
| Clock in/out own time | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clock in/out crew | — | ✓ | ✓ | ✓ | ✓ |
| View own schedule | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/edit work orders | — | — | ✓ | ✓ | ✓ |
| Dispatch jobs | — | — | ✓ | ✓ | ✓ |
| View crew live map | — | ✓ | ✓ | ✓ | ✓ |
| Create estimates/quotes | — | — | — | ✓ | ✓ |
| Create/send invoices | — | — | — | ✓ | ✓ |
| Approve timecards | — | — | ✓ | ✓ | ✓ |
| Manage customers/assets | — | — | — | ✓ | ✓ |
| Access job costing reports | — | — | — | ✓ | ✓ |
| Manage company settings | — | — | — | ✓ | ✓ |
| Manage users/roles | — | — | — | — | ✓ |
| Billing/subscription | — | — | — | — | ✓ |
| Customer portal access | Customer | — | — | — | — |

---

## 2. Module Inventory

### Module 1: Authentication & Onboarding
- Phone number + SMS OTP login (primary, matches field-worker reality of no corporate email)
- Email/password login (admin users)
- Company registration wizard (5-step: company info → invite team → set up first job site → connect QuickBooks → tour)
- Role-based invitation link system (owner sends unique invite URL per role)
- Device PIN for kiosk mode
- Biometric unlock (Face ID / Touch ID) for mobile app re-entry
- Session management: JWT + refresh token rotation, device fingerprinting
- 2FA via authenticator app (admin roles)

### Module 2: GPS Time Tracking

**Clock In/Out**
- Large one-tap clock-in button with project + cost code selector
- GPS coordinate captured at clock-in and every 5 minutes while active
- Drive detection: auto-segments driving vs. on-site time using speed threshold
- Offline mode: all time entries stored locally (SQLite) and synced when online
- Facial photo capture at clock-in (anti-buddy-punch; photo stored, not processed for biometrics)
- Manual time entry with supervisor approval required

**Geofencing**
- Admins define geofences per job site (radius 50–500 ft)
- Auto clock-in prompt when tech enters geofence while not clocked in (2-min delay)
- Optional: restrict clock-in to inside geofence only
- Auto-assign project/cost code based on which geofence tech is in
- Geofence exit triggers clock-out prompt or auto clock-out (configurable)

**Supervisor Bulk Actions**
- Crew lead selects multiple workers → bulk clock in/out with single project + cost code
- Switch entire crew between jobs mid-shift
- Add/end breaks for multiple workers simultaneously

**Kiosk Mode (iOS tablet)**
- Shared iPad at fixed location (shop, warehouse)
- Worker selects name → enters PIN → camera captures photo → clocked in
- Auto-end shift after configurable hours

**Compliance Engine**
- Federal overtime: 1.5x after 40 hrs/week
- State overtime rules: California (1.5x after 8 hrs/day, 2x after 12 hrs/day, 1.5x 7th consecutive day, 2x after 8 hrs on 7th consecutive day), Texas, Florida (federal only), Arizona (federal only), Nevada, Washington
- Break reminders via push notification: 30-min meal break after 5 hrs (configurable)
- Clock-out compliance questionnaire (Enterprise): "Did you take all required breaks?" with digital signature
- Auto clock-out after 24 hours with alert
- Complete edit audit log: every timecard change logged with who, when, previous value, new value, reason

### Module 3: Scheduling & Dispatch

**Job Scheduling**
- Calendar views: day, week, month, timeline (Gantt-style)
- Group by: technician, job, zone/territory
- Drag-and-drop job assignment
- Color-coded by job status: new (gray), scheduled (blue), en route (yellow), in progress (green), complete (teal), cancelled (red)
- Recurring job templates (daily, weekly, bi-weekly, monthly, quarterly, semi-annual, annual)
- Conflict detection: alerts when technician is double-booked

**Smart Dispatch**
- Recommend nearest available tech to a new emergency job using real-time GPS positions
- Skill-based dispatch: match job type (installation, repair, maintenance) to tech certifications
- Workload balancing: spread jobs evenly across available technicians
- Customer preference routing: send preferred/previous tech to repeat customers

**Customer Booking**
- Online booking widget embeddable on company website
- Customer portal self-scheduling with available time window selection
- Appointment confirmation email/SMS to customer
- "Technician on the way" SMS with ETA and tech name/photo when job dispatched
- Live tech location sharing link (valid for job duration only) — like UberEats-style tracking

**Notifications**
- Push + email to tech: new job assigned, job updated, job cancelled
- SMS to customer: appointment confirmed, tech en route (with ETA), job complete, invoice ready
- Push to dispatcher: tech arrived, job started, job completed, form submitted

### Module 4: Work Order Management

**Work Order Lifecycle**
```
Lead/Request → Estimate → Scheduled → Dispatched → En Route → In Progress → Complete → Invoiced → Paid → Closed
```

**Work Order Fields**
- Customer (link to CRM record)
- Service address (with map pin confirmation)
- Job type: New Installation, Repair, Preventive Maintenance, Emergency, Warranty, Inspection
- Priority: Emergency, High, Normal, Low
- Assigned technician(s) + crew lead
- Scheduled date/time window (e.g., "Tuesday 10am–2pm")
- Estimated duration
- Equipment being serviced (link to asset record)
- Scope of work (rich text)
- Internal notes (not visible to customer)
- Attached photos/documents
- Parts required (from inventory)
- Cost codes for each line of work
- Customer PO number (optional)
- Service agreement linkage (if applicable)

**On-Site Tech Workflow**
- Accept job → navigate (opens Maps) → "I'm Here" → start job timer → complete checklist → add photos → record parts used → customer signature → mark complete → invoice generated

**Checklist Templates by Job Type**
- AC Tune-Up: 12-point checklist (filter, refrigerant, drain, coils, etc.)
- Furnace Inspection: 10-point checklist
- New Install: pre-install site survey + post-install commissioning checklist
- Emergency Service: rapid diagnostic form

### Module 5: Customer & Asset Management (CRM)

**Customer Records**
- Contact info: name, phone, email, address(es)
- Service address vs. billing address
- Customer since date, source (referral, Google, etc.)
- Communication preferences (SMS/email/call)
- Service history: all past work orders, sorted by date
- Open estimates, active agreements, unpaid invoices
- Total lifetime value
- Notes/tags
- Portal account status (has portal login or not)

**Equipment/Asset Records (per customer)**
- Unit type: AC, Furnace, Heat Pump, Mini-Split, Ductwork, Water Heater
- Make, Model, Serial Number, SEER rating
- Installation date, warranty expiration date
- Location at property (e.g., "attic," "backyard left unit")
- Service history log: every work order, part replaced, refrigerant charge
- Maintenance due date (auto-calculated from last PM date + contract interval)
- Upload equipment photos and documents (warranty card, manual)

**Service Agreements / Maintenance Contracts**
- Contract type: annual, bi-annual, quarterly
- Units covered
- Visit schedule auto-generates recurring work orders
- Renewal date, auto-renewal toggle
- Revenue per agreement tracked in financial dashboard
- Renewal reminder: 60, 30, 7 days before expiration (email to customer + alert to admin)

### Module 6: Estimates & Quotes

**Estimate Builder**
- Line items: labor (hourly rate × hours), parts/materials (cost + markup), flat-rate service fees
- "Good / Better / Best" tiered option builder (display all three to customer)
- Tax line (configurable rate by state/county)
- Discount field ($ or %)
- Estimate validity date (expires after N days)
- Internal notes vs. customer-facing notes per line item

**Sending & Approval**
- Email estimate as branded PDF with company logo
- Customer portal link to view and approve/reject online
- Customer digital signature on approval
- Approved estimate auto-converts to work order
- Track: sent, viewed (read receipt), approved, rejected, expired

**Estimate Templates**
- Save common estimate packages as templates (e.g., "Standard AC Tune-Up," "5-ton install package")
- Seasonal pricing overrides

### Module 7: Invoicing & Payments

**Invoice Generation**
- Auto-generate from completed work order (labor time + parts used)
- Manual adjustment before sending
- Line items inherit from estimate (approved estimates become invoice basis)
- Partial invoicing for large jobs (deposit, progress, final)
- Recurring invoice for maintenance agreements

**Payment Methods**
- Tap-to-Pay on iPhone (Stripe Terminal SDK, no hardware needed)
- Stripe reader (Stripe Reader S700) support
- Email invoice with Stripe payment link (credit card, ACH)
- Cash/check recording (mark as paid manually)
- Financing option: Wisetack or GreenSky integration (buy-now-pay-later for large installs)

**Accounts Receivable**
- Aging report: current, 1–30, 31–60, 61–90, 90+ days
- Auto-reminder: email customer at 7, 14, 30 days past due
- Late fee calculation (configurable %)
- Two-click statement send to customer

### Module 8: Parts & Inventory Management

**Inventory Tracking**
- Master parts catalog: part number, description, cost, sell price, supplier
- Truck inventory: each tech's truck has own stock level
- Warehouse/shop inventory
- Parts used per job: tech records parts pulled from truck during work order
- Cost of goods sold auto-calculated per job

**Replenishment**
- Low-stock alerts (configurable threshold per part)
- Reorder list auto-generated
- Purchase order creation (PDF export to send to supplier)
- Receive PO: scan or input quantities received, updates inventory

**Pricing**
- Multiple markup tiers (e.g., cost + 30% for standard, cost + 20% for agreement customers)
- Price book: flat-rate prices for common repairs (customer sees flat rate, system knows cost)

### Module 9: Smart Forms & Inspections

**Form Builder**
- Drag-and-drop: text, number, multiple choice, yes/no, photo, signature, date, calculated fields
- AI assistant: describe form in natural language → form auto-built
- 50+ HVAC-specific templates pre-loaded
- Required vs. optional fields
- Conditional logic: show field B only if field A = "Yes"
- Section headers and instructional text blocks

**Built-In Form Templates**
- Pre-Job Safety Checklist (OSHA)
- AC/Heat Pump Maintenance Checklist (12-point)
- Furnace Maintenance Checklist
- Equipment Commissioning Report (new installs)
- Refrigerant Tracking Log (EPA 608 compliance)
- IAQ/Air Quality Assessment
- Indoor Air Quality Report (customer copy)
- Incident/Near Miss Report
- Vehicle Inspection (pre/post trip)
- Customer Equipment Survey (new customer intake)
- Warranty Claim Documentation

**Submission & Workflow**
- Forms auto-assigned at job start or clock-in
- Submitted forms: timestamped, GPS-tagged, tech signature required
- Real-time alerts to admin for flagged responses (e.g., refrigerant leak found)
- Auto-attach service report PDF to work order and customer record

### Module 10: Reporting & Analytics

**Dashboard (Admin)**
- KPI cards: revenue MTD, jobs complete MTD, avg job value, revenue per tech per day
- Job pipeline funnel: estimates sent → approved → work orders → invoiced → paid
- Open receivables total
- Tech utilization rate (billable hours / scheduled hours)
- Agreement MRR and renewal rate

**Report Types**
- Labor cost by project, cost code, employee, date range (CSV + PDF)
- Job profitability: revenue − labor cost − parts cost = gross margin
- Technician productivity: jobs per day, hours per job, revenue per tech
- Customer lifetime value ranking
- Equipment service history report (for warranty/maintenance planning)
- Payroll export: formatted for QuickBooks, ADP, Gusto, Paychex
- Accounts receivable aging
- Service agreement portfolio: active contracts, renewal pipeline, MRR
- Time-off balance by employee
- Mileage report by tech (for reimbursement)

**Filters & Export**
- All reports: filter by date range, technician, job type, customer, territory
- Export: CSV, PDF, Excel-compatible format
- Schedule report delivery: email to specified addresses on recurring schedule

### Module 11: Communication Hub

**Internal Chat (Dispatcher ↔ Tech)**
- Direct messages: dispatcher to tech, tech to dispatcher
- Group channels: all-hands announcements, tech crew channels
- Message types: text, photo, voice memo (30-sec max), document
- Job-linked messages: message in context of a specific work order
- Read receipts
- Push notification on new message

**Customer Communication**
- SMS: sent from company number (Twilio), replies route to admin portal
- Email: sent from company domain via SendGrid
- Automated sequences: appointment reminder (24hr before), en route alert, follow-up survey (24hr after)
- All customer communications logged to work order history

### Module 12: Customer Portal

**Customer-Facing Web App**
- Login: email/password or magic link
- Dashboard: upcoming appointments, open estimates awaiting approval, unpaid invoices
- Service history: all past work orders with tech notes and photos
- Equipment list: all registered HVAC units with next maintenance due dates
- Estimate approval: view PDF, approve/reject, sign digitally
- Invoice payment: click to pay with card or ACH
- Request service: submit service request form (dispatched as new lead)
- Maintenance agreement: view contract details, covered equipment, visit schedule

### Module 13: Integrations

**Payroll**
- QuickBooks Online (native two-way sync)
- QuickBooks Desktop (sync agent)
- Gusto (native)
- ADP Run (native)
- Paychex Flex (native)
- Rippling (native)

**Accounting**
- QuickBooks Online: customers, invoices, payments, expenses, payroll sync
- Xero: invoices and expenses
- Sage 100 Contractor (Enterprise)

**Other**
- Google Calendar: sync scheduled jobs to tech's personal calendar
- Outlook Calendar: sync scheduled jobs
- Stripe: payment processing, terminal
- Twilio: SMS
- SendGrid: transactional email
- Zapier: connect to 6,000+ tools (webhooks)
- REST API: 80+ endpoints, developer documentation, API keys per company

### Module 14: Mobile App (iOS & Android)

**Tech/Field Worker App**
- Home: large clock-in button, today's job queue
- Schedule: day/week view of assigned jobs
- Job detail: tap to see full work order, navigate, start/complete
- Time cards: view and submit own hours
- Forms: complete and submit job forms
- Chat: internal messaging
- Notifications center

**Supervisor/Crew Lead App**
- All tech features plus:
- Crew map: real-time pins for direct reports
- Bulk clock in/out
- Timecard approval for crew

**Admin/Dispatcher App (Full Feature Parity)**
- All features available on mobile
- Dispatch board (optimized for tablet)
- Customer search and work order creation
- Invoice send from field

---

## 3. Non-Functional Requirements

### Performance
- App load time: < 2 seconds on LTE
- GPS update to server: < 3 seconds latency
- Real-time map refresh: < 5 seconds
- Clock-in action: < 1 second (offline mode: instant)
- Invoice PDF generation: < 3 seconds
- Dashboard load: < 3 seconds

### Offline Capability
- Clock in/out, timecard entries, form submissions, photos: all work fully offline
- Data queued in local SQLite (React Native) and synced on next connection
- Conflict resolution: server-authoritative with client timestamp; conflicts surfaced to user

### Security
- Data encrypted in transit (TLS 1.3) and at rest (AES-256)
- JWT access tokens: 15-minute expiry; refresh tokens: 30-day expiry, rotated on use
- Role-based access control enforced server-side (never trust client)
- PCI DSS compliance for payment card data (handled entirely by Stripe; no card data touches Prime Air servers)
- HIPAA not required (HVAC is not medical)
- SOC 2 Type II certification target (Year 2)
- Customer location data: GPS tracking stops when clocked out (never passive tracking)
- Data retention: configurable per company (default 7 years for compliance)

### Scalability
- Target: support 10,000 concurrent active technicians
- Architecture: stateless API servers behind load balancer
- Database: PostgreSQL with read replicas for reporting queries
- Real-time: WebSocket server cluster (Socket.io with Redis adapter for horizontal scale)

### Availability
- Target SLA: 99.9% uptime (< 8.7 hrs downtime/year)
- Zero-downtime deployments
- Database: daily automated backups + point-in-time recovery (35-day retention)

### Compliance
- EPA 608 refrigerant tracking logs (auto-generated from service reports)
- OSHA pre-job safety form library
- State overtime law compliance engine
- FLSA recordkeeping: complete, searchable, exportable timecard history
- Prevailing wage: cost code classification exports

---

## 4. Key User Flows (Happy Paths)

### Flow 1: Field Tech — Complete a Work Order
1. Push notification: "New job assigned — Smith Residence, 2pm"
2. Open app → Tap job → View work order details, address, equipment, scope
3. Tap "Navigate" → opens Apple/Google Maps
4. App detects arrival (geofence) → prompts "Clock In to Job?"
5. Clock in → job timer starts
6. Complete pre-job safety checklist form
7. Work on unit → record refrigerant charge in Refrigerant Log form
8. Tap "Parts Used" → select parts from truck inventory
9. Take photos of completed work
10. "Complete Checklist" → all items checked off
11. Customer signs on-screen
12. Mark job "Complete" → system generates invoice → sends to customer email
13. Clock out → optional: complete compliance sign-off

### Flow 2: Dispatcher — Assign Emergency Job
1. Customer calls office → dispatcher creates new work order (customer search or new)
2. Sets priority: Emergency, job type: Repair
3. Opens dispatch board → sees real-time tech map
4. Smart dispatch suggests nearest available tech
5. Taps tech name → confirms assignment → tech receives push notification
6. Dispatcher monitors: tech accepted job → en route → arrived → in progress
7. Customer receives SMS: "Tech John on the way, ETA 22 min" with live tracking link

### Flow 3: Admin — Run Payroll
1. Navigate to Reports → Payroll
2. Set pay period dates
3. Review: all timecards for period listed by employee
4. Bulk approve pending timecards
5. Click "Export to QuickBooks" → data pushed to QBO in correct format
6. Confirmation: "87 timecard entries exported successfully"

### Flow 4: Customer — Approve Estimate & Pay Invoice
1. Customer receives email: "Your estimate is ready"
2. Clicks link → opens customer portal (no login required for estimate view)
3. Reviews "Better" option → clicks "Approve This Option" → signs digitally
4. System converts to work order, schedules job, sends confirmation
5. After job: invoice email with "Pay Now" button
6. Clicks → enters card → paid → receipt emailed

---

## 5. Integration Architecture

```
┌─────────────────────────────────────────────┐
│              Prime Air Platform              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Web App  │  │Mobile App│  │ Customer  │  │
│  │ (Next.js) │  │  (Expo)  │  │  Portal   │  │
│  └────┬──────┘  └────┬─────┘  └─────┬─────┘  │
│       └──────────────┼───────────────┘        │
│              ┌───────▼───────┐                │
│              │  REST API +   │                │
│              │  WebSocket    │                │
│              └───────┬───────┘                │
│              ┌───────▼───────┐                │
│              │  PostgreSQL   │                │
│              │  + Redis      │                │
│              └───────────────┘                │
└─────────────────────────────────────────────┘
         │         │        │       │
    ┌────┘    ┌────┘   ┌────┘  ┌────┘
    ▼         ▼        ▼       ▼
  Stripe   Twilio  SendGrid  QuickBooks
  (payments)(SMS)  (email)   (accounting)
```

---

## 6. Out of Scope (V1)

The following features are explicitly deferred to V2 or later:

- AI-powered demand forecasting / revenue prediction
- Multi-branch / franchise management
- Native accounting (General Ledger) — QuickBooks integration covers this
- IoT thermostat / equipment integration
- 3D augmented reality for ductwork planning
- Voice assistant integration (Alexa/Siri for hands-free job updates)
- Automated truck routing / multi-stop route optimization (V2)
- Subcontractor / 1099 contractor management (V2)
- Custom white-label for resellers (V3)
