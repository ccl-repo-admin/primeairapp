import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-safe config — no Prisma, no Twilio. Used by middleware to decode JWT.
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      id: "otp",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code: { label: "Code", type: "text" },
      },
      authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = (user as { companyId: string }).companyId;
        token.roleId = (user as { roleId: string }).roleId;
        token.roleName = (user as { roleName: string }).roleName;
        token.jobType = (user as { jobType: string }).jobType;
        token.payType = (user as { payType: string }).payType;
        token.permissions = (user as { permissions: unknown }).permissions;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.companyId = token.companyId as string;
      session.user.roleId = token.roleId as string;
      session.user.roleName = token.roleName as string;
      session.user.jobType = token.jobType as string;
      session.user.payType = token.payType as string;
      session.user.permissions = token.permissions as Session["user"]["permissions"];
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
