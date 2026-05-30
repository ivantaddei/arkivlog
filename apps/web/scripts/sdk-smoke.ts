/**
 * End-to-end test: invoca el SDK `arkivlog` contra el endpoint local
 * y verifica que la entity termina en Arkiv testnet.
 *
 * Pre-requisito: corre el server en otra terminal: `pnpm dev:web`
 *
 *   pnpm --filter web run sdk-smoke
 */

import { eq } from "@arkiv-network/sdk/query";
import { init } from "../../../packages/sdk/src/index";
import {
  ENTITY_TYPE,
  PROJECT_ATTRIBUTE,
  publicArkiv,
} from "../src/lib/arkiv";

const ENDPOINT =
  process.env.ARKIVLOG_ENDPOINT ?? "http://localhost:3100/api/logs";
const API_KEY = process.env.ARKIVLOG_API_KEY ?? "demo-key";
const OWNER_WALLET = process.env.SCRIPTS_TEST_OWNER;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`→ Endpoint:  ${ENDPOINT}`);
  console.log(`→ API key:   ${API_KEY}`);
  console.log(`→ Owner:     ${OWNER_WALLET ?? "(service wallet)"}`);

  const logger = init({
    apiKey: API_KEY,
    endpoint: ENDPOINT,
    onError: (e) => console.error("SDK error:", e),
  });

  const stamp = Date.now().toString(36);
  const actor = `sdk-smoke-${stamp}@arkivlog.dev`;

  console.log(`\n1) Calling logger.record() for actor=${actor}...`);
  logger.record({
    eventType: "SDK_TEST",
    actor,
    target: "arkivlog-endpoint",
    severity: "MEDIUM",
    metadata: { runId: stamp, source: "sdk-smoke.ts" },
  });

  // record() is fire-and-forget; give the endpoint + chain time to settle.
  console.log("   Waiting 8s for endpoint + Arkiv tx confirmations...");
  await sleep(8000);

  console.log(`\n2) Querying Arkiv for actor=${actor}`);
  const result = await publicArkiv
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", ENTITY_TYPE.AUDIT_EVENT))
    .where(eq("actor", actor))
    .withPayload(true)
    .withMetadata(true)
    .limit(5)
    .fetch();

  if (result.entities.length === 0) {
    throw new Error(
      "No entity found — the SDK call didn't reach Arkiv (or didn't settle yet).",
    );
  }

  const entity: any = result.entities[0];
  console.log(`   ✓ Found ${result.entities.length} entity:`);
  console.log(`     payload:`, entity.toJson?.() ?? entity.payload);
  console.log(`     $owner:`, entity.owner ?? entity.metadata?.owner ?? "—");
  console.log(`     $creator:`, entity.creator ?? entity.metadata?.creator ?? "—");

  console.log("\n✓ SDK smoke test passed.");
}

main().catch((err) => {
  console.error("\n✗ SDK smoke failed:", err);
  process.exit(1);
});
