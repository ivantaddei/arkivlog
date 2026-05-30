import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-emerald-500/20 ring-1 ring-emerald-500/40 grid place-items-center text-emerald-400 font-bold">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">
            ArkivLog
          </span>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            Inmutable AI audit trail · Arkiv testnet
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-zinc-300 hover:text-white">
            Dashboard
          </Link>
          <ConnectWallet />
        </nav>
      </div>
    </header>
  );
}
