import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@primeair/api";
import { auth } from "@/lib/auth";
import type { AppSession } from "@primeair/api";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      return createContext({ session: session as AppSession | null });
    },
  });

export { handler as GET, handler as POST };
