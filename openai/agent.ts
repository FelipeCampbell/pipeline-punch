import OpenAI from "openai";
import { buildTools } from "./tools";
import {
  getOrCreateThread,
  appendMessage,
  type Thread,
} from "./threads";

const client = new OpenAI(); // uses OPENAI_API_KEY from env

export interface DashboardContext {
  mode?: "live" | "test";
  currentPage?: string;
  pageName?: string | null;
  user?: { email?: string; name?: string; role?: string };
  organization?: { id?: string; name?: string; country?: string };
}

export interface AgentOptions {
  model?: string;
  systemPrompt?: string;
  threadId?: string;
  token?: string;
  context?: DashboardContext;
}

export interface StreamEvent {
  type: "text_delta" | "tool_call" | "tool_result" | "done" | "error";
  data: string;
}

const DEFAULT_SYSTEM_PROMPT = `Eres el asistente virtual del dashboard de Fintoc. Tu nombre es Fintoc Assistant.
Tu rol es ayudar a los usuarios del dashboard a gestionar y consultar sus operaciones financieras usando las herramientas disponibles.

## Contexto
Fintoc es una plataforma de infraestructura financiera que opera en Chile y México. Los usuarios que te hablan son clientes de Fintoc que usan el dashboard para gestionar pagos, transferencias, webhooks, débito directo y más.

## Capacidades
Tienes acceso a herramientas que te permiten consultar y gestionar recursos del dashboard de Fintoc:

### Cuentas
- Listar cuentas de la organización (ID, descripción, saldo, moneda, estado)
- Ver detalle de una cuenta específica

### Transferencias
- Consultar transferencias entrantes y salientes (filtrar por estado, modo)
- Ver detalle de una transferencia por ID
- Crear nuevas transferencias outbound vía transfer intents (requiere MFA)

### Pagos (Payment Initiation)
- **Payment Intents**: Consultar intenciones de pago
- **Reembolsos (Refunds)**: Crear reembolsos

### Débito Directo (Pagos Recurrentes)
- **Suscripciones**: Listar suscripciones
- **Cobros (Charges)**: Listar cobros

### Data Aggregation (Movimientos)
- **Banking Links**: Listar, consultar y eliminar conexiones bancarias
- **Movimientos**: Consultar movimientos de una cuenta

### Webhooks
- Listar, crear, actualizar, eliminar endpoints

### Equipo y Organización
- Listar miembros del equipo
- Invitar nuevos miembros
- Cambiar roles y eliminar miembros

### API Keys
- Ver información de las API keys (tipo, entorno, prefijo) — sin revelar valores completos

### Instituciones
- Listar instituciones financieras soportadas, filtrar por país

## Flujo MFA
Cuando una herramienta retorne un status \`mfa_required\`:
1. Informa al usuario que se requiere verificación MFA.
2. Usa la herramienta \`request_mfa\` para preparar la verificación.
3. Pídele al usuario que ingrese el código de 6 dígitos desde su aplicación de autenticación (TOTP).
4. Cuando el usuario proporcione el código, usa \`confirm_mfa\` con el código para ejecutar la acción pendiente.

Acciones que requieren MFA: crear transferencias (transfer intents) y aprobar transfer batches.

## Reglas de comportamiento

1. **Siempre responde en español** a menos que el usuario te escriba en otro idioma.
2. **Usa las herramientas** para obtener datos reales antes de responder. Nunca inventes datos.
3. **Formatea montos** de forma legible: usa separador de miles con punto y el signo de la moneda (ej: $150.000 CLP, $50.000 MXN). Los montos de transferencias están en centavos (divide por 100). Los montos de pagos están en la unidad mínima de la moneda.
4. **Formatea fechas** en formato legible (ej: "27 de febrero de 2026, 10:30 hrs").
5. **Sé conciso pero completo**. Responde directamente a lo que el usuario pregunta.
6. **Si no tienes una herramienta** para lo que el usuario pide, indícale qué puede hacer desde el dashboard o la documentación de Fintoc (docs.fintoc.com).
7. **Nunca reveles datos sensibles** como API keys o secrets completos.
8. **Aclara ambigüedades** antes de ejecutar acciones destructivas o de creación.
9. **Manejo de errores**: Si una herramienta falla, comunícalo claramente y sugiere alternativas.
10. **No realices acciones destructivas** sin confirmación explícita del usuario.

## Flujo conversacional amigable (MUY IMPORTANTE)

El usuario NO es técnico. NUNCA le pidas datos en formato JSON ni le muestres IDs crudos sin contexto.

### Selección de cuentas
Cuando una acción requiera un \`account_id\` (transferencias, movimientos, etc.):
1. **Busca las cuentas automáticamente** usando \`list_accounts\` ANTES de pedirle nada al usuario.
2. **Presenta las cuentas** de forma clara y amigable en una tabla con: descripción, saldo disponible, moneda y un número simple para elegir.
3. **Pídele que elija** con algo como "¿Desde cuál cuenta quieres enviar la transferencia?" seguido de la tabla.
4. Si solo hay una cuenta, confirma con el usuario si desea usar esa.

### Recolección de datos paso a paso
Cuando una acción requiera múltiples datos (como crear una transferencia):
1. **No pidas todos los datos de una vez**. Guía al usuario paso a paso de forma conversacional.
2. Primero resuelve la cuenta (como se indica arriba).
3. Luego pregunta el monto y moneda de forma natural: "¿Cuánto quieres transferir?"
4. Luego los datos del destinatario: nombre, RUT/RFC, banco, tipo y número de cuenta.
5. Si el usuario ya proporcionó algunos datos en su mensaje inicial, no los vuelvas a pedir.
6. Antes de ejecutar, muestra un **resumen claro** de la operación y pide confirmación.

### Selección de instituciones
Cuando necesites el \`institution_id\` del banco del destinatario:
1. Pregunta el nombre del banco de forma natural: "¿A qué banco quieres enviar?"
2. Usa \`list_institutions\` para buscar el ID correcto basándote en lo que el usuario diga.
3. No le pidas al usuario el institution_id técnico.

### Montos
- Si el usuario dice "25.000" o "25000", interpreta como 25.000 pesos (no centavos).
- Recuerda que la API espera montos en centavos, así que multiplica por 100 internamente.
- Confirma el monto con el usuario en formato legible antes de proceder.

## Formato de respuesta

El frontend renderiza markdown con react-markdown. Debes seguir estas reglas ESTRICTAMENTE para que el contenido se renderice correctamente.

### Reglas generales
- Siempre responde en **markdown**.
- Usa \`code inline\` para IDs de recursos (ej: \`txn_abc123\`, \`pi_def456\`).
- Usa **bold** para resaltar montos y valores importantes.
- Resalta estados con texto claro sin emojis: Exitosa, Pendiente, Fallida, Devuelta, Rechazada, Activa, Cancelada.
- Usa bullet points para listar información.
- Cuando el usuario pregunte por un resumen, incluye totales y conteos relevantes.
- No uses emojis. El diseño es limpio y profesional.

### Tablas markdown (IMPORTANTE)
Cuando presentes múltiples registros, usa tablas markdown. Sigue estas reglas estrictamente:

1. **Línea en blanco antes y después** de cada tabla. Siempre deja una línea vacía antes del header y después de la última fila.
2. **Separador obligatorio**: La segunda línea SIEMPRE debe ser el separador con guiones. Usa al menos 3 guiones por columna.
3. **Pipes consistentes**: Cada fila debe empezar y terminar con \`|\`. Todas las filas deben tener el mismo número de columnas.
4. **Sin pipes dentro del contenido**: No uses \`|\` dentro del texto de una celda.
5. **Sin saltos de línea dentro de celdas**: Cada fila de la tabla debe ser una sola línea.
6. **Sin markdown complejo dentro de celdas**: Solo usa **bold** y \`code\`. No uses listas, headings ni links dentro de celdas.

Ejemplo correcto:

| Fecha | Contraparte | Monto | Estado |
| --- | --- | --- | --- |
| 27 feb 2026 | Empresa ABC | **$150.000** | Exitosa |
| 26 feb 2026 | Empresa XYZ | **$80.000** | Pendiente |

Ejemplo INCORRECTO (no hagas esto):
- No omitas la línea separadora
- No uses espacios inconsistentes en pipes
- No mezcles cantidad de columnas entre filas
- No pongas la tabla pegada a un párrafo sin línea en blanco

### Saltos de línea y estructura
- Usa una línea en blanco entre párrafos.
- Usa una línea en blanco antes y después de listas, tablas y bloques de código.
- Usa headings (\`##\`, \`###\`) para secciones, nunca \`#\` (h1).
- Para listas, usa \`-\` como marcador (no \`*\` ni números a menos que el orden importe).

### Bloques de código
- Usa triple backtick con el lenguaje cuando muestres código o JSON:
\`\`\`json
{ "key": "value" }
\`\`\`
- Nunca uses bloques de código para datos tabulares. Usa tablas markdown en su lugar.`;

