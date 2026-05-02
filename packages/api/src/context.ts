import { prisma } from "@primeair/db";

export interface Permissions {
  hubAccess: boolean;
  timeclockAccess: boolean;
  canClockIn: boolean;
  canViewOwnTimecards: boolean;
  canEditTimecards: boolean;
  canApproveTimecards: boolean;
  canAssignWorkOrders: boolean;
  canManageCustomers: boolean;
  canViewReports: boolean;
  canExportPayroll: boolean;
  canManageTeam: boolean;
  canManageAdmin: boolean;
  canManageRoles: boolean;
  canManageBilling: boolean;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  companyId: string;
  roleId: string;
  roleName: string;
  jobType: string;
  permissions: Permissions;
}

export interface AppSession {
  user: SessionUser;
  expires: string;
}

export interface Context {
  session: AppSession | null;
  db: typeof prisma;
  companyId?: string;
  userId?: string;
  roleId?: string;
  roleName?: string;
  permissions?: Permissions;
  jobType?: string;
}

export async function createContext({
  session,
}: {
  session: AppSession | null;
}): Promise<Context> {
  return {
    session,
    db: prisma,
    companyId: session?.user?.companyId,
    userId: session?.user?.id,
    roleId: session?.user?.roleId,
    roleName: session?.user?.roleName,
    permissions: session?.user?.permissions,
    jobType: session?.user?.jobType,
  };
}
