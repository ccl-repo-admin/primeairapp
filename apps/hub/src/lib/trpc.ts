import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@primeair/api";

export const trpc = createTRPCReact<AppRouter>();
