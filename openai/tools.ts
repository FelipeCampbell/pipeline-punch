import { z } from "zod/v4";
import type { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction";
import { setPendingAction, getPendingAction } from "./threads";
import { dispatch } from "../src/dispatcher";
import { resolveRoute, getAllRoutes } from "./navigation";
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

export interface BuildToolsContext {
  organizationId?: string;
  mode?: "live" | "test";
}

export type OnNavigateCallback = (path: string, name: string) => void;

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
  limit: z.number().optional().describe("Maximum number of transfers to return. Defaults to 20 if not specified."),
  starting_after: z.string().optional().describe("Cursor for pagination: the ID of the last transfer from the previous page (e.g. 'txn_abc123'). Omit for the first page."),
  status: z.string().optional().describe("Filter transfers by status. Possible values: 'pending', 'succeeded', 'failed', 'reversed'. Omit to return all statuses."),
});

const GetTransferByIdParameters = z.object({
  transfer_id: z.string().describe("The unique transfer ID to retrieve (e.g. 'txn_abc123'). Obtain this from the list_transfers results or from the user."),
});

const CreateTransferIntentParameters = z.object({
  account_id: z.string().describe("The Fintoc account ID to send the transfer from (e.g. 'acc_abc123'). Use list_accounts first to find available accounts."),
  amount: z.number().describe("Transfer amount in cents (centavos). For example, $25.000 CLP = 2500000 cents. Always multiply the user-facing amount by 100."),
  currency: z.enum(["CLP", "MXN"]).describe("Currency code for the transfer: 'CLP' for Chilean Peso, 'MXN' for Mexican Peso."),
  counterparty_holder_name: z.string().describe("Full legal name of the recipient (e.g. 'Juan Pérez López')."),
  counterparty_holder_id: z.string().describe("Recipient's tax identification number: RUT for Chile (e.g. '12.345.678-9') or RFC for Mexico."),
  counterparty_institution_id: z.string().describe("The Fintoc institution ID of the recipient's bank (e.g. 'cl_banco_estado'). Use list_institutions to find the correct ID."),
  counterparty_account_type: z.string().describe("Type of the recipient's bank account: 'checking_account', 'savings_account', or 'vista_account'."),
  counterparty_account_number: z.string().describe("The recipient's bank account number."),
  comment: z.string().optional().describe("Optional descriptive comment or reference for the transfer (e.g. 'Pago factura #1234')."),
});

// ── MFA ──

const RequestMfaParameters = z.object({
  action_summary: z.string().describe("A brief, human-readable description of the pending action that requires MFA verification (e.g. 'Transferencia de $50.000 CLP a Juan Pérez'). This is shown to the user for context."),
});

const ConfirmMfaParameters = z.object({
  otp_code: z.string().describe("The 6-digit numeric OTP code provided by the user from their authenticator app (e.g. '123456'). Must be exactly 6 digits."),
});

// ── Webhooks ──

const ListWebhooksParameters = z.object({});

const CreateWebhookParameters = z.object({
  name: z.string().optional().describe("A friendly name for the webhook endpoint (e.g. 'Notificaciones de pagos'). Optional but recommended for identification."),
  url: z.string().describe("The HTTPS URL that will receive webhook event POST requests (e.g. 'https://myapp.com/webhooks/fintoc')."),
  enabled_events: z.array(z.string()).describe("List of Fintoc event types to subscribe to (e.g. ['payment_intent.succeeded', 'transfer.created']). Use '*' to subscribe to all events."),
});

const UpdateWebhookParameters = z.object({
  webhook_id: z.string().describe("The ID of the webhook endpoint to update (e.g. 'we_abc123'). Obtain this from list_webhooks."),
  name: z.string().optional().describe("New friendly name for the webhook endpoint."),
  url: z.string().optional().describe("New HTTPS URL for the webhook endpoint."),
  enabled_events: z.array(z.string()).optional().describe("New list of event types to subscribe to. This replaces the existing list entirely."),
  disabled: z.boolean().optional().describe("Set to true to disable the webhook (stops receiving events), or false to re-enable it."),
});

