# Prime Air Condition — Data Models (Prisma Schema)

## Entity Relationship Overview

```
Company
  ├── Users (employees)
  │     ├── TimeEntries
  │     ├── LocationPings
  │     └── Devices (push tokens)
  ├── Customers
  │     ├── ServiceAddresses
  │     ├── Assets (HVAC equipment)
  │     └── ServiceAgreements
  ├── WorkOrders
  │     ├── Assignments (which techs)
  │     ├── StatusHistory
  │     ├── TimeEntries (linked)
  │     ├── PartUsages
  │     ├── FormSubmissions
  │     └── Photos
  ├── Estimates
  │     ├── LineItems
  │     └── Approvals
  ├── Invoices
  │     ├── LineItems
  │     └── Payments
  ├── Projects (job costing groupings)
  │     └── CostCodes
  ├── Inventory
  │     ├── Parts
  │     └── TruckStock
  ├── Forms (templates)
  │     └── FormSubmissions
  ├── Schedules
  │     └── Tasks
  └── ChatChannels
        └── Messages
```

---

## Full Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────
// COMPANY & USERS
// ─────────────────────────────────────

model Company {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique  // used in URLs: app.primeair.app/c/acme-hvac
  phone           String?
  email           String?
  website         String?
  logoUrl         String?
  addressLine1    String?
  addressLine2    String?
  city            String?
  state           String?
  zip             String?
  timezone        String   @default("America/New_York")
  
  // Billing
  stripeCustomerId    String? @unique
  stripeSubscriptionId String? @unique
  plan                Plan    @default(STARTER)
  trialEndsAt         DateTime?
  
  // Settings
  overtimeState       String  @default("federal")  // state code for OT rules
  defaultBreakMinutes Int     @default(30)
  geofenceRadiusFt    Int     @default(200)
  clockOutAfterHours  Int     @default(24)
  requireFacePhoto    Boolean @default(false)
  requireSignOff      Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users             User[]
  customers         Customer[]
  workOrders        WorkOrder[]
  projects          Project[]
  costCodes         CostCode[]
  forms             Form[]
  inventory         Part[]
  chatChannels      ChatChannel[]
  timeOffPolicies   TimeOffPolicy[]
  integrations      Integration[]

  @@index([slug])
}

enum Plan {
  STARTER
  PRO
  ENTERPRISE
}

model User {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id])
  
  // Identity
  firstName    String
  lastName     String
  email        String?
  phone        String?
  avatarUrl    String?
  
  // Auth
  passwordHash String?
  role         Role     @default(TECHNICIAN)
  isActive     Boolean  @default(true)
  
  // Profile
  title        String?  // "Senior HVAC Technician"
  certifications String[] // ["EPA 608", "NATE Certified"]
  skills       String[] // ["commercial", "residential", "refrigeration"]
  color        String?  // hex, for calendar display
  
  // Payroll
  hourlyRate   Decimal? @db.Decimal(8, 2)
  payType      PayType  @default(HOURLY)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  devices          Device[]
  timeEntries      TimeEntry[]
  locationPings    LocationPing[]
  workAssignments  WorkOrderAssignment[]
  approvedTimecards TimeEntry[] @relation("TimecardApprover")
  sentMessages     Message[]
  timeOffRequests  TimeOffRequest[]
  createdWorkOrders WorkOrder[] @relation("WorkOrderCreator")

  @@unique([companyId, email])
  @@unique([companyId, phone])
  @@index([companyId, role])
}

enum Role {
  TECHNICIAN
  CREW_LEAD
  DISPATCHER
  OFFICE_ADMIN
  OWNER
}

enum PayType {
  HOURLY
  SALARY
}

model Device {
  id          String  @id @default(cuid())
  userId      String
  user        User    @relation(fields: [userId], references: [id])
  
  expoPushToken String?
  platform      String  // "ios" | "android"
  deviceModel   String?
  appVersion    String?
  lastSeen      DateTime @default(now())
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
}

