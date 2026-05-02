# Prime Air — Office Admin & Owner Guide

## Overview

As an Office Admin or Owner, you have full access to every feature in Prime Air. This guide covers:
- Initial company setup
- Financial workflows (estimates, invoices, payments)
- Customer and service agreement management
- Reporting and job costing
- Team management and payroll
- System settings and integrations

---

## Initial Company Setup (First-Time Admin)

### Step 1: Company Profile
1. Go to **Settings → Company Profile**
2. Upload your company logo (used on invoices, estimates, and customer emails)
3. Confirm: company name, address, phone, email, website
4. Set your **timezone** (important for accurate timestamps)
5. Set your **state** for overtime rules (determines which state's labor laws apply)

### Step 2: Add Your Team
1. Go to **Team → Invite Members**
2. Enter each employee's name, phone number, and role
3. Click **Send Invite** — they receive a text message with a download link
4. Set each employee's **hourly rate** (used for job costing calculations)

**Roles to assign:**
- **Owner** — you (full access)
- **Office Admin** — office staff who manage jobs and billing
- **Dispatcher** — dispatch-focused staff (no billing access)
- **Crew Lead** — senior tech who manages a crew
- **Technician** — field staff

### Step 3: Set Up Cost Codes
Cost codes track what kind of work time is spent on. Common HVAC cost codes:
- `INSTALL` — New equipment installation
- `REPAIR` — Service and repair work
- `PM` — Preventive maintenance
- `TRAVEL` — Drive time between jobs
- `ADMIN` — Office/paperwork time

To add cost codes: **Settings → Cost Codes → + Add**

### Step 4: Create Your Service Catalog
Before creating estimates or invoices, set up your parts and services:

**Parts Catalog:**
1. Go to **Inventory → Parts → + Add Part**
2. Enter: part number, name, category, your cost, your sell price
3. Repeat for all common parts (filters, capacitors, contactors, refrigerant, etc.)

**Labor Rates:**
1. Go to **Settings → Pricing → Labor Rates**
2. Set your standard hourly rate, overtime rate, and emergency rate

### Step 5: Connect QuickBooks (Recommended)
1. Go to **Settings → Integrations → QuickBooks**
2. Click **Connect to QuickBooks**
3. You'll be redirected to QuickBooks to authorize the connection
4. After connecting, choose what to sync: customers, invoices, payments, time activities
5. Click **Run Initial Sync** — your existing QBO customers and items import automatically

### Step 6: Set Up Email and SMS Templates
1. Go to **Settings → Communications**
2. Customize each template with your company voice:
   - Appointment confirmation (SMS)
   - Tech en route (SMS)
   - Estimate ready (email)
   - Invoice ready (email)
   - 24-hour appointment reminder (SMS)
   - Post-job follow-up (SMS)

### Step 7: Invite Your First Customer
Test the full workflow before going live:
1. Create a test customer
2. Create a work order for them
3. Send a test estimate
4. Mark it approved and generate an invoice
5. Process a test payment (Stripe has test card numbers)

---

## Customer Management

### Adding a New Customer
1. Go to **Customers → + New Customer**
2. Fill in: name, phone, email, service address
3. **Optional but valuable:**
   - Preferred contact method
   - How they found you (referral, Google, repeat customer)
   - Notes about their property or preferences
4. Click **Save**

### Adding Customer Equipment
After creating the customer, add their HVAC equipment:
1. Open the customer → click **Equipment → + Add Unit**
2. Fill in:
   - Unit type (AC, Furnace, Heat Pump, etc.)
   - Make, Model, Serial Number
   - Installation date and warranty expiration
   - Where on the property ("backyard left unit," "attic")
3. Upload a photo of the unit and the equipment manual (optional but very useful)
4. Save

This builds your asset database — every future work order links to this equipment record, creating a permanent service history.

### Customer Portal Invite
Give customers access to their own portal (view jobs, approve estimates, pay invoices):
1. Open the customer profile
2. Click **Invite to Portal**
3. Enter their email address
4. They receive an email to set up their portal password
5. They can log in at: `portal.primeair.app` (or your custom domain)

---

## Estimates

### Creating an Estimate
1. Go to **Estimates → + New Estimate** (or open a work order → **Create Estimate**)
2. Select the customer
3. Add a title: "5-Ton AC Replacement — Smith Residence"

**Building the Line Items:**
Click **+ Add Line Item** to add each charge:
- **Labor:** Description ("Installation labor"), Hours (e.g., 6), Rate ($120/hr) → Total auto-calculates
- **Part:** Select from your parts catalog → quantity fills in the sell price automatically
- **Fee:** Fixed charges (disposal fee, permit fee, etc.)

**Good / Better / Best Tiers (Optional):**
If you want to present multiple options:
1. Click **Add Tier**
2. Name them: "Standard," "Upgraded," "Premium" (or "Good," "Better," "Best")
3. Build separate line items for each tier
4. Example: Good = basic unit, Better = mid-range unit, Best = high-efficiency unit

**Reviewing Margin:**
Each line item shows your cost and sell price — the margin column shows your gross profit. Aim for 40–60% margin on parts and a profitable effective hourly rate on labor.

### Sending the Estimate
1. Review the estimate — click **Preview** to see what the customer will see (your internal cost data is hidden)
2. Click **Send via Email**
3. Add a personal message (optional): "Hi Sarah, as discussed here's the estimate for your A/C replacement. Let me know if you have any questions!"
4. Click **Send**
5. The customer receives a branded email with a link to view and approve online

### Tracking Estimate Status
The estimate list shows a color-coded status for each estimate:
- **Draft** — not yet sent
- **Sent** — emailed, awaiting response
- **Viewed** — customer opened the email (you can see when)
- **Approved** — customer signed and approved (automatically creates a work order)
- **Rejected** — customer declined
- **Expired** — passed the validity date with no response

When an estimate is approved:
- You receive a notification
- A work order is automatically created
- The estimate's line items become the basis for the invoice

---

## Invoices

### Auto-Generate from a Completed Work Order
When a tech marks a job complete, you'll see a notification: **"Work Order #47 complete — create invoice?"**

1. Click the notification or go to the work order → click **Generate Invoice**
2. The invoice pre-fills with:
   - Labor (from time entries on this job, calculated at the tech's rate, or your standard rate)
   - Parts (from what the tech recorded as used)
   - Any approved estimate line items
3. Review and adjust as needed
4. Click **Send Invoice**

### Manual Invoice
For cases where you want to invoice separately from a work order (deposits, service agreement billing):
1. Go to **Invoices → + New Invoice**
2. Select the customer
3. Add line items manually
4. Set the due date
5. Send

### Invoice Settings
Set your defaults under **Settings → Invoicing:**
- Default payment terms (Net 7, Net 14, Net 30)
- Late fee percentage and when it applies
- Invoice footer text (your payment options, bank details, etc.)
- Tax rate (set by state/county for your service area)

### Processing Payment

**Online (Customer pays themselves):**
The invoice email includes a **Pay Now** button → customer enters card details → you receive the money within 2 business days.

**Tap-to-Pay (Tech collects on-site, iOS only):**
From the tech's iPhone:
1. Open the work order → **Collect Payment**
2. Enter the amount
3. Tap **Tap to Pay**
4. Customer taps their card or phone to the tech's iPhone
5. Payment processes instantly — receipt emailed to customer

**Check or Cash:**
1. Open the invoice → **Record Payment**
2. Select method: Cash or Check
3. Enter amount and check number (if applicable)
4. Click **Save** — invoice marked as paid

### Accounts Receivable
To see who owes you money:
1. Go to **Reports → Accounts Receivable**
2. The aging report shows all outstanding invoices sorted by: Current, 1–30 days, 31–60 days, 61–90 days, 90+ days
3. Click **Send Reminder** next to any overdue invoice → sends a polite follow-up email

Automated reminders also go out at 7, 14, and 30 days past due (configurable in Settings).

---

## Service Agreements

### Setting Up an Agreement
1. Go to **Customers → [Customer Name] → Agreements → + New Agreement**
2. Set:
   - Agreement name: "Premier 2-Visit Annual Plan"
   - Type: Annual / Bi-Annual / Quarterly
   - Equipment covered: select from customer's asset list
   - Visits per year (e.g., 2)
   - Annual value (what you charge)
   - Start and end date
   - Auto-renew: Yes/No
3. Click **Save**

Prime Air automatically:
- Schedules the required PM visits throughout the year
- Creates work orders for each visit on the scheduled dates
- Sends renewal reminders 60, 30, and 7 days before expiration

### Tracking Your Agreement Portfolio
Go to **Reports → Service Agreements** to see:
- Total active agreements
- Monthly recurring revenue (MRR) from agreements
- Agreements expiring in the next 30 days (your renewal pipeline)
- Lapsed agreements (not renewed — winback opportunities)

---

## Reports & Job Costing

### Daily Dashboard
Go to **Dashboard** (the home screen after login) to see:
- **Revenue MTD** — total invoiced this month vs. last month
- **Jobs Complete** — count of finished jobs this month
- **Open Receivables** — total unpaid invoices
- **Tech Utilization** — what percent of scheduled hours are billable hours
- **Pipeline** — estimates sent → approved → work orders → invoiced → paid

### Labor Cost Report
Go to **Reports → Labor Cost:**
1. Select a date range (e.g., this month or this pay period)
2. Group by: Employee, Job, or Cost Code
3. See: regular hours, overtime hours, double-time hours, total labor cost
4. Export to CSV for further analysis

### Job Profitability Report
Go to **Reports → Job Profitability:**
- See each completed job's: revenue, labor cost, parts cost, gross margin, margin %
- Sort by margin % to find your least profitable job types
- Useful for: adjusting pricing, identifying jobs where estimates were too low

### Payroll Export
When ready to run payroll:
1. Go to **Reports → Payroll Export**
2. Select the pay period
3. Review: all employees, hours by category (regular/OT/double-time)
4. Bulk approve any pending timecards
5. Click **Export to QuickBooks** (or select ADP, Gusto, Paychex, etc.)
6. The export runs in the background — you'll be notified when complete
7. Open QuickBooks — the time activities are already there, categorized by cost code and job

---

## Team Management

### Timecard Approval Workflow
Approve all timecards before running payroll each pay period:

1. Go to **Team → Timecards**
2. Select the pay period
3. Review each employee's entries:
   - Look for missing clock-outs (very long entries)
   - Verify correct projects and cost codes
   - Check that overtime hours are expected
4. Click **Approve All** (or approve individually)
5. Approved timecards lock — they can no longer be edited without admin override

### Managing Time-Off Requests
1. Go to **Team → Time Off**
2. Pending requests show in the **Pending** tab
3. Click **Approve** or **Decline** with a note
4. Approved time off automatically appears in the schedule calendar

### Setting Time-Off Policies
1. Go to **Settings → Time Off**
2. Create policies: PTO, Sick Leave, Holiday Pay
3. Set accrual rates if you offer accrued PTO

### Onboarding a New Technician
1. **Settings → Team → Invite** → enter name, phone, role: Technician
2. They download the app and sign in via SMS
3. Assign their truck stock (if they have a truck):
   - Inventory → Truck Stock → [Tech Name] → Add Parts
4. Brief them on using the app (use the Field Technician Guide)
5. Assign their first job → they'll receive a push notification

---

## System Settings Reference

### Settings → Company
Logo, contact info, timezone, state for overtime rules

### Settings → Pricing
Standard labor rate, overtime rate, emergency rate, tax rate

### Settings → Time Clock Rules
- Break reminder timing
- Compliance sign-off requirement (on/off)
- Geofence radius (default 200 ft — increase if techs park far from sites)
- Auto clock-out after N hours (default 24)
- Require facial photo (on/off)

### Settings → Notifications
Configure which events trigger SMS, email, and push notifications for each role

### Settings → Integrations
Connect/disconnect: QuickBooks Online, QuickBooks Desktop, Gusto, ADP, Paychex, Rippling, Google Calendar

### Settings → Customer Portal
Enable/disable the portal, customize the welcome message, set your company's branding

### Settings → Forms
Manage your form library — create custom forms or modify the pre-built templates

### Settings → Billing
View your Prime Air subscription, upgrade/downgrade plan, update payment method, download invoices

---

## Security Best Practices

- **Owner accounts:** Always enable 2FA (authenticator app)
- **Offboarding an employee:** Go to Team → deactivate their account immediately after their last day
- **Data access:** Employees only see what their role permits — techs cannot see billing data
- **Payroll data:** Only Owner and Office Admin roles can see hourly rates and payroll reports
- **QuickBooks:** Only one person should manage the QBO integration to avoid sync conflicts

---

## Getting Support

- **Help Center:** help.primeair.app (searchable knowledge base + video library)
- **Live Chat:** Click **?** in the bottom left corner of any page → chat with support (business hours)
- **Email:** support@primeair.app
- **Phone:** 1-800-PRIMEAIR (Mon–Fri, 8am–6pm ET)
- **Emergency (platform outage):** status.primeair.app
