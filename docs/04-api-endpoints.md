# Prime Air Condition — API Endpoint Reference

## Overview

All endpoints use **tRPC** for type-safe client-server communication. REST webhooks handle Stripe and external service callbacks. The base URL pattern is:

```
Web:    https://app.primeair.app/api/trpc/[procedure]
Mobile: Same endpoint (tRPC client configured per environment)
Webhooks: https://app.primeair.app/api/webhooks/[service]
```

All authenticated procedures require a valid JWT in the `Authorization: Bearer <token>` header (mobile) or HTTP-only session cookie (web).

Company isolation is enforced at the middleware layer — `companyId` is never accepted from the client; it is always read from the authenticated session.

---

## Authentication Procedures

### `auth.requestOtp`
Send SMS OTP to phone number.
```ts
Input:  { phone: string }
Output: { sessionId: string }
```

### `auth.verifyOtp`
Verify OTP and return tokens.
```ts
Input:  { sessionId: string; code: string }
Output: { accessToken: string; refreshToken: string; user: User; company: Company }
```

### `auth.loginEmail`
Email + password login (admin).
```ts
Input:  { email: string; password: string; totpCode?: string }
Output: { accessToken: string; refreshToken: string; user: User }
```

### `auth.refreshToken`
Get new access token using refresh token.
```ts
Input:  { refreshToken: string }
Output: { accessToken: string; refreshToken: string }
```

### `auth.logout`
Revoke tokens.
```ts
Input:  {}
Output: { success: boolean }
```

### `auth.registerCompany`
Create new company account (owner).
```ts
Input:  {
  company: { name, phone, email, address, state, timezone }
  owner: { firstName, lastName, email, phone, password }
}
Output: { company: Company; user: User; accessToken: string }
```

---

## User Management

### `users.list`
List all active users in company.
```ts
Input:  { role?: Role; isActive?: boolean }
Output: User[]
```

### `users.get`
Get single user profile.
```ts
Input:  { id: string }
Output: User
```

### `users.invite`
Send invite link to new employee.
```ts
Input:  { email?: string; phone?: string; role: Role; firstName: string; lastName: string }
Output: { inviteUrl: string }
```

### `users.update`
Update user profile, role, or pay rate.
```ts
Input:  { id: string; data: Partial<User> }
Output: User
```

### `users.deactivate`
Soft-delete user (preserves historical data).
```ts
Input:  { id: string }
Output: { success: boolean }
```

### `users.registerDevice`
Register Expo push token for this device.
```ts
Input:  { expoPushToken: string; platform: "ios" | "android"; appVersion: string }
Output: { success: boolean }
```

---

## GPS & Time Clock

### `timeclock.clockIn`
Start a time entry.
```ts
Input:  {
  lat: number; lng: number
  projectId?: string; costCodeId?: string; workOrderId?: string
  photoDataUri?: string  // base64 facial photo
  note?: string
}
Output: TimeEntry
```

### `timeclock.clockOut`
End active time entry.
```ts
Input:  {
  lat: number; lng: number
  breakMinutes?: number
  signOffData?: { tookAllBreaks: boolean; signature: string }
  note?: string
}
Output: TimeEntry
```

### `timeclock.getActiveEntry`
Get current clocked-in state for authenticated user.
```ts
Input:  {}
Output: TimeEntry | null
```

### `timeclock.startBreak`
Record break start.
```ts
Input:  { type: BreakType }
Output: Break
```

### `timeclock.endBreak`
Record break end.
```ts
Input:  { breakId: string }
Output: Break
```

### `timeclock.listEntries`
Get timecard history with filters.
```ts
Input:  {
  userId?: string    // admin only; omit for own entries
  startDate: Date; endDate: Date
  status?: TimeEntryStatus
  workOrderId?: string
  page?: number; perPage?: number
}
Output: { entries: TimeEntry[]; total: number; totalHours: number }
```

### `timeclock.editEntry`
Admin/supervisor edit a timecard.
```ts
Input:  {
  id: string
  clockInAt?: Date; clockOutAt?: Date; breakMinutes?: number
  costCodeId?: string; workOrderId?: string
  reason: string  // required for audit log
}
Output: TimeEntry
```

### `timeclock.approveEntries`
Bulk approve timecards.
```ts
Input:  { ids: string[] }
Output: { approved: number }
```

### `timeclock.bulkClockIn`
Supervisor bulk clock in multiple workers.
```ts
Input:  {
  userIds: string[]
  projectId?: string; workOrderId?: string; costCodeId?: string
  lat: number; lng: number
}
Output: { created: TimeEntry[] }
```

### `timeclock.bulkClockOut`
Supervisor bulk clock out.
```ts
Input:  { userIds: string[]; breakMinutes?: number }
Output: { updated: number }
```

