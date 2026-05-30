/**
 * Lista todas las entities que ArkivLog guardó en testnet, con detalle completo.
 *
 *   pnpm --filter web run list
 */

import { eq } from "@arkiv-network/sdk/query";
import {
  ENTITY_TYPE,
  PROJECT_ATTRIBUTE,
  publicArkiv,
} from "../src/lib/arkiv";

async function listAuditEvents() {
  const result = await publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.AUDIT_EVENT))
    .withPayload(true)
    .withAttributes(true)
    .withMetadata(true)
    .limit(50)
    .fetch();
  return result.entities;
}

async function listProjects() {
  const result = await publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.PROJECT))
    .withPayload(true)
    .withAttributes(true)
    .withMetadata(true)
    .limit(20)
    .fetch();
  return result.entities;
}

function short(x: unknown) {
  if (typeof x !== "string") return "—";
  return x.length > 18 ? `${x.slice(0, 10)}…${x.slice(-6)}` : x;
}

function summarize(entity: any, index: number) {
  // Try common property name variants for entity key + metadata
  const key =
    entity.key ?? entity.entityKey ?? entity.entity_key ?? "(unknown)";
  const owner =
    entity.owner ??
    entity.metadata?.owner ??
    entity.metadata?.$owner ??
    "—";
  const creator =
    entity.creator ??
    entity.metadata?.creator ??
    entity.metadata?.$creator ??
    "—";
  const expiration =
    entity.expiration ??
    entity.expiresAt ??
    entity.metadata?.expiration ??
    null;
  const createdAtBlock =
    entity.createdAtBlock ?? entity.metadata?.createdAtBlock ?? null;

  let payload: any = null;
  try {
    payload = entity.toJson();
  } catch {
    payload = entity.payload ?? null;
  }

  console.log(`\n[${index}] ────────────────────────────────────────────`);
  console.log(`  key:       ${short(key)}`);
  console.log(`  $owner:    ${short(owner)}`);
  console.log(`  $creator:  ${short(creator)}`);
  if (expiration) console.log(`  expires:   ${expiration}`);
  if (createdAtBlock) console.log(`  block:     ${createdAtBlock}`);
  if (entity.attributes) {
    console.log(`  attrs:`);
    for (const a of entity.attributes) {
      console.log(`    ${a.key} = ${JSON.stringify(a.value)}`);
    }
  }
  if (payload) {
    console.log(`  payload:`);
    for (const [k, v] of Object.entries(payload)) {
      console.log(`    ${k}: ${JSON.stringify(v)}`);
    }
  }
}

async function main() {
  console.log(`\nNamespace: ${PROJECT_ATTRIBUTE.value}\n`);

  const projects = await listProjects();
  console.log(`\n📁 PROJECTS (${projects.length})`);
  projects.forEach((e: any, i: number) => summarize(e, i + 1));

  const events = await listAuditEvents();
  console.log(`\n\n📜 AUDIT EVENTS (${events.length})`);
  events.forEach((e: any, i: number) => summarize(e, i + 1));

  console.log("");
}

main().catch((err) => {
  console.error("✗ List failed:", err);
  process.exit(1);
});
