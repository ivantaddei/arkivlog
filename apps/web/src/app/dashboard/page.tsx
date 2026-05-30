import { Header } from "@/components/Header";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tu Provenance Trail
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Solo vos podés ver tus logs. Cada evento es firmado por el backend
            de ArkivLog (<code className="text-zinc-300">$creator</code>) y
            tiene tu wallet como <code className="text-zinc-300">$owner</code>.
          </p>
        </div>
        <DashboardClient />
      </main>
    </>
  );
}