// ─────────────────────────────────────
// TIME TRACKING
// ─────────────────────────────────────

model TimeEntry {
  id           String   @id @default(cuid())
  companyId    String
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  workOrderId  String?
  workOrder    WorkOrder? @relation(fields: [workOrderId], references: [id])
  projectId    String?
  project      Project? @relation(fields: [projectId], references: [id])
  costCodeId   String?
  costCode     CostCode? @relation(fields: [costCodeId], references: [id])
  
  // Time
  clockInAt    DateTime
  clockOutAt   DateTime?
  breakMinutes Int      @default(0)
  totalMinutes Int?     // computed: (clockOut - clockIn) - break
  
  // Overtime (computed nightly)
  regularMinutes    Int?
  overtimeMinutes   Int?  // 1.5x
  doubleTimeMinutes Int?  // 2x
  
  // Status
  status       TimeEntryStatus @default(ACTIVE)
  
  // Location at clock-in
  clockInLat   Float?
  clockInLng   Float?
  clockInPhoto String? // R2 URL
  
  // Sign-off
  signedOffAt      DateTime?
  signedOffByTech  Boolean @default(false)
  breakCompliance  Boolean?  // "did you take all breaks?" answer
  
  // Audit
  approvedAt   DateTime?
  approvedById String?
  approvedBy   User?    @relation("TimecardApprover", fields: [approvedById], references: [id])
  
  note         String?
  isManual     Boolean @default(false)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  edits        TimeEntryEdit[]
  breaks       Break[]

  @@index([companyId, userId, clockInAt])
  @@index([companyId, workOrderId])
}

enum TimeEntryStatus {
  ACTIVE      // currently clocked in
  PENDING     // clocked out, awaiting approval
  APPROVED
  REJECTED
}

model Break {
  id          String    @id @default(cuid())
  timeEntryId String
  timeEntry   TimeEntry @relation(fields: [timeEntryId], references: [id])
  
  startAt     DateTime
  endAt       DateTime?
  minutes     Int?
  type        BreakType @default(MEAL)
  
  @@index([timeEntryId])
}

enum BreakType {
  MEAL
  REST
  OTHER
}

model TimeEntryEdit {
  id          String    @id @default(cuid())
  timeEntryId String
  timeEntry   TimeEntry @relation(fields: [timeEntryId], references: [id])
  
  editedById  String
  field       String    // "clockInAt" | "clockOutAt" | "breakMinutes"
  oldValue    String
  newValue    String
  reason      String
  editedAt    DateTime  @default(now())
  
  @@index([timeEntryId])
}

model LocationPing {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  companyId String
  
  lat       Float
  lng       Float
  accuracy  Float?   // meters
  speed     Float?   // m/s
  bearing   Float?   // degrees
  altitude  Float?   // meters
  
  isDriving Boolean  @default(false)
  
  timestamp DateTime

  @@index([companyId, userId, timestamp])
}

// ─────────────────────────────────────
// TIME OFF
// ─────────────────────────────────────

model TimeOffPolicy {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  name        String  // "PTO", "Sick", "Holiday"
  isPaid      Boolean @default(true)
  accrualRateHoursPerYear Float?
  
  requests    TimeOffRequest[]
}

model TimeOffRequest {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  policyId    String
  policy      TimeOffPolicy @relation(fields: [policyId], references: [id])
  
  startDate   DateTime
  endDate     DateTime
  hoursPerDay Float
  reason      String?
  status      TimeOffStatus @default(PENDING)
  
  reviewedById String?
  reviewedAt   DateTime?
  reviewNote   String?
  
  createdAt   DateTime @default(now())
}

enum TimeOffStatus {
  PENDING
  APPROVED
  REJECTED
}

// ─────────────────────────────────────
// CUSTOMERS & ASSETS
// ─────────────────────────────────────

