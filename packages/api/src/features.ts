/**
 * Feature flags — controlled entirely by environment variables.
 * Set in Vercel (or .env) and redeploy to toggle. Customers have no UI to change these.
 *
 * Core features default ON  → set FEATURE_X=false to disable
 * Optional features default OFF → set FEATURE_X=true to enable
 */
export const features = {
  // Core — on by default
  timecards:    process.env.FEATURE_TIMECARDS    !== "false",
  workOrders:   process.env.FEATURE_WORK_ORDERS  !== "false",
  customerCRM:  process.env.FEATURE_CUSTOMER_CRM !== "false",
  reports:      process.env.FEATURE_REPORTS      !== "false",

  // Optional — off by default
  purchaseOrders: process.env.FEATURE_PURCHASE_ORDERS === "true",
  estimates:      process.env.FEATURE_ESTIMATES       === "true",
  invoicing:      process.env.FEATURE_INVOICING       === "true",
  dispatch:       process.env.FEATURE_DISPATCH        === "true",
  inventory:      process.env.FEATURE_INVENTORY       === "true",
} as const;

export type Features = typeof features;
