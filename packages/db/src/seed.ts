import {
  PrismaClient,
  JobType,
  PayType,
  WorkOrderType,
  WorkOrderStatus,
  Priority,
  TimeEntryStatus,
  TimeOffStatus,
  AssetType,
  InvoiceStatus,
  LineItemType,
  PaymentMethod,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number, hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursLater(base: Date, h: number) {
  return new Date(base.getTime() + h * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding database...");

  // ── Company ──────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { slug: "primeair-demo" },
    update: {},
    create: {
      name: "Prime Air Conditioning",
      slug: "primeair-demo",
      phone: "5129871234",
      email: "office@primeaircondition.com",
      website: "https://www.myprimeair.com",
      city: "Austin",
      state: "TX",
      zip: "78701",
      addressLine1: "1200 S Lamar Blvd",
      timezone: "America/Chicago",
      overtimeState: "federal",
      defaultBreakMinutes: 30,
      geofenceRadiusFt: 300,
    },
  });
  console.log("Company:", company.name);

  // ── Built-in roles ───────────────────────────────────────────
  const techRole = await prisma.role.upsert({
    where: { id: "role-tech" },
    update: {},
    create: {
      id: "role-tech",
      companyId: company.id,
      name: "Technician",
      isBuiltIn: true,
      sortOrder: 0,
      hubAccess: false,
      timeclockAccess: true,
      canClockIn: true,
      canViewOwnTimecards: true,
      canEditTimecards: false,
      canApproveTimecards: false,
      canAssignWorkOrders: false,
      canManageCustomers: false,
      canViewReports: false,
      canExportPayroll: false,
      canManageTeam: false,
      canManageAdmin: false,
      canManageRoles: false,
      canManageBilling: false,
    },
  });

  const crewLeadRole = await prisma.role.upsert({
    where: { id: "role-crew-lead" },
    update: {},
    create: {
      id: "role-crew-lead",
      companyId: company.id,
      name: "Crew Lead",
      isBuiltIn: true,
      sortOrder: 1,
      hubAccess: false,
      timeclockAccess: true,
      canClockIn: true,
      canViewOwnTimecards: true,
      canEditTimecards: false,
      canApproveTimecards: false,
      canAssignWorkOrders: false,
      canManageCustomers: false,
      canViewReports: false,
      canExportPayroll: false,
      canManageTeam: false,
      canManageAdmin: false,
      canManageRoles: false,
      canManageBilling: false,
    },
  });

  const dispatcherRole = await prisma.role.upsert({
    where: { id: "role-dispatcher" },
    update: {},
    create: {
      id: "role-dispatcher",
      companyId: company.id,
      name: "Dispatcher",
      isBuiltIn: true,
      sortOrder: 2,
      hubAccess: true,
      timeclockAccess: false,
      canClockIn: false,
      canViewOwnTimecards: true,
      canEditTimecards: false,
      canApproveTimecards: true,
      canAssignWorkOrders: true,
      canManageCustomers: true,
      canViewReports: true,
      canExportPayroll: false,
      canManageTeam: false,
      canManageAdmin: false,
      canManageRoles: false,
      canManageBilling: false,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { id: "role-admin" },
    update: {},
    create: {
      id: "role-admin",
      companyId: company.id,
      name: "Office Admin",
      isBuiltIn: true,
      sortOrder: 3,
      hubAccess: true,
      timeclockAccess: false,
      canClockIn: false,
      canViewOwnTimecards: true,
      canEditTimecards: true,
      canApproveTimecards: true,
      canAssignWorkOrders: true,
      canManageCustomers: true,
      canViewReports: true,
      canExportPayroll: true,
      canManageTeam: true,
      canManageAdmin: true,
      canManageRoles: false,
      canManageBilling: false,
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: { id: "role-owner" },
    update: {},
    create: {
      id: "role-owner",
      companyId: company.id,
      name: "Owner",
      isBuiltIn: true,
      sortOrder: 4,
      hubAccess: true,
      timeclockAccess: true,
      canClockIn: true,
      canViewOwnTimecards: true,
      canEditTimecards: true,
      canApproveTimecards: true,
      canAssignWorkOrders: true,
      canManageCustomers: true,
      canViewReports: true,
      canExportPayroll: true,
      canManageTeam: true,
      canManageAdmin: true,
      canManageRoles: true,
      canManageBilling: true,
    },
  });

  console.log("Roles created.");

  // ── Cost Codes ───────────────────────────────────────────────
  const costCodes = await Promise.all([
    prisma.costCode.upsert({ where: { companyId_code: { companyId: company.id, code: "HVAC-SVC" } }, update: {}, create: { companyId: company.id, code: "HVAC-SVC", description: "HVAC Service & Repair" } }),
    prisma.costCode.upsert({ where: { companyId_code: { companyId: company.id, code: "HVAC-INST" } }, update: {}, create: { companyId: company.id, code: "HVAC-INST", description: "HVAC Installation" } }),
    prisma.costCode.upsert({ where: { companyId_code: { companyId: company.id, code: "HVAC-PM" } }, update: {}, create: { companyId: company.id, code: "HVAC-PM", description: "Preventive Maintenance" } }),
    prisma.costCode.upsert({ where: { companyId_code: { companyId: company.id, code: "HVAC-EMRG" } }, update: {}, create: { companyId: company.id, code: "HVAC-EMRG", description: "Emergency Service" } }),
    prisma.costCode.upsert({ where: { companyId_code: { companyId: company.id, code: "HVAC-INSP" } }, update: {}, create: { companyId: company.id, code: "HVAC-INSP", description: "Inspection" } }),
    prisma.costCode.upsert({ where: { companyId_code: { companyId: company.id, code: "ADMIN" } }, update: {}, create: { companyId: company.id, code: "ADMIN", description: "Administrative / Office" } }),
  ]);
  type CC = Awaited<ReturnType<typeof prisma.costCode.upsert>>;
  const [svcCode, instCode, pmCode, emrgCode, inspCode] = costCodes as [CC, CC, CC, CC, CC, CC];
  console.log("Cost codes created.");

  // ── Users ────────────────────────────────────────────────────
  const hash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { id: "seed-owner-1" },
    update: {},
    create: {
      id: "seed-owner-1",
      companyId: company.id,
      firstName: "Rick",
      lastName: "Patterson",
      email: "owner@primeaircondition.com",
      roleId: ownerRole.id,
      jobType: JobType.OFFICE_STAFF,
      passwordHash: hash,
      isActive: true,
      color: "#1B3A6B",
      title: "Owner / CEO",
    },
  });

  const admin = await prisma.user.upsert({
    where: { id: "seed-admin-1" },
    update: {},
    create: {
      id: "seed-admin-1",
      companyId: company.id,
      firstName: "Sandra",
      lastName: "Martinez",
      email: "admin@primeaircondition.com",
      roleId: adminRole.id,
      jobType: JobType.OFFICE_STAFF,
      passwordHash: hash,
      isActive: true,
      color: "#0891B2",
      title: "Office Manager",
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { id: "seed-dispatcher-1" },
    update: {},
    create: {
      id: "seed-dispatcher-1",
      companyId: company.id,
      firstName: "Jordan",
      lastName: "Reyes",
      email: "dispatch@primeaircondition.com",
      roleId: dispatcherRole.id,
      jobType: JobType.OFFICE_STAFF,
      passwordHash: hash,
      isActive: true,
      color: "#7C3AED",
      title: "Dispatcher",
    },
  });

  const marcus = await prisma.user.upsert({
    where: { id: "seed-tech-1" },
    update: {},
    create: {
      id: "seed-tech-1",
      companyId: company.id,
      firstName: "Marcus",
      lastName: "Williams",
      phone: "5121110001",
      roleId: techRole.id,
      jobType: JobType.SERVICE_TECH,
      passwordHash: hash,
      hourlyRate: 28.0,
      payType: PayType.HOURLY,
      isActive: true,
      color: "#059669",
      title: "HVAC Technician",
      certifications: ["EPA 608", "NATE Certified"],
      skills: ["Residential", "Commercial", "Refrigerant Handling"],
    },
  });

  const carlos = await prisma.user.upsert({
    where: { id: "seed-tech-2" },
    update: {},
    create: {
      id: "seed-tech-2",
      companyId: company.id,
      firstName: "Carlos",
      lastName: "Ramirez",
      phone: "5121110002",
      roleId: crewLeadRole.id,
      jobType: JobType.INSTALLER,
      passwordHash: hash,
      hourlyRate: 34.0,
      payType: PayType.HOURLY,
      isActive: true,
      color: "#D97706",
      title: "Lead Installer",
      certifications: ["EPA 608", "NATE Certified", "TX HVAC License"],
      skills: ["New Construction", "Equipment Installation", "Ductwork"],
    },
  });

  const darius = await prisma.user.upsert({
    where: { id: "seed-tech-3" },
    update: {},
    create: {
      id: "seed-tech-3",
      companyId: company.id,
      firstName: "Darius",
      lastName: "Johnson",
      phone: "5121110003",
      roleId: techRole.id,
      jobType: JobType.SERVICE_TECH,
      passwordHash: hash,
      hourlyRate: 25.0,
      payType: PayType.HOURLY,
      isActive: true,
      color: "#DC2626",
      title: "HVAC Technician",
      certifications: ["EPA 608"],
      skills: ["Residential", "Preventive Maintenance"],
    },
  });

  const priya = await prisma.user.upsert({
    where: { id: "seed-tech-4" },
    update: {},
    create: {
      id: "seed-tech-4",
      companyId: company.id,
      firstName: "Priya",
      lastName: "Patel",
      phone: "5121110004",
      roleId: techRole.id,
      jobType: JobType.SERVICE_TECH,
      passwordHash: hash,
      hourlyRate: 26.5,
      payType: PayType.HOURLY,
      isActive: true,
      color: "#9333EA",
      title: "HVAC Technician",
      certifications: ["EPA 608", "NATE Certified"],
      skills: ["Residential", "Mini-Split Systems", "Refrigerant Handling"],
    },
  });

  const tommy = await prisma.user.upsert({
    where: { id: "seed-tech-5" },
    update: {},
    create: {
      id: "seed-tech-5",
      companyId: company.id,
      firstName: "Tommy",
      lastName: "Nguyen",
      phone: "5121110005",
      roleId: techRole.id,
      jobType: JobType.INSTALLER,
      passwordHash: hash,
      hourlyRate: 29.0,
      payType: PayType.HOURLY,
      isActive: true,
      color: "#0EA5E9",
      title: "Installation Technician",
      certifications: ["EPA 608"],
      skills: ["Equipment Installation", "Electrical", "Ductwork"],
    },
  });

  console.log("Users created.");

  // ── Time Off Policies ─────────────────────────────────────────
  const ptoPolicy = await prisma.timeOffPolicy.upsert({
    where: { id: "seed-policy-pto" },
    update: {},
    create: {
      id: "seed-policy-pto",
      companyId: company.id,
      name: "PTO",
      type: "VACATION",
      isPaid: true,
      accrualEnabled: true,
      accrualRateHoursPerYear: 80,
      maxBalanceHours: 120,
    },
  });

  const sickPolicy = await prisma.timeOffPolicy.upsert({
    where: { id: "seed-policy-sick" },
    update: {},
    create: {
      id: "seed-policy-sick",
      companyId: company.id,
      name: "Sick Leave",
      type: "SICK",
      isPaid: true,
      accrualEnabled: true,
      accrualRateHoursPerYear: 40,
    },
  });

  // ── Time Off Requests ────────────────────────────────────────
  await prisma.timeOffRequest.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-tor-1",
        userId: marcus.id,
        policyId: ptoPolicy.id,
        startDate: daysAgo(-7),   // next week
        endDate: daysAgo(-9),
        hoursPerDay: 8,
        reason: "Family vacation",
        status: TimeOffStatus.APPROVED,
        reviewedById: admin.id,
        reviewedAt: daysAgo(1),
        reviewNote: "Approved. Have a great trip!",
      },
      {
        id: "seed-tor-2",
        userId: darius.id,
        policyId: ptoPolicy.id,
        startDate: daysAgo(-3),
        endDate: daysAgo(-3),
        hoursPerDay: 8,
        reason: "Doctor appointment",
        status: TimeOffStatus.PENDING,
      },
      {
        id: "seed-tor-3",
        userId: priya.id,
        policyId: sickPolicy.id,
        startDate: daysAgo(2),
        endDate: daysAgo(2),
        hoursPerDay: 8,
        reason: "Sick",
        status: TimeOffStatus.APPROVED,
        reviewedById: admin.id,
        reviewedAt: daysAgo(2),
      },
    ],
  });

  console.log("Time off created.");

  // ── Customers ─────────────────────────────────────────────────
  type CreatedCustomer = Awaited<ReturnType<typeof prisma.customer.upsert>>;

  const customerData = [
    { id: "seed-cust-1", firstName: "Robert", lastName: "Henderson", companyName: null,            email: "rhenderson@gmail.com",       phone: "5124440001", notes: "Long-time customer since 2019. Always requests Marcus." },
    { id: "seed-cust-2", firstName: "Maria",  lastName: "Gonzalez",  companyName: null,            email: "mariag@yahoo.com",            phone: "5124440002", notes: "Bilingual (Spanish/English). Has 3 units on property." },
    { id: "seed-cust-3", firstName: "James",  lastName: "Kim",       companyName: "Kim Properties LLC", email: "james@kimproperties.com", phone: "5124440003", notes: "Commercial landlord. 12 rental units, quarterly PM contract." },
    { id: "seed-cust-4", firstName: "Susan",  lastName: "Blake",     companyName: null,            email: "sblake@outlook.com",          phone: "5124440004", notes: "Prefers morning appointments. Has 2 dogs." },
    { id: "seed-cust-5", firstName: "David",  lastName: "Torres",    companyName: "Torres Auto Repair", email: "dtorres@torresauto.com", phone: "5124440005", notes: "Commercial. Shop needs strong cooling for summer." },
    { id: "seed-cust-6", firstName: "Angela", lastName: "Chen",      companyName: null,            email: "achen@gmail.com",             phone: "5124440006", notes: "New customer, referred by Robert Henderson." },
    { id: "seed-cust-7", firstName: "Mike",   lastName: "Okonkwo",   companyName: null,            email: "mikeo@hotmail.com",           phone: "5124440007", notes: "New construction install completed April 2025." },
    { id: "seed-cust-8", firstName: "Linda",  lastName: "Reyes",     companyName: "Reyes Dental",  email: "lreyes@reyesdental.com",     phone: "5124440008", notes: "Dental office. Critical cooling — cannot have downtime." },
  ];

  const customers: CreatedCustomer[] = [];
  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, companyId: company.id, source: "REFERRAL" },
    });
    customers.push(cust);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [henderson, gonzalez, kim, blake, torres, chen, okonkwo, reyesDental] = customers as [CreatedCustomer, CreatedCustomer, CreatedCustomer, CreatedCustomer, CreatedCustomer, CreatedCustomer, CreatedCustomer, CreatedCustomer];
  console.log("Customers created.");

  // ── Service Addresses ────────────────────────────────────────
  const addrData = [
    { id: "seed-addr-1",  customerId: henderson.id,   label: "Home",       line1: "4201 Duval St",          city: "Austin", state: "TX", zip: "78751", lat: 30.312, lng: -97.726, isPrimary: true },
    { id: "seed-addr-2",  customerId: gonzalez.id,    label: "Home",       line1: "8832 Research Blvd",     city: "Austin", state: "TX", zip: "78758", lat: 30.377, lng: -97.715, isPrimary: true },
    { id: "seed-addr-3",  customerId: kim.id,         label: "Property 1", line1: "2200 S Congress Ave",    city: "Austin", state: "TX", zip: "78704", lat: 30.239, lng: -97.750, isPrimary: true },
    { id: "seed-addr-4",  customerId: kim.id,         label: "Property 2", line1: "5400 Burnet Rd",         city: "Austin", state: "TX", zip: "78756", lat: 30.334, lng: -97.738, isPrimary: false },
    { id: "seed-addr-5",  customerId: blake.id,       label: "Home",       line1: "312 Barton Springs Rd",  city: "Austin", state: "TX", zip: "78704", lat: 30.260, lng: -97.765, isPrimary: true },
    { id: "seed-addr-6",  customerId: torres.id,      label: "Shop",       line1: "9901 N Lamar Blvd",      city: "Austin", state: "TX", zip: "78753", lat: 30.381, lng: -97.695, isPrimary: true },
    { id: "seed-addr-7",  customerId: chen.id,        label: "Home",       line1: "1850 S Lamar Blvd #302", city: "Austin", state: "TX", zip: "78704", lat: 30.250, lng: -97.766, isPrimary: true },
    { id: "seed-addr-8",  customerId: okonkwo.id,     label: "Home",       line1: "14022 Flat Top Ranch Rd", city: "Austin", state: "TX", zip: "78732", lat: 30.406, lng: -97.884, isPrimary: true },
    { id: "seed-addr-9",  customerId: reyesDental.id, label: "Office",     line1: "3801 N Capital of Texas Hwy", city: "Austin", state: "TX", zip: "78746", lat: 30.298, lng: -97.804, isPrimary: true },
  ];

  const addresses: Awaited<ReturnType<typeof prisma.serviceAddress.upsert>>[] = [];
  for (const a of addrData) {
    const addr = await prisma.serviceAddress.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
    addresses.push(addr);
  }

  type SA = Awaited<ReturnType<typeof prisma.serviceAddress.upsert>>;
  const [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] = addresses as [SA, SA, SA, SA, SA, SA, SA, SA, SA];
  console.log("Addresses created.");

  // ── Assets ───────────────────────────────────────────────────
  const assetData = [
    { id: "seed-asset-1", customerId: henderson.id, addressId: addr1.id, type: AssetType.AC_UNIT,    make: "Carrier",  model: "24ACC636A003", serialNumber: "4320C12345", tonnage: 3.0, seerRating: 16, installDate: new Date("2019-06-15"), warrantyExpires: new Date("2029-06-15"), lastServiceDate: daysAgo(180) },
    { id: "seed-asset-2", customerId: henderson.id, addressId: addr1.id, type: AssetType.FURNACE,    make: "Carrier",  model: "58TP080-12",   serialNumber: "4320F54321", installDate: new Date("2019-06-15"), warrantyExpires: new Date("2029-06-15") },
    { id: "seed-asset-3", customerId: gonzalez.id,  addressId: addr2.id, type: AssetType.AC_UNIT,    make: "Lennox",   model: "XC21-036",     serialNumber: "5819L11111", tonnage: 3.0, seerRating: 21, installDate: new Date("2021-03-10") },
    { id: "seed-asset-4", customerId: gonzalez.id,  addressId: addr2.id, type: AssetType.MINI_SPLIT, make: "Mitsubishi", model: "MUZ-GL12NA", serialNumber: "9921M22222", installDate: new Date("2022-08-01") },
    { id: "seed-asset-5", customerId: kim.id,       addressId: addr3.id, type: AssetType.AC_UNIT,    make: "Trane",    model: "XR15",         serialNumber: "7723T33333", tonnage: 4.0, seerRating: 15, installDate: new Date("2018-05-20"), lastServiceDate: daysAgo(90) },
    { id: "seed-asset-6", customerId: blake.id,     addressId: addr5.id, type: AssetType.AC_UNIT,    make: "Goodman",  model: "GSX160361",    serialNumber: "6622G44444", tonnage: 3.0, seerRating: 16, installDate: new Date("2020-07-12") },
    { id: "seed-asset-7", customerId: okonkwo.id,   addressId: addr8.id, type: AssetType.AC_UNIT,    make: "Carrier",  model: "24ACC648A003", serialNumber: "2524C55555", tonnage: 4.0, seerRating: 16, installDate: new Date("2025-01-15"), warrantyExpires: new Date("2030-01-15"), condition: "New" },
    { id: "seed-asset-8", customerId: reyesDental.id, addressId: addr9.id, type: AssetType.AC_UNIT,  make: "Lennox",   model: "XC21-060",     serialNumber: "4420L66666", tonnage: 5.0, seerRating: 21, installDate: new Date("2022-02-28"), notes: "Critical — dental office, cannot go down during business hours" },
  ];

  for (const a of assetData) {
    await prisma.asset.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, companyId: company.id },
    });
  }
  console.log("Assets created.");

  // ── Work Orders ──────────────────────────────────────────────
  // counter helper
  let woNum = 1;
  const nextNum = () => woNum++;

  async function upsertWO(id: string, data: Parameters<typeof prisma.workOrder.upsert>[0]["create"]) {
    return prisma.workOrder.upsert({ where: { id }, update: {}, create: { id, ...data } });
  }

  const wo1 = await upsertWO("seed-wo-1", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: henderson.id, serviceAddressId: addr1.id, assetId: "seed-asset-1",
    type: WorkOrderType.REPAIR, status: WorkOrderStatus.COMPLETE, priority: Priority.NORMAL,
    description: "AC not cooling adequately. Customer reports warm air coming from vents.",
    scheduledStart: daysAgo(10, 9), completedAt: daysAgo(10, 12),
    internalNotes: "Found low refrigerant. Added 1.5 lbs R-410A. Checked for leaks — none found.",
  });

  const wo2 = await upsertWO("seed-wo-2", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: gonzalez.id, serviceAddressId: addr2.id, assetId: "seed-asset-3",
    type: WorkOrderType.PREVENTIVE_MAINTENANCE, status: WorkOrderStatus.COMPLETE, priority: Priority.NORMAL,
    description: "Annual spring tune-up and filter replacement.",
    scheduledStart: daysAgo(8, 10), completedAt: daysAgo(8, 13),
  });

  const wo3 = await upsertWO("seed-wo-3", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: kim.id, serviceAddressId: addr3.id, assetId: "seed-asset-5",
    type: WorkOrderType.PREVENTIVE_MAINTENANCE, status: WorkOrderStatus.INVOICED, priority: Priority.NORMAL,
    description: "Quarterly PM for rental property HVAC units. Check 4 units.",
    scheduledStart: daysAgo(7, 8), completedAt: daysAgo(7, 14),
  });

  const wo4 = await upsertWO("seed-wo-4", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: blake.id, serviceAddressId: addr5.id, assetId: "seed-asset-6",
    type: WorkOrderType.REPAIR, status: WorkOrderStatus.COMPLETE, priority: Priority.HIGH,
    description: "Unit tripping breaker repeatedly. No cooling.",
    scheduledStart: daysAgo(5, 13), completedAt: daysAgo(5, 16),
    internalNotes: "Replaced capacitor and contactor. Cleaned condenser coils.",
  });

  const wo5 = await upsertWO("seed-wo-5", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: torres.id, serviceAddressId: addr6.id,
    type: WorkOrderType.REPAIR, status: WorkOrderStatus.IN_PROGRESS, priority: Priority.HIGH,
    description: "Commercial AC unit not keeping up. Shop reaching 90°F during afternoon.",
    scheduledStart: daysAgo(0, 8),
    internalNotes: "Tech on site. Checking refrigerant charge and ductwork.",
  });

  const wo6 = await upsertWO("seed-wo-6", {
    companyId: company.id, number: nextNum(), createdByUserId: admin.id,
    customerId: reyesDental.id, serviceAddressId: addr9.id, assetId: "seed-asset-8",
    type: WorkOrderType.EMERGENCY, status: WorkOrderStatus.DISPATCHED, priority: Priority.EMERGENCY,
    description: "EMERGENCY: AC completely down. Dental office at 84°F. Need same-day service.",
    scheduledStart: daysAgo(0, 14),
  });

  const wo7 = await upsertWO("seed-wo-7", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: chen.id, serviceAddressId: addr7.id,
    type: WorkOrderType.REPAIR, status: WorkOrderStatus.SCHEDULED, priority: Priority.NORMAL,
    description: "Mini-split in bedroom dripping water. Possible drain line clog.",
    scheduledStart: daysAgo(-2, 10),
  });

  const wo8 = await upsertWO("seed-wo-8", {
    companyId: company.id, number: nextNum(), createdByUserId: admin.id,
    customerId: okonkwo.id, serviceAddressId: addr8.id, assetId: "seed-asset-7",
    type: WorkOrderType.NEW_INSTALLATION, status: WorkOrderStatus.PAID, priority: Priority.NORMAL,
    description: "New construction install — 4-ton Carrier 24ACC648 + air handler + 500 ft ductwork.",
    scheduledStart: new Date("2025-01-13T08:00:00"),
    completedAt: new Date("2025-01-15T17:00:00"),
    internalNotes: "3-day installation. Passed city inspection 01/20/2025.",
  });

  const wo9 = await upsertWO("seed-wo-9", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: henderson.id, serviceAddressId: addr1.id, assetId: "seed-asset-1",
    type: WorkOrderType.INSPECTION, status: WorkOrderStatus.SCHEDULED, priority: Priority.LOW,
    description: "Annual fall inspection and tune-up.",
    scheduledStart: daysAgo(-5, 9),
  });

  const wo10 = await upsertWO("seed-wo-10", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: kim.id, serviceAddressId: addr4.id,
    type: WorkOrderType.REPAIR, status: WorkOrderStatus.NEW, priority: Priority.NORMAL,
    description: "Tenant reporting no heat. Furnace not igniting.",
  });

  const wo11 = await upsertWO("seed-wo-11", {
    companyId: company.id, number: nextNum(), createdByUserId: dispatcher.id,
    customerId: gonzalez.id, serviceAddressId: addr2.id, assetId: "seed-asset-4",
    type: WorkOrderType.REPAIR, status: WorkOrderStatus.COMPLETE, priority: Priority.NORMAL,
    description: "Mini-split remote not responding, unit running continuously.",
    scheduledStart: daysAgo(14, 11), completedAt: daysAgo(14, 13),
    internalNotes: "Replaced control board. Tested all modes — OK.",
  });

  const wo12 = await upsertWO("seed-wo-12", {
    companyId: company.id, number: nextNum(), createdByUserId: admin.id,
    customerId: blake.id, serviceAddressId: addr5.id,
    type: WorkOrderType.ESTIMATE_ONLY, status: WorkOrderStatus.COMPLETE, priority: Priority.LOW,
    description: "Customer requesting estimate for full system replacement.",
    scheduledStart: daysAgo(12, 14), completedAt: daysAgo(12, 15),
  });

  console.log("Work orders created.");

  // ── Assignments ──────────────────────────────────────────────
  const assignments = [
    { id: "seed-asgn-1",  workOrderId: wo1.id,  userId: marcus.id,  isLead: true },
    { id: "seed-asgn-2",  workOrderId: wo2.id,  userId: darius.id,  isLead: true },
    { id: "seed-asgn-3",  workOrderId: wo3.id,  userId: darius.id,  isLead: true },
    { id: "seed-asgn-4",  workOrderId: wo3.id,  userId: priya.id,   isLead: false },
    { id: "seed-asgn-5",  workOrderId: wo4.id,  userId: marcus.id,  isLead: true },
    { id: "seed-asgn-6",  workOrderId: wo5.id,  userId: marcus.id,  isLead: true },
    { id: "seed-asgn-7",  workOrderId: wo6.id,  userId: priya.id,   isLead: true },
    { id: "seed-asgn-8",  workOrderId: wo7.id,  userId: darius.id,  isLead: true },
    { id: "seed-asgn-9",  workOrderId: wo8.id,  userId: carlos.id,  isLead: true },
    { id: "seed-asgn-10", workOrderId: wo8.id,  userId: tommy.id,   isLead: false },
    { id: "seed-asgn-11", workOrderId: wo9.id,  userId: darius.id,  isLead: true },
    { id: "seed-asgn-12", workOrderId: wo11.id, userId: priya.id,   isLead: true },
    { id: "seed-asgn-13", workOrderId: wo12.id, userId: marcus.id,  isLead: true },
  ];

  for (const a of assignments) {
    await prisma.workOrderAssignment.upsert({
      where: { workOrderId_userId: { workOrderId: a.workOrderId, userId: a.userId } },
      update: {},
      create: a,
    });
  }
  console.log("Assignments created.");

  // ── Time Entries ─────────────────────────────────────────────
  function mins(clockIn: Date, clockOut: Date, breakMins = 0) {
    const total = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMins;
    const reg = Math.min(total, 480);
    const ot = total > 480 ? Math.min(total - 480, 120) : 0;
    const dt = total > 600 ? total - 600 : 0;
    return { totalMinutes: total, regularMinutes: reg, overtimeMinutes: ot, doubleTimeMinutes: dt };
  }

  // Approved entries (older)
  const approvedEntries = [
    // Marcus — WO1 (10 days ago)
    { id: "seed-te-1", userId: marcus.id, workOrderId: wo1.id, costCodeId: svcCode.id,
      clockInAt: daysAgo(10, 8, 0), clockOutAt: daysAgo(10, 12, 30), breakMinutes: 0,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(9),
      clockInLat: 30.312, clockInLng: -97.726 },
    // Darius — WO2 (8 days ago)
    { id: "seed-te-2", userId: darius.id, workOrderId: wo2.id, costCodeId: pmCode.id,
      clockInAt: daysAgo(8, 9, 0), clockOutAt: daysAgo(8, 13, 45), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(7),
      clockInLat: 30.377, clockInLng: -97.715 },
    // Darius + Priya — WO3 (7 days ago, multi-tech)
    { id: "seed-te-3", userId: darius.id, workOrderId: wo3.id, costCodeId: pmCode.id,
      clockInAt: daysAgo(7, 8, 0), clockOutAt: daysAgo(7, 14, 0), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(6),
      clockInLat: 30.239, clockInLng: -97.750 },
    { id: "seed-te-4", userId: priya.id, workOrderId: wo3.id, costCodeId: pmCode.id,
      clockInAt: daysAgo(7, 8, 30), clockOutAt: daysAgo(7, 14, 30), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(6),
      clockInLat: 30.239, clockInLng: -97.750 },
    // Marcus — WO4 (5 days ago)
    { id: "seed-te-5", userId: marcus.id, workOrderId: wo4.id, costCodeId: svcCode.id,
      clockInAt: daysAgo(5, 13, 0), clockOutAt: daysAgo(5, 16, 15), breakMinutes: 0,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(4),
      clockInLat: 30.260, clockInLng: -97.765 },
    // Priya — WO11 (14 days ago)
    { id: "seed-te-6", userId: priya.id, workOrderId: wo11.id, costCodeId: svcCode.id,
      clockInAt: daysAgo(14, 10, 0), clockOutAt: daysAgo(14, 13, 0), breakMinutes: 0,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(13),
      clockInLat: 30.377, clockInLng: -97.715 },
    // Marcus — WO12 estimate visit (12 days ago)
    { id: "seed-te-7", userId: marcus.id, workOrderId: wo12.id, costCodeId: inspCode.id,
      clockInAt: daysAgo(12, 14, 0), clockOutAt: daysAgo(12, 15, 30), breakMinutes: 0,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: daysAgo(11),
      clockInLat: 30.260, clockInLng: -97.765 },
    // Carlos + Tommy — WO8 install (Jan 13-15, 3 days × 2 techs = 6 entries)
    { id: "seed-te-8", userId: carlos.id, workOrderId: wo8.id, costCodeId: instCode.id,
      clockInAt: new Date("2025-01-13T07:30:00"), clockOutAt: new Date("2025-01-13T18:00:00"), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: new Date("2025-01-16"),
      clockInLat: 30.406, clockInLng: -97.884 },
    { id: "seed-te-9", userId: tommy.id, workOrderId: wo8.id, costCodeId: instCode.id,
      clockInAt: new Date("2025-01-13T07:30:00"), clockOutAt: new Date("2025-01-13T18:00:00"), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: new Date("2025-01-16"),
      clockInLat: 30.406, clockInLng: -97.884 },
    { id: "seed-te-10", userId: carlos.id, workOrderId: wo8.id, costCodeId: instCode.id,
      clockInAt: new Date("2025-01-14T07:30:00"), clockOutAt: new Date("2025-01-14T19:00:00"), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: new Date("2025-01-16"),
      clockInLat: 30.406, clockInLng: -97.884 },
    { id: "seed-te-11", userId: tommy.id, workOrderId: wo8.id, costCodeId: instCode.id,
      clockInAt: new Date("2025-01-14T07:30:00"), clockOutAt: new Date("2025-01-14T19:00:00"), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: new Date("2025-01-16"),
      clockInLat: 30.406, clockInLng: -97.884 },
    { id: "seed-te-12", userId: carlos.id, workOrderId: wo8.id, costCodeId: instCode.id,
      clockInAt: new Date("2025-01-15T07:30:00"), clockOutAt: new Date("2025-01-15T17:00:00"), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: new Date("2025-01-16"),
      clockInLat: 30.406, clockInLng: -97.884 },
    { id: "seed-te-13", userId: tommy.id, workOrderId: wo8.id, costCodeId: instCode.id,
      clockInAt: new Date("2025-01-15T07:30:00"), clockOutAt: new Date("2025-01-15T17:00:00"), breakMinutes: 30,
      status: TimeEntryStatus.APPROVED, approvedById: admin.id, approvedAt: new Date("2025-01-16"),
      clockInLat: 30.406, clockInLng: -97.884 },
  ];

  // Pending entries (recent, needs approval)
  const pendingEntries = [
    // Marcus — WO5 today (active shift)
    { id: "seed-te-14", userId: marcus.id, workOrderId: wo5.id, costCodeId: svcCode.id,
      clockInAt: daysAgo(0, 8, 0), clockOutAt: daysAgo(0, 11, 30), breakMinutes: 0,
      status: TimeEntryStatus.PENDING,
      clockInLat: 30.381, clockInLng: -97.695 },
    // Darius — yesterday
    { id: "seed-te-15", userId: darius.id, workOrderId: null, costCodeId: svcCode.id,
      clockInAt: daysAgo(1, 7, 30), clockOutAt: daysAgo(1, 16, 0), breakMinutes: 30,
      status: TimeEntryStatus.PENDING,
      clockInLat: 30.312, clockInLng: -97.726 },
    // Priya — yesterday
    { id: "seed-te-16", userId: priya.id, workOrderId: null, costCodeId: svcCode.id,
      clockInAt: daysAgo(1, 8, 0), clockOutAt: daysAgo(1, 17, 30), breakMinutes: 30,
      status: TimeEntryStatus.PENDING,
      clockInLat: 30.298, clockInLng: -97.804 },
    // Tommy — yesterday, long day (OT)
    { id: "seed-te-17", userId: tommy.id, workOrderId: null, costCodeId: instCode.id,
      clockInAt: daysAgo(1, 7, 0), clockOutAt: daysAgo(1, 19, 0), breakMinutes: 30,
      status: TimeEntryStatus.PENDING,
      clockInLat: 30.406, clockInLng: -97.884 },
    // Marcus — 2 days ago
    { id: "seed-te-18", userId: marcus.id, workOrderId: null, costCodeId: svcCode.id,
      clockInAt: daysAgo(2, 8, 0), clockOutAt: daysAgo(2, 17, 0), breakMinutes: 30,
      status: TimeEntryStatus.PENDING,
      clockInLat: 30.260, clockInLng: -97.765 },
    // Carlos — 2 days ago
    { id: "seed-te-19", userId: carlos.id, workOrderId: null, costCodeId: instCode.id,
      clockInAt: daysAgo(2, 7, 30), clockOutAt: daysAgo(2, 18, 0), breakMinutes: 30,
      status: TimeEntryStatus.PENDING,
      clockInLat: 30.406, clockInLng: -97.884 },
  ];

  // Active entry — Priya currently clocked in on emergency WO6
  const activeEntries = [
    { id: "seed-te-20", userId: priya.id, workOrderId: wo6.id, costCodeId: emrgCode.id,
      clockInAt: daysAgo(0, 14, 0), clockOutAt: null, breakMinutes: 0,
      status: TimeEntryStatus.ACTIVE,
      clockInLat: 30.298, clockInLng: -97.804 },
  ];

  // Rejected entry (example)
  const rejectedEntries = [
    { id: "seed-te-21", userId: darius.id, workOrderId: null, costCodeId: svcCode.id,
      clockInAt: daysAgo(3, 6, 0), clockOutAt: daysAgo(3, 7, 0), breakMinutes: 0,
      status: TimeEntryStatus.REJECTED,
      note: "Rejected: Accidental clock-in before shift.",
      clockInLat: 30.377, clockInLng: -97.715 },
  ];

  for (const e of [...approvedEntries, ...pendingEntries, ...activeEntries, ...rejectedEntries]) {
    const clockOut = e.clockOutAt ? new Date(e.clockOutAt) : null;
    const clockIn = new Date(e.clockInAt);
    const calculated = clockOut ? mins(clockIn, clockOut, e.breakMinutes) : { totalMinutes: null, regularMinutes: null, overtimeMinutes: null, doubleTimeMinutes: null };

    await prisma.timeEntry.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        companyId: company.id,
        userId: e.userId,
        workOrderId: e.workOrderId ?? undefined,
        costCodeId: e.costCodeId,
        clockInAt: clockIn,
        clockOutAt: clockOut ?? undefined,
        breakMinutes: e.breakMinutes,
        status: e.status,
        approvedById: (e as { approvedById?: string }).approvedById,
        approvedAt: (e as { approvedAt?: Date }).approvedAt,
        note: (e as { note?: string }).note,
        clockInLat: e.clockInLat,
        clockInLng: e.clockInLng,
        ...calculated,
      },
    });
  }
  console.log("Time entries created.");

  // ── Invoices ─────────────────────────────────────────────────
  const inv1 = await prisma.invoice.upsert({
    where: { id: "seed-inv-1" },
    update: {},
    create: {
      id: "seed-inv-1",
      companyId: company.id,
      workOrderId: wo1.id,
      customerId: henderson.id,
      number: 1001,
      status: InvoiceStatus.PAID,
      dueDate: daysAgo(0),
      paidAt: daysAgo(8),
      taxRate: 0.0825,
      notes: "Thank you for your business!",
    },
  });

  await prisma.invoiceLineItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-ili-1", invoiceId: inv1.id, type: LineItemType.LABOR, description: "AC Service — Diagnostic & Refrigerant Check", quantity: 2.5, unitPrice: 95.00, total: 237.50, sortOrder: 0 },
      { id: "seed-ili-2", invoiceId: inv1.id, type: LineItemType.PART,  description: "R-410A Refrigerant (1.5 lbs)",                quantity: 1.5, unitPrice: 65.00, total: 97.50,  sortOrder: 1 },
      { id: "seed-ili-3", invoiceId: inv1.id, type: LineItemType.FEE,   description: "Service Call Fee",                           quantity: 1,   unitPrice: 89.00, total: 89.00,  sortOrder: 2 },
    ],
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv1.id,
      method: PaymentMethod.CARD_ONLINE,
      amount: 455.93, // (237.50 + 97.50 + 89.00) * 1.0825
      paidAt: daysAgo(8),
      note: "Online payment via Stripe",
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { id: "seed-inv-2" },
    update: {},
    create: {
      id: "seed-inv-2",
      companyId: company.id,
      workOrderId: wo3.id,
      customerId: kim.id,
      number: 1002,
      status: InvoiceStatus.SENT,
      dueDate: daysAgo(-15),
      taxRate: 0.0825,
      notes: "Quarterly PM — 4 units serviced at 2200 S Congress Ave.",
    },
  });

  await prisma.invoiceLineItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-ili-4", invoiceId: inv2.id, type: LineItemType.LABOR, description: "Preventive Maintenance — 4 Units (2 techs × 6 hrs)", quantity: 12, unitPrice: 85.00, total: 1020.00, sortOrder: 0 },
      { id: "seed-ili-5", invoiceId: inv2.id, type: LineItemType.PART,  description: "Filters (4-pack, 20×25×1)",                          quantity: 4,  unitPrice: 18.00, total: 72.00,   sortOrder: 1 },
      { id: "seed-ili-6", invoiceId: inv2.id, type: LineItemType.FEE,   description: "Commercial PM Inspection Fee",                        quantity: 1,  unitPrice: 150.00, total: 150.00, sortOrder: 2 },
    ],
  });

  const inv3 = await prisma.invoice.upsert({
    where: { id: "seed-inv-3" },
    update: {},
    create: {
      id: "seed-inv-3",
      companyId: company.id,
      workOrderId: wo8.id,
      customerId: okonkwo.id,
      number: 1003,
      status: InvoiceStatus.PAID,
      dueDate: new Date("2025-01-30"),
      paidAt: new Date("2025-01-28"),
      taxRate: 0.0825,
    },
  });

  await prisma.invoiceLineItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-ili-7",  invoiceId: inv3.id, type: LineItemType.PART,  description: "Carrier 24ACC648A003 4-Ton AC Unit",        quantity: 1,   unitPrice: 2850.00, total: 2850.00, sortOrder: 0 },
      { id: "seed-ili-8",  invoiceId: inv3.id, type: LineItemType.PART,  description: "Carrier Air Handler (AHU)",                  quantity: 1,   unitPrice: 1200.00, total: 1200.00, sortOrder: 1 },
      { id: "seed-ili-9",  invoiceId: inv3.id, type: LineItemType.LABOR, description: "Installation Labor (2 techs × 3 days)",      quantity: 48,  unitPrice: 75.00,   total: 3600.00, sortOrder: 2 },
      { id: "seed-ili-10", invoiceId: inv3.id, type: LineItemType.PART,  description: "Ductwork & Materials (500 ft)",               quantity: 500, unitPrice: 4.50,    total: 2250.00, sortOrder: 3 },
      { id: "seed-ili-11", invoiceId: inv3.id, type: LineItemType.FEE,   description: "Permit & Inspection Coordination Fee",        quantity: 1,   unitPrice: 250.00,  total: 250.00,  sortOrder: 4 },
    ],
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv3.id,
      method: PaymentMethod.CHECK,
      amount: 10920.38,
      reference: "CHK-4421",
      paidAt: new Date("2025-01-28"),
      note: "Check payment received in office",
    },
  });

  console.log("Invoices and payments created.");

  // ── Parts / Inventory ────────────────────────────────────────
  const parts = await Promise.all([
    prisma.part.upsert({ where: { id: "seed-part-1" }, update: {}, create: { id: "seed-part-1", companyId: company.id, name: "R-410A Refrigerant (25 lb jug)", sku: "REF-410A-25", unitPrice: 180.00, unit: "jug" } }),
    prisma.part.upsert({ where: { id: "seed-part-2" }, update: {}, create: { id: "seed-part-2", companyId: company.id, name: "Capacitor 35/5 MFD 370V",          sku: "CAP-35-5-370", unitPrice: 22.00, unit: "each" } }),
    prisma.part.upsert({ where: { id: "seed-part-3" }, update: {}, create: { id: "seed-part-3", companyId: company.id, name: "Contactor 2-Pole 40A",              sku: "CONT-2P-40A",  unitPrice: 28.00, unit: "each" } }),
    prisma.part.upsert({ where: { id: "seed-part-4" }, update: {}, create: { id: "seed-part-4", companyId: company.id, name: "Air Filter 20x25x1 MERV 8",         sku: "FILT-20251",   unitPrice: 8.50,  unit: "each" } }),
    prisma.part.upsert({ where: { id: "seed-part-5" }, update: {}, create: { id: "seed-part-5", companyId: company.id, name: "Thermostat — Honeywell T6 Pro",      sku: "THER-T6PRO",   unitPrice: 65.00, unit: "each" } }),
    prisma.part.upsert({ where: { id: "seed-part-6" }, update: {}, create: { id: "seed-part-6", companyId: company.id, name: "Condensate Drain Pan Tabs",          sku: "DRAIN-TAB-30", unitPrice: 12.00, unit: "pack" } }),
  ]);

  type Pt = Awaited<ReturnType<typeof prisma.part.upsert>>;
  const [, cap, cont] = parts as [Pt, Pt, Pt, Pt, Pt, Pt];

  await prisma.warehouseStock.createMany({
    skipDuplicates: true,
    data: [
      { partId: parts[0].id, quantity: 4,  location: "Warehouse Shelf A1" },
      { partId: cap.id,      quantity: 24, location: "Warehouse Shelf B2" },
      { partId: cont.id,     quantity: 12, location: "Warehouse Shelf B3" },
      { partId: parts[3].id, quantity: 48, location: "Warehouse Shelf C1" },
      { partId: parts[4].id, quantity: 6,  location: "Warehouse Shelf D1" },
      { partId: parts[5].id, quantity: 20, location: "Warehouse Shelf C2" },
    ],
  });

  // Truck stock for Marcus
  await prisma.truckStock.createMany({
    skipDuplicates: true,
    data: [
      { partId: parts[0].id, techId: marcus.id, quantity: 1 },
      { partId: cap.id,      techId: marcus.id, quantity: 4 },
      { partId: cont.id,     techId: marcus.id, quantity: 3 },
      { partId: parts[3].id, techId: marcus.id, quantity: 6 },
    ],
  });

  console.log("Parts and inventory created.");

  // ── Status History ───────────────────────────────────────────
  await prisma.workOrderStatusHistory.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-wosh-1",  workOrderId: wo1.id, fromStatus: null,                       toStatus: WorkOrderStatus.NEW,       changedById: dispatcher.id, changedAt: daysAgo(12) },
      { id: "seed-wosh-2",  workOrderId: wo1.id, fromStatus: WorkOrderStatus.NEW,         toStatus: WorkOrderStatus.SCHEDULED, changedById: dispatcher.id, changedAt: daysAgo(11) },
      { id: "seed-wosh-3",  workOrderId: wo1.id, fromStatus: WorkOrderStatus.SCHEDULED,   toStatus: WorkOrderStatus.DISPATCHED,changedById: dispatcher.id, changedAt: daysAgo(10, 7) },
      { id: "seed-wosh-4",  workOrderId: wo1.id, fromStatus: WorkOrderStatus.DISPATCHED,  toStatus: WorkOrderStatus.EN_ROUTE,  changedById: marcus.id,     changedAt: daysAgo(10, 7, 45) },
      { id: "seed-wosh-5",  workOrderId: wo1.id, fromStatus: WorkOrderStatus.EN_ROUTE,    toStatus: WorkOrderStatus.IN_PROGRESS,changedById: marcus.id,    changedAt: daysAgo(10, 8, 10) },
      { id: "seed-wosh-6",  workOrderId: wo1.id, fromStatus: WorkOrderStatus.IN_PROGRESS, toStatus: WorkOrderStatus.COMPLETE,  changedById: marcus.id,     changedAt: daysAgo(10, 12, 30) },
      { id: "seed-wosh-7",  workOrderId: wo5.id, fromStatus: null,                        toStatus: WorkOrderStatus.NEW,       changedById: admin.id,      changedAt: daysAgo(1) },
      { id: "seed-wosh-8",  workOrderId: wo5.id, fromStatus: WorkOrderStatus.NEW,         toStatus: WorkOrderStatus.SCHEDULED, changedById: dispatcher.id, changedAt: daysAgo(1) },
      { id: "seed-wosh-9",  workOrderId: wo5.id, fromStatus: WorkOrderStatus.SCHEDULED,   toStatus: WorkOrderStatus.DISPATCHED,changedById: dispatcher.id, changedAt: daysAgo(0, 7) },
      { id: "seed-wosh-10", workOrderId: wo5.id, fromStatus: WorkOrderStatus.DISPATCHED,  toStatus: WorkOrderStatus.EN_ROUTE,  changedById: marcus.id,     changedAt: daysAgo(0, 7, 45) },
      { id: "seed-wosh-11", workOrderId: wo5.id, fromStatus: WorkOrderStatus.EN_ROUTE,    toStatus: WorkOrderStatus.IN_PROGRESS,changedById: marcus.id,    changedAt: daysAgo(0, 8, 15) },
      { id: "seed-wosh-12", workOrderId: wo6.id, fromStatus: null,                        toStatus: WorkOrderStatus.NEW,       changedById: admin.id,      changedAt: daysAgo(0, 13) },
      { id: "seed-wosh-13", workOrderId: wo6.id, fromStatus: WorkOrderStatus.NEW,         toStatus: WorkOrderStatus.DISPATCHED,changedById: dispatcher.id, changedAt: daysAgo(0, 13, 30) },
      { id: "seed-wosh-14", workOrderId: wo8.id, fromStatus: null,                        toStatus: WorkOrderStatus.NEW,       changedById: admin.id,      changedAt: new Date("2025-01-10") },
      { id: "seed-wosh-15", workOrderId: wo8.id, fromStatus: WorkOrderStatus.NEW,         toStatus: WorkOrderStatus.COMPLETE,  changedById: carlos.id,     changedAt: new Date("2025-01-15T17:00:00") },
      { id: "seed-wosh-16", workOrderId: wo8.id, fromStatus: WorkOrderStatus.COMPLETE,    toStatus: WorkOrderStatus.INVOICED,  changedById: admin.id,      changedAt: new Date("2025-01-17") },
      { id: "seed-wosh-17", workOrderId: wo8.id, fromStatus: WorkOrderStatus.INVOICED,    toStatus: WorkOrderStatus.PAID,      changedById: admin.id,      changedAt: new Date("2025-01-28") },
    ],
  });

  // ── QB Desktop Integration record ────────────────────────────
  await prisma.integration.upsert({
    where: { companyId_type: { companyId: company.id, type: "QUICKBOOKS_DESKTOP" } },
    update: {},
    create: {
      companyId: company.id,
      type: "QUICKBOOKS_DESKTOP",
      status: "DISCONNECTED",
      metadata: {
        qbwcVersion: null,
        lastConnectedAt: null,
        companyFile: null,
        setupInstructions: "Download QB Web Connector from the Integrations page and import the .qwc file.",
      },
    },
  });

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log("Hub login:       http://localhost:3000");
  console.log("  owner@primeaircondition.com / password123");
  console.log("  admin@primeaircondition.com / password123");
  console.log("  dispatch@primeaircondition.com / password123");
  console.log("Timeclock login: http://localhost:3001");
  console.log("  Phone: 5121110001 (Marcus)  / 5121110002 (Carlos)");
  console.log("  Phone: 5121110003 (Darius)  / 5121110004 (Priya)");
  console.log("  Phone: 5121110005 (Tommy)");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