model Customer {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  // Contact
  firstName   String
  lastName    String?
  company     String? // for commercial customers
  email       String?
  phone       String?
  altPhone    String?
  
  // Preferences
  preferredContactMethod String? // "sms" | "email" | "call"
  preferredTechId        String? // preferred technician
  notes                  String?
  tags                   String[]
  
  // Portal
  portalEmail    String?   // may differ from contact email
  portalPasswordHash String?
  
  // Acquisition
  source      String?  // "google", "referral", "repeat"
  referredById String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  addresses       ServiceAddress[]
  assets          Asset[]
  workOrders      WorkOrder[]
  estimates       Estimate[]
  invoices        Invoice[]
  agreements      ServiceAgreement[]
  communications  CustomerCommunication[]

  @@index([companyId, lastName])
  @@index([companyId, phone])
  @@index([companyId, email])
}

model ServiceAddress {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  label       String?  // "Home", "Office", "Rental Property"
  line1       String
  line2       String?
  city        String
  state       String
  zip         String
  lat         Float?
  lng         Float?
  
  geofenceRadiusFt Int @default(200)
  isPrimary   Boolean @default(false)
  
  @@index([customerId])
}

model Asset {
  id          String   @id @default(cuid())
  companyId   String
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  addressId   String?
  
  // Equipment Details
  type        AssetType
  make        String?
  model       String?
  serialNumber String?
  seerRating  Float?
  tonnage     Float?
  
  // Location at property
  location    String? // "attic", "backyard", "basement"
  
  // Dates
  installDate      DateTime?
  warrantyExpires  DateTime?
  lastServiceDate  DateTime?
  nextServiceDue   DateTime?
  
  // Status
  condition   String? // "good", "fair", "poor", "replace"
  notes       String?
  
  photos      String[] // R2 URLs
  documents   String[] // warranty cards, manuals
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  workOrders  WorkOrder[]
  serviceHistory AssetServiceLog[]
  agreementCoverage ServiceAgreementAsset[]

  @@index([customerId])
  @@index([companyId, nextServiceDue])
}

enum AssetType {
  AC_UNIT
  FURNACE
  HEAT_PUMP
  MINI_SPLIT
  AIR_HANDLER
  THERMOSTAT
  DUCTWORK
  WATER_HEATER
  HUMIDIFIER
  AIR_PURIFIER
  OTHER
}

model AssetServiceLog {
  id          String   @id @default(cuid())
  assetId     String
  asset       Asset    @relation(fields: [assetId], references: [id])
  workOrderId String?
  
  serviceDate DateTime
  description String
  techName    String?
  partsReplaced String?
  refrigerantAdded Float? // lbs
  
  @@index([assetId, serviceDate])
}

// ─────────────────────────────────────
// SERVICE AGREEMENTS
// ─────────────────────────────────────

model ServiceAgreement {
  id          String   @id @default(cuid())
  companyId   String
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  name        String   // "Premier Annual Plan"
  type        AgreementType
  status      AgreementStatus @default(ACTIVE)
  
  startDate   DateTime
  endDate     DateTime
  autoRenew   Boolean  @default(true)
  
  annualValue Decimal  @db.Decimal(10, 2)
  
  // Scheduling
  visitsPerYear Int    @default(2)
  nextVisitDate DateTime?
  
  notes       String?
  
  assets      ServiceAgreementAsset[]
  workOrders  WorkOrder[]
  renewalReminders AgreementRenewalReminder[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([companyId, endDate])
  @@index([customerId])
}

model ServiceAgreementAsset {
  agreementId String
  agreement   ServiceAgreement @relation(fields: [agreementId], references: [id])
  assetId     String
  asset       Asset   @relation(fields: [assetId], references: [id])
  
  @@id([agreementId, assetId])
}

model AgreementRenewalReminder {
  id          String   @id @default(cuid())
  agreementId String
  agreement   ServiceAgreement @relation(fields: [agreementId], references: [id])
  
  daysBeforeExpiry Int  // 60, 30, 7
  sentAt       DateTime?
  
  @@unique([agreementId, daysBeforeExpiry])
}

enum AgreementType {
  ANNUAL
  BIANNUAL
  QUARTERLY
  MONTHLY
}

enum AgreementStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  PENDING_RENEWAL
}

