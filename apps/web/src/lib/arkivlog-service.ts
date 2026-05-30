import { eq, gt } from "@arkiv-network/sdk/query";
import { jsonToPayload } from "@arkiv-network/sdk/utils";
import {
  ENTITY_TYPE,
  PROJECT_ATTRIBUTE,
  RETENTION,
  getServiceAddress,
  getWalletArkiv,
  publicArkiv,
  type AuditEventPayload,
  type Severity,
} from "./arkiv";

export interface RecordAuditEventInput extends AuditEventPayload {
  /** Optional project entity key (parent FK). */
  projectKey?: string;
  /**
   * Optional end-user wallet that becomes `$owner` after creation. If absent,
   * the service wallet stays as `$owner`. `$creator` is always the service wallet.
   */
  ownerWallet?: `0x${string}`;
}

export interface RecordAuditEventResult {
  entityKey: string;
  txHash: string;
  ownerTransferTxHash?: string;
}

const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as string[]).includes(value);
}

export function validateInput(body: unknown): RecordAuditEventInput {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object");
  }
  const o = body as Record<string, unknown>;
  if (typeof o.eventType !== "string" || !o.eventType) {
    throw new Error("eventType is required");
  }
  if (typeof o.actor !== "string" || !o.actor) {
    throw new Error("actor is required");
  }
  if (!isSeverity(o.severity)) {
    throw new Error(`severity must be one of ${SEVERITIES.join(", ")}`);
  }
  return {
    eventType: o.eventType,
    actor: o.actor,
    severity: o.severity,
    target: typeof o.target === "string" ? o.target : undefined,
    action: typeof o.action === "string" ? o.action : undefined,
    metadata:
      typeof o.metadata === "object" && o.metadata
        ? (o.metadata as Record<string, unknown>)
        : undefined,
    projectKey:
      typeof o.projectKey === "string" ? o.projectKey : undefined,
    ownerWallet:
      typeof o.ownerWallet === "string" && o.ownerWallet.startsWith("0x")
        ? (o.ownerWallet as `0x${string}`)
        : undefined,
  };
}

/**
 * Writes an AuditEvent to Arkiv and optionally transfers $owner to the
 * end-user's wallet. Returns the entity key and tx hash(es).
 */
export async function recordAuditEvent(
  input: RecordAuditEventInput,
): Promise<RecordAuditEventResult> {
  const wallet = getWalletArkiv();
  const serviceAddress = getServiceAddress();
  if (!serviceAddress) {
    throw new Error("Service wallet not configured");
  }

  const timestamp = Date.now();
  const payload: AuditEventPayload = {
    eventType: input.eventType,
    actor: input.actor,
    severity: input.severity,
    target: input.target,
    action: input.action,
    metadata: input.metadata,
  };

  const attributes = [
    PROJECT_ATTRIBUTE,
    { key: "entityType", value: ENTITY_TYPE.AUDIT_EVENT },
    { key: "eventType", value: input.eventType },
    { key: "actor", value: input.actor },
    { key: "severity", value: input.severity },
    { key: "timestamp", value: timestamp },
    ...(input.target ? [{ key: "target", value: input.target }] : []),
    ...(input.projectKey
      ? [{ key: "projectKey", value: input.projectKey }]
      : []),
  ];

  const { entityKey, txHash } = await wallet.createEntity({
    payload: jsonToPayload(payload as unknown as Record<string, unknown>),
    contentType: "application/json",
    attributes,
    expiresIn: RETENTION[input.severity],
  });

  // Optional ownership transfer to the end-user. Done sequentially to keep the
  // endpoint simple; SDK is fire-and-forget on the client side so latency is hidden.
  let ownerTransferTxHash: string | undefined;
  if (
    input.ownerWallet &&
    input.ownerWallet.toLowerCase() !== serviceAddress.toLowerCase()
  ) {
    const result = await wallet.changeOwnership({
      entityKey,
      newOwner: input.ownerWallet,
    });
    ownerTransferTxHash = result.txHash;
  }

  return { entityKey, txHash, ownerTransferTxHash };
}

export interface ListAuditEventsFilters {
  severity?: Severity;
  eventType?: string;
  actor?: string;
  /** Inclusive lower bound for entity timestamp (ms since epoch). */
  sinceMs?: number;
  /** Filter by current $owner address. */
  ownerWallet?: `0x${string}`;
  limit?: number;
}

export interface ListAuditEventsResult {
  entities: Array<{
    entityKey: string;
    owner: string | null;
    creator: string | null;
    createdAtBlock: number | null;
    timestamp: number | null;
    payload: AuditEventPayload | null;
  }>;
  count: number;
}

/**
 * Reads audit events from Arkiv. The query is always scoped to the project
 * namespace; additional filters are chained as separate `.where()` calls
 * because Arkiv RPC rejects array-form predicates (see smoke-test notes).
 */
export async function listAuditEvents(
  filters: ListAuditEventsFilters = {},
): Promise<ListAuditEventsResult> {
  const limit = Math.max(1, Math.min(filters.limit ?? 50, 200));

  let query = publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.AUDIT_EVENT));

  if (filters.severity) query = query.where(eq("severity", filters.severity));
  if (filters.eventType) query = query.where(eq("eventType", filters.eventType));
  if (filters.actor) query = query.where(eq("actor", filters.actor));
  if (filters.sinceMs) query = query.where(gt("timestamp", filters.sinceMs));
  if (filters.ownerWallet) query = query.ownedBy(filters.ownerWallet);

  const result = await query
    .withPayload(true)
    .withAttributes(true)
    .withMetadata(true)
    .limit(limit)
    .fetch();

  const toNumber = (v: unknown): number | null => {
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    return null;
  };

  // Defensive mapping: normalize the entity shape into a stable JSON contract
  // for the API. The Arkiv SDK exposes some fields under metadata, some at the
  // top level; this hides the variation from API consumers.
  const entities = result.entities.map((e) => {
    const anyEntity = e as unknown as Record<string, unknown> & {
      attributes?: Array<{ key: string; value: unknown }>;
      toJson?: () => AuditEventPayload | null;
      metadata?: {
        owner?: string;
        creator?: string;
        createdAtBlock?: number;
      };
    };
    const attrs = anyEntity.attributes ?? [];
    const tsAttr = attrs.find((a) => a.key === "timestamp");
    return {
      entityKey: (anyEntity.key ?? anyEntity.entityKey ?? "") as string,
      owner:
        (anyEntity.owner as string | undefined) ??
        anyEntity.metadata?.owner ??
        null,
      creator:
        (anyEntity.creator as string | undefined) ??
        anyEntity.metadata?.creator ??
        null,
      createdAtBlock: toNumber(
        anyEntity.createdAtBlock ?? anyEntity.metadata?.createdAtBlock,
      ),
      timestamp: toNumber(tsAttr?.value),
      payload:
        anyEntity.toJson?.() ??
        ((anyEntity.payload as AuditEventPayload | undefined) ?? null),
    };
  });

  return { entities, count: entities.length };
}
