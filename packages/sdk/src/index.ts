export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ArkivLogConfig {
  apiKey: string;
  endpoint?: string;
  onError?: (err: unknown) => void;
}

export interface AuditEventInput {
  eventType: string;
  actor: string;
  target?: string;
  action?: string;
  severity: Severity;
  metadata?: Record<string, unknown>;
}

export interface ArkivLogger {
  record(event: AuditEventInput): void;
}

const DEFAULT_ENDPOINT = "http://localhost:3000/api/logs";

export function init(config: ArkivLogConfig): ArkivLogger {
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const apiKey = config.apiKey;
  const onError = config.onError ?? (() => {});

  return {
    record(event: AuditEventInput) {
      const payload = { ...event, timestamp: Date.now() };
      // Fire-and-forget: no await, errors caught and forwarded to onError.
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(onError);
    },
  };
}

export const arkivlog = { init };
