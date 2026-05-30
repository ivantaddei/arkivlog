import {
  createPublicClient,
  createWalletClient,
  http,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { ExpirationTime } from "@arkiv-network/sdk/utils";

/**
 * Project namespace — every entity ArkivLog writes carries this attribute,
 * and every query filters on it. Without it we'd collide with the rest of
 * the Arkiv testnet.
 */
export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "arkivlog-punatech26-v1",
} as const;

if (!PROJECT_ATTRIBUTE.value) {
  throw new Error("PROJECT_ATTRIBUTE.value must be set");
}

/**
 * Wallet that signs every write to Arkiv. It becomes `$creator` on every
 * AuditEvent, which is immutable — that's how we prove a log was genuinely
 * produced by the ArkivLog backend and not forged by someone else.
 */
const SERVICE_PRIVATE_KEY = process.env.ARKIV_SERVICE_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const ENTITY_TYPE = {
  PROJECT: "project",
  AUDIT_EVENT: "auditEvent",
} as const;

/** Retention windows differentiated per severity (rubric: differentiated expiresIn). */
export const RETENTION = {
  LOW: ExpirationTime.fromDays(7),
  MEDIUM: ExpirationTime.fromDays(30),
  HIGH: ExpirationTime.fromDays(90),
  CRITICAL: ExpirationTime.fromDays(365),
} as const satisfies Record<Severity, number>;

/** Projects live for a year by default — they're the parent entity. */
export const PROJECT_EXPIRATION = ExpirationTime.fromDays(365);

export interface ProjectPayload {
  name: string;
  description?: string;
  ownerWallet: `0x${string}`;
}

export interface AuditEventPayload {
  eventType: string;
  actor: string;
  target?: string;
  action?: string;
  severity: Severity;
  metadata?: Record<string, unknown>;
}

export const publicArkiv = createPublicClient({
  chain: braga,
  transport: http(),
});

let cachedWallet: ReturnType<typeof createWalletClient> | null = null;

/**
 * Server-only — the wallet client signs writes. Throws if the private key
 * isn't configured (e.g. running on the client by mistake).
 */
export function getWalletArkiv() {
  if (cachedWallet) return cachedWallet;
  if (!SERVICE_PRIVATE_KEY) {
    throw new Error(
      "ARKIV_SERVICE_PRIVATE_KEY is not set — cannot write to Arkiv.",
    );
  }
  cachedWallet = createWalletClient({
    chain: braga,
    transport: http(),
    account: privateKeyToAccount(SERVICE_PRIVATE_KEY),
  });
  return cachedWallet;
}

/** Address of the trusted creator wallet — used by queries that need tamper-proof source. */
export function getServiceAddress(): `0x${string}` | null {
  if (!SERVICE_PRIVATE_KEY) return null;
  return privateKeyToAccount(SERVICE_PRIVATE_KEY).address;
}