const DeleteWebhookParameters = z.object({
  webhook_id: z.string().describe("The ID of the webhook endpoint to permanently delete (e.g. 'we_abc123'). This action cannot be undone."),
});

// ── Payments ──

const ListPaymentIntentsParameters = z.object({
  limit: z.number().optional().describe("Maximum number of payment intents to return. Defaults to 20 if not specified."),
});

const GetPaymentIntentParameters = z.object({
  payment_intent_id: z.string().describe("The unique payment intent ID to retrieve (e.g. 'pi_abc123'). Obtain this from list_payment_intents or from the user."),
});

// ── Refunds ──

const CreateRefundParameters = z.object({
  resource_type: z.string().describe("The type of resource to refund. Currently supported: 'payment_intent'."),
  resource_id: z.string().describe("The ID of the resource to refund (e.g. 'pi_abc123' for a payment intent)."),
  amount: z.number().optional().describe("Amount to refund in the smallest currency unit (cents). Omit to refund the full amount. Provide a value for partial refunds."),
});

// ── Subscriptions ──

const ListSubscriptionsParameters = z.object({});

// ── Charges ──

const ListChargesParameters = z.object({});

// ── Banking Links ──

const ListBankingLinksParameters = z.object({
  institution_id: z.string().optional().describe("Filter banking links by financial institution ID (e.g. 'cl_banco_estado'). Use list_institutions to find valid IDs. Omit to return all links."),
  page: z.number().optional().describe("Page number for pagination (starts at 1). Omit for the first page."),
  per_page: z.number().optional().describe("Number of banking links per page. Defaults to 20 if not specified."),
});

const GetBankingLinkParameters = z.object({
  link_id: z.string().describe("The unique banking link ID to retrieve (e.g. 'link_abc123'). Obtain this from list_banking_links."),
});

const DeleteBankingLinkParameters = z.object({
  link_id: z.string().describe("The unique banking link ID to permanently delete (e.g. 'link_abc123'). This disconnects the user's bank account. Cannot be undone."),
});

// ── Movements ──

const ListMovementsParameters = z.object({
  account_id: z.string().describe("The account ID to list bank movements (transactions) for (e.g. 'acc_abc123'). Use list_accounts to find available accounts."),
  limit: z.number().optional().describe("Maximum number of movements to return. Defaults to 20 if not specified."),
});

// ── Team ──

const ListTeamMembersParameters = z.object({});

const InviteTeamMemberParameters = z.object({
  name: z.string().describe("First name of the person to invite (e.g. 'Juan')."),
  last_name: z.string().describe("Last name of the person to invite (e.g. 'Pérez')."),
  email: z.string().describe("Email address of the person to invite (e.g. 'juan@empresa.com'). An invitation will be sent to this email."),
  organization_role: z.string().describe("Organization-level role to assign. Possible values: 'admin', 'developer', 'viewer'."),
  dashboard_role_name: z.string().optional().describe("Optional dashboard-specific role name for more granular permissions."),
});

const UpdateTeamMemberRoleParameters = z.object({
  member_id: z.string().describe("The organization user ID of the team member to update. Obtain this from list_team_members."),
  organization_role: z.string().describe("New organization-level role to assign. Possible values: 'admin', 'developer', 'viewer'."),
  name: z.string().optional().describe("Updated first name for the team member. Omit to keep current value."),
  last_name: z.string().optional().describe("Updated last name for the team member. Omit to keep current value."),
});

const DisableTeamMemberParameters = z.object({
  member_id: z.string().describe("The organization user ID of the team member to remove. Obtain this from list_team_members. This revokes their access to the organization."),
});

// ── API Keys ──

const GetApiKeysInfoParameters = z.object({});

// ── Accounts ──

const ListAccountsParameters = z.object({});

const GetAccountParameters = z.object({
  account_id: z.string().describe("The unique account ID to retrieve details for (e.g. 'acc_abc123'). Obtain this from list_accounts."),
});

