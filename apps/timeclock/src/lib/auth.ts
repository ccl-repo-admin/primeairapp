import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@primeair/db";
import { authConfig } from "./auth.config";

export async function sendOtp(phone: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    console.warn("Twilio not configured — OTP bypassed (dev mode)");
    return { success: true };
  }

  // Dynamic import keeps Twilio out of the edge runtime bundle
  const twilio = (await import("twilio")).default;
  const client = twilio(accountSid, authToken);
  const formatted = phone.startsWith("+") ? phone : `+1${phone}`;
  await client.verify.v2.services(serviceSid).verifications.create({
    to: formatted,
    channel: "sms",
  });
  return { success: true };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "otp",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const phone = String(credentials.phone).replace(/\D/g, "");
        const code = String(credentials.code);

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (accountSid && authToken && serviceSid) {
          const twilio = (await import("twilio")).default;
          const client = twilio(accountSid, authToken);
          const formatted = `+1${phone}`;
          const check = await client.verify.v2
            .services(serviceSid)
            .verificationChecks.create({ to: formatted, code });
          if (check.status !== "approved") return null;
        } else {
          if (code !== "123456") return null;
        }

        const user = await prisma.user.findFirst({
          where: { phone, isActive: true },
          include: { role: true },
        });
        if (!user) return null;
        if (!user.role.timeclockAccess) return null;

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
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
