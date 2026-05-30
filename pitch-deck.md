# ArkivLog — Pitch Deck

> Working doc para iterar el deck antes de pasarlo a Claude Design / Figma / Slides. Editar libremente: copy, layout, orden.

**Contexto fijo:**
- Hackathon: ARKIV × PunaTech 2026 · track _AI Applications on ARKIV_ · vertical _AI provenance & audit_
- Duración del pitch: **90 segundos**
- Idioma: **español argentino neutro**
- Audiencia: jurado técnico
- Formato: **16:9**, dark mode
- **El deck es self-contained**: el demo va aparte en un video pre-grabado. Las slides cuentan la historia sin depender de que algo corra en vivo.

---

## Estilo visual (referencia transversal)

| Elemento | Valor |
|---|---|
| Paleta base | Fondo `#0d0d12`, texto `#f5f5f7` |
| Acento principal | Violeta Arkiv `#6f42c1` |
| Acento positivo | Verde `#0a7c3e` |
| Acento crítico | Naranja para severidades altas |
| Tipografía display | Inter / Geist (sans-serif moderna) |
| Tipografía mono | JetBrains Mono / Fira Code |
| Densidad | Máximo 3 ideas por slide. Espacio en blanco a propósito. |
| Prohibido | Gradientes saturados, stock photos, logos de terceros como protagonistas |

---

## Slide 1 — Hook / Portada

**Anchor visual:** logo + tagline gigantes, todo lo demás secundario.

- **Título:** `ArkivLog`
- **Subtítulo:** _"Auditoría inmutable para agentes IA."_
- **Tagline:** _"Cada acción de tu agente, firmada on-chain. Imposible de falsificar."_
- **Badge visible:** `npm i arkivlog`
- **Footer:** `ARKIV × PunaTech 2026 · Track AI Applications on ARKIV`

**Notas de layout:** título centrado, tagline debajo en peso medio, badge tipo "chip" abajo-centro.

---

## Slide 2 — El problema

**Anchor visual:** título grande arriba + 3 bullets con íconos line-art.

- **Título:** _"Los agentes IA actúan en el mundo. Nadie audita qué hacen."_
- **Bullets:**
  - 🤖 Tu agente consulta DBs, paga, agenda, decide.
  - 📝 Los logs viven en una base de datos común — los edita cualquiera con permisos de escritura.
  - ⚖️ Sin registro inviolable: no hay compliance, no hay forensics, no hay confianza.
- **Visual sugerido:** diagrama minimalista de un agente con flecha a "log mutable" tachado en rojo.

---

## Slide 3 — La solución

**Anchor visual:** snippet de código grande con syntax highlight, centrado.

- **Título:** _"ArkivLog: 3 líneas, audit trail inmutable."_
- **Snippet:**
  ```ts
  import { init } from "arkivlog";
  const logger = init({ apiKey, endpoint });
  logger.record({ eventType, actor, severity, metadata });
  ```
- **Subtítulo (abajo):** _"Fire-and-forget. No bloquea tu request path."_

**Notas:** el snippet debe ser legible a 3 metros — usar peso medio, line-height generoso.

---

## Slide 4 — Las 3 garantías

**Anchor visual:** 3 columnas iguales. Esta es la slide más importante del pitch.

- **Título:** _"Por qué Arkiv y no Postgres."_
- **Columnas:**
  | Ícono | Título | Descripción |
  |---|---|---|
  | 🔒 | **Origen tamper-proof** | `$creator` = wallet del backend, inmutable. |
  | 👤 | **Propiedad del usuario** | `$owner` = wallet del end-user. Él controla retención. |
  | ⏱️ | **Retención diferenciada** | `expiresIn` por severidad: `7d` / `30d` / `90d` / `365d`. |

---

## Slide 5 — Cómo funciona (arquitectura)

**Anchor visual:** diagrama horizontal de 4 nodos conectados con flechas. Esta slide reemplaza la demo en vivo — cuenta el flow sin mostrar pantallas.

- **Título:** _"Del tool-call al registro inmutable, en una request."_
- **Diagrama (4 cajas en fila):**
  1. **Agente IA** — invoca un tool (`searchInventory`, `processPayment`, etc.)
  2. **SDK ArkivLog** — captura `eventType`, `actor`, `severity`, `metadata`
  3. **API Route** — firma con wallet del backend, crea la entidad
  4. **Arkiv Braga** — entidad on-chain · `$creator` backend · `$owner` usuario
