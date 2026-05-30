import Link from "next/link";
import { Header } from "@/components/Header";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          ARKIV × PunaTech 2026 · AI provenance &amp; audit
        </span>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">
          Cada acción de tu IA, inmutable.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          ArkivLog es un SDK + dashboard que registra cada llamada a tools de
          tu agente IA en Arkiv. Tamper-proof, queryable, con ownership por
          wallet. Si la IA lo hizo, queda escrito on-chain.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Abrir dashboard
          </Link>
          <a
            href="http://localhost:3200"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Probar demo (Concesionaria)
          </a>
        </div>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Feature
            title="$creator inmutable"
            body="Firmamos cada log con la wallet del SaaS. Imposible falsificar el origen."
          />
          <Feature
            title="$owner del usuario"
            body="Cada log pertenece a la wallet del cliente, que puede ejercer right-to-be-forgotten."
          />
          <Feature
            title="Retención diferenciada"
            body="LOW=7d, MEDIUM=30d, HIGH=90d, CRITICAL=365d. expiresIn por severity."
          />
        </section>

        <section className="mt-16 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">Cómo se usa</h2>
          <pre className="mt-4 overflow-x-auto rounded-md bg-zinc-950 p-4 text-sm text-zinc-200">
            <code>{`import { init } from "arkivlog";

const logger = init({
  apiKey: process.env.ARKIVLOG_API_KEY!,
  endpoint: "http://localhost:3100/api/logs",
});

logger.record({
  eventType: "TOOL_INVOKED",
  actor: sessionId,
  target: "searchInventory",
  severity: "LOW",
  metadata: { input, output },
});`}</code>
          </pre>
        </section>
      </main>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <h3 className="text-sm font-semibold text-emerald-300">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{body}</p>
    </div>
  );
}
