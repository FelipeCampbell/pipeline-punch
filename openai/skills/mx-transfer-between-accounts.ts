/**
 * Skill: Transferencia entre cuentas propias — Mexico (MX)
 *
 * Mirrors the BetweenAccounts drawer flow in the dashboard:
 *   SetupStep -> ConfirmationStep -> Succeeded | Pending
 *
 * The counterparty is always another Fintoc account of the same organisation,
 * so the institution ID is Fintoc MX (90735) and account type is checking_account.
 */

export const mxTransferBetweenAccountsSkill = `
### Transferencia entre mis cuentas — México (MX)

Flujo cuando el usuario quiere mover dinero entre sus propias cuentas Fintoc mexicanas.
Requiere al menos 2 cuentas activas en la organización.

REGLA: Cada paso es UN mensaje tuyo que termina en UNA pregunta. NO combines pasos.
Si el usuario ya proporcionó datos en su mensaje, salta esos pasos.

**Paso 1 — Cuenta origen:**
Usa \`list_accounts\` automáticamente. Presenta las cuentas en tabla con: número para elegir, descripción, saldo disponible formateado en MXN.
Cuentas con saldo $0 las muestras deshabilitadas.
Si hay solo 2 cuentas, sugiere cuál usar como origen (la de mayor saldo).
Si hay una sola cuenta, informa que no es posible hacer transferencia entre cuentas propias (se necesitan al menos 2).
Pregunta: "¿Desde cuál cuenta quieres enviar?"
NO preguntes nada más.

**Paso 2 — Cuenta destino:**
Presenta las cuentas restantes (excluyendo la elegida como origen) en tabla con: número para elegir, descripción, número de cuenta.
Si solo queda una cuenta disponible, confirma si quiere enviar a esa.
Pregunta: "¿A cuál cuenta quieres enviar?"
NO preguntes nada más.

**Paso 3 — Monto:**
Pregunta cuánto quiere transferir: "¿Cuánto quieres transferir?"
Internamente multiplica por 100 para centavos.
Máximo: saldo disponible de la cuenta origen.
Si el monto excede el saldo, informa y pide un monto válido.
Espera respuesta. NO preguntes nada más.

**Paso 4 — Concepto (opcional):**
Pregunta si quiere agregar un concepto: "¿Quieres agregar un concepto? (máximo 40 caracteres, puedes decir 'no')"
En MX el campo se llama "concepto" (no "comentario").
Espera respuesta. NO preguntes nada más.

**Paso 5 — Confirmar y ejecutar:**
Muestra un resumen claro:
- **Desde**: descripción de la cuenta origen + número de cuenta
- **Hacia**: descripción de la cuenta destino + número de cuenta
- **Monto**: formateado con separador de miles (ej: $50.000 MXN)
- **Concepto**: si lo hay

Pide confirmación: "¿Confirmas la transferencia?"

Al confirmar, ejecuta \`create_transfer\` con estos parámetros:
- \`account_id\`: ID de la cuenta origen
- \`amount\`: monto en centavos
- \`currency\`: "MXN"
- \`counterparty_holder_name\`: nombre del titular de la cuenta destino (viene de list_accounts)
- \`counterparty_holder_id\`: holder ID de la cuenta destino (viene de list_accounts)
- \`counterparty_institution_id\`: "90735" (Fintoc MX, SIEMPRE este valor para entre cuentas)
- \`counterparty_account_type\`: "checking_account" (SIEMPRE este valor para entre cuentas)
- \`counterparty_account_number\`: número de cuenta destino (viene de list_accounts)
- \`comment\`: el concepto si lo proporcionó

Luego sigue el flujo MFA (request_mfa -> pedir código -> confirm_mfa).

Si la transferencia fue exitosa, muestra confirmación con el monto y las cuentas involucradas.
Si queda pendiente (requiere aprobación), informa que la transferencia está pendiente de autorización.
`;
