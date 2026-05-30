"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, type UIMessagePart } from "ai";
import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextPart {
  type: "text";
  text: string;
  state?: "streaming" | "done";
}

function isTextPart(p: UIMessagePart<never, never>): p is UIMessagePart<never, never> & TextPart {
  return (p as { type: string }).type === "text";
}

function isToolPart(p: UIMessagePart<never, never>) {
  const type = (p as { type: string }).type;
  return typeof type === "string" && type.startsWith("tool-");
}

function toolName(p: { type: string }) {
  return p.type.replace(/^tool-/, "");
}

const SUGGESTIONS = [
  "¿Qué Toyotas tenés disponibles bajo USD 30.000?",
  "Mostrame los detalles del VIN 2HGCM82633B654321",
  "Quiero agendar una prueba de manejo del Corolla para mañana",
  "Cotizame financiación: USD 25.000 con USD 5.000 de anticipo a 36 meses",
];

interface ChatProps {
  arkivLogConfigured?: boolean;
}

export function Chat({ arkivLogConfigured = true }: ChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    setSessionId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}`,
    );
  }, []);

  if (!sessionId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-500 shadow-sm">
        Iniciando sesión…
      </div>
    );
  }

  return <ChatInner sessionId={sessionId} arkivLogConfigured={arkivLogConfigured} />;
}

function ChatInner({
  sessionId,
  arkivLogConfigured,
}: {
  sessionId: string;
  arkivLogConfigured: boolean;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId },
      }),
    [sessionId],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const busy = status === "streaming" || status === "submitted";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    sendMessage({ text: trimmed });
  }

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Asistente IA</div>
          <div className="text-xs text-zinc-500 font-mono">
            session: {sessionId.slice(0, 8)}
          </div>
        </div>
        <a
          href="http://localhost:3100/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
        >
          🛡 Auditado con ArkivLog ↗
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-zinc-500">
            <p>Hola, soy el asistente de Concesionaria Demo. ¿En qué te puedo ayudar?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  disabled={busy}
                  className="text-xs rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            arkivLogConfigured={arkivLogConfigured}
          />
        ))}

        {busy && (
          <div className="text-xs text-zinc-500 italic animate-pulse">
            El asistente está pensando…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
            ⚠ {error.message}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-zinc-200 p-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder="Preguntame por inventario, agendá una prueba…"
          rows={1}
          className="flex-1 resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function Message({
  message,
  arkivLogConfigured,
}: {
  message: UIMessage;
  arkivLogConfigured: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-zinc-100 text-zinc-900"
        }`}
      >
        {message.parts.map((part, i) => {
          if (isTextPart(part)) {
            if (isUser) {
              return (
                <div key={i} className="whitespace-pre-wrap">
                  {part.text}
                </div>
              );
            }
            return (
              <div key={i} className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="my-1.5 list-disc pl-5 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1.5 list-decimal pl-5 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    h1: ({ children }) => <h1 className="text-base font-semibold my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-semibold my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold my-1.5">{children}</h3>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
                        {children}
                      </a>
                    ),
                    code: ({ children }) => (
                      <code className="rounded bg-zinc-200 px-1 py-0.5 text-[0.85em] font-mono">{children}</code>
                    ),
                    pre: ({ children }) => (
                      <pre className="my-2 overflow-x-auto rounded bg-zinc-900 p-2 text-xs text-zinc-100">{children}</pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-2 border-l-2 border-zinc-300 pl-3 text-zinc-600">{children}</blockquote>
                    ),
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }
          if (isToolPart(part)) {
            const anyPart = part as unknown as {
              type: string;
              state?: string;
            };
            const name = toolName(anyPart);
            const running = anyPart.state !== "output-available" && anyPart.state !== "output-error";
            return (
              <div
                key={i}
                className="my-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900"
              >
                <div className="flex items-center gap-2">
                  <span>🔧</span>
                  <span className="font-mono">{name}</span>
                  {running ? (
                    <span className="text-emerald-700 animate-pulse">…</span>
                  ) : arkivLogConfigured ? (
                    <span className="text-emerald-700">✓ logged on Arkiv</span>
                  ) : (
                    <span className="text-zinc-500">
                      (no logged — falta API key)
                    </span>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