// ── Institutions ──

const ListInstitutionsParameters = z.object({
  country: z.enum(["CL", "MX"]).optional().describe("Filter institutions by country code: 'CL' for Chile, 'MX' for Mexico. Omit to return institutions from all countries."),
});

// ── Navigation ──

const NavigateToPageParameters = z.object({
  destination: z.string().describe("Natural language description of where the user wants to navigate in the dashboard (e.g. 'configuración', 'transferencias', 'webhooks', 'api keys')."),
});

// ══════════════════════════════════════════════════════════════
// ── Build all tools (with thread-scoped MFA handlers) ──
// ══════════════════════════════════════════════════════════════

export function buildTools(threadId: string, token: string, context: BuildToolsContext = {}, onNavigate?: OnNavigateCallback): Tool[] {
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
      description: "List bank transfers (both inbound and outbound) for the organization. Returns transfer ID, amount, currency, counterparty, status, and dates. Supports filtering by status and pagination. The environment mode (live/test) is automatically set from the user's session.",
      schema: GetTransfersParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.limit) flags.limit = args.limit;
        if (args.starting_after) flags.starting_after = args.starting_after;
        if (args.status) flags.status = args.status;
        return runCommand(token, "transfers", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "get_transfer_by_id",
      description: "Get detailed information about a specific bank transfer by its ID. Returns full transfer details including amount, currency, counterparty info, status, timestamps, and metadata. The environment mode (live/test) is automatically set from the user's session.",
      schema: GetTransferByIdParameters,
      handler: async (args) => {
        return runCommand(token, "transfers", "show", {}, args.transfer_id, context);
      },
    }),
    createTool({
      name: "create_transfer",
      description: "Create a new outbound transfer intent to send money from a Fintoc account to an external bank account. Requires the sender's account ID, amount in cents, currency, and full recipient details (name, tax ID, bank, account type, account number). This action triggers MFA verification — after calling this, use request_mfa and confirm_mfa to complete the transfer. The environment mode (live/test) is automatically set from the user's session.",
      schema: CreateTransferIntentParameters,
      handler: createTransferIntent,
    }),

    // ── MFA ──
    createTool({
      name: "request_mfa",
      description: "Initiates the MFA (Multi-Factor Authentication) verification flow for a pending sensitive action. Call this ONLY after another tool (like create_transfer) returns a response with status 'mfa_required'. This prepares the system to receive the user's 6-digit TOTP code. After calling this, ask the user to provide their code from their authenticator app, then use confirm_mfa.",
      schema: RequestMfaParameters,
      handler: requestMfa,
    }),
    createTool({
      name: "confirm_mfa",
      description: "Completes MFA verification by submitting the user's 6-digit OTP code from their authenticator app. On success, executes the pending action (e.g. creates the transfer). Call this ONLY after request_mfa has been called and the user has provided their 6-digit code.",
      schema: ConfirmMfaParameters,
      handler: confirmMfa,
    }),

    // ── Webhooks ──
    createTool({
      name: "list_webhooks",
      description: "List all configured webhook endpoints for the organization. Returns each endpoint's ID, name, URL, subscribed events, and enabled/disabled status. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListWebhooksParameters,
      handler: async () => {
        return runCommand(token, "webhook-endpoints", "list", {}, undefined, context);
      },
    }),
    createTool({
      name: "create_webhook",
      description: "Create a new webhook endpoint to receive event notifications via HTTP POST. Requires a URL and a list of event types to subscribe to. The environment mode (live/test) is automatically set from the user's session.",
      schema: CreateWebhookParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.name) flags.name = args.name;
        flags.url = args.url;
        flags.enabled_events = args.enabled_events;
        return runCommand(token, "webhook-endpoints", "create", flags, undefined, context);
      },
    }),
    createTool({
      name: "update_webhook",
      description: "Update an existing webhook endpoint's configuration. Can change the URL, subscribed events, name, or enable/disable the endpoint. The environment mode (live/test) is automatically set from the user's session.",
      schema: UpdateWebhookParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.name) flags.name = args.name;
        if (args.url) flags.url = args.url;
        if (args.enabled_events) flags.enabled_events = args.enabled_events;
        if (args.disabled !== undefined) flags.disabled = args.disabled;
        return runCommand(token, "webhook-endpoints", "update", flags, args.webhook_id, context);
      },
    }),
    createTool({
      name: "delete_webhook",
      description: "Permanently delete a webhook endpoint. This stops all event deliveries to that URL. This action cannot be undone. The environment mode (live/test) is automatically set from the user's session.",
      schema: DeleteWebhookParameters,
      handler: async (args) => {
        return runCommand(token, "webhook-endpoints", "delete", {}, args.webhook_id, context);
      },
    }),

    // ── Payments ──
    createTool({
      name: "list_payment_intents",
      description: "List payment intents (payment initiation requests) for the organization. Returns each payment intent's ID, amount, currency, status, and creation date. Supports pagination via the limit parameter. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListPaymentIntentsParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.limit) flags.limit = args.limit;
        return runCommand(token, "payments", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "get_payment_intent",
      description: "Get detailed information about a specific payment intent by its ID. Returns the full payment details including amount, currency, status, recipient info, and timestamps. The environment mode (live/test) is automatically set from the user's session.",
      schema: GetPaymentIntentParameters,
      handler: async (args) => {
        return runCommand(token, "payments", "show", {}, args.payment_intent_id, context);
      },
    }),

    // ── Refunds ──
    createTool({
      name: "create_refund",
      description: "Create a refund for a completed payment. Can refund the full amount or a partial amount. Returns the refund details including ID and status. The environment mode (live/test) is automatically set from the user's session.",
      schema: CreateRefundParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {
          resource_type: args.resource_type,
          resource_id: args.resource_id,
        };
        if (args.amount) flags.amount = args.amount;
        return runCommand(token, "refunds", "create", flags, undefined, context);
      },
    }),

    // ── Subscriptions ──
    createTool({
      name: "list_subscriptions",
      description: "List all direct debit subscriptions (recurring payment mandates) for the organization. Returns each subscription's ID, customer info, status, and schedule. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListSubscriptionsParameters,
      handler: async () => runCommand(token, "subscriptions", "list", {}, undefined, context),
    }),

    // ── Charges ──
    createTool({
      name: "list_charges",
      description: "List all charges (individual payment attempts within direct debit subscriptions). Returns each charge's ID, amount, status, and associated subscription. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListChargesParameters,
      handler: async () => runCommand(token, "charges", "list", {}, undefined, context),
    }),

    // ── Banking Links (Data Aggregation) ──
    createTool({
      name: "list_banking_links",
      description: "List banking links (connections to end-users' bank accounts via data aggregation). Returns each link's ID, institution, holder info, status, and associated accounts. Can filter by institution and supports pagination. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListBankingLinksParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.institution_id) flags.institution_id = args.institution_id;
        if (args.page) flags.page = args.page;
        if (args.per_page) flags.per_page = args.per_page;
        return runCommand(token, "links", "list", flags, undefined, context);
      },
    }),
    createTool({
      name: "get_banking_link",
      description: "Get detailed information about a specific banking link by ID, including all associated bank accounts with their balances and account numbers. The environment mode (live/test) is automatically set from the user's session.",
      schema: GetBankingLinkParameters,
      handler: async (args) => {
        return runCommand(token, "links", "show", {}, args.link_id, context);
      },
    }),
    createTool({
      name: "delete_banking_link",
      description: "Permanently delete a banking link, disconnecting the end-user's bank account from Fintoc. This action cannot be undone. The environment mode (live/test) is automatically set from the user's session.",
      schema: DeleteBankingLinkParameters,
      handler: async (args) => {
        return runCommand(token, "links", "delete", {}, args.link_id, context);
      },
    }),

    // ── Movements ──
    createTool({
      name: "list_movements",
      description: "List bank movements (transactions) for a specific bank account. Returns each movement's ID, date, description, amount, currency, and type (debit/credit). Requires an account ID — use list_accounts first if needed. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListMovementsParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.limit) flags.limit = args.limit;
        return runCommand(token, "accounts", "movements", flags, args.account_id, context);
      },
    }),

    // ── Team ──
    createTool({
      name: "list_team_members",
      description: "List all team members of the organization. Returns each member's ID, name, email, role, and status. Use this to find member IDs needed for updating roles or removing members.",
      schema: ListTeamMembersParameters,
      handler: async () => runCommand(token, "organization-users", "list", {}, undefined, context),
    }),
    createTool({
      name: "invite_team_member",
      description: "Invite a new team member to the organization by email. An invitation email will be sent. Requires the person's name, email, and the role to assign them. Confirm the details with the user before inviting.",
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
      description: "Update an existing team member's role or personal information. Use list_team_members first to find the member's ID. Confirm the change with the user before executing.",
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
      description: "Remove a team member from the organization, revoking their access to the dashboard and API. This action cannot be easily undone. Always confirm with the user before removing a member.",
      schema: DisableTeamMemberParameters,
      handler: async (args) => {
        return runCommand(token, "organization-users", "delete", {}, args.member_id, context);
      },
    }),

    // ── API Keys ──
    createTool({
      name: "get_api_keys_info",
      description: "Get metadata about the organization's API keys, including key type (public/secret), environment (live/test), and prefix. Does NOT reveal full key values for security. The environment mode (live/test) is automatically set from the user's session.",
      schema: GetApiKeysInfoParameters,
      handler: async () => {
        return runCommand(token, "api-keys", "list", {}, undefined, context);
      },
    }),

    // ── Accounts ──
    createTool({
      name: "list_accounts",
      description: "List the organization's Fintoc accounts (bank accounts registered for transfers). Returns each account's ID, description/alias, available balance, currency, and status. ALWAYS call this first when the user wants to make a transfer or check movements, so you can present the accounts for them to choose from. The environment mode (live/test) is automatically set from the user's session.",
      schema: ListAccountsParameters,
      handler: async () => {
        return runCommand(token, "accounts", "list", {}, undefined, context);
      },
    }),
    createTool({
      name: "get_account",
      description: "Get detailed information about a specific Fintoc account by its ID. Returns the account's full details including balance, currency, bank institution, account number, and metadata. The environment mode (live/test) is automatically set from the user's session.",
      schema: GetAccountParameters,
      handler: async (args) => {
        return runCommand(token, "accounts", "show", {}, args.account_id, context);
      },
    }),

    // ── Institutions ──
    createTool({
      name: "list_institutions",
      description: "List all financial institutions (banks) supported by Fintoc. Returns each institution's ID (needed for transfers), name, and country. Can filter by country. Use this when the user mentions a bank name and you need to find its institution_id for a transfer.",
      schema: ListInstitutionsParameters,
      handler: async (args) => {
        const flags: Record<string, unknown> = {};
        if (args.country) flags.country = args.country;
        return runCommand(token, "banks", "list", flags, undefined, context);
      },
    }),

    // ── Navigation ──
    createTool({
      name: "navigate_to_page",
      description: "Navigate the user to a specific section of the Fintoc dashboard. Use this when the user asks to go to a page (e.g. 'llévame a configuración', 'quiero ver mis transferencias', 'ir a webhooks'). The destination should be a natural language description of where they want to go.",
      schema: NavigateToPageParameters,
      handler: async (args) => {
        const route = resolveRoute(args.destination);
        if (route) {
          onNavigate?.(route.path, route.name);
          return JSON.stringify({ navigated: true, path: route.path, name: route.name });
        }
        return JSON.stringify({ navigated: false, available_pages: getAllRoutes() });
      },
    }),
  ];
}

// Keep defaultTools for backward compat
export const defaultTools: Tool[] = [];