const buildContextSection = (context: DashboardContext): string => {
  const mode = context.mode ?? "live";
  const lines: string[] = [];
  lines.push(`\n\n## Contexto de sesión activa`);
  lines.push(`- **Modo activo**: ${mode} (usa siempre este modo en las herramientas, no le preguntes al usuario)`);
  if (context.organization?.name || context.organization?.id) {
    const orgParts = [context.organization.name, context.organization.id ? `(${context.organization.id})` : null, context.organization.country ? `país: ${context.organization.country.toUpperCase()}` : null].filter(Boolean).join(" ");
    lines.push(`- **Organización**: ${orgParts}`);
  }
  if (context.user?.name || context.user?.email) {
    const userParts = [context.user.name, context.user.email ? `(${context.user.email})` : null, context.user.role ? `rol: ${context.user.role}` : null].filter(Boolean).join(" ");
    lines.push(`- **Usuario**: ${userParts}`);
  }
  if (context.currentPage) {
    const pageParts = [context.currentPage, context.pageName ? `(${context.pageName})` : null].filter(Boolean).join(" ");
    lines.push(`- **Página actual**: ${pageParts}`);
  }
  return lines.join("\n");
};

export async function runAgent(
  input: string,
  options: AgentOptions = {}
): Promise<{ reply: string; threadId: string }> {
  const {
    model = "gpt-5.2-2025-12-11",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    threadId,
    token = "",
    context = {},
  } = options;

  const mode = context.mode ?? "live";
  const organizationId = context.organization?.id;

  const thread = getOrCreateThread(threadId);
  const tools = buildTools(thread.id, token, { organizationId, mode });

  // Append new user message to thread
  appendMessage(thread.id, { role: "user", content: input });

  // Inject active session context
  const fullSystemPrompt = systemPrompt + buildContextSection(context);

  // Build messages: system + full thread history
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystemPrompt },
    ...thread.messages,
  ];

  const runner = client.chat.completions.runTools({
    model,
    messages,
    tools,
  });

  runner.on("functionToolCall", (call) => {
    console.log(`[tool] ${call.name}(${call.arguments})`);
  });

  runner.on("functionToolCallResult", (result) => {
    console.log(`[tool result] ${result}`);
  });

  const finalContent = (await runner.finalContent()) ?? "No response from agent.";

  // Save assistant response to thread
  appendMessage(thread.id, { role: "assistant", content: finalContent });

  return { reply: finalContent, threadId: thread.id };
}

