# ArkivLog

[![npm version](https://img.shields.io/npm/v/arkivlog.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/arkivlog)
[![license](https://img.shields.io/npm/l/arkivlog.svg)](./LICENSE)
[![hackathon](https://img.shields.io/badge/hackathon-ARKIV%20%C3%97%20PunaTech%202026-6f42c1)](https://forms.arkiv.network/punatech26)
[![track](https://img.shields.io/badge/track-AI%20provenance%20%26%20audit-0a7c3e)](#)

> **Immutable AI audit trail.** Every action your AI agent takes — every tool call, every output — is written to [Arkiv](https://arkiv.network) testnet with tamper-proof creator attribution and wallet-based ownership.

Built for **ARKIV × PunaTech 2026**, track _"AI Applications on ARKIV"_, vertical _AI provenance & audit_.

- 🌐 **Live demo:** _coming soon — add Vercel URL here_
- 🎥 **Video pitch (ES):** _coming soon — add YouTube link here_
- 📦 **SDK on npm:** [`npm i arkivlog`](https://www.npmjs.com/package/arkivlog)

**Quick links:** [Para el jurado 🇦🇷](#para-el-jurado-) · [30-second install](#30-second-install) · [What it is](#what-it-is) · [Why it matters](#why-it-matters) · [Architecture](#architecture) · [Setup](#setup) · [Run](#run) · [Demo script](#the-90-second-demo-script) · [Data model](#data-model) · [SDK](#sdk-usage)

---

## Para el jurado 🇦🇷

**ArkivLog** es una librería + dashboard + agente IA de demostración que registra **cada acción de un agente LLM de forma inmutable** en la testnet de Arkiv. Pensado para la vertical _AI provenance & audit_ del track _AI Applications on ARKIV_.

**Por qué importa:** los agentes IA hoy actúan en el mundo real (consultan inventario, agendan turnos, cotizan financiación), pero **no existe un registro inviolable** de qué hicieron, cuándo y para quién. Una base de datos común la edita cualquiera con permisos de escritura. ArkivLog garantiza tres cosas:

1. **Origen tamper-proof** — el `$creator` es la wallet del backend, fijo al momento de crear la entidad, imposible de falsificar.
2. **Propiedad del usuario final** — el `$owner` es la wallet del usuario, que controla la retención y puede ejercer el derecho al olvido.
3. **Retención diferenciada por severidad** — `LOW=7d`, `MEDIUM=30d`, `HIGH=90d`, `CRITICAL=365d` vía `expiresIn`.

**Qué entregamos:**
- 📦 SDK público en npm — `npm i arkivlog` (3 líneas para integrar)
- 🖥️ Dashboard SaaS con SIWE + API keys por wallet
- 🤖 Demo "concesionaria con asistente IA" donde **cada tool-call queda on-chain**
- 🎬 Demo guiado de 90 segundos abajo en este README

> Para ver el flow completo paso a paso, leé [The 90-second demo script](#the-90-second-demo-script). El resto del README está en inglés pensando en la audiencia del SDK en npm.

---

## 30-second install

The SDK is published on npm. Drop it into any TypeScript backend:

```bash
npm install arkivlog
```

```ts
import { init } from "arkivlog";

const logger = init({
  apiKey: process.env.ARKIVLOG_API_KEY!,                  // issued in the ArkivLog dashboard
  endpoint: "https://your-arkivlog.vercel.app/api/logs",  // your deployment
});

// Fire-and-forget. Never blocks your request path.
logger.record({
  eventType: "TOOL_INVOKED",
  actor: sessionId,
  target: "searchInventory",
  severity: "HIGH",
  metadata: { input, output, durationMs: 142 },
});
```

That's it. The event is signed by ArkivLog's service wallet, owned by your wallet, and written to Arkiv testnet — tamper-proof, with severity-based retention.

---

## What it is

ArkivLog is two things in one repo:

1. **An SDK (`packages/sdk`)** that any TypeScript backend can install (`npm install arkivlog`) to fire-and-forget log structured events.
2. **A SaaS dashboard (`apps/web`)** that receives those events, signs them with a service wallet, and writes them to Arkiv testnet as `AuditEvent` entities. It also exposes a wallet-aware Provenance Trail UI.

Plus a third app to make the demo concrete:

3. **A consumer demo (`apps/demo`)** — a fictitious car dealership with an AI assistant (Gemini 2.5 on Vertex). Every tool the assistant calls is automatically logged via the SDK.

---

## Why it matters

LLM agents act in the world: they search, they query DBs, they schedule, they pay. Today there is no immutable record of _what_ they did, _when_, _on whose behalf_, and _with what inputs_. Logs in a normal database can be modified by anyone with write access. ArkivLog gives that record three guarantees:

- **Tamper-proof origin** — `$creator` is the backend's wallet, set at creation, immutable forever. Forging the source is cryptographically impossible.
- **End-user ownership** — `$owner` is the user's wallet. They control retention and exercise right-to-be-forgotten.
- **Differentiated retention** — `expiresIn` is set by severity (`LOW=7d`, `MEDIUM=30d`, `HIGH=90d`, `CRITICAL=365d`), reflecting product logic.

---

## Architecture

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  apps/demo  (port 3200)      │         │  apps/web  (port 3100)       │
│  Concesionaria Demo          │         │  ArkivLog SaaS               │
│                              │         │                              │
│  ┌────────────────────────┐  │  POST   │  ┌────────────────────────┐  │
│  │ Vertex AI agent        │──┼─────────┼─▶│ POST /api/logs         │  │
│  │ (Gemini 2.5 + tools)   │  │  /api/  │  │ - validates API key    │  │
│  │                        │  │  logs   │  │ - createEntity (Arkiv) │  │
│  │ tools/                 │  │         │  │ - changeOwnership      │  │
│  │  ├─ searchInventory    │  │         │  └────────────────────────┘  │
│  │  ├─ getVehicleDetails  │  │         │                              │
│  │  ├─ scheduleTestDrive  │  │         │  ┌────────────────────────┐  │
│  │  └─ getFinancingQuote  │  │         │  │ GET  /api/logs         │  │
│  │   (each fires SDK)     │  │         │  │ - filters: severity,   │  │
│  └────────────────────────┘  │         │  │   eventType, actor,    │  │
│                              │         │  │   since, owner         │  │
│  Chat UI (useChat)           │         │  └────────────────────────┘  │
└──────────────────────────────┘         │                              │
                                         │  /dashboard                  │
┌──────────────────────────────┐         │  - wagmi wallet connect      │
│  packages/sdk  (arkivlog)    │         │  - Provenance table          │
│  - init({apiKey, endpoint})  │         │  - filters + entity expand   │
│  - record() fire-and-forget  │         │  - $owner / $creator links   │
└──────────────────────────────┘         └──────────────┬───────────────┘
                                                        │
                                                        │ @arkiv-network/sdk
                                                        ▼
                                         ┌──────────────────────────────┐
                                         │   Arkiv Braga testnet        │
                                         │   chain id 60138453102       │
                                         │   Entity AuditEvent          │
                                         │   - attributes (indexed)     │
                                         │   - payload (JSON)           │
                                         │   - $creator (immutable)     │
                                         │   - $owner   (user wallet)   │
                                         │   - expiresIn by severity    │
                                         └──────────────────────────────┘
```

---

## Repo layout

```
arkivlog/
├── apps/
│   ├── web/          Next.js — SaaS dashboard + API routes (port 3100)
│   └── demo/         Next.js — Concesionaria Demo with Vertex agent (port 3200)
├── packages/
│   └── sdk/          arkivlog — TypeScript SDK published as `arkivlog`
└── README.md
```

Workspace tooling: **pnpm 10**, **Node 20+**, **Next.js 16**, **TypeScript 5**.

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd arkivlog
pnpm install
```

### 2. Wallet for Arkiv testnet

You need one wallet for the backend's service signer. It will be `$creator` on every entity ArkivLog writes.

1. Install MetaMask.
2. Add the **Arkiv Braga Testnet** network:
   - RPC: `https://braga.hoodi.arkiv.network/rpc`
   - Chain ID: `60138453102`
   - Symbol: `GLM`
   - Explorer: `https://explorer.braga.hoodi.arkiv.network/`
3. Fund it from the faucet: <https://braga.hoodi.arkiv.network/faucet/>
4. Export the **private key** of that account (Account details → Show private key).

### 3. Configure `apps/web/.env`

Copy `apps/web/env.example` to `apps/web/.env` and fill in:

```
ARKIV_SERVICE_PRIVATE_KEY=0x<your_private_key>
SESSION_SECRET=<long_random_string_for_signing_JWTs>
SCRIPTS_TEST_OWNER=0x<any_address_for_test_scripts>
```

> `ARKIVLOG_API_KEY` is no longer a single shared key — it's issued per wallet from the dashboard (see step 5).

### 4. Configure `apps/demo/.env`

Copy `apps/demo/env.example` to `apps/demo/.env` and fill in (leave `ARKIVLOG_API_KEY` empty for now — step 5 fills it):

```
ARKIVLOG_ENDPOINT=http://localhost:3100/api/logs
ARKIVLOG_API_KEY=ak_<will_be_set_after_step_5>

VERTEX_PROJECT_ID=<your_gcp_project>
VERTEX_LOCATION=us-central1
VERTEX_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com
VERTEX_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MODEL=gemini-2.5-flash
```

> **Tip:** `VERTEX_PRIVATE_KEY` from a Google service account JSON usually has literal `\n` separators. Keep them — the code unescapes them.

---

## Run

```bash
# Terminal 1 — SaaS (dashboard + API)
pnpm dev:web         # http://localhost:3100
```

### 5. Sign in and issue your API key

1. Open **http://localhost:3100/dashboard**.
2. Click **Sign in with MetaMask**. MetaMask pops up with a SIWE message — read it and **Sign**.
3. The dashboard creates a Project entity on Arkiv (takes ~5-10s the first time) and shows your API key (`ak_…`).
4. Copy the key into `apps/demo/.env` as `ARKIVLOG_API_KEY`.

### 6. Start the demo

```bash
# Terminal 2 — Demo (concesionaria with AI assistant)
pnpm dev:demo        # http://localhost:3200
```

- Open **http://localhost:3200** and chat with the assistant. Try _"¿Qué Toyotas tenés bajo USD 30.000?"_.
- Switch back to **http://localhost:3100/dashboard** — your logs are now there, with full payload, and they're privacy-scoped to your wallet. No one else (not even with the right query) can read them via the API.

---

## The 90-second demo script

This is the story the judges should see:

1. _"Esta es la SaaS de ArkivLog. Hago Sign-In con MetaMask."_ → click **Sign in with MetaMask** in `/dashboard`. MetaMask popup → Sign. The dashboard creates the Project entity on-chain and shows my API key.
2. _"Copio esta key, la pego en mi backend — acá la concesionaria que ya integró el SDK."_ → paste into `apps/demo/.env` (already done off-camera), open `apps/demo`.
3. _"Charlo con el asistente IA."_ → user message. Tool indicator `🔧 searchInventory` appears, then assistant response.
4. _"Cada acción quedó firmada en Arkiv. Y solo yo la veo."_ → switch to dashboard tab. New row appeared. Expand → full payload. Click `entityKey` → Braga explorer shows the on-chain tx.
5. _"Si abro este dashboard SIN sesión iniciada, no veo nada. La privacidad no es una feature — es la arquitectura."_ → optional: sign out and refresh to demonstrate empty state.
6. _"`$creator` es nuestra wallet de servicio, inmutable. `$owner` es tu wallet — vos controlás la retención y podés borrar. Pero nadie puede falsificar lo que ya quedó escrito."_

That's it. The story sells itself.

---

## Data model

We store two related entity types, both carrying the `PROJECT_ATTRIBUTE = { key: "project", value: "arkivlog-punatech26-v1" }`.

### Project (parent)

| Field | Type | Purpose |
|---|---|---|
| attrs | `entityType=project`, `ownerWallet`, `name` | indexed |
| payload | `{ name, description, ownerWallet }` | JSON |
| `expiresIn` | 365 days | parent retention |

### AuditEvent (child)

| Field | Type | Purpose |
|---|---|---|
| attrs | `entityType=auditEvent`, `eventType`, `actor`, `severity`, `timestamp` (numeric), `projectKey` (FK), optional `target` | indexed for queries |
| payload | `{ eventType, actor, target, severity, metadata }` | JSON |
| `$creator` | service wallet | tamper-proof |
| `$owner` | end-user wallet | control |
| `expiresIn` | severity-based: `LOW=7d`, `MEDIUM=30d`, `HIGH=90d`, `CRITICAL=365d` | differentiated retention |

`projectKey` acts as a foreign key — the standard Arkiv pattern for relationships.

### Sample queries

```ts
// All HIGH-severity events from a given actor in the last hour
publicArkiv
  .buildQuery()
  .where(eq("project", "arkivlog-punatech26-v1"))
  .where(eq("entityType", "auditEvent"))
  .where(eq("severity", "HIGH"))
  .where(eq("actor", "session-abc"))
  .where(gt("timestamp", Date.now() - 3600_000))
  .withPayload(true)
  .limit(50)
  .fetch();

// Only events owned by my wallet (right-to-be-forgotten requires this)
publicArkiv
  .buildQuery()
  .where(eq("project", "arkivlog-punatech26-v1"))
  .ownedBy("0xMyWallet")
  .fetch();

// Only events whose origin is the official ArkivLog backend (anti-spoofing)
publicArkiv
  .buildQuery()
  .where(eq("project", "arkivlog-punatech26-v1"))
  .createdBy(SERVICE_WALLET_ADDRESS)
  .fetch();
```

---

## SDK usage

The SDK lives at [`packages/sdk`](./packages/sdk) and is **published on npm as [`arkivlog`](https://www.npmjs.com/package/arkivlog)** — anyone can install and integrate it today:

```bash
npm install arkivlog
```

```ts
import { init } from "arkivlog";

const logger = init({
  apiKey: process.env.ARKIVLOG_API_KEY!,
  endpoint: process.env.ARKIVLOG_ENDPOINT ?? "http://localhost:3100/api/logs",
  onError: (err) => console.error("arkivlog:", err), // optional
});

logger.record({
  eventType: "TOOL_INVOKED",
  actor: sessionId,
  target: "searchInventory",
  severity: "LOW",
  metadata: { input, output, durationMs },
});
```

`record()` is fire-and-forget — it returns immediately and never blocks the request path. Errors are surfaced via the optional `onError` callback.

### API surface

| Export | Type | Purpose |
|---|---|---|
| `init(config)` | `(ArkivLogConfig) => ArkivLogger` | Create a logger bound to an API key + endpoint |
| `logger.record(event)` | `(AuditEventInput) => void` | Send one event. Non-blocking, no return value. |
| `Severity` | `"LOW" \| "MEDIUM" \| "HIGH" \| "CRITICAL"` | Drives retention on Arkiv |

Zero runtime dependencies. ESM only. Targets Node 20+ and any modern bundler.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev:web` | run the SaaS (port 3100) |
| `pnpm dev:demo` | run the demo (port 3200) |
| `pnpm smoke` | direct test against Arkiv: creates a Project + 3 AuditEvents + 3 queries |
| `pnpm list` | pretty-print every entity ArkivLog has written under its namespace |
| `pnpm --filter web run sdk-smoke` | end-to-end test: SDK → endpoint → Arkiv |

---

## Design decisions worth knowing

- **Two transactions per log (createEntity + changeOwnership).** Arkiv doesn't accept `$owner` as a parameter on creation — the signer is the implicit owner. To set the user as `$owner`, we have to transfer. We do it sequentially in the API; the SDK is fire-and-forget so this latency is hidden.
- **`changeOwnership` is skipped when `ownerWallet` equals the service wallet** — saves a tx in the trivial case.
- **`transpilePackages: ["arkivlog"]`** is set in both apps' `next.config.ts` so we never have to rebuild the SDK during development.
- **Numeric attributes use real numbers**, not strings — required for Arkiv range queries (`gt`, `lt`).
- **Queries chain `.where()` calls instead of passing arrays** — array-form predicates cause `context cancelled` errors from the Arkiv RPC (confirmed against Braga testnet).
- **Severity-based `expiresIn`** demonstrates intentional, differentiated retention — a Level-5 signal per the rubric.

---

## Known limitations

- The keystore (`apps/web/data/keys.json`) is a local JSON file — fine for a single-node hackathon demo, but production would back it with a real DB (Postgres) and rotate keys.
- The wallet abstraction in the dashboard uses `injected` (MetaMask only) to avoid a WalletConnect projectId for the demo. Production should use `getDefaultConfig` from RainbowKit with full wallet support.
- Arkiv Braga testnet RPC is sometimes flaky (`context cancelled` errors). Production retries with exponential backoff are not implemented; the smoke scripts simply retry on failure.
- The chat history in `apps/demo` is in-memory per browser session. There is no persistence layer for chats themselves (the audit trail in Arkiv _is_ the persistent record).
- Nonces are stored in-memory; if the SaaS process restarts mid-login, the user has to click Sign-In again. A real deployment would persist them in Redis.

---

## Tech stack

| Concern | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Apps | Next.js 16 (App Router, Turbopack) |
| SDK | TypeScript, ESM, `tsup` for bundling |
| Arkiv | `@arkiv-network/sdk` 0.6.8, Braga testnet |
| AI | `ai` 6.x + `@ai-sdk/google-vertex` + Gemini 2.5 Flash |
| Wallet | `wagmi` + `viem` + injected connector |
| Auth | SIWE (EIP-4361) via `siwe` + JWT cookies via `jose` |
| Persistence | JSON keystore on disk + Arkiv for the audit trail itself |
| Tests | Smoke scripts (no test framework — hackathon scope) |
| Styling | Tailwind CSS 4 |

---

## License

MIT — see [LICENSE](./LICENSE).
