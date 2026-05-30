import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { jsonToPayload } from "@arkiv-network/sdk/utils";
import {
  ENTITY_TYPE,
  PROJECT_ATTRIBUTE,
  PROJECT_EXPIRATION,
  getWalletArkiv,
} from "./arkiv";
import { getDemoConfig, isDemoMode } from "./demo-mode";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "keys.json");

interface KeyRecord {
  /** Hex address, lowercased. */
  wallet: `0x${string}`;
  /** API key the SDK sends in Authorization header. */
  apiKey: string;
  /** Arkiv entity key of the Project parent. */
  projectKey: string;
  /** Display name shown in dashboards. */
  projectName: string;
  createdAt: number;
}

interface KeyStoreShape {
  version: 1;
  records: KeyRecord[];
}

let cache: KeyStoreShape | null = null;
let inflight: Promise<unknown> | null = null;

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<KeyStoreShape> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as KeyStoreShape;
    cache = parsed;
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      cache = { version: 1, records: [] };
      return cache;
    }
    throw err;
  }
}

async function persist(store: KeyStoreShape) {
  await ensureDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  cache = store;
}

/**
 * Serializes mutations through a single in-flight promise so two requests
 * racing for the same wallet don't both create a Project entity.
 */
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  while (inflight) {
    try {
      await inflight;
    } catch {
      // ignore the previous error; we only care about ordering
    }
  }
  const p = fn();
  inflight = p;
  try {
    return await p;
  } finally {
    if (inflight === p) inflight = null;
  }
}

function generateApiKey(): string {
  return `ak_${crypto.randomBytes(24).toString("base64url")}`;
}

function projectNameFor(wallet: string) {
  return `Project ${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

async function createProjectEntity(
  wallet: `0x${string}`,
  name: string,
): Promise<string> {
  const arkiv = getWalletArkiv();
  const { entityKey } = await arkiv.createEntity({
    payload: jsonToPayload({ name, ownerWallet: wallet }),
    contentType: "application/json",
    attributes: [
      PROJECT_ATTRIBUTE,
      { key: "entityType", value: ENTITY_TYPE.PROJECT },
      { key: "ownerWallet", value: wallet },
      { key: "name", value: name },
    ],
    expiresIn: PROJECT_EXPIRATION,
  });
  return entityKey;
}

export async function findByWallet(
  wallet: `0x${string}`,
): Promise<KeyRecord | null> {
  const store = await load();
  const normalized = wallet.toLowerCase();
  return (
    store.records.find((r) => r.wallet.toLowerCase() === normalized) ?? null
  );
}

export async function findByApiKey(
  apiKey: string,
): Promise<KeyRecord | null> {
  if (isDemoMode()) {
    const demo = getDemoConfig();
    if (apiKey === demo.apiKey) {
      return {
        wallet: demo.wallet,
        apiKey: demo.apiKey,
        projectKey: demo.projectKey,
        projectName: demo.projectName,
        createdAt: 0,
      };
    }
    return null;
  }
  const store = await load();
  return store.records.find((r) => r.apiKey === apiKey) ?? null;
}

/**
 * Idempotent: returns the existing record if one exists for that wallet,
 * otherwise creates a Project entity on Arkiv (blocks ~5s) and stores the
 * mapping locally.
 */
export async function getOrCreateApiKey(
  wallet: `0x${string}`,
): Promise<KeyRecord> {
  return withLock(async () => {
    const existing = await findByWallet(wallet);
    if (existing) return existing;

    const name = projectNameFor(wallet);
    const projectKey = await createProjectEntity(wallet, name);
    const record: KeyRecord = {
      wallet: wallet.toLowerCase() as `0x${string}`,
      apiKey: generateApiKey(),
      projectKey,
      projectName: name,
      createdAt: Date.now(),
    };

    const store = await load();
    const next: KeyStoreShape = {
      version: 1,
      records: [...store.records, record],
    };
    await persist(next);
    return record;
  });
}
