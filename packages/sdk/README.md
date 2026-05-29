# arkivlog

> Fire-and-forget audit logger for Node — events land in [Arkiv](https://arkiv.network), inmutably.

## Install

```bash
npm install arkivlog
```

## Use

```ts
import { init } from "arkivlog";

const logger = init({
  apiKey: process.env.ARKIVLOG_API_KEY!,
  endpoint: "https://<your-arkivlog-deployment>/api/logs",
});

logger.record({
  eventType: "LOGIN_FAILED",
  actor: "user@acme.com",
  target: "admin-panel",
  severity: "HIGH",
  metadata: { ip: "1.2.3.4", reason: "bad-password" },
});
```

`record()` is fire-and-forget — it returns immediately and never blocks your request path.

## Severity → retention

| Severity   | Retention (testnet) |
|------------|---------------------|
| `LOW`      | 7 days              |
| `MEDIUM`   | 30 days             |
| `HIGH`     | 90 days             |
| `CRITICAL` | 365 days            |

Retention is enforced via Arkiv `expiresIn` on each entity.
