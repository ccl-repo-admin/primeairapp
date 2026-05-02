# Prime Air — Company Onboarding Checklist

Use this checklist when setting up a new HVAC company on Prime Air. Complete in order.

---

## Week 1: Setup & Configuration

### Day 1 — Account Setup
- [ ] Owner registers company account (web app)
- [ ] Upload company logo (PNG, minimum 400×400px)
- [ ] Confirm company address, phone, email, website
- [ ] Set correct state/timezone (affects overtime rules and scheduling)
- [ ] Set default break duration (30 minutes recommended)
- [ ] Enable/disable facial photo capture at clock-in

### Day 1–2 — Team Setup
- [ ] Identify all employees and their roles
- [ ] Send invite to each employee via SMS
- [ ] Confirm each employee has downloaded the app and can sign in
- [ ] Set hourly rates for each employee (admin only view)
- [ ] Assign roles: Technician, Crew Lead, Dispatcher, Office Admin

### Day 2 — Cost Codes
- [ ] Create cost codes that match your accounting categories:
  - INSTALL (Installation)
  - REPAIR (Repairs & Service)
  - PM (Preventive Maintenance)
  - TRAVEL (Travel/Drive Time)
  - ADMIN (Administrative)
  - MAINT (Maintenance Agreements)
- [ ] Add any company-specific codes

### Day 2–3 — Parts Catalog
- [ ] Export your current parts list from QuickBooks or spreadsheet
- [ ] Import into Prime Air → Inventory → Parts (CSV import available)
- [ ] Verify pricing: cost and sell price for each part
- [ ] Set low-stock thresholds for high-turn parts
- [ ] Assign initial truck stock quantities per technician

### Day 3 — Pricing Setup
- [ ] Set standard labor rate ($/hr)
- [ ] Set overtime labor rate ($/hr)
- [ ] Set emergency/after-hours rate ($/hr)
- [ ] Set default tax rate for your service area
- [ ] Set default payment terms (Net 7 recommended for residential)
- [ ] Set late fee % and timing (optional)

### Day 3–4 — QuickBooks Integration
- [ ] Connect QuickBooks Online in Settings → Integrations
- [ ] Run initial sync — import customers and items
- [ ] Verify customer list matches between QBO and Prime Air
- [ ] Confirm time activity sync settings

### Day 4–5 — Customer Import
Option A: Import from QuickBooks (after sync above — customers auto-imported)
Option B: CSV import:
- [ ] Export customer list from old system
- [ ] Format CSV: firstName, lastName, phone, email, serviceAddress, city, state, zip
- [ ] Import via Customers → Import CSV
- [ ] Review imported customers for data quality

- [ ] For top 20 customers: add their HVAC equipment (make, model, serial, install date)
- [ ] Note which customers have active service agreements

### Day 5 — Forms Setup
- [ ] Review pre-built form library (Help Center → Forms Reference)
- [ ] Activate forms appropriate for your services:
  - AC/Heat Pump Tune-Up Checklist
  - Furnace Tune-Up Checklist
  - Pre-Job Safety Checklist
  - Refrigerant Tracking Log
  - New Equipment Commissioning Report
  - Customer Equipment Survey
- [ ] Customize any forms with company-specific items (Settings → Forms)
- [ ] Test: create a work order and submit a test form

---

## Week 1: Communication Templates

### Email & SMS Templates
- [ ] Review and customize appointment confirmation SMS
- [ ] Customize "tech en route" SMS (include your company name)
- [ ] Add personal touch to estimate email template
- [ ] Customize invoice email (add payment options note)
- [ ] Set up post-job follow-up SMS ("Thank you for choosing [Company]!")
- [ ] Verify emails send from your company domain (DNS records needed — IT/admin task)

### Test the Full Customer Flow
- [ ] Create a test customer
- [ ] Create a work order for them
- [ ] Send a test estimate → approve it
- [ ] Assign to a tech → dispatch → tech marks complete
- [ ] Generate invoice → process a test payment
- [ ] Confirm all SMS and email notifications delivered correctly

---

## Week 2: Geofencing & Job Sites

### Job Site Setup
For each active recurring location (shop, regular commercial accounts):
- [ ] Create a Project in Prime Air (matches the job site)
- [ ] Set the geofence location (pin on map + radius)
- [ ] Test: have a tech stand at the location and confirm the clock-in prompt appears
- [ ] Set any site-specific access notes in the project description

For service area (residential dispatch):
- [ ] Confirm the geofence auto-creates when a work order is created with an address (default behavior)
- [ ] Set default geofence radius (150–250 ft recommended for most residential homes)

