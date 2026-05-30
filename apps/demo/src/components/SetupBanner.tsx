import { ARKIVLOG_DASHBOARD_URL } from "@/lib/dashboard-url";

interface Props {
  arkivLog: boolean;
  vertex: boolean;
}

export function SetupBanner({ arkivLog, vertex }: Props) {
  if (arkivLog && vertex) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold">⚠ Configuración pendiente</div>
      <ul className="mt-2 space-y-1 list-disc list-inside">
        {!vertex && (
          <li>
            Faltan credenciales del modelo — el chat va a fallar al primer
            mensaje.
          </li>
        )}
        {!arkivLog && (
          <li>
            Todavía no conectaste una API key de ArkivLog. El asistente va a
            responder, pero{" "}
            <strong>NINGÚN tool call va a quedar registrado</strong> on-chain.
            Generá una key haciendo Sign-In en{" "}
            <a
              href={ARKIVLOG_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              el dashboard de ArkivLog
            </a>{" "}
            y conectala a esta app.
          </li>
        )}
      </ul>
    </div>
  );
}
