# Prime Air — Dispatcher Guide

## Your Role in Prime Air

As a dispatcher, Prime Air is your command center. You'll use it to:
- See where every tech is in real time
- Create, assign, and manage work orders
- Communicate with techs and customers
- Monitor job progress from start to finish
- Handle emergency calls and same-day dispatching

The dispatcher experience is primarily on the **web app** (computer browser), though everything is also available on your phone or tablet.

---

## The Dispatch Board — Your Main Screen

Navigate to **Dispatch** in the left sidebar. This is your home base.

### What You're Looking At
The dispatch board has two panels:

**Left panel — Unassigned Jobs Queue**
New jobs that haven't been assigned to a technician yet. These need your attention.

**Right panel — Tech Columns**
Each technician on shift today has a column showing:
- Their name and current status (clocked in, en route, on-site, clocked out)
- Real-time GPS location (shown below their name)
- All jobs assigned to them today, in order

### Status Colors at a Glance
| Color | Status |
|---|---|
| Gray | New / not yet scheduled |
| Blue | Scheduled (assigned, not started) |
| Yellow | Dispatched / En Route |
| Green | In Progress |
| Teal | Complete |
| Red | On Hold / Cancelled |

### Assigning a Job
**Method 1 — Drag and Drop**
Drag a job card from the Unassigned queue and drop it onto a tech's column.

**Method 2 — Smart Dispatch (Recommended for emergency calls)**
1. Open the unassigned job
2. Click **Find Best Tech**
3. Prime Air shows you the top 3 available techs with:
   - Distance from job site
   - Current workload
   - Whether they have the right skills for this job type
4. Click **Assign** next to your choice

When you assign a job, the tech receives an instant push notification.

### Sending "Tech On the Way" Notification
When a tech is heading to a job, click the yellow **Dispatch** button on the job card. This automatically:
- Updates the job status to "En Route"
- Sends the customer a text: "Hi [Customer Name], [Tech Name] is on their way. ETA: [X] minutes."
- Provides the customer a live tracking link valid for that trip

---

## The Live Crew Map

Click **Map View** in the top right of the Dispatch Board to switch from columns to a map.

The map shows:
- A pin for every clocked-in technician (updates every 30 seconds)
- Hover over any pin to see: tech name, job they're assigned to, how long they've been there
- Click a pin to open the tech's profile panel (see their day's jobs, contact them, see their route history)
- Blue circles = geofenced job sites
- Green star = tech is currently inside a job site geofence

### Using the Map for Emergency Dispatch
1. A customer calls with an emergency (A/C out in Texas heat, etc.)
2. Look at the map for the tech closest to the customer's address
3. Right-click the customer address → **New Emergency Job Here**
4. The form pre-fills the address → complete the job details → assign to the nearest tech
5. Send the assignment — tech gets an alert, customer gets a confirmation text

### Viewing a Tech's Day
Click any tech's pin → their sidebar panel shows:
- Clock-in time and total hours today
- Current job and status
- All jobs scheduled for today
- A **Message** button to send them a direct chat message

---

## Creating a Work Order

Click **+ New Work Order** (top right of any page, or use the keyboard shortcut `N`).

### Step 1: Customer
Start typing the customer's name, phone, or address. If they're in your system, select them from the dropdown.

If it's a new customer:
- Click **Create New Customer**
- Enter: Name, Phone, Email, Service Address
- Click **Save & Continue**

