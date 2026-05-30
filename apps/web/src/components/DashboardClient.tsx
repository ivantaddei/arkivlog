"use client";

import { useSiwe } from "@/lib/use-siwe";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { LogsTable } from "./LogsTable";

export function DashboardClient() {
  const { me, meLoading, signIn, busy } = useSiwe();

  if (meLoading) {
    return (
      <div className="text-sm text-zinc-500">Cargando sesión…</div>
    );
  }

  if (!me.address) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="text-lg font-medium">
          Iniciá sesión para ver tus logs
        </div>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          ArkivLog usa Sign-In with Ethereum: conectás MetaMask, firmás un
          mensaje y se crea una sesión privada. Solo vos vas a ver los logs
          firmados con tu wallet.
        </p>
        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="mt-6 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {busy ? "Firmando…" : "Sign in with MetaMask"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApiKeyPanel />
      <LogsTable />
    </div>
  );
}
