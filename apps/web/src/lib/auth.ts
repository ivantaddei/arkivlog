import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import { getDemoConfig, isDemoMode } from "./demo-mode";

const COOKIE_NAME = "arkivlog_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

function getSecret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET ?? "dev-only-secret-change-in-production";
  if (raw === "dev-only-secret-change-in-production") {
    console.warn(
      "[auth] SESSION_SECRET is not set — using a fallback. Sessions are NOT secure for production.",
    );
  }
  return new TextEncoder().encode(raw);
}

interface NonceRecord {
  nonce: string;
  address: `0x${string}`;
  expiresAt: number;
}

const nonces = new Map<string, NonceRecord>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5min

function gcNonces() {
  const now = Date.now();
  for (const [k, v] of nonces) {
    if (v.expiresAt < now) nonces.delete(k);
  }
}

export function generateNonce(address: `0x${string}`): string {
  gcNonces();
  const nonce = crypto.randomBytes(16).toString("hex");
  nonces.set(nonce, {
    nonce,
    address: address.toLowerCase() as `0x${string}`,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });
  return nonce;
}

export function consumeNonce(
  nonce: string,
  address: `0x${string}`,
): boolean {
  gcNonces();
  const record = nonces.get(nonce);
  if (!record) return false;
  if (record.address !== (address.toLowerCase() as `0x${string}`)) return false;
  if (record.expiresAt < Date.now()) {
    nonces.delete(nonce);
    return false;
  }
  nonces.delete(nonce);
  return true;
}

export async function signSession(address: `0x${string}`): Promise<string> {
  return new SignJWT({ address: address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setSubject(address.toLowerCase())
    .sign(getSecret());
}

export async function readSessionAddress(): Promise<`0x${string}` | null> {
  if (isDemoMode()) {
    return getDemoConfig().wallet;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const addr = (payload.address ?? payload.sub) as string | undefined;
    if (!addr || !addr.startsWith("0x")) return null;
    return addr.toLowerCase() as `0x${string}`;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAgeSeconds: SESSION_TTL_SECONDS,
};

export function buildSessionCookieHeader(jwt: string): string {
  const parts = [
    `${COOKIE_NAME}=${jwt}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
