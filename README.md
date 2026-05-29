# ArkivLog

> Inmutable, ownable audit logs on Arkiv — SDK + dashboard + AI agent.

Built for the **ARKIV × PunaTech 2026** hackathon (track: AI Applications on ARKIV, vertical: AI provenance & audit).

## Structure

```
arkivlog/
├── apps/
│   └── web/        # Next.js dashboard + API (proxy to Arkiv) + AI agent
└── packages/
    └── sdk/        # arkivlog npm package (TypeScript SDK)
```

## Architecture (TL;DR)

```
Dev's backend ──[arkivlog SDK]──► /api/logs ──► Arkiv testnet
                                       │
User's browser ──[wallet connect]──► Dashboard ──► reads Arkiv
                                       │
                                       └──► /api/chat ──► LLM (Vertex) ──► tools ──► Arkiv
```

- SDK = fire-and-forget POST to backend.
- Backend signs and writes `AuditEvent` entities to Arkiv testnet.
- `$owner` = user's wallet (set on the dashboard).
- `$creator` = service wallet (tamper-proof attribution).
- `expiresIn` differentiated by severity.

## Quick start

> WIP. Filled in once SDK and dashboard are functional.

## Status

WIP. Submission deadline: 2026-05-30 14:00 ART.