---

## Week 2: Service Agreements

- [ ] List all existing active maintenance agreement customers
- [ ] For each: create agreement record in Prime Air with correct dates, units covered, visits/year
- [ ] Verify auto-generated PM visits appear in the schedule calendar
- [ ] Enable portal access for agreement customers (optional but high-value)
- [ ] Test the renewal reminder flow in staging

---

## Week 2: Payroll Integration (Choose One)

**QuickBooks Payroll:**
- [ ] Already connected via QBO integration above
- [ ] Confirm time activity categories match your QBO payroll items

**Gusto:**
- [ ] Settings → Integrations → Gusto → Connect
- [ ] Map Prime Air cost codes to Gusto earning types
- [ ] Test payroll export with one employee

**ADP Run:**
- [ ] Settings → Integrations → ADP → Connect
- [ ] Map cost codes to ADP earning codes
- [ ] Test export

**CSV Export (if above don't apply):**
- [ ] Run Reports → Payroll Export → CSV
- [ ] Open in Excel and confirm format matches what your payroll provider expects
- [ ] Process first payroll with both old system and Prime Air side-by-side to verify

---

## Week 2–3: Tech Training

### Group Training Session (1 hour)
- [ ] Schedule a 1-hour training session with all field techs
- [ ] Cover (using the Field Technician Guide):
  - Downloading and signing in
  - Granting location/camera/notification permissions
  - How to clock in/out
  - How to view and start a job
  - How to complete a checklist
  - How to record parts and take photos
  - How to get customer signature
  - How to use chat
- [ ] Q&A time — address any concerns about GPS tracking (emphasize: only while clocked in)
- [ ] Each tech completes their first test clock-in during the session

### Individual Follow-Up (Days 1–5 of live use)
- [ ] Check in with each tech: any questions or app issues?
- [ ] Review their first week's timecards — are they clocking in/out correctly?
- [ ] Are they recording parts on jobs?
- [ ] Are checklists being completed?

---

## Week 3: Go Live

### Pre-Go-Live Checklist
- [ ] All employees are registered and have signed in to the app
- [ ] At least one test work order completed end-to-end
- [ ] QuickBooks or payroll integration tested
- [ ] First customer invited to the portal (pick a tech-friendly customer for the pilot)
- [ ] Dispatcher has reviewed the dispatch board and crew map
- [ ] Admin has run a test payroll export
- [ ] Support contact info shared with all admin staff

### Go Live Day
- [ ] Announce to team: "Starting today, Prime Air is our system"
- [ ] Stop using previous time clock system
- [ ] All new jobs created in Prime Air
- [ ] Any open work orders from old system manually entered in Prime Air

### First Pay Period Close
- [ ] Review all timecards for the period
- [ ] Approve any pending entries
- [ ] Run payroll export
- [ ] Compare totals to previous system — investigate any discrepancies
- [ ] Note: first pay period may have some manual corrections as team adjusts

---

## Month 1 Check-In

Schedule a 30-minute review after the first month:

**Review these metrics:**
- [ ] What % of jobs have timecards attached? (Goal: 95%+)
- [ ] What % of jobs have checklist completed? (Goal: 90%+)
- [ ] What % of invoices are paid within 30 days? (Compare to before)
- [ ] Are techs recording parts on jobs? (Check parts cost data in job profitability report)
- [ ] Any timecard errors or corrections? Identify patterns and coach accordingly

**Fine-tune settings:**
- [ ] Adjust geofence radii if any sites are problematic
- [ ] Add or adjust cost codes based on how your team is using them
- [ ] Review any forms that aren't being completed — are they required? Simplify if needed
- [ ] Adjust overtime rules if any states were misconfigured

**Enable advanced features:**
- [ ] Customer portal rollout to all customers (email campaign)
- [ ] Enable post-job review request SMS
- [ ] Set up scheduled report delivery (weekly P&L to owner email)
- [ ] Configure service agreement renewals for agreements expiring in next 90 days

---

## Ongoing Monthly Admin Tasks

- [ ] Approve prior pay period timecards (before payroll run)
- [ ] Review job profitability report — are margins trending right?
- [ ] Review accounts receivable aging — follow up on 30+ day invoices
- [ ] Check agreement renewals due in 60 days — any sales opportunities?
- [ ] Review tech utilization report — who is at capacity? Who has bandwidth?
- [ ] Update truck stock after restocking runs
- [ ] Review low-stock alerts and submit purchase orders