// ─────────────────────────────────────
// WORK ORDERS
// ─────────────────────────────────────

model WorkOrder {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  
  // Reference
  number      Int      // auto-increment per company: WO-001, WO-002
  
  // Customer
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  serviceAddressId String?
  assetId     String?
  asset       Asset?   @relation(fields: [assetId], references: [id])
  agreementId String?
  agreement   ServiceAgreement? @relation(fields: [agreementId], references: [id])
  
  // Classification
  type        WorkOrderType
  priority    Priority @default(NORMAL)
  status      WorkOrderStatus @default(NEW)
  
  // Scheduling
  scheduledStart   DateTime?
  scheduledEnd     DateTime?
  estimatedHours   Float?
  
  // Description
  title            String
  scopeOfWork      String?
  internalNotes    String?
  customerPO       String?
  
  // Project/Cost
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  
  // Completion
  completedAt DateTime?
  completionNotes String?
  
  // Creator
  createdById String
  createdBy   User   @relation("WorkOrderCreator", fields: [createdById], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  assignments      WorkOrderAssignment[]
  statusHistory    WorkOrderStatusHistory[]
  timeEntries      TimeEntry[]
  partUsages       PartUsage[]
  formSubmissions  FormSubmission[]
  photos           WorkOrderPhoto[]
  estimate         Estimate?
  invoice          Invoice?
  checklists       Checklist[]
  customerComms    CustomerCommunication[]

  @@unique([companyId, number])
  @@index([companyId, status])
  @@index([companyId, scheduledStart])
  @@index([customerId])
}

model WorkOrderAssignment {
  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  isLead      Boolean   @default(false)
  assignedAt  DateTime  @default(now())
  
  @@id([workOrderId, userId])
  @@index([userId])
}

model WorkOrderStatusHistory {
  id          String   @id @default(cuid())
  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  
  fromStatus  WorkOrderStatus?
  toStatus    WorkOrderStatus
  changedById String?
  note        String?
  changedAt   DateTime @default(now())
  
  @@index([workOrderId])
}

model WorkOrderPhoto {
  id          String   @id @default(cuid())
  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  uploadedById String
  
  url         String   // R2 URL
  caption     String?
  takenAt     DateTime @default(now())
  lat         Float?
  lng         Float?
  
  @@index([workOrderId])
}

enum WorkOrderType {
  NEW_INSTALLATION
  REPAIR
  PREVENTIVE_MAINTENANCE
  EMERGENCY
  WARRANTY
  INSPECTION
  ESTIMATE_ONLY
}

enum WorkOrderStatus {
  NEW
  SCHEDULED
  DISPATCHED
  EN_ROUTE
  IN_PROGRESS
  ON_HOLD
  COMPLETE
  INVOICED
  PAID
  CANCELLED
}

enum Priority {
  EMERGENCY
  HIGH
  NORMAL
  LOW
}

// ─────────────────────────────────────
// JOB COSTING
// ─────────────────────────────────────

model Project {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  name        String
  description String?
  color       String? // hex
  
  budgetHours     Float?
  budgetLaborCost Decimal? @db.Decimal(10, 2)
  budgetMaterial  Decimal? @db.Decimal(10, 2)
  
  isActive    Boolean @default(true)
  
  // Geofence
  lat         Float?
  lng         Float?
  radiusFt    Int?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  timeEntries TimeEntry[]
  workOrders  WorkOrder[]
  costCodes   CostCode[]  @relation("ProjectCostCodes")

  @@index([companyId, isActive])
}

model CostCode {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  code        String  // "INSTALL", "TRAVEL", "SERVICE"
  name        String
  isGlobal    Boolean @default(true) // if false, restricted to specific projects
  
  timeEntries TimeEntry[]
  projects    Project[]  @relation("ProjectCostCodes")

  @@unique([companyId, code])
}

// ─────────────────────────────────────
// ESTIMATES
// ─────────────────────────────────────

model Estimate {
  id          String   @id @default(cuid())
  companyId   String
  number      Int      // auto-increment: EST-001
  
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  workOrderId String?  @unique
  workOrder   WorkOrder? @relation(fields: [workOrderId], references: [id])
  
  status      EstimateStatus @default(DRAFT)
  
  title       String
  notes       String?    // visible to customer
  internalNotes String?  // not visible to customer
  
  expiresAt   DateTime?
  sentAt      DateTime?
  viewedAt    DateTime?  // read receipt
  approvedAt  DateTime?
  rejectedAt  DateTime?
  
  // Customer selection (Good/Better/Best)
  selectedTierId String?
  customerSignature String? // R2 URL
  
  tax         Decimal  @db.Decimal(8, 4) @default(0) // percentage
  discount    Decimal  @db.Decimal(10, 2) @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tiers       EstimateTier[]

  @@unique([companyId, number])
  @@index([customerId])
}

model EstimateTier {
  id          String   @id @default(cuid())
  estimateId  String
  estimate    Estimate @relation(fields: [estimateId], references: [id])
  
  label       String   // "Good", "Better", "Best"
  description String?
  sortOrder   Int
  
  lineItems   EstimateLineItem[]

  @@index([estimateId])
}

model EstimateLineItem {
  id          String       @id @default(cuid())
  tierId      String
  tier        EstimateTier @relation(fields: [tierId], references: [id])
  
  type        LineItemType
  description String
  quantity    Decimal      @db.Decimal(10, 2)
  unitPrice   Decimal      @db.Decimal(10, 2)
  cost        Decimal?     @db.Decimal(10, 2) // internal cost (not shown to customer)
  sortOrder   Int
  
  partId      String?
  part        Part?        @relation(fields: [partId], references: [id])

  @@index([tierId])
}

enum EstimateStatus {
  DRAFT
  SENT
  VIEWED
  APPROVED
  REJECTED
  EXPIRED
  CONVERTED  // became a work order
}

enum LineItemType {
  LABOR
  PART
  MATERIAL
  FEE
  DISCOUNT
}

// ─────────────────────────────────────
// INVOICES & PAYMENTS
// ─────────────────────────────────────

model Invoice {
  id          String   @id @default(cuid())
  companyId   String
  number      Int      // auto-increment: INV-001
  
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  workOrderId String?  @unique
  workOrder   WorkOrder? @relation(fields: [workOrderId], references: [id])
  
  status      InvoiceStatus @default(DRAFT)
  dueDate     DateTime?
  
  notes       String?
  
  subtotal    Decimal  @db.Decimal(10, 2)
  tax         Decimal  @db.Decimal(10, 2)
  discount    Decimal  @db.Decimal(10, 2) @default(0)
  total       Decimal  @db.Decimal(10, 2)
  amountPaid  Decimal  @db.Decimal(10, 2) @default(0)
  balance     Decimal  @db.Decimal(10, 2)
  
  stripePaymentIntentId String?
  
  sentAt      DateTime?
  paidAt      DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  lineItems   InvoiceLineItem[]
  payments    Payment[]

  @@unique([companyId, number])
  @@index([customerId])
  @@index([companyId, status, dueDate])
}

model InvoiceLineItem {
  id          String    @id @default(cuid())
  invoiceId   String
  invoice     Invoice   @relation(fields: [invoiceId], references: [id])
  
  type        LineItemType
  description String
  quantity    Decimal   @db.Decimal(10, 2)
  unitPrice   Decimal   @db.Decimal(10, 2)
  total       Decimal   @db.Decimal(10, 2)
  sortOrder   Int
  
  partId      String?
  part        Part?     @relation(fields: [partId], references: [id])
  timeEntryId String?

  @@index([invoiceId])
}

model Payment {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  
  amount      Decimal  @db.Decimal(10, 2)
  method      PaymentMethod
  
  stripePaymentIntentId String?
  checkNumber String?
  
  paidAt      DateTime @default(now())
  recordedById String?
  
  @@index([invoiceId])
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIAL
  PAID
  OVERDUE
  VOIDED
}

enum PaymentMethod {
  CARD_TAP_TO_PAY
  CARD_ONLINE
  ACH
  CHECK
  CASH
  FINANCING
}

// ─────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────

model Part {
  id          String  @id @default(cuid())
  companyId   String
  
  partNumber  String?
  name        String
  description String?
  category    String? // "Refrigerant", "Filter", "Motor", etc.
  unit        String  @default("each") // "each", "lb", "ft"
  
  cost        Decimal @db.Decimal(10, 2)  // wholesale cost
  sellPrice   Decimal @db.Decimal(10, 2)  // default sell price
  
  supplierId  String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  truckStock      TruckStock[]
  warehouseStock  WarehouseStock[]
  usages          PartUsage[]
  estimateItems   EstimateLineItem[]
  invoiceItems    InvoiceLineItem[]

  @@unique([companyId, partNumber])
  @@index([companyId, category])
}

model TruckStock {
  id          String  @id @default(cuid())
  userId      String  // the tech whose truck this is
  partId      String
  part        Part    @relation(fields: [partId], references: [id])
  
  quantity    Int     @default(0)
  minQuantity Int     @default(1)  // alert threshold
  
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, partId])
}

