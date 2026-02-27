import { z } from "zod/v4";
import type { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction";
import { setPendingAction, getPendingAction } from "./threads";
import { dispatch } from "../src/dispatcher";
import type { ParsedCommand } from "../src/parser";

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

// ── Helper to dispatch a CLI command and return stringified result ──

interface BuildToolsContext {
  organizationId?: string;
  mode?: "live" | "test";
}

async function runCommand(
  token: string,
  resource: string,
  action: string,
  flags: Record<string, unknown> = {},
  id?: string,
  context?: BuildToolsContext
): Promise<string> {
  // Inject org and mode defaults so the LLM doesn't need to specify them
  if (context?.organizationId) {
    flags.current_organization_id = context.organizationId;
  }
  if (context?.mode && !flags.mode) {
    flags.mode = context.mode;
  }
  const command: ParsedCommand = { resource, action, flags, id };
  const result = await dispatch(command, token);
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

export function buildTools(threadId: string, token: string, context: BuildToolsContext = {}): Tool[] {
  // ── MFA-aware handlers ──

  async function createTransferIntent(args: z.infer<typeof CreateTransferIntentParameters>): Promise<string> {
    // Store pending action data for MFA approval flow
    const pendingData: Record<string, unknown> = {
      account_id: args.account_id,
      amount_cents: args.amount,
      amount_currency: args.currency,
      counterparty: {
        holder_name: args.counterparty_holder_name,
        holder_id: args.counterparty_holder_id,
        institution_id: args.counterparty_institution_id,
        type: args.counterparty_account_type,
        account_number: args.counterparty_account_number,
      },
      comment: args.comment,
      mode: args.mode ?? "live",
    };

    setPendingAction(threadId, {
      type: "create_transfer",
      data: pendingData,
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para confirmar la transferencia de $${(args.amount / 100).toLocaleString("es-CL")} ${args.currency} a ${args.counterparty_holder_name}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function requestMfa(args: z.infer<typeof RequestMfaParameters>): Promise<string> {
    const pending = getPendingAction(threadId);
    if (!pending) return JSON.stringify({ error: "No hay ninguna acción pendiente que requiera MFA." });
    return JSON.stringify({
      status: "otp_ready",
      message: "Pídele al usuario que ingrese su código MFA de 6 dígitos desde su aplicación de autenticación para confirmar la acción.",
    });
  }

  async function confirmMfa(args: z.infer<typeof ConfirmMfaParameters>): Promise<string> {
    const pending = getPendingAction(threadId);
    if (!pending) return JSON.stringify({ error: "No hay ninguna acción pendiente que requiera MFA." });
    if (!/^\d{6}$/.test(args.otp_code)) {
      return JSON.stringify({ error: "El código OTP debe ser exactamente 6 dígitos numéricos." });
    }
    // Execute the pending action via the CLI dispatcher
    const result = await executePendingAction(pending.type, pending.data, args.otp_code, token);
    setPendingAction(threadId, null);
    return result;
  }

  // ── Execute pending MFA actions via CLI dispatcher ──

  async function executePendingAction(
    type: string,
    data: Record<string, unknown>,
    otpCode: string,
    apiToken: string
  ): Promise<string> {
    if (type === "create_transfer") {
      const flags: Record<string, unknown> = {
        ...data,
        otp_code: otpCode,
      };
      return runCommand(apiToken, "transfer-intents", "create", flags, undefined, context);
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
      description: "Get bank transfers. Can filter by status and paginate.",
      schema: GetTransfersParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        if (args.limit) flags.limit = args.limit;
        if (args.starting_after) flags.starting_after = args.starting_after;
        if (args.status) flags.status = args.status;
        return runCommand(token, "transfers", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "get_transfer_by_id",
      description: "Get a specific transfer by its ID.",
      schema: GetTransferByIdParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "transfers", "show", flags, args.transfer_id, context);
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
      description: "Initiates MFA verification for a pending action. Call this after a tool returns mfa_required status. It will prompt the user to enter their 6-digit TOTP code from their authenticator app.",
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
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "webhook-endpoints", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "create_webhook",
      description: "Create a new webhook endpoint. Specify the URL and list of events to subscribe to.",
      schema: CreateWebhookParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.name) flags.name = args.name;
        flags.url = args.url;
        flags.enabled_events = args.enabled_events;
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "webhook-endpoints", "create", flags, undefined, context);
      },
    }),
    createTool({
      name: "update_webhook",
      description: "Update an existing webhook endpoint. Can change URL, events, status (enable/disable).",
      schema: UpdateWebhookParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.name) flags.name = args.name;
        if (args.url) flags.url = args.url;
        if (args.enabled_events) flags.enabled_events = args.enabled_events;
        if (args.disabled !== undefined) flags.disabled = args.disabled;
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "webhook-endpoints", "update", flags, args.webhook_id, context);
      },
    }),
    createTool({
      name: "delete_webhook",
      description: "Delete a webhook endpoint by ID.",
      schema: DeleteWebhookParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "webhook-endpoints", "delete", flags, args.webhook_id, context);
      },
    }),

    // ── Payments ──
    createTool({
      name: "list_payment_intents",
      description: "List payment intents.",
      schema: ListPaymentIntentsParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        if (args.limit) flags.limit = args.limit;
        return runCommand(token, "payments", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "get_payment_intent",
      description: "Get a specific payment intent by ID.",
      schema: GetPaymentIntentParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "payments", "show", flags, args.payment_intent_id, context);
      },
    }),

    // ── Refunds ──
    createTool({
      name: "create_refund",
      description: "Create a refund for a payment.",
      schema: CreateRefundParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {
          resource_type: args.resource_type,
          resource_id: args.resource_id,
        };
        if (args.amount) flags.amount = args.amount;
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "refunds", "create", flags, undefined, context);
      },
    }),

    // ── Subscriptions ──
    createTool({
      name: "list_subscriptions",
      description: "List subscriptions (direct debit / recurring payments).",
      schema: ListSubscriptionsParameters,
      handler: async () => runCommand(token, "subscriptions", "list", {}, undefined, context),
    }),

    // ── Charges ──
    createTool({
      name: "list_charges",
      description: "List charges (individual payments within subscriptions).",
      schema: ListChargesParameters,
      handler: async () => runCommand(token, "charges", "list", {}, undefined, context),
    }),

    // ── Banking Links (Data Aggregation) ──
    createTool({
      name: "list_banking_links",
      description: "List banking links (connections to users' bank accounts). Can filter by institution.",
      schema: ListBankingLinksParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        if (args.institution_id) flags.institution_id = args.institution_id;
        if (args.page) flags.page = args.page;
        if (args.per_page) flags.per_page = args.per_page;
        return runCommand(token, "links", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "get_banking_link",
      description: "Get a specific banking link by ID, including associated bank accounts.",
      schema: GetBankingLinkParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "links", "show", flags, args.link_id, context);
      },
    }),
    createTool({
      name: "delete_banking_link",
      description: "Delete a banking link.",
      schema: DeleteBankingLinkParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "links", "delete", flags, args.link_id, context);
      },
    }),

    // ── Movements ──
    createTool({
      name: "list_movements",
      description: "List bank movements (transactions) for a specific account.",
      schema: ListMovementsParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        if (args.limit) flags.limit = args.limit;
        return runCommand(token, "accounts", "movements", flags, args.account_id, context);
      },
    }),

    // ── Team ──
    createTool({
      name: "list_team_members",
      description: "List team members of the organization.",
      schema: ListTeamMembersParameters,
      handler: async () => runCommand(token, "organization-users", "list", {}, undefined, context),
    }),
    createTool({
      name: "invite_team_member",
      description: "Invite a new team member to the organization.",
      schema: InviteTeamMemberParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {
          name: args.name,
          last_name: args.last_name,
          email: args.email,
          organization_role: args.organization_role,
        };
        if (args.dashboard_role_name) flags.dashboard_role_name = args.dashboard_role_name;
        return runCommand(token, "organization-users", "create", flags, undefined, context);
      },
    }),
    createTool({
      name: "update_team_member_role",
      description: "Update a team member's role and info.",
      schema: UpdateTeamMemberRoleParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {
          user_data: {
            organization_role: args.organization_role,
            ...(args.name && { name: args.name }),
            ...(args.last_name && { last_name: args.last_name }),
          },
        };
        return runCommand(token, "organization-users", "update", flags, args.member_id, context);
      },
    }),
    createTool({
      name: "disable_team_member",
      description: "Remove a team member from the organization.",
      schema: DisableTeamMemberParameters,
      handler: async (args) => {
        return runCommand(token, "organization-users", "delete", {}, args.member_id, context);
      },
    }),

    // ── API Keys ──
    createTool({
      name: "get_api_keys_info",
      description: "Get information about the organization's API keys (type, environment, prefix). Does NOT reveal full key values.",
      schema: GetApiKeysInfoParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.mode) flags.mode = args.mode;
        return runCommand(token, "api-keys", "list", flags, undefined, context);
      },
    }),

    // ── Institutions ──
    createTool({
      name: "list_institutions",
      description: "List supported financial institutions. Can filter by country (CL, MX).",
      schema: ListInstitutionsParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.country) flags.country = args.country;
        return runCommand(token, "banks", "list", flags, undefined, context);
      },
    }),
  ];
}

// Keep defaultTools for backward compat
export const defaultTools: Tool[] = [];