### `locations.ping`
Ingest GPS position (called every 30s while clocked in).
```ts
Input:  { lat: number; lng: number; accuracy: number; speed?: number; bearing?: number }
Output: { success: boolean }
```

### `locations.getHistory`
Get GPS trail for a user on a date.
```ts
Input:  { userId: string; date: Date }
Output: LocationPing[]
```

### `locations.getLiveMap`
Get current positions of all clocked-in team members.
```ts
Input:  {}
Output: Array<{ user: User; lastPing: LocationPing; workOrder?: WorkOrder }>
```

---

## Work Orders

### `jobs.list`
List work orders with filters.
```ts
Input:  {
  status?: WorkOrderStatus | WorkOrderStatus[]
  techId?: string
  customerId?: string
  type?: WorkOrderType
  priority?: Priority
  scheduledStart?: { gte?: Date; lte?: Date }
  search?: string
  page?: number; perPage?: number
}
Output: { jobs: WorkOrder[]; total: number }
```

### `jobs.get`
Get full work order with all relations.
```ts
Input:  { id: string }
Output: WorkOrder & {
  customer: Customer; asset?: Asset; assignments: WorkOrderAssignment[]
  timeEntries: TimeEntry[]; partUsages: PartUsage[]; photos: WorkOrderPhoto[]
  checklists: Checklist[]; formSubmissions: FormSubmission[]
  estimate?: Estimate; invoice?: Invoice
}
```

### `jobs.create`
Create new work order.
```ts
Input:  {
  customerId: string; serviceAddressId?: string; assetId?: string
  type: WorkOrderType; priority: Priority
  title: string; scopeOfWork?: string; internalNotes?: string
  scheduledStart?: Date; scheduledEnd?: Date; estimatedHours?: number
  assigneeIds?: string[]; costCodeId?: string; projectId?: string
  checklistTemplateId?: string; formIds?: string[]
  customerPO?: string; agreementId?: string
}
Output: WorkOrder
```

### `jobs.update`
Update work order fields.
```ts
Input:  { id: string; data: Partial<WorkOrderInput> }
Output: WorkOrder
```

### `jobs.updateStatus`
Transition work order to new status (validates allowed transitions).
```ts
Input:  { id: string; status: WorkOrderStatus; note?: string; lat?: number; lng?: number }
Output: WorkOrder
```

### `jobs.assign`
Assign technician(s) to work order.
```ts
Input:  { id: string; userIds: string[]; leadId?: string }
Output: WorkOrder
```

### `jobs.addPhoto`
Upload photo to work order (returns presigned upload URL).
```ts
Input:  { id: string; caption?: string; mimeType: string }
Output: { uploadUrl: string; photoId: string }
```

### `jobs.recordParts`
Record parts used during a job.
```ts
Input:  {
  workOrderId: string
  parts: Array<{ partId: string; quantity: number }>
}
Output: PartUsage[]
```

### `jobs.completeChecklist`
Mark checklist item(s) complete.
```ts
Input:  { itemIds: string[] }
Output: ChecklistItem[]
```

### `jobs.getDispatchBoard`
Get dispatch-optimized view of today's jobs with tech positions.
```ts
Input:  { date?: Date }
Output: {
  unassigned: WorkOrder[]
  byTech: Array<{
    user: User; currentLocation?: LocationPing
    jobs: WorkOrder[]
    isAvailable: boolean
  }>
}
```

### `jobs.suggestTech`
Smart dispatch: suggest best tech for a job.
```ts
Input:  { jobId: string; prioritize: "nearest" | "skill" | "balanced" }
Output: Array<{ user: User; score: number; reason: string; etaMinutes?: number }>
```

---

## Customers & Assets

### `customers.list`
```ts
Input:  { search?: string; tag?: string; page?: number; perPage?: number }
Output: { customers: Customer[]; total: number }
```

### `customers.get`
Full customer profile with history.
```ts
Input:  { id: string }
Output: Customer & {
  addresses: ServiceAddress[]; assets: Asset[]
  workOrders: WorkOrder[]; agreements: ServiceAgreement[]
  openEstimates: Estimate[]; unpaidInvoices: Invoice[]
}
```

### `customers.create`
```ts
Input:  { firstName, lastName?, company?, email?, phone?, source?, notes?, tags? }
Output: Customer
```

### `customers.update`
```ts
Input:  { id: string; data: Partial<CustomerInput> }
Output: Customer
```

### `customers.addAddress`
```ts
Input:  { customerId: string; line1, city, state, zip, label?, isPrimary? }
Output: ServiceAddress
```

### `assets.list`
```ts
Input:  { customerId: string }
Output: Asset[]
```

### `assets.create`
```ts
Input:  {
  customerId: string; addressId?: string
  type: AssetType; make?, model?, serialNumber?
  installDate?; warrantyExpires?; location?; notes?
}
Output: Asset
```