model WarehouseStock {
  id          String  @id @default(cuid())
  companyId   String
  partId      String
  part        Part    @relation(fields: [partId], references: [id])
  
  quantity    Int     @default(0)
  minQuantity Int     @default(5)
  
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, partId])
}

model PartUsage {
  id          String    @id @default(cuid())
  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  partId      String
  part        Part      @relation(fields: [partId], references: [id])
  userId      String    // tech who pulled the part
  
  quantity    Decimal   @db.Decimal(10, 3)
  costAtTime  Decimal   @db.Decimal(10, 2) // snapshot of cost when used
  usedAt      DateTime  @default(now())
  
  @@index([workOrderId])
  @@index([partId])
}

// ─────────────────────────────────────
// FORMS & INSPECTIONS
// ─────────────────────────────────────

model Form {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  name        String
  description String?
  category    String?  // "Safety", "Inspection", "Service Report"
  isTemplate  Boolean  @default(true)
  isActive    Boolean  @default(true)
  
  // JSON schema for form structure
  schema      Json     // { fields: [{ id, type, label, required, options, logic }] }
  
  // Auto-assignment rules
  autoAssignOn  FormTrigger[]
  workOrderTypes WorkOrderType[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  submissions FormSubmission[]

  @@index([companyId, isActive])
}

enum FormTrigger {
  CLOCK_IN
  CLOCK_OUT
  JOB_START
  JOB_COMPLETE
}

model FormSubmission {
  id          String   @id @default(cuid())
  formId      String
  form        Form     @relation(fields: [formId], references: [id])
  workOrderId String?
  workOrder   WorkOrder? @relation(fields: [workOrderId], references: [id])
  submittedById String
  
  // Submitted data
  data        Json     // { fieldId: value, ... }
  
  // Geo + time
  lat         Float?
  lng         Float?
  submittedAt DateTime @default(now())
  
  // Signature
  signatureUrl String? // R2 URL
  
  // Alert flags
  hasFlaggedResponse Boolean @default(false)
  
  pdfUrl      String?  // R2 URL of generated PDF

  @@index([workOrderId])
  @@index([submittedById, submittedAt])
}

// ─────────────────────────────────────
// CHECKLISTS (per work order)
// ─────────────────────────────────────

model Checklist {
  id          String    @id @default(cuid())
  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  
  name        String    // "AC Tune-Up Checklist"
  
  items       ChecklistItem[]
  
  @@index([workOrderId])
}

model ChecklistItem {
  id          String    @id @default(cuid())
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id])
  
  text        String
  isComplete  Boolean   @default(false)
  completedAt DateTime?
  completedById String?
  sortOrder   Int
  
  @@index([checklistId])
}

