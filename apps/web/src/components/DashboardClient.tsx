"use client";

import { useSiwe } from "@/lib/use-siwe";
import { isDemoMode } from "@/lib/demo-mode";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { LogsTable } from "./LogsTable";

function DemoBanner() {
  return (
    <div className="rounded-lg border border-violet-900/40 bg-violet-950/30 p-4 text-sm">
      <div className="font-medium text-violet-200">
        🎬 Live demo — public read-only view
      </div>
      <p className="mt-1 text-violet-300/80">
        Estás viendo el audit trail de la wallet de servicio del demo público.
        En producción cada wallet ve solo sus propios logs (SIWE + API keys por
        wallet).{" "}
        <a
          href="https://github.com/ivantaddei/arkivlog#sdk-usage"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-violet-100"
        >
          Mirá el SDK
        </a>
        .
      </p>
    </div>
  );
}

export function DashboardClient() {
  const demo = isDemoMode();
  const { me, meLoading, signIn, busy } = useSiwe();

  if (demo) {
    return (
      <div className="space-y-6">
        <DemoBanner />
        <LogsTable />
      </div>
    );
  }

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
