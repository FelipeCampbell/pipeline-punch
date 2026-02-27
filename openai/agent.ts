import OpenAI from "openai";
import { buildTools } from "./tools";
import {
  getOrCreateThread,
  appendMessage,
  type Thread,
} from "./threads";

const client = new OpenAI(); // uses OPENAI_API_KEY from env

export interface AgentOptions {
  model?: string;
  systemPrompt?: string;
  threadId?: string;
  token?: string;
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

### Transferencias
- Consultar transferencias entrantes y salientes (filtrar por estado, modo)
- Ver detalle de una transferencia por ID
- Crear nuevas transferencias outbound vía transfer intents (requiere MFA)

### Pagos (Payment Initiation)
- **Payment Intents**: Consultar intenciones de pago
- **Reembolsos (Refunds)**: Crear reembolsos (requiere MFA)

### Débito Directo (Pagos Recurrentes)
- **Suscripciones**: Listar suscripciones
- **Cobros (Charges)**: Listar cobros

### Data Aggregation (Movimientos)
- **Banking Links**: Listar, consultar y eliminar conexiones bancarias (eliminar requiere MFA)
- **Movimientos**: Consultar movimientos de una cuenta

### Webhooks
- Listar, crear, actualizar, eliminar endpoints (eliminar requiere MFA)

### Equipo y Organización
- Listar miembros del equipo
- Invitar nuevos miembros (requiere MFA)
- Cambiar roles y eliminar miembros (eliminar requiere MFA)

### API Keys
- Ver información de las API keys (tipo, entorno, prefijo) — sin revelar valores completos

### Instituciones
- Listar instituciones financieras soportadas, filtrar por país

## Flujo MFA
Cuando una herramienta retorne un status \`mfa_required\`:
1. Informa al usuario que se requiere verificación MFA.
2. Usa la herramienta \`request_mfa\` para enviar el código OTP.
3. Pídele al usuario que ingrese el código de 6 dígitos que recibió.
4. Cuando el usuario proporcione el código, usa \`confirm_mfa\` con el código para ejecutar la acción pendiente.

Acciones que requieren MFA: crear transferencias, eliminar webhooks, crear reembolsos, eliminar banking links, invitar miembros al equipo, eliminar miembros.

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

## Formato de respuesta
- Siempre responde en **markdown** — el frontend lo renderiza completo (tablas, listas, code, bold, headings).
- Usa **tablas markdown** con columnas bien definidas cuando presentes múltiples registros. Ejemplo:
  | Fecha | Contraparte | Monto | Estado |
  |---|---|---|---|
  | 27 feb 2026 | Empresa ABC | **$150.000** | Exitosa |
- Usa \`code inline\` para IDs de recursos (ej: \`txn_abc123\`, \`pi_def456\`).
- Usa **bold** para resaltar montos y valores importantes.
- Resalta estados con texto claro sin emojis: Exitosa, Pendiente, Fallida, Devuelta, Rechazada, Activa, Cancelada.
- Usa bullet points para listar información.
- Cuando el usuario pregunte por un resumen, incluye totales y conteos relevantes.
- No uses emojis. El diseño es limpio y profesional.`;

export async function runAgent(
  input: string,
  options: AgentOptions = {}
): Promise<{ reply: string; threadId: string }> {
  const {
    model = "gpt-4.1-2025-04-14",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    threadId,
    token = "",
  } = options;

  const thread = getOrCreateThread(threadId);
  const tools = buildTools(thread.id, token);

  // Append new user message to thread
  appendMessage(thread.id, { role: "user", content: input });

  // Build messages: system + full thread history
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
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
    model = "gpt-4.1-2025-04-14",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    threadId,
    token = "",
  } = options;

  const thread = getOrCreateThread(threadId);
  const tools = buildTools(thread.id, token);

  appendMessage(thread.id, { role: "user", content: input });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
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