// ─────────────────────────────────────
// SCHEDULING & TASKS
// ─────────────────────────────────────

model Task {
  id          String   @id @default(cuid())
  companyId   String
  
  title       String
  description String?
  
  assigneeIds String[]
  watcherIds  String[]
  
  workOrderId String?
  projectId   String?
  
  status      TaskStatus @default(TODO)
  priority    Priority   @default(NORMAL)
  
  dueDate     DateTime?
  scheduledStart DateTime?
  scheduledEnd   DateTime?
  
  isRecurring Boolean  @default(false)
  recurrence  Json?    // { frequency: "weekly", dayOfWeek: [1,5], ... }
  
  labels      String[]
  
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  comments    TaskComment[]

  @@index([companyId, dueDate])
  @@index([companyId, status])
}

model TaskComment {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id])
  authorId    String
  
  content     String
  attachments String[] // R2 URLs
  
  createdAt   DateTime @default(now())

  @@index([taskId])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETE
  CANCELLED
}

// ─────────────────────────────────────
// CHAT & MESSAGING
// ─────────────────────────────────────

model ChatChannel {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  type        ChannelType
  name        String?       // for group channels
  workOrderId String?       // for job-linked threads
  
  memberIds   String[]
  
  createdAt   DateTime @default(now())
  
  messages    Message[]
  
  @@index([companyId, type])
}