### `assets.getServiceHistory`
```ts
Input:  { assetId: string }
Output: AssetServiceLog[]
```

### `agreements.list`
```ts
Input:  { customerId?: string; status?: AgreementStatus }
Output: ServiceAgreement[]
```

### `agreements.create`
```ts
Input:  {
  customerId: string; assetIds: string[]
  type: AgreementType; startDate, endDate
  visitsPerYear: number; annualValue: number
  notes?
}
Output: ServiceAgreement
```

---

## Estimates

### `estimates.create`
```ts
Input:  {
  customerId: string; workOrderId?
  title: string; notes?; expiresAt?
  tax?: number
  tiers: Array<{
    label: string; description?
    lineItems: Array<{ type, description, quantity, unitPrice, partId? }>
  }>
}
Output: Estimate
```

### `estimates.send`
Email estimate to customer.
```ts
Input:  { id: string; message?: string }
Output: { sentAt: Date }
```

### `estimates.approve`
Customer approves (called from portal, no auth required if token valid).
```ts
Input:  { token: string; tierId: string; signatureDataUri: string }
Output: { workOrderId: string }  // auto-created work order
```

### `estimates.getByToken`
Public endpoint for customer to view estimate.
```ts
Input:  { token: string }
Output: Estimate (public fields only)
```

---

## Invoices

### `invoices.createFromJob`
Auto-generate invoice from completed work order.
```ts
Input:  { workOrderId: string; dueDate?: Date }
Output: Invoice
```

### `invoices.createManual`
```ts
Input:  {
  customerId: string
  lineItems: Array<{ type, description, quantity, unitPrice }>
  dueDate?: Date; notes?
}
Output: Invoice
```

### `invoices.send`
Email invoice to customer.
```ts
Input:  { id: string; message?: string }
Output: { sentAt: Date }
```

### `invoices.initiatePayment`
Create Stripe PaymentIntent for online payment.
```ts
Input:  { id: string; method: "card" | "ach" }
Output: { clientSecret: string; amount: number }
```

### `invoices.recordOfflinePayment`
Record cash/check payment.
```ts
Input:  { id: string; amount: number; method: PaymentMethod; checkNumber? }
Output: Invoice
```

### `invoices.getAging`
AR aging report.
```ts
Input:  {}
Output: {
  current: Invoice[]; days1_30: Invoice[]; days31_60: Invoice[]
  days61_90: Invoice[]; over90: Invoice[]
  totals: { current, days1_30, days31_60, days61_90, over90 }
}
```

---

## Inventory

### `inventory.listParts`
```ts
Input:  { search?: string; category?: string; lowStockOnly?: boolean }
Output: Part[]
```

### `inventory.getTruckStock`
```ts
Input:  { userId: string }
Output: Array<{ part: Part; quantity: number; minQuantity: number; isLow: boolean }>
```

### `inventory.adjustStock`
```ts
Input:  {
  partId: string
  locationType: "truck" | "warehouse"
  locationId: string  // userId for truck, companyId for warehouse
  adjustment: number  // positive = add, negative = remove
  reason: string
}
Output: { newQuantity: number }
```

---

## Forms

### `forms.list`
```ts
Input:  { category?: string; isTemplate?: boolean }
Output: Form[]
```

### `forms.getSchema`
Get form structure for rendering.
```ts
Input:  { id: string }
Output: Form & { schema: FormSchema }
```

### `forms.submit`
Submit completed form.
```ts
Input:  {
  formId: string; workOrderId?: string
  data: Record<string, unknown>
  lat?: number; lng?: number
  signatureDataUri?: string
}
Output: { submissionId: string; pdfUrl?: string }
```

### `forms.getSubmissions`
```ts
Input:  { workOrderId?: string; formId?: string; startDate?: Date; endDate?: Date }
Output: FormSubmission[]
```

---

## Reports

### `reports.laborCost`
```ts
Input:  {
  startDate: Date; endDate: Date
  groupBy: "employee" | "project" | "costCode" | "workOrder"
  employeeId?: string; projectId?: string
}
Output: {
  rows: Array<{ label, regularHours, otHours, dtHours, totalHours, laborCost }>
  totals: { regularHours, otHours, dtHours, totalCost }
}
```

### `reports.jobProfitability`
```ts
Input:  { startDate: Date; endDate: Date; workOrderId?: string }
Output: Array<{
  workOrder: WorkOrder
  revenue: number; laborCost: number; partsCost: number
  grossMargin: number; marginPercent: number
}>
```

### `reports.techProductivity`
```ts
Input:  { startDate: Date; endDate: Date }
Output: Array<{
  user: User; jobsCompleted: number; avgJobDuration: number
  billableHours: number; utilizationRate: number; revenueGenerated: number
}>
```