- **Línea de retorno (abajo):** Dashboard ← lee entidades por `owner` o `creator` ← Arkiv
- **Footer pequeño:** _"Video demo del flow completo: [URL]"_

**Notas:** las 4 cajas deben tener iconos consistentes y la flecha final (paso 4) resaltada en violeta Arkiv — es donde ocurre la inmutabilidad.

---

## Slide 6 — Stack y entregables

**Anchor visual:** 2 columnas balanceadas.

- **Título:** _"Lo que entregamos."_
- **Columna izquierda — Stack:**
  - Arkiv Braga testnet
  - Next.js 16 · TypeScript
  - Vertex AI (Gemini 2.5 Flash)
  - SIWE + wagmi/viem
  - pnpm monorepo
- **Columna derecha — Entregables:**
  - 📦 SDK público en [npmjs.com/package/arkivlog](https://www.npmjs.com/package/arkivlog)
  - 🖥️ Dashboard SaaS deployado
  - 🤖 Demo agente IA funcionando end-to-end
  - 🎥 Video demo del flow completo
  - 📚 README + arquitectura documentada

---

## Slide 7 — Cierre / Ask

**Anchor visual:** frase grande centrada, 3 CTAs abajo.

- **Frase grande:** _"La auditoría inmutable no es una feature. Es la arquitectura."_
- **CTAs (tres chips iguales):**
  - `npm i arkivlog`
  - 🌐 [Live demo](#) _(reemplazar con URL Vercel)_
  - 🐙 [Repo](https://github.com/ivantaddei/arkivlog)
- **Footer:** nombre + wallet/contacto

---

## Guion hablado de 90 segundos (borrador)

> _Editable. Pensado para acompañar las slides — no leer literal. El demo está en video aparte; el guion del deck no depende de mostrar pantallas en vivo._

**[0:00 – 0:10] Slide 1 — Hook**
"Hola, soy Ivan. Les muestro **ArkivLog**: auditoría inmutable para agentes IA. Cada acción de tu agente, firmada on-chain."

**[0:10 – 0:25] Slide 2 — Problema**
"Hoy los agentes LLM actúan en el mundo real: consultan inventario, pagan, agendan. Pero los logs viven en bases de datos comunes que cualquiera con permisos puede editar. No hay forma de probar qué hizo tu agente."

**[0:25 – 0:40] Slide 3 — Solución**
"ArkivLog se integra en 3 líneas. `npm i arkivlog`, inicializás con tu API key, y llamás `record()`. Fire-and-forget, no bloquea nada."

**[0:40 – 1:00] Slide 4 — Las 3 garantías**
"Tres cosas que solo Arkiv te da: uno, el creator es la wallet del backend, imposible de falsificar. Dos, el owner es la wallet del usuario, él controla la retención y puede ejercer derecho al olvido. Tres, retención diferenciada por severidad — un evento crítico vive un año, uno informativo siete días."

**[1:00 – 1:20] Slide 5 — Arquitectura**
"El flow es directo: el agente invoca un tool, el SDK lo captura, la API route lo firma con la wallet del backend y crea una entidad en Arkiv Braga. Desde ese momento es inmutable. El dashboard lee las entidades por owner. Hay un video corto con el flujo end-to-end."

**[1:20 – 1:30] Slide 7 — Cierre**
"La auditoría inmutable no es una feature, es la arquitectura. SDK público en npm hoy. Gracias."

---

## TODOs antes de finalizar el deck

- [ ] Reemplazar `#` placeholders por URL real de Vercel (slide 7) y URL del video demo (slide 5)
- [ ] Diagrama de arquitectura (slide 5) — 4 cajas + flecha de retorno al dashboard
- [ ] Mock del diagrama "log mutable tachado" (slide 2)
- [ ] Logo de ArkivLog (si llegamos a diseñar uno)
- [ ] Ajustar guion al cronómetro real una vez ensayado

---

## Prompt listo para Claude Design

> Pegá esto cuando el contenido de las slides arriba esté estable.

````
Armá un pitch deck de 7 slides para ArkivLog (hackathon ARKIV × PunaTech 2026, track AI provenance & audit, pitch en español de 90 segundos, formato 16:9 dark mode).

El contenido exacto de cada slide y el estilo visual están en este documento de referencia — usalo verbatim, no inventes copy nuevo. El deck es self-contained: el demo va en video aparte, no hay que dejar espacio para screenshots en vivo.

[Pegar aquí el contenido de las slides 1-7 más la sección "Estilo visual"]

Generá las 7 slides respetando layout, copy y paleta.
````
