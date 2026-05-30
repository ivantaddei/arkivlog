import type { NextRequest } from "next/server";
import { readSessionAddress } from "@/lib/auth";
import { findByApiKey } from "@/lib/keystore";
import {
  listAuditEvents,
  recordAuditEvent,
  validateInput,
  type ListAuditEventsFilters,
} from "@/lib/arkivlog-service";
import type { Severity } from "@/lib/arkiv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(message: string) {
  return Response.json({ error: message }, { status: 401 });
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function serverError(message: string) {
  return Response.json({ error: message }, { status: 500 });
}

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/**
 * Used by external clients (the SDK in apps/demo). Authentication is the
 * Bearer API key issued via /dashboard. The key resolves to a wallet via the
 * keystore, and that wallet becomes the `$owner` of the new AuditEvent.
 *
 * Anything the caller puts in `ownerWallet` is ignored — clients cannot
 * impersonate other tenants.
 */
export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return unauthorized("Missing API key (Bearer token)");
  }
  const record = await findByApiKey(token);
  if (!record) {
    return unauthorized("Invalid API key");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body must be valid JSON");
  }

  let input;
  try {
    input = validateInput(body);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Invalid input");
  }

  try {
    const result = await recordAuditEvent({
      ...input,
      // Server-side enforcement: the apiKey's wallet IS the owner, period.
      ownerWallet: record.wallet,
      // Link every event to the tenant's Project so we get a proper FK.
      projectKey: input.projectKey ?? record.projectKey,
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/logs] failed:", err);
    return serverError(err instanceof Error ? err.message : "Internal error");
  }
}

const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function parseFilters(
  req: NextRequest,
  walletFromSession: `0x${string}`,
): ListAuditEventsFilters | { error: string } {
  const params = req.nextUrl.searchParams;
  const filters: ListAuditEventsFilters = {
    // Hard-locked to the authenticated wallet. Cannot be overridden by client.
    ownerWallet: walletFromSession,
  };

  const severity = params.get("severity");
  if (severity) {
    if (!(SEVERITIES as string[]).includes(severity)) {
      return { error: `severity must be one of ${SEVERITIES.join(", ")}` };
    }
    filters.severity = severity as Severity;
  }

  const eventType = params.get("eventType");
  if (eventType) filters.eventType = eventType;

  const actor = params.get("actor");
  if (actor) filters.actor = actor;

  const sinceRaw = params.get("since");
  if (sinceRaw) {
    const since = Number(sinceRaw);
    if (!Number.isFinite(since)) {
      return { error: "since must be a number (ms since epoch)" };
    }
    filters.sinceMs = since;
  }

  const limitRaw = params.get("limit");
  if (limitRaw) {
    const limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1) {
      return { error: "limit must be a positive integer" };
    }
    filters.limit = limit;
  }

  return filters;
}

/**
 * Auth-gated: requires an active SIWE session cookie. Results are forced to
 * the session wallet via `.ownedBy()` — there is no way to fetch someone
 * else's logs from this endpoint.
 */
export async function GET(req: NextRequest) {
  const address = await readSessionAddress();
  if (!address) {
    return unauthorized("Sign in with your wallet to view your logs");
  }
  const parsed = parseFilters(req, address);
  if ("error" in parsed) {
    return badRequest(parsed.error);
  }
  try {
    const result = await listAuditEvents(parsed);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[GET /api/logs] failed:", err);
    return serverError(err instanceof Error ? err.message : "Internal error");
  }
}
