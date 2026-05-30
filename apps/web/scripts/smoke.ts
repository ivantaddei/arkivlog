/**
 * Smoke test — runs against Arkiv testnet (Braga).
 *
 *   pnpm --filter web smoke
 *
 * Creates 1 Project + 3 AuditEvents linked to it, then runs three queries
 * (by severity, by actor, by recency) to confirm the integration works.
 */

import { eq, gt } from "@arkiv-network/sdk/query";
import { jsonToPayload } from "@arkiv-network/sdk/utils";
import {
  ENTITY_TYPE,
  PROJECT_ATTRIBUTE,
  PROJECT_EXPIRATION,
  RETENTION,
  getServiceAddress,
  getWalletArkiv,
  publicArkiv,
  type AuditEventPayload,
  type ProjectPayload,
  type Severity,
} from "../src/lib/arkiv";

const DEMO_OWNER: `0x${string}` =
  (process.env.SCRIPTS_TEST_OWNER as `0x${string}`) ??
  "0x000000000000000000000000000000000000dead";

async function createProject(payload: ProjectPayload) {
  const wallet = getWalletArkiv();
  return wallet.createEntity({
    payload: jsonToPayload(payload),
    contentType: "application/json",
    attributes: [
      PROJECT_ATTRIBUTE,
      { key: "entityType", value: ENTITY_TYPE.PROJECT },
      { key: "ownerWallet", value: payload.ownerWallet },
      { key: "name", value: payload.name },
    ],
    expiresIn: PROJECT_EXPIRATION,
  });
}

async function createAuditEvents(
  projectKey: string,
  events: AuditEventPayload[],
) {
  const wallet = getWalletArkiv();
  return wallet.mutateEntities({
    creates: events.map((event) => ({
      payload: jsonToPayload(event),
      contentType: "application/json",
      attributes: [
        PROJECT_ATTRIBUTE,
        { key: "entityType", value: ENTITY_TYPE.AUDIT_EVENT },
        { key: "projectKey", value: projectKey },
        { key: "eventType", value: event.eventType },
        { key: "actor", value: event.actor },
        { key: "severity", value: event.severity },
        { key: "timestamp", value: Date.now() },
      ],
      expiresIn: RETENTION[event.severity],
    })),
  });
}

async function querySeverity(severity: Severity) {
  const result = await publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.AUDIT_EVENT))
    .where(eq("severity", severity))
    .withPayload(true)
    .limit(10)
    .fetch();
  return result.entities;
}

async function queryActor(actor: string) {
  const result = await publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.AUDIT_EVENT))
    .where(eq("actor", actor))
    .withPayload(true)
    .limit(10)
    .fetch();
  return result.entities;
}

async function queryRecent(sinceMs: number) {
  const result = await publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.AUDIT_EVENT))
    .where(gt("timestamp", sinceMs))
    .withPayload(true)
    .limit(10)
    .fetch();
  return result.entities;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const service = getServiceAddress();
  if (!service) {
    throw new Error(
      "ARKIV_SERVICE_PRIVATE_KEY missing — copy env.example to .env and fund the wallet at https://braga.hoodi.arkiv.network/faucet/",
    );
  }

  console.log("→ Service wallet (creator):", service);
  console.log("→ Demo owner wallet:", DEMO_OWNER);
  console.log("→ Project namespace:", PROJECT_ATTRIBUTE.value);

  console.log("\n1) Creating parent Project entity...");
  const project = await createProject({
    name: "Smoke Test Project",
    description: "Created by scripts/smoke.ts to verify Arkiv integration.",
    ownerWallet: DEMO_OWNER,
  });
  console.log("   ✓ projectKey:", project.entityKey);

  console.log("\n2) Batch-creating 3 AuditEvents...");
  const events: AuditEventPayload[] = [
    {
      eventType: "LOGIN_FAILED",
      actor: "alice@acme.com",
      target: "admin-panel",
      severity: "HIGH",
      metadata: { ip: "1.2.3.4", reason: "bad-password" },
    },
    {
      eventType: "CONFIG_CHANGED",
      actor: "bob@acme.com",
      target: "billing-settings",
      severity: "MEDIUM",
      metadata: { field: "currency", from: "USD", to: "EUR" },
    },
    {
      eventType: "DATA_EXPORTED",
      actor: "alice@acme.com",
      target: "users-table",
      severity: "CRITICAL",
      metadata: { rows: 50_000, format: "csv" },
    },
  ];
  const batch = await createAuditEvents(project.entityKey, events);
  console.log("   ✓ created:", batch.results?.length ?? "(no result count)");

  console.log("\n   Waiting 3s for tx to settle...");
  await sleep(3000);

  console.log("\n3) Query by severity=CRITICAL");
  const critical = await querySeverity("CRITICAL");
  console.log("   ✓ matches:", critical.length);

  console.log("\n4) Query by actor=alice@acme.com");
  const alice = await queryActor("alice@acme.com");
  console.log("   ✓ matches:", alice.length);

  console.log("\n5) Query recent (last 5 min)");
  const recent = await queryRecent(Date.now() - 5 * 60_000);
  console.log("   ✓ matches:", recent.length);

  console.log("\n✓ Smoke test passed.");
}

main().catch((err) => {
  console.error("\n✗ Smoke test failed:", err);
  process.exit(1);
});
