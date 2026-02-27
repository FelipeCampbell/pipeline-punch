import { z } from "zod/v4";
import type { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction";
import { setPendingAction, getPendingAction } from "./threads";
import { apiRequest } from "../src/client";

// ── Tool factory ──

export type Tool = RunnableToolFunctionWithParse<any>;

export function createTool<T extends z.ZodType>(opts: {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<string>;
}): Tool {
  return {
    type: "function",
    function: {
      name: opts.name,
      description: opts.description,
      function: opts.handler,
      parse: (input: string) => opts.schema.parse(JSON.parse(input)),
      parameters: z.toJSONSchema(opts.schema) as Record<string, unknown>,
    },
  };
}

// ── Helper to call the Rails API and return stringified result ──

async function callApi(
  token: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options?: { query?: Record<string, unknown>; body?: Record<string, unknown> }
): Promise<string> {
  const result = await apiRequest({
    method,
    path,
    token,
    query: options?.query,
    body: options?.body,
  });
  return JSON.stringify(result.data);
}

// ══════════════════════════════════════════════════════════════
// ── Schemas ──
// ══════════════════════════════════════════════════════════════

// ── Transfers ──

const GetTransfersParameters = z.object({
  mode: z.enum(["live", "test"]).optional().describe("Environment mode: live or test"),
  limit: z.number().optional().describe("Max number of results"),
  starting_after: z.string().optional().describe("Cursor for pagination"),
  status: z.string().optional().describe("Filter by transfer status"),
});

const GetTransferByIdParameters = z.object({
  transfer_id: z.string().describe("The transfer ID"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

const CreateTransferIntentParameters = z.object({
  account_id: z.string().describe("Account ID to send from"),
  amount: z.number().describe("Amount in cents"),
  currency: z.enum(["CLP", "MXN"]).describe("Currency"),
  counterparty_holder_name: z.string().describe("Recipient's full name"),
  counterparty_holder_id: z.string().describe("Recipient's RUT or RFC"),
  counterparty_institution_id: z.string().describe("Recipient's bank institution ID"),
  counterparty_account_type: z.string().describe("Recipient's account type"),
  counterparty_account_number: z.string().describe("Recipient's account number"),
  comment: z.string().optional().describe("Optional comment"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

// ── MFA ──

const RequestMfaParameters = z.object({
  action_summary: z.string().describe("Brief description of the pending action that requires MFA verification"),
});

const ConfirmMfaParameters = z.object({
  otp_code: z.string().describe("The 6-digit OTP code provided by the user"),
});

// ── Webhooks ──

const ListWebhooksParameters = z.object({
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

const CreateWebhookParameters = z.object({
  name: z.string().optional().describe("Name for the webhook endpoint"),
  url: z.string().describe("The URL to receive webhook events"),
  enabled_events: z.array(z.string()).describe("List of event types to subscribe to"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

const UpdateWebhookParameters = z.object({
  webhook_id: z.string().describe("The webhook endpoint ID to update"),
  name: z.string().optional().describe("New name"),
  url: z.string().optional().describe("New URL"),
  enabled_events: z.array(z.string()).optional().describe("New list of events"),
  disabled: z.boolean().optional().describe("Whether to disable the webhook"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

const DeleteWebhookParameters = z.object({
  webhook_id: z.string().describe("The webhook endpoint ID to delete"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

// ── Payments ──

const ListPaymentIntentsParameters = z.object({
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
  limit: z.number().optional().describe("Max number of results"),
});

const GetPaymentIntentParameters = z.object({
  payment_intent_id: z.string().describe("The payment intent ID"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

// ── Refunds ──

const CreateRefundParameters = z.object({
  resource_type: z.string().describe("Resource type to refund (e.g. payment_intent)"),
  resource_id: z.string().describe("The resource ID to refund"),
  amount: z.number().optional().describe("Amount to refund (partial refund)"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

// ── Subscriptions ──

const ListSubscriptionsParameters = z.object({});

// ── Charges ──

const ListChargesParameters = z.object({});

// ── Banking Links ──

const ListBankingLinksParameters = z.object({
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
  institution_id: z.string().optional().describe("Filter by institution"),
  page: z.number().optional().describe("Page number"),
  per_page: z.number().optional().describe("Items per page"),
});

const GetBankingLinkParameters = z.object({
  link_id: z.string().describe("The banking link ID"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

const DeleteBankingLinkParameters = z.object({
  link_id: z.string().describe("The banking link ID to delete"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

// ── Movements ──

const ListMovementsParameters = z.object({
  account_id: z.string().describe("The account ID to list movements for"),
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
  limit: z.number().optional().describe("Max number of results"),
});

// ── Team ──

const ListTeamMembersParameters = z.object({});

const InviteTeamMemberParameters = z.object({
  name: z.string().describe("Name of the person to invite"),
  last_name: z.string().describe("Last name of the person to invite"),
  email: z.string().describe("Email of the person to invite"),
  organization_role: z.string().describe("Organization role to assign"),
  dashboard_role_name: z.string().optional().describe("Dashboard role name"),
});

const UpdateTeamMemberRoleParameters = z.object({
  member_id: z.string().describe("The organization user ID"),
  organization_role: z.string().describe("New organization role"),
  name: z.string().optional().describe("Updated name"),
  last_name: z.string().optional().describe("Updated last name"),
});

const DisableTeamMemberParameters = z.object({
  member_id: z.string().describe("The organization user ID to delete/disable"),
});

// ── API Keys ──

const GetApiKeysInfoParameters = z.object({
  mode: z.enum(["live", "test"]).optional().describe("Environment mode"),
});

// ── Institutions ──

const ListInstitutionsParameters = z.object({
  country: z.enum(["CL", "MX"]).optional().describe("Filter by country"),
});

// ══════════════════════════════════════════════════════════════
// ── Build all tools (with thread-scoped MFA handlers) ──
// ══════════════════════════════════════════════════════════════

export function buildTools(threadId: string, token: string): Tool[] {
  // ── MFA-aware handlers ──

  async function createTransferIntent(args: z.infer<typeof CreateTransferIntentParameters>): Promise<string> {
    const { mode, ...bodyArgs } = args;
    // Build counterparty nested object as the API expects
    const body: Record<string, unknown> = {
      account_id: bodyArgs.account_id,
      amount: bodyArgs.amount,
      currency: bodyArgs.currency,
      counterparty: {
        holder_name: bodyArgs.counterparty_holder_name,
        holder_id: bodyArgs.counterparty_holder_id,
        institution_id: bodyArgs.counterparty_institution_id,
        account_type: bodyArgs.counterparty_account_type,
        account_number: bodyArgs.counterparty_account_number,
      },
    };
    if (bodyArgs.comment) body.comment = bodyArgs.comment;

    // Store pending action for MFA approval flow
    setPendingAction(threadId, {
      type: "create_transfer",
      data: { ...body, mode: mode ?? "live" },
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para confirmar la transferencia de $${(args.amount / 100).toLocaleString("es-CL")} ${args.currency} a ${args.counterparty_holder_name}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function requestMfa(args: z.infer<typeof RequestMfaParameters>): Promise<string> {
    const pending = getPendingAction(threadId);
    if (!pending) return JSON.stringify({ error: "No hay ninguna acción pendiente que requiera MFA." });
    // Call real OTP endpoint
    const result = await callApi(token, "POST", "/internal/v1/dashboard/mfa/otp");
    return JSON.stringify({
      status: "otp_sent",
      message: "Se ha enviado un código OTP al dispositivo del usuario. Pídele al usuario que ingrese el código de 6 dígitos para confirmar la acción.",
      api_result: JSON.parse(result),
    });
  }

  async function confirmMfa(args: z.infer<typeof ConfirmMfaParameters>): Promise<string> {
    const pending = getPendingAction(threadId);
    if (!pending) return JSON.stringify({ error: "No hay ninguna acción pendiente que requiera MFA." });
    if (!/^\d{6}$/.test(args.otp_code)) {
      return JSON.stringify({ error: "El código OTP debe ser exactamente 6 dígitos numéricos." });
    }
    // Validate OTP
    const validateResult = await callApi(token, "POST", "/internal/v1/dashboard/mfa/otp/validate", {
      body: { code: args.otp_code },
    });
    // Execute the pending action
    const result = await executePendingAction(pending.type, pending.data, args.otp_code, token);
    setPendingAction(threadId, null);
    return result;
  }

  async function deleteWebhook(args: z.infer<typeof DeleteWebhookParameters>): Promise<string> {
    setPendingAction(threadId, {
      type: "delete_webhook",
      data: { webhook_id: args.webhook_id, mode: args.mode ?? "live" },
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para eliminar el webhook ${args.webhook_id}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function createRefundMfa(args: z.infer<typeof CreateRefundParameters>): Promise<string> {
    setPendingAction(threadId, {
      type: "create_refund",
      data: args as unknown as Record<string, unknown>,
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para crear el reembolso del recurso ${args.resource_id}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function deleteBankingLinkMfa(args: z.infer<typeof DeleteBankingLinkParameters>): Promise<string> {
    setPendingAction(threadId, {
      type: "delete_banking_link",
      data: { link_id: args.link_id, mode: args.mode ?? "live" },
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para eliminar el link bancario ${args.link_id}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function inviteTeamMemberMfa(args: z.infer<typeof InviteTeamMemberParameters>): Promise<string> {
    setPendingAction(threadId, {
      type: "invite_team_member",
      data: args as unknown as Record<string, unknown>,
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para invitar a ${args.name} ${args.last_name} (${args.email}) como ${args.organization_role}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function disableTeamMemberMfa(args: z.infer<typeof DisableTeamMemberParameters>): Promise<string> {
    setPendingAction(threadId, {
      type: "disable_team_member",
      data: { member_id: args.member_id },
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para deshabilitar al miembro ${args.member_id}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  // ── Execute pending MFA actions via real API ──

  async function executePendingAction(
    type: string,
    data: Record<string, unknown>,
    otpCode: string,
    apiToken: string
  ): Promise<string> {
    if (type === "create_transfer") {
      // Create the transfer intent
      const mode = (data.mode as string) ?? "live";
      const { mode: _, ...body } = data;
      const createResult = await callApi(apiToken, "POST", "/internal/v2/dashboard/transfer_intents", {
        body,
      });
      const created = JSON.parse(createResult);
      const intentId = created?.id ?? created?.data?.id;
      if (intentId) {
        // Approve via batch review with OTP
        return callApi(apiToken, "POST", "/internal/v2/dashboard/transfer_intents/batch_review", {
          body: {
            mode,
            transfer_intent_ids: [intentId],
            decision: "approve",
            otp_code: otpCode,
          },
        });
      }
      return createResult;
    }

    if (type === "delete_webhook") {
      const mode = (data.mode as string) ?? "live";
      return callApi(apiToken, "DELETE", `/internal/v1/dashboard/webhook_endpoints/${encodeURIComponent(data.webhook_id as string)}`, {
        query: { mode },
      });
    }

    if (type === "create_refund") {
      const { mode, ...body } = data;
      return callApi(apiToken, "POST", "/internal/v1/dashboard/refunds", {
        query: mode ? { mode } : undefined,
        body,
      });
    }

    if (type === "delete_banking_link") {
      const mode = (data.mode as string) ?? "live";
      return callApi(apiToken, "DELETE", `/internal/v1/dashboard/links/${encodeURIComponent(data.link_id as string)}`, {
        body: { mode },
      });
    }

    if (type === "invite_team_member") {
      return callApi(apiToken, "POST", "/internal/v1/dashboard/organization_users", {
        body: data,
      });
    }

    if (type === "disable_team_member") {
      return callApi(apiToken, "DELETE", `/internal/v1/dashboard/organization_users/${encodeURIComponent(data.member_id as string)}`);
    }

    return JSON.stringify({ error: "Unknown action type" });
  }

  // ══════════════════════════════════════════════════════════════
  // ── Return all tools ──
  // ══════════════════════════════════════════════════════════════

  return [
    // ── Transfers ──
    createTool({
      name: "get_transfers",
      description: "Get bank transfers. Can filter by status, mode, and paginate.",
      schema: GetTransfersParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        if (args.limit) query.limit = args.limit;
        if (args.starting_after) query.starting_after = args.starting_after;
        if (args.status) query.status = args.status;
        return callApi(token, "GET", "/internal/v2/dashboard/transfers", { query });
      },
    }),
    createTool({
      name: "get_transfer_by_id",
      description: "Get a specific transfer by its ID.",
      schema: GetTransferByIdParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        return callApi(token, "GET", `/internal/v2/dashboard/transfers/${encodeURIComponent(args.transfer_id)}`, { query });
      },
    }),
    createTool({
      name: "create_transfer",
      description: "Create a new outbound transfer intent. Requires MFA verification before approval.",
      schema: CreateTransferIntentParameters,
      handler: createTransferIntent,
    }),

    // ── MFA ──
    createTool({
      name: "request_mfa",
      description: "Initiates MFA verification for a pending action. Sends an OTP code to the user's registered device. Call this after a tool returns mfa_required status.",
      schema: RequestMfaParameters,
      handler: requestMfa,
    }),
    createTool({
      name: "confirm_mfa",
      description: "Confirms MFA verification with the 6-digit OTP code. On success, executes the pending action.",
      schema: ConfirmMfaParameters,
      handler: confirmMfa,
    }),

    // ── Webhooks ──
    createTool({
      name: "list_webhooks",
      description: "List all configured webhook endpoints with their URLs, events, and status.",
      schema: ListWebhooksParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        return callApi(token, "GET", "/internal/v1/dashboard/webhook_endpoints", { query });
      },
    }),
    createTool({
      name: "create_webhook",
      description: "Create a new webhook endpoint. Specify the URL and list of events to subscribe to.",
      schema: CreateWebhookParameters,
      handler: async (args) => {
        const { mode, ...body } = args;
        return callApi(token, "POST", "/internal/v1/dashboard/webhook_endpoints", {
          query: mode ? { mode } : undefined,
          body,
        });
      },
    }),
    createTool({
      name: "update_webhook",
      description: "Update an existing webhook endpoint. Can change URL, events, status (enable/disable).",
      schema: UpdateWebhookParameters,
      handler: async (args) => {
        const { webhook_id, mode, ...body } = args;
        return callApi(token, "PUT", `/internal/v1/dashboard/webhook_endpoints/${encodeURIComponent(webhook_id)}`, {
          query: mode ? { mode } : undefined,
          body,
        });
      },
    }),
    createTool({
      name: "delete_webhook",
      description: "Delete a webhook endpoint by ID. Requires MFA verification.",
      schema: DeleteWebhookParameters,
      handler: deleteWebhook,
    }),

    // ── Payments ──
    createTool({
      name: "list_payment_intents",
      description: "List payment intents. Can filter by mode.",
      schema: ListPaymentIntentsParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        if (args.limit) query.limit = args.limit;
        return callApi(token, "GET", "/internal/v1/dashboard/payment_intents", { query });
      },
    }),
    createTool({
      name: "get_payment_intent",
      description: "Get a specific payment intent by ID.",
      schema: GetPaymentIntentParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        return callApi(token, "GET", `/internal/v1/dashboard/payment_intents/${encodeURIComponent(args.payment_intent_id)}`, { query });
      },
    }),

    // ── Refunds ──
    createTool({
      name: "create_refund",
      description: "Create a refund for a payment. Requires MFA verification.",
      schema: CreateRefundParameters,
      handler: createRefundMfa,
    }),

    // ── Subscriptions ──
    createTool({
      name: "list_subscriptions",
      description: "List subscriptions (direct debit / recurring payments).",
      schema: ListSubscriptionsParameters,
      handler: async () => callApi(token, "GET", "/internal/v1/dashboard/subscriptions"),
    }),

    // ── Charges ──
    createTool({
      name: "list_charges",
      description: "List charges (individual payments within subscriptions).",
      schema: ListChargesParameters,
      handler: async () => callApi(token, "GET", "/internal/v1/dashboard/charges"),
    }),

    // ── Banking Links (Data Aggregation) ──
    createTool({
      name: "list_banking_links",
      description: "List banking links (connections to users' bank accounts). Can filter by mode and institution.",
      schema: ListBankingLinksParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        if (args.institution_id) query.institution_id = args.institution_id;
        if (args.page) query.page = args.page;
        if (args.per_page) query.per_page = args.per_page;
        return callApi(token, "GET", "/internal/v1/dashboard/links", { query });
      },
    }),
    createTool({
      name: "get_banking_link",
      description: "Get a specific banking link by ID, including associated bank accounts.",
      schema: GetBankingLinkParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        return callApi(token, "GET", `/internal/v1/dashboard/links/${encodeURIComponent(args.link_id)}`, { query });
      },
    }),
    createTool({
      name: "delete_banking_link",
      description: "Delete a banking link. Requires MFA verification.",
      schema: DeleteBankingLinkParameters,
      handler: deleteBankingLinkMfa,
    }),

    // ── Movements ──
    createTool({
      name: "list_movements",
      description: "List bank movements (transactions) for a specific account.",
      schema: ListMovementsParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        if (args.limit) query.limit = args.limit;
        return callApi(token, "GET", `/internal/v2/dashboard/accounts/${encodeURIComponent(args.account_id)}/movements`, { query });
      },
    }),

    // ── Team ──
    createTool({
      name: "list_team_members",
      description: "List team members of the organization.",
      schema: ListTeamMembersParameters,
      handler: async () => callApi(token, "GET", "/internal/v1/dashboard/organization_users"),
    }),
    createTool({
      name: "invite_team_member",
      description: "Invite a new team member to the organization. Requires MFA verification.",
      schema: InviteTeamMemberParameters,
      handler: inviteTeamMemberMfa,
    }),
    createTool({
      name: "update_team_member_role",
      description: "Update a team member's role and info.",
      schema: UpdateTeamMemberRoleParameters,
      handler: async (args) => {
        const { member_id, ...body } = args;
        return callApi(token, "PUT", `/internal/v1/dashboard/organization_users/${encodeURIComponent(member_id)}`, {
          body: { user_data: body },
        });
      },
    }),
    createTool({
      name: "disable_team_member",
      description: "Remove a team member from the organization. Requires MFA verification.",
      schema: DisableTeamMemberParameters,
      handler: disableTeamMemberMfa,
    }),

    // ── API Keys ──
    createTool({
      name: "get_api_keys_info",
      description: "Get information about the organization's API keys (type, environment, prefix). Does NOT reveal full key values.",
      schema: GetApiKeysInfoParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.mode) query.mode = args.mode;
        return callApi(token, "GET", "/internal/v1/dashboard/api_keys", { query });
      },
    }),

    // ── Institutions ──
    createTool({
      name: "list_institutions",
      description: "List supported financial institutions. Can filter by country (CL, MX).",
      schema: ListInstitutionsParameters,
      handler: async (args) => {
        const query: Record<string, unknown> = {};
        if (args.country) query.country = args.country;
        return callApi(token, "GET", "/internal/v1/dashboard/banks", { query });
      },
    }),
  ];
}

// Keep defaultTools for backward compat
export const defaultTools: Tool[] = [];
