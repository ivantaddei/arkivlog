"use client";

import { useSiwe } from "@/lib/use-siwe";
import { isDemoMode } from "@/lib/demo-mode";

function short(addr?: string | null) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWallet() {
  const { me, meLoading, signIn, signOut, busy, error } = useSiwe();

  if (isDemoMode()) {
    return (
      <span className="rounded-md border border-violet-800/60 bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-200">
        DEMO MODE
      </span>
    );
  }

  if (meLoading) {
    return <span className="text-sm text-zinc-500">…</span>;
  }

  if (me.address) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="font-mono text-sm text-emerald-300"
          title={me.address}
        >
          {short(me.address)}
        </span>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? "…" : "Cerrar sesión"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span className="text-xs text-red-400 max-w-[260px] truncate" title={error}>
          ⚠ {error}
        </span>
      )}
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Firmando…" : "Sign in with MetaMask"}
      </button>
    </div>
  );
}
