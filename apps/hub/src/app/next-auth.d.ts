import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      roleId: string;
      roleName: string;
      jobType: string;
      permissions: {
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
      };
    } & DefaultSession["user"];
  }
}
