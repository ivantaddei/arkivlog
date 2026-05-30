/**
 * Demo mode bypasses SIWE auth and the filesystem-backed keystore so the app
 * can run on serverless platforms (Vercel) where the disk is read-only.
 *
 * When enabled, the dashboard becomes a public read-only view of the audit
 * trail belonging to a single pre-baked "demo" wallet, and the SDK's API key
 * is hardcoded via env vars instead of being issued per wallet.
 *
 * Local development leaves this OFF; the full SIWE + keystore flow runs as-is.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export interface DemoConfig {
  wallet: `0x${string}`;
  apiKey: string;
  projectKey: string;
  projectName: string;
}

/**
 * Reads the demo wallet / api key / project key from env. Throws if any are
 * missing — fail fast at request time rather than serving a half-broken demo.
 */
export function getDemoConfig(): DemoConfig {
  const wallet = process.env.DEMO_OWNER_WALLET;
  const apiKey = process.env.DEMO_API_KEY;
  const projectKey = process.env.DEMO_PROJECT_KEY;
  const projectName = process.env.DEMO_PROJECT_NAME ?? "ArkivLog Public Demo";

  if (!wallet || !wallet.startsWith("0x")) {
    throw new Error("DEMO_MODE enabled but DEMO_OWNER_WALLET is missing");
  }
  if (!apiKey || !apiKey.startsWith("ak_")) {
    throw new Error("DEMO_MODE enabled but DEMO_API_KEY is missing");
  }
  if (!projectKey) {
    throw new Error("DEMO_MODE enabled but DEMO_PROJECT_KEY is missing");
  }

  return {
    wallet: wallet.toLowerCase() as `0x${string}`,
    apiKey,
    projectKey,
    projectName,
  };
}