### Step 2: Job Details
| Field | What to Enter |
|---|---|
| Job Type | Select: Repair, Maintenance, New Install, Emergency, Warranty, Inspection |
| Priority | Emergency, High, Normal, or Low |
| Equipment | Which HVAC unit this is for (select from customer's asset list or add new) |
| Title | Short description: "A/C not cooling - 5-ton unit" |
| Scope of Work | What the tech needs to know: symptoms, what customer said, access info |
| Internal Notes | Notes for your team only (not visible to customer) |

### Step 3: Schedule
- Select the **date** and **time window** (e.g., "Tuesday 10am – 2pm")
- Estimated hours (helps plan the tech's day)
- Assign technician(s) — you can assign multiple techs to one job

### Step 4: Review & Save
- Review the job summary
- Click **Create Work Order** — the job appears on the dispatch board and the assigned tech gets a notification

---

## Managing a Job in Progress

### Monitoring Active Jobs
From the Dispatch Board, jobs that are "In Progress" (green) show:
- A live timer showing how long the tech has been on site
- A **View** button to see real-time updates (photos uploaded, checklist items completed)

### Viewing Real-Time Job Activity
Open any in-progress job. The **Activity Feed** (right side) shows:
- When the tech clocked in at this job
- Each checklist item as it's checked off
- Photos as they're uploaded
- Parts recorded
- Any notes the tech has added

### Updating a Job
If the scope changes or you need to add information:
1. Open the job
2. Click **Edit** (pencil icon)
3. Make changes → Save
4. The tech receives a push notification that the job was updated

### Putting a Job On Hold
If a job needs to pause (waiting for a part, customer not home, etc.):
1. Open the job → click **Status → On Hold**
2. Enter a reason and note
3. The job moves to the On Hold column; you can reschedule when ready

---

## Handling Customer Calls

### When a Customer Calls About Their Job
1. Search for the customer in the top search bar (name, phone, or address)
2. Their profile opens showing: all their jobs, current status, equipment, and communication history
3. Click on any work order to see the current status and what's happening

### When a Customer Calls With a New Problem
1. Open their customer profile → click **+ New Work Order**
2. Their info auto-fills — just add the job details
3. Assign and dispatch

### Sending a Custom SMS to a Customer
From any work order:
1. Click the **Message Customer** button
2. Type your message
3. Click **Send** — the message goes from your company's number
4. The customer's reply comes back to your Messages inbox in Prime Air

---

## Time Card Monitoring & Approval

### Who's Clocked In Right Now?
The **Live Map** and the top of the **Dispatch Board** both show a count of techs currently clocked in.

### Reviewing Timecards
1. Go to **Team → Timecards**
2. Select the pay period (current or past)
3. Timecards are listed by employee with status: Active, Pending Approval, Approved

### Approving Timecards
- Click **Approve** next to a timecard to approve it
- Click the checkboxes next to multiple timecards → **Bulk Approve**
- Before approving, review: total hours, any unusually short or long shifts, correct project assignments

### Editing a Timecard
If a tech forgot to clock out, made an error, or was at the wrong project:
1. Click on the timecard
2. Click **Edit**
3. Change the clock-in time, clock-out time, break minutes, or project
4. **Reason is required** — enter why you're editing (e.g., "Tech forgot to clock out")
5. Click **Save** — the tech receives a notification that their timecard was modified
6. The edit is logged permanently in the audit trail

### Handling "I Forgot to Clock In"
If a tech tells you they forgot to clock in:
1. Go to **Team → Timecards → + Manual Entry**
2. Select the employee
3. Enter clock-in time, clock-out time, project, and reason
4. Save — this creates a pending entry that the employee can see on their app

---

## Monitoring Location History

If you need to verify where a tech was at a specific time:

1. Go to **Map → History**
2. Select the tech's name
3. Select the date
4. You'll see their full GPS breadcrumb trail for that day, with driving segments marked

This is useful for:
- Confirming a tech was at a job site when a customer disputes work
- Verifying mileage for reimbursement
- Investigating any claims of unauthorized location

---

## Managing Daily Schedules

### Publishing Tomorrow's Schedule
1. Go to **Schedule**
2. Set the date to tomorrow
3. Review all assigned jobs — drag to reorder or reassign as needed
4. Click **Notify Team** (bell icon, top right)
5. All techs receive a push notification and email with their schedule

### Recurring Jobs
If a maintenance agreement generates recurring PM visits:
1. Go to **Schedule**
2. You'll see auto-generated PM work orders from active agreements
3. Assign them to available techs like any other job

### Resolving Scheduling Conflicts
The calendar shows a **red warning** if a tech is double-booked. Click the conflict warning to see both jobs and resolve by:
- Moving one job to another time slot
- Reassigning one job to a different tech

---

## Quick Actions Reference

| Action | How |
|---|---|
| Create new work order | `N` key or **+ New Work Order** button |
| Search customer | `Ctrl+K` or top search bar |
| View crew map | **Map View** tab on Dispatch Board |
| Send custom customer SMS | Open work order → **Message Customer** |
| Assign job | Drag to tech column or open job → **Assign** |
| Approve timecard | Team → Timecards → **Approve** |
| View tech location history | Map → History → select tech + date |
| Send "tech on the way" | Open job → **Dispatch** button |

---

## Common Scenarios

### Scenario: Tech calls in sick mid-day
1. Find all of their remaining jobs for the day in their column on the dispatch board
2. For each job: click **Reassign** → select available tech or reschedule
3. Customer notification goes out automatically for rescheduled jobs

### Scenario: Emergency call comes in at 2pm
1. Take the customer info → click **+ New Work Order**
2. Set Priority: **Emergency**
3. Open the Map — find the closest available tech
4. Assign → click **Dispatch** → customer gets ETA text immediately

### Scenario: Customer calls asking where their tech is
1. Search for the customer → open their work order
2. Check the job status and tech's current GPS location on the map
3. Click the **Live Tracking Link** → send it to the customer so they can watch the tech's progress

### Scenario: Tech reports they need a part that's not on the truck
1. Open the work order → click **Put On Hold** with note "Waiting for part"
2. Contact the supplier or warehouse to get the part
3. When part is ready, reschedule the job and notify the customer

---

## Getting Help

- **Technical issues:** Contact your office admin or tap the **?** icon in the bottom left corner
- **Training videos:** Help Center → Dispatcher Video Library
- **Keyboard shortcuts:** Press `?` key on any page for full shortcut list
