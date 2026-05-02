import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { rolesRouter } from "./routers/roles";
import { timeclockRouter } from "./routers/timeclock";
import { locationsRouter } from "./routers/locations";
import { reportsRouter } from "./routers/reports";
import { adminRouter } from "./routers/admin";
import { timeoffRouter } from "./routers/timeoff";
import { costCodesRouter } from "./routers/costCodes";
import { workOrdersRouter } from "./routers/workOrders";
import { customersRouter } from "./routers/customers";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  roles: rolesRouter,
  timeclock: timeclockRouter,
  locations: locationsRouter,
  reports: reportsRouter,
  admin: adminRouter,
  timeoff: timeoffRouter,
  costCodes: costCodesRouter,
  workOrders: workOrdersRouter,
  customers: customersRouter,
});

export type AppRouter = typeof appRouter;
