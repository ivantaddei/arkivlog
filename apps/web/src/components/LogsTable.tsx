"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { explorerAddressUrl, explorerEntityUrl } from "@/lib/explorer";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface ApiEntity {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  createdAtBlock: number | null;
  timestamp: number | null;
  payload: {
    eventType?: string;
    actor?: string;
    target?: string;
    severity?: Severity;
    metadata?: Record<string, unknown>;
  } | null;
}

interface ApiResponse {
  entities: ApiEntity[];
  count: number;
}

type SortKey = "timestamp" | "eventType" | "severity";
type SortDir = "asc" | "desc";

const SEVERITY_BADGE: Record<Severity, string> = {
  LOW: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  HIGH: "bg-orange-500/15 text-orange-300 ring-orange-500/40",
  CRITICAL: "bg-red-500/15 text-red-300 ring-red-500/40",
};

const SEVERITY_ORDER: Record<Severity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

const AUTO_REFRESH_MS = 4000;
const PAGE_SIZE = 50;
const TOTAL_COLS = 9;

function short(v?: string | null) {
  if (!v) return "—";
  return v.length > 18 ? `${v.slice(0, 10)}…${v.slice(-6)}` : v;
}

function fmtTime(ms: number | null) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es-AR", { hour12: false });
}

function toDatetimeLocal(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return "";
  const bytes = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function entitiesToCSV(entities: ApiEntity[]): string {
  const header = [
    "timestamp_iso",
    "timestamp_ms",
    "eventType",
    "severity",
    "actor",
    "target",
    "owner",
    "creator",
    "entityKey",
    "createdAtBlock",
    "metadata_json",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entities.map((e) => [
    e.timestamp ? new Date(e.timestamp).toISOString() : "",
    e.timestamp ?? "",
    e.payload?.eventType ?? "",
    e.payload?.severity ?? "",
    e.payload?.actor ?? "",
    e.payload?.target ?? "",
    e.owner ?? "",
    e.creator ?? "",
    e.entityKey,
    e.createdAtBlock ?? "",
    e.payload?.metadata ? JSON.stringify(e.payload.metadata) : "",
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "ok";
  hint?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-orange-300"
      : tone === "ok"
        ? "text-emerald-300"
        : "text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-zinc-200 ${
        active ? "text-zinc-200" : ""
      }`}
    >
      {label}
      <span aria-hidden className="text-[10px] opacity-70">
        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

function PayloadHash({ payload }: { payload: ApiEntity["payload"] }) {
  const [hash, setHash] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    sha256Hex(JSON.stringify(payload ?? {}))
      .then((h) => {
        if (!cancelled) setHash(h);
      })
      .catch(() => {
        if (!cancelled) setHash("");
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);
  if (!hash) return <span className="text-zinc-600">computando…</span>;
  return (
    <span className="font-mono text-xs text-zinc-400" title={hash}>
      {hash.slice(0, 16)}…{hash.slice(-6)}
    </span>
  );
}

export function LogsTable() {
  const [severity, setSeverity] = useState<Severity | "">("");
  const [eventType, setEventType] = useState("");
  const [actor, setActor] = useState("");
  const [entityKeyQuery, setEntityKeyQuery] = useState("");
  const [fromMs, setFromMs] = useState<number | null>(null);
  const [toMs, setToMs] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const hasActiveFilters =
    severity !== "" ||
    eventType !== "" ||
    actor !== "" ||
    entityKeyQuery !== "" ||
    fromMs !== null ||
    toMs !== null;

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (severity) p.set("severity", severity);
    if (eventType) p.set("eventType", eventType);
    if (actor) p.set("actor", actor);
    if (fromMs !== null) p.set("since", String(fromMs));
    p.set("limit", String(limit));
    return p.toString();
  }, [severity, eventType, actor, fromMs, limit]);

  const reload = useCallback(() => setRefreshTick((t) => t + 1), []);

  const clearFilters = useCallback(() => {
    setSeverity("");
    setEventType("");
    setActor("");
    setEntityKeyQuery("");
    setFromMs(null);
    setToMs(null);
    setLimit(PAGE_SIZE);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/logs?${queryString}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(json);
          setLastUpdated(Date.now());
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshTick]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setRefreshTick((t) => t + 1), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh]);

  // Client-side: apply `to` upper bound + entityKey search + sort.
  const visibleEntities = useMemo(() => {
    const base = data?.entities ?? [];
    const q = entityKeyQuery.trim().toLowerCase();
    let filtered = base;
    if (toMs !== null) {
      filtered = filtered.filter((e) => e.timestamp !== null && e.timestamp <= toMs);
    }
    if (q) {
      filtered = filtered.filter((e) =>
        e.entityKey.toLowerCase().includes(q),
      );
    }
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "timestamp") {
        cmp = (a.timestamp ?? 0) - (b.timestamp ?? 0);
      } else if (sortKey === "eventType") {
        cmp = (a.payload?.eventType ?? "").localeCompare(
          b.payload?.eventType ?? "",
        );
      } else if (sortKey === "severity") {
        cmp =
          SEVERITY_ORDER[a.payload?.severity ?? "LOW"] -
          SEVERITY_ORDER[b.payload?.severity ?? "LOW"];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [data, entityKeyQuery, toMs, sortKey, sortDir]);

  const stats = useMemo(() => {
    const entities = data?.entities ?? [];
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    let highCritical = 0;
    let last24h = 0;
    const actors = new Set<string>();
    for (const e of entities) {
      const sev = e.payload?.severity ?? "LOW";
      if (sev === "HIGH" || sev === "CRITICAL") highCritical++;
      if (e.timestamp && e.timestamp >= dayAgo) last24h++;
      if (e.payload?.actor) actors.add(e.payload.actor);
    }
    return {
      total: data?.count ?? 0,
      highCritical,
      uniqueActors: actors.size,
      last24h,
    };
  }, [data]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "timestamp" ? "desc" : "asc");
    }
  };

  const canLoadMore =
    !loading && data !== null && data.entities.length >= limit;

  const exportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: {
        severity: severity || null,
        eventType: eventType || null,
        actor: actor || null,
        entityKeyQuery: entityKeyQuery || null,
        fromMs,
        toMs,
      },
      count: visibleEntities.length,
      entities: visibleEntities,
    };
    downloadBlob(
      `arkivlog-${Date.now()}.json`,
      "application/json",
      JSON.stringify(payload, null, 2),
    );
  };

  const exportCSV = () => {
    downloadBlob(
      `arkivlog-${Date.now()}.csv`,
      "text/csv;charset=utf-8",
      entitiesToCSV(visibleEntities),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Eventos totales" value={stats.total} hint="tu tenant" />
        <StatCard
          label="HIGH + CRITICAL"
          value={stats.highCritical}
          tone={stats.highCritical > 0 ? "danger" : "default"}
          hint="requieren atención"
        />
        <StatCard
          label="Sesiones únicas"
          value={stats.uniqueActors}
          hint="actores distintos"
        />
        <StatCard
          label="Últimas 24h"
          value={stats.last24h}
          tone="ok"
          hint="actividad reciente"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | "")}
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Event type
          </label>
          <input
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="ej. TOOL_INVOKED"
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Actor
          </label>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="sessionId / email"
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Entity key
          </label>
          <input
            value={entityKeyQuery}
            onChange={(e) => setEntityKeyQuery(e.target.value)}
            placeholder="pegá un hash 0x…"
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Desde
          </label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(fromMs)}
            onChange={(e) => setFromMs(fromDatetimeLocal(e.target.value))}
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Hasta
          </label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(toMs)}
            onChange={(e) => setToMs(fromDatetimeLocal(e.target.value))}
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            ⟳ Refrescar
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              ✕ Limpiar filtros
            </button>
          )}
          <button
            type="button"
            onClick={exportJSON}
            disabled={visibleEntities.length === 0}
            className="rounded-md border border-emerald-700/60 bg-emerald-600/10 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↓ JSON
          </button>
          <button
            type="button"
            onClick={exportCSV}
            disabled={visibleEntities.length === 0}
            className="rounded-md border border-emerald-700/60 bg-emerald-600/10 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↓ CSV
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 select-none cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-emerald-500"
            />
            Auto {autoRefresh && <span className="text-emerald-400">●</span>}
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-400">
          {loading
            ? "Cargando…"
            : `${visibleEntities.length} de ${data?.count ?? 0} eventos${
                lastUpdated
                  ? ` · actualizado ${new Date(lastUpdated).toLocaleTimeString(
                      "es-AR",
                      { hour12: false },
                    )}`
                  : ""
              }`}
        </div>
        {error && <div className="text-red-400">⚠ {error}</div>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">
                <SortHeader
                  label="Cuándo"
                  active={sortKey === "timestamp"}
                  dir={sortDir}
                  onClick={() => toggleSort("timestamp")}
                />
              </th>
              <th className="px-3 py-2 text-left">
                <SortHeader
                  label="Event"
                  active={sortKey === "eventType"}
                  dir={sortDir}
                  onClick={() => toggleSort("eventType")}
                />
              </th>
              <th className="px-3 py-2 text-left">
                <SortHeader
                  label="Severity"
                  active={sortKey === "severity"}
                  dir={sortDir}
                  onClick={() => toggleSort("severity")}
                />
              </th>
              <th className="px-3 py-2 text-left">Actor</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">$owner</th>
              <th className="px-3 py-2 text-left">$creator</th>
              <th className="px-3 py-2 text-left">Entity</th>
              <th className="px-3 py-2 text-left">On-chain</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntities.map((e) => {
              const sev = e.payload?.severity ?? "LOW";
              const expanded = expandedKey === e.entityKey;
              const isOnChain = Boolean(e.entityKey && e.createdAtBlock);
              return (
                <Fragment key={e.entityKey}>
                  <tr
                    className="border-t border-zinc-800/60 hover:bg-zinc-900/40 cursor-pointer"
                    onClick={() =>
                      setExpandedKey(expanded ? null : e.entityKey)
                    }
                  >
                    <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                      {fmtTime(e.timestamp)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {e.payload?.eventType ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs ring-1 ${SEVERITY_BADGE[sev]}`}
                      >
                        {sev}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      <div
                        className="max-w-[180px] truncate"
                        title={e.payload?.actor ?? ""}
                      >
                        {e.payload?.actor ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      <div
                        className="max-w-[160px] truncate"
                        title={e.payload?.target ?? ""}
                      >
                        {e.payload?.target ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                      {e.owner ? (
                        <a
                          href={explorerAddressUrl(e.owner)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-400 block max-w-[140px] truncate"
                          title={e.owner}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {short(e.owner)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                      {e.creator ? (
                        <a
                          href={explorerAddressUrl(e.creator)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-400 block max-w-[140px] truncate"
                          title={e.creator}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {short(e.creator)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <a
                        href={explorerEntityUrl(e.entityKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 block max-w-[160px] truncate"
                        title={e.entityKey}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {short(e.entityKey)} ↗
                      </a>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isOnChain ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/40"
                            title="Inmutable y verificable en Arkiv"
                          >
                            <span aria-hidden>✓</span> verificado
                          </span>
                          <span
                            className="font-mono text-[10px] text-zinc-500"
                            title={`Block ${e.createdAtBlock}`}
                          >
                            #{e.createdAtBlock}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">pending…</span>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-zinc-900/30 border-t border-zinc-800/60">
                      <td colSpan={TOTAL_COLS} className="px-3 py-3">
                        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                          Payload completo
                        </div>
                        <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-200">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span>
                            createdAtBlock:{" "}
                            <span className="font-mono text-zinc-400">
                              {e.createdAtBlock ?? "—"}
                            </span>
                          </span>
                          <span>·</span>
                          <span>
                            $owner:{" "}
                            <span className="font-mono text-zinc-400">
                              {short(e.owner)}
                            </span>
                          </span>
                          <span>·</span>
                          <span>
                            $creator:{" "}
                            <span className="font-mono text-zinc-400">
                              {short(e.creator)}
                            </span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            sha256(payload):{" "}
                            <PayloadHash payload={e.payload} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && visibleEntities.length === 0 && (
              <tr>
                <td
                  colSpan={TOTAL_COLS}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  {hasActiveFilters ? (
                    <div className="space-y-2">
                      <div>
                        No hay eventos que coincidan con los filtros actuales.
                      </div>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  ) : (
                    <>
                      Sin eventos aún. Configurá tu API key en el demo y empezá
                      a chatear con la concesionaria.
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Cargar más ({PAGE_SIZE})
          </button>
        </div>
      )}
    </div>
  );
}