model Message {
  id          String  @id @default(cuid())
  channelId   String
  channel     ChatChannel @relation(fields: [channelId], references: [id])
  senderId    String
  sender      User    @relation(fields: [senderId], references: [id])
  
  type        MessageType @default(TEXT)
  content     String?
  fileUrl     String?
  
  readBy      String[]  // array of userIds
  
  sentAt      DateTime  @default(now())

  @@index([channelId, sentAt])
}

enum ChannelType {
  DIRECT         // 1:1
  GROUP          // team channel
  JOB_THREAD     // linked to a work order
  ANNOUNCEMENT   // all-hands
}

enum MessageType {
  TEXT
  PHOTO
  VOICE_MEMO
  DOCUMENT
  SYSTEM   // "John clocked in", "Job marked complete"
}

// ─────────────────────────────────────
// CUSTOMER COMMUNICATIONS
// ─────────────────────────────────────

model CustomerCommunication {
  id          String   @id @default(cuid())
  companyId   String
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  workOrderId String?
  workOrder   WorkOrder? @relation(fields: [workOrderId], references: [id])
  
  channel     CommChannel  // SMS, EMAIL
  direction   CommDirection // OUTBOUND, INBOUND
  
  subject     String?   // email subject
  body        String
  
  status      CommStatus @default(SENT)
  twilioSid   String?
  
  sentAt      DateTime  @default(now())
  deliveredAt DateTime?
  readAt      DateTime?

  @@index([customerId, sentAt])
  @@index([workOrderId])
}

enum CommChannel {
  SMS
  EMAIL
}

enum CommDirection {
  OUTBOUND
  INBOUND
}

enum CommStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
  READ
}

// ─────────────────────────────────────
// INTEGRATIONS
// ─────────────────────────────────────

model Integration {
  id          String  @id @default(cuid())
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  type        IntegrationType
  status      IntegrationStatus @default(CONNECTED)
  
  // OAuth tokens (encrypted)
  accessToken  String?
  refreshToken String?
  tokenExpiry  DateTime?
  
  // Integration-specific metadata
  config      Json?    // { realmId, entityId, etc. }
  
  lastSyncAt  DateTime?
  lastSyncError String?
  
  connectedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([companyId, type])
}

enum IntegrationType {
  QUICKBOOKS_ONLINE
  QUICKBOOKS_DESKTOP
  XERO
  GUSTO
  ADP_RUN
  PAYCHEX
  RIPPLING
  GOOGLE_CALENDAR
  STRIPE
}

enum IntegrationStatus {
  CONNECTED
  DISCONNECTED
  ERROR
  PENDING
}
```
