import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import type { NextRequest } from "next/server";
import { chatModel } from "@/lib/vertex";
import { buildTools } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Tool execution + Arkiv writes can take >30s, give it room on Vercel.
export const maxDuration = 60;

const SYSTEM_PROMPT = `Sos el asistente virtual de "Concesionaria Demo", una concesionaria de vehículos.

Tu rol:
- Ayudar a clientes a encontrar el auto ideal de nuestro inventario.
- Cuando tengas que buscar autos, usá la tool searchInventory.
- Cuando un cliente pida detalles de un auto específico, usá getVehicleDetails con el VIN.
- Si el cliente quiere probarlo, usá scheduleTestDrive (pedile email y nombre primero).
- Para cotizaciones de financiación, usá getFinancingQuote.

Reglas:
- Respondé siempre en español rioplatense, casual pero profesional.
- Si una tool devuelve count=0 o found=false, sugerile alternativas.
- Nunca inventes VINs, precios ni features. Usá siempre lo que devuelven las tools.
- Cada tool que ejecutás queda registrada inmutablemente en Arkiv (audit trail).`;

export async function POST(req: NextRequest) {
  let body: { messages?: UIMessage[]; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const sessionId = body.sessionId ?? `anon-${crypto.randomUUID().slice(0, 8)}`;
  const tools = buildTools(sessionId);

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
