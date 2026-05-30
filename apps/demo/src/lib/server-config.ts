/**
 * Server-only flags surfacing whether required env vars are set. The page is
 * a Server Component, so reading these at render time is safe and they're
 * passed to the client banner.
 */

export interface DemoConfigStatus {
  arkivLog: boolean;
  vertex: boolean;
}

function isUsableApiKey(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === "ak_unset" || trimmed === "demo-key") return false;
  if (trimmed.startsWith("ak_") && trimmed.length >= 12) return true;
  return trimmed.length >= 12; // tolerate non-prefixed keys
}

export function getDemoConfigStatus(): DemoConfigStatus {
  const arkivLog = isUsableApiKey(process.env.ARKIVLOG_API_KEY);
  const vertex = Boolean(
    process.env.VERTEX_PROJECT_ID &&
      process.env.VERTEX_CLIENT_EMAIL &&
      process.env.VERTEX_PRIVATE_KEY,
  );
  return { arkivLog, vertex };
}