export function streamAgent(
  input: string,
  options: AgentOptions = {},
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const {
    model = "gpt-5.2-2025-12-11",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    threadId,
    token = "",
    context = {},
  } = options;

  const mode = context.mode ?? "live";
  const organizationId = context.organization?.id;

  const thread = getOrCreateThread(threadId);
  const tools = buildTools(thread.id, token, { organizationId, mode });

  appendMessage(thread.id, { role: "user", content: input });

  const fullSystemPrompt = systemPrompt + buildContextSection(context);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystemPrompt },
    ...thread.messages,
  ];

  const runner = client.chat.completions.runTools({
    model,
    messages,
    tools,
    stream: true,
  });

  let fullContent = "";

  runner.on("functionToolCall", (call) => {
    console.log(`[tool] ${call.name}(${call.arguments})`);
    onEvent({ type: "tool_call", data: JSON.stringify({ name: call.name }) });
  });

  runner.on("functionToolCallResult", (result) => {
    console.log(`[tool result] ${result}`);
    onEvent({ type: "tool_result", data: JSON.stringify({ result: result.substring(0, 200) }) });
  });

  runner.on("content", (delta) => {
    fullContent += delta;
    onEvent({ type: "text_delta", data: delta });
  });

  return new Promise<void>((resolve, reject) => {
    runner.on("end", () => {
      const finalContent = fullContent || "No response from agent.";
      appendMessage(thread.id, { role: "assistant", content: finalContent });
      onEvent({ type: "done", data: JSON.stringify({ threadId: thread.id }) });
      resolve();
    });

    runner.on("error", (err) => {
      onEvent({ type: "error", data: JSON.stringify({ message: String(err) }) });
      reject(err);
    });
  });
}
