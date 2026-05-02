import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-safe config — no Prisma, no bcrypt. Used by middleware to decode JWT.
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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
      session.user.permissions = token.permissions as Session["user"]["permissions"];
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
