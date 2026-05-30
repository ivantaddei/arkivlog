"use client";

import { useCallback, useEffect, useState } from "react";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 4.22-5.06" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface KeyResponse {
  wallet: string;
  apiKey: string;
  projectKey: string;
  projectName: string;
  createdAt: number;
}

const REQUEST_TIMEOUT_MS = 15_000;

export function ApiKeyPanel() {
  const [data, setData] = useState<KeyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/keys", {
          credentials: "include",
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as KeyResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof DOMException && e.name === "AbortError"
            ? "El servidor tardó demasiado. Probá de nuevo."
            : e instanceof Error
              ? e.message
              : String(e);
        setError(msg);
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, [attempt]);

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        Generando tu API key… (la primera vez tarda ~10s, estamos creando tu
        Project entity en Arkiv)
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-300 flex items-center justify-between gap-3">
        <span>⚠ {error}</span>
        <button
          type="button"
          onClick={reload}
          className="rounded-md border border-red-700/50 bg-red-900/40 px-3 py-1 text-xs text-red-100 hover:bg-red-900/60"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-emerald-400">
          Tu API key
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          {data.projectName} · projectKey:{" "}
          <span className="font-mono">
            {data.projectKey.slice(0, 10)}…{data.projectKey.slice(-6)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded bg-zinc-950 p-2">
        <input
          type={revealed ? "text" : "password"}
          value={data.apiKey}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 bg-transparent font-mono text-xs text-emerald-200 outline-none"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Ocultar API key" : "Mostrar API key"}
          title={revealed ? "Ocultar" : "Mostrar"}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300"
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar API key"
          title={copied ? "Copiado" : "Copiar"}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Usá esta key en tu integración de ArkivLog. Cada log que se registre
        con ella quedará on-chain bajo TU wallet como{" "}
        <code className="text-zinc-300">$owner</code>.
      </p>
    </div>
  );
}
