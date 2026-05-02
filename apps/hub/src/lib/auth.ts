import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@primeair/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: String(credentials.email), isActive: true },
          include: { role: true },
        });
        if (!user?.passwordHash) return null;
        if (!user.role.hubAccess) return null;

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email ?? undefined,
          companyId: user.companyId,
          roleId: user.role.id,
          roleName: user.role.name,
          jobType: user.jobType,
          permissions: {
            hubAccess: user.role.hubAccess,
            timeclockAccess: user.role.timeclockAccess,
            canClockIn: user.role.canClockIn,
            canViewOwnTimecards: user.role.canViewOwnTimecards,
            canEditTimecards: user.role.canEditTimecards,
            canApproveTimecards: user.role.canApproveTimecards,
            canAssignWorkOrders: user.role.canAssignWorkOrders,
            canManageCustomers: user.role.canManageCustomers,
            canViewReports: user.role.canViewReports,
            canExportPayroll: user.role.canExportPayroll,
            canManageTeam: user.role.canManageTeam,
            canManageAdmin: user.role.canManageAdmin,
            canManageRoles: user.role.canManageRoles,
            canManageBilling: user.role.canManageBilling,
          },
        };
      },
    }),
  ],
});