### `reports.payrollExport`
```ts
Input:  { startDate: Date; endDate: Date; format: "quickbooks" | "adp" | "gusto" | "csv" }
Output: { downloadUrl: string }  // pre-signed R2 URL
```

### `reports.agreementPortfolio`
```ts
Input:  {}
Output: {
  totalAgreements: number; activeAgreements: number
  mrr: number; arr: number
  renewalsDue30: ServiceAgreement[]
  totalCustomersCovered: number
}
```

### `reports.dashboard`
```ts
Input:  {}
Output: {
  revenueMtd: number; jobsCompleteMtd: number; avgJobValue: number
  openWorkOrders: number; openEstimatesValue: number
  arBalance: number; techUtilizationRate: number
  jobsByStatus: Record<WorkOrderStatus, number>
  revenueByDay: Array<{ date: string; revenue: number }>
}
```

---

## Scheduling

### `schedule.list`
```ts
Input:  {
  startDate: Date; endDate: Date
  userId?: string; view: "day" | "week" | "month"
}
Output: Array<WorkOrder | Task>  // merged calendar items
```

### `tasks.create`
```ts
Input:  {
  title: string; description?
  assigneeIds: string[]; watcherIds?: string[]
  dueDate?: Date; scheduledStart?: Date; scheduledEnd?: Date
  workOrderId?; projectId?; labels?: string[]
  isRecurring?: boolean; recurrence?: RecurrenceRule
}
Output: Task
```

### `tasks.update`
```ts
Input:  { id: string; data: Partial<TaskInput> }
Output: Task
```

### `tasks.complete`
```ts
Input:  { id: string }
Output: Task
```

---

## Chat

### `chat.getChannels`
```ts
Input:  {}
Output: Array<ChatChannel & { lastMessage?: Message; unreadCount: number }>
```

### `chat.getMessages`
```ts
Input:  { channelId: string; before?: Date; limit?: number }
Output: Message[]
```

### `chat.send`
```ts
Input:  { channelId: string; content?: string; type: MessageType; fileUrl?: string }
Output: Message  // also broadcast via Socket.io
```

### `chat.createDirectChannel`
```ts
Input:  { userId: string }
Output: ChatChannel
```

### `chat.markRead`
```ts
Input:  { channelId: string; through: Date }
Output: { success: boolean }
```

---

## Time Off

### `timeoff.request`
```ts
Input:  {
  policyId: string; startDate: Date; endDate: Date
  hoursPerDay: number; reason?: string
}
Output: TimeOffRequest
```

### `timeoff.list`
```ts
Input:  { userId?: string; status?: TimeOffStatus }
Output: TimeOffRequest[]
```

### `timeoff.review`
```ts
Input:  { id: string; status: "APPROVED" | "REJECTED"; note?: string }
Output: TimeOffRequest
```

---

## Integrations

### `integrations.connectQuickbooks`
Initiate OAuth flow for QBO.
```ts
Input:  {}
Output: { authUrl: string }
```

### `integrations.syncQuickbooks`
Manual trigger full sync.
```ts
Input:  {}
Output: { synced: { customers, items, timeActivities } }
```

### `integrations.list`
```ts
Input:  {}
Output: Integration[]
```

### `integrations.disconnect`
```ts
Input:  { type: IntegrationType }
Output: { success: boolean }
```

---

## Webhook Endpoints (REST)

### `POST /api/webhooks/stripe`
Handle Stripe events: `invoice.paid`, `customer.subscription.deleted`, `payment_intent.succeeded`, `terminal.reader.action_succeeded`

### `POST /api/webhooks/twilio`
Handle inbound SMS replies from customers → route to CustomerCommunication log + alert dispatcher via Socket.io

### `POST /api/webhooks/quickbooks`
Handle QBO data change events (payment received in QBO → mark invoice paid in Prime Air)

### `POST /api/webhooks/expo`
Handle Expo push delivery receipts (failed → retry, deregister dead tokens)

---

## Error Response Format

All tRPC errors return a consistent shape:
```json
{
  "error": {
    "code": "UNAUTHORIZED | FORBIDDEN | NOT_FOUND | BAD_REQUEST | INTERNAL_SERVER_ERROR",
    "message": "Human-readable error message",
    "data": {
      "zodError": null,  // validation errors if applicable
      "field": null      // which field caused the error
    }
  }
}
```

## Rate Limits

| Endpoint Group | Limit |
|---|---|
| OTP request | 3 per phone per 10 minutes |
| Auth (all) | 20 per minute per IP |
| GPS ping | 120 per minute per user |
| General API | 300 per minute per user |
| File upload | 50 per hour per user |
| Report generation | 10 per minute per company |
| Payment initiation | 5 per minute per user |
