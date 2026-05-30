/**
 * Public URL of the ArkivLog dashboard, used in UI links from the demo.
 * Set NEXT_PUBLIC_ARKIVLOG_DASHBOARD_URL in production (e.g. on Vercel) to
 * point at the deployed SaaS. Falls back to localhost for dev.
 */
export const ARKIVLOG_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_ARKIVLOG_DASHBOARD_URL ??
  "http://localhost:3100/dashboard";
