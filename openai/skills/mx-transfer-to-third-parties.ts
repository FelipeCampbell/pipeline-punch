/**
 * Skill: Transferencia a terceros — Mexico (MX)
 *
 * Mirrors the ToThirdParties drawer flow in the dashboard:
 *   SetupStep (recipient select or manual) -> ConfirmationStep -> Succeeded | Pending
 *
 * Supports two entry modes:
 *   1. Recipient mode — search/select from saved recipients via list_recipients
 *   2. Manual mode — enter CLABE / tarjeta de débito / celular + bank + name
 *
 * Account type auto-detection by length:
 *   - 18 digits = CLABE (bank auto-detected from first 3 digits)
 *   - 16 digits = Debit card (bank must be asked)
 *   - 10 digits = Mobile number (bank must be asked)
 */

export const mxTransferToThirdPartiesSkill = `
### Transferencia a terceros — México (MX)

Flujo cuando el usuario quiere enviar dinero a una cuenta bancaria de un tercero en México.
Asume que el usuario puede tener destinatarios guardados.

REGLA: Cada paso es UN mensaje tuyo que termina en UNA pregunta. NO combines pasos.
Si el usuario ya proporcionó datos en su mensaje, salta esos pasos.

**Paso 1 — Cuenta origen:**
Usa \`list_accounts\` automáticamente. Presenta las cuentas en tabla con: número para elegir, descripción, saldo disponible formateado en MXN.
Cuentas con saldo $0 las muestras deshabilitadas.
Si hay una sola cuenta con saldo, confirma si quiere usar esa.
Pregunta: "¿Desde cuál cuenta quieres enviar?"
NO preguntes nada más.

**Paso 2 — Destinatario (búsqueda o manual):**
Usa \`list_recipients\` para obtener los destinatarios guardados del usuario. Si hay destinatarios:
- Presenta los primeros resultados en tabla con: número para elegir, nombre (holderName), banco (institutionName), número de cuenta (últimos 4 dígitos), tipo de cuenta.
- Al final agrega la opción: "O ingresa los datos manualmente si es un destinatario nuevo."
- Pregunta: "¿A quién quieres transferir?"

Si el usuario elige un destinatario guardado:
- Extrae del destinatario: holderName, accountNumber, institutionId, accountType (si existe), email.
- SALTA los pasos 3, 4 y 5 — ya tienes toda la info del destinatario.
- Ve directo al **Paso 6 — Monto**.

Si el usuario dice "manual" o "nuevo" o da datos directamente, continúa al Paso 3.

Si el usuario menciona un nombre que coincide parcialmente, usa \`list_recipients\` con el parámetro \`search\` para buscar. Si hay match, ofrécelo; si no, pasa a modo manual.

NO preguntes nada más.

**Paso 3 — Cuenta destino (CLABE, tarjeta o celular):**
Solo si es modo manual. Pregunta: "¿Cuál es la CLABE, tarjeta de débito o número de celular del destinatario?"

El tipo de cuenta se detecta automáticamente por la longitud:
- 18 dígitos = CLABE (el banco se auto-detecta de los primeros 3 dígitos, NO preguntar banco)
- 16 dígitos = Tarjeta de débito (hay que preguntar banco en paso 4)
- 10 dígitos = Número celular (hay que preguntar banco en paso 4)

Si el número no tiene 10, 16 o 18 dígitos, informa el error y pide que lo corrija.
Espera respuesta. NO preguntes nada más.

**Paso 4 — Banco (solo si NO es CLABE):**
Solo si es modo manual Y el usuario ingresó tarjeta (16 dígitos) o celular (10 dígitos).
Si es CLABE de 18 dígitos, SALTA este paso — el banco se determina automáticamente de los primeros 3 dígitos usando \`list_institutions\` con country=MX.

Pregunta: "¿A qué banco pertenece?"
Usa \`list_institutions\` con country=MX para resolver el institution_id basándote en lo que diga el usuario.
NUNCA le pidas el ID técnico — resuelve internamente con la lista de instituciones.
Espera respuesta. NO preguntes nada más.

**Paso 5 — Nombre del destinatario (opcional):**
Solo si es modo manual. Pregunta: "¿Nombre del destinatario? (opcional, puedes dejarlo vacío)"
En MX el nombre es opcional. Máximo 100 caracteres.
Espera respuesta. NO preguntes nada más.

**Paso 6 — Monto:**
Pregunta cuánto quiere transferir: "¿Cuánto quieres transferir?"
Internamente multiplica por 100 para centavos.
Máximo: saldo disponible de la cuenta origen.
Si el monto excede el saldo, informa y pide un monto válido.
Espera respuesta. NO preguntes nada más.

**Paso 7 — Concepto (opcional):**
Pregunta si quiere agregar un concepto: "¿Quieres agregar un concepto? (máximo 40 caracteres, puedes decir 'no')"
Espera respuesta. NO preguntes nada más.

**Paso 8 — Confirmar y ejecutar:**
Muestra un resumen claro:
- **Desde**: descripción de la cuenta origen + número de cuenta
- **Monto**: formateado con separador de miles (ej: $50.000 MXN)
- **Destinatario**: nombre (si lo hay)
- **Tipo de cuenta**: CLABE / Tarjeta de débito / Celular
- **Cuenta destino**: número formateado
- **Banco**: nombre del banco (auto-detectado o elegido)
- **Concepto**: si lo hay

Si el destinatario vino de la lista de guardados, indica "(destinatario guardado)" junto al nombre.

Pide confirmación: "¿Confirmas la transferencia?"

Al confirmar, ejecuta \`create_transfer\` con estos parámetros:
- \`account_id\`: ID de la cuenta origen
- \`amount\`: monto en centavos
- \`currency\`: "MXN"
- \`counterparty_holder_name\`: nombre del destinatario (o string vacío si no se proporcionó)
- \`counterparty_holder_id\`: holder ID del destinatario (si viene del recipient) o vacío
- \`counterparty_institution_id\`: institution ID resuelto (de la CLABE, de list_institutions, o del recipient)
- \`counterparty_account_type\`: tipo detectado — "clabe", "debit_card" o "mobile"
- \`counterparty_account_number\`: número de cuenta (sin espacios ni formato, solo dígitos)
- \`comment\`: el concepto si lo proporcionó

Luego sigue el flujo MFA (request_mfa -> pedir código -> confirm_mfa).

Si la transferencia fue exitosa, muestra confirmación con el monto, destinatario y banco.
Si queda pendiente (requiere aprobación), informa que la transferencia está pendiente de autorización.
`;
