import { Chat } from "@/components/Chat";
import { SetupBanner } from "@/components/SetupBanner";
import { getDemoConfigStatus } from "@/lib/server-config";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const config = getDemoConfigStatus();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="border-b border-zinc-200 bg-white shrink-0">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-zinc-900 text-white grid place-items-center font-bold">
              CD
            </div>
            <div>
              <div className="font-semibold">Concesionaria Demo</div>
              <div className="text-xs text-zinc-500">
                Tu próximo auto, asistido por IA
              </div>
            </div>
          </div>
          <a
            href="http://localhost:3100/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs rounded-md border px-3 py-1.5 ${
              config.arkivLog
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-zinc-200 bg-zinc-50 text-zinc-500"
            }`}
          >
            {config.arkivLog
              ? "🛡 Auditoría activa (ArkivLog)"
              : "⚠ Sin auditoría"}
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 min-h-0 px-6 py-4 grid gap-6 lg:grid-cols-[1fr_320px] overflow-hidden">
        <section className="flex flex-col min-h-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Encontrá el auto que buscás.
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Charlá con nuestro asistente IA. Cada acción que toma queda
            registrada inmutablemente en Arkiv: vos podés verificar después
            qué consultó, qué te respondió y por qué.
          </p>

          <div className="mt-3">
            <SetupBanner
              arkivLog={config.arkivLog}
              vertex={config.vertex}
            />
          </div>

          <div className="mt-4 flex-1 min-h-0">
            <Chat arkivLogConfigured={config.arkivLog} />
          </div>
        </section>

        <aside className="space-y-3 overflow-y-auto min-h-0">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Cómo funciona</h2>
            <ol className="mt-2 space-y-2 text-sm text-zinc-600 list-decimal list-inside">
              <li>El asistente entiende tu mensaje (Gemini 2.5).</li>
              <li>Llama tools internas para buscar inventario, agendar, etc.</li>
              <li>Cada tool-call se loggea on-chain vía ArkivLog.</li>
              <li>
                Auditá el trail completo en el{" "}
                <a
                  href="http://localhost:3100/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  dashboard
                </a>
                .
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Tools disponibles</h2>
            <ul className="mt-2 space-y-1 text-xs text-zinc-600 font-mono">
              <li>· searchInventory <span className="text-zinc-400">(LOW)</span></li>
              <li>· getVehicleDetails <span className="text-zinc-400">(LOW)</span></li>
              <li>· scheduleTestDrive <span className="text-amber-600">(MEDIUM)</span></li>
              <li>· getFinancingQuote <span className="text-orange-600">(HIGH)</span></li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
