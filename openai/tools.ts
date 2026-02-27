import { z } from "zod/v4";
import type { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction";
import { setPendingAction, getPendingAction } from "./threads";
import {
  TRANSFER_STATUSES,
  TRANSFER_TYPES,
  ACCOUNT_TYPES,
  CURRENCIES,
  WEBHOOK_EVENTS,
  PAYMENT_INTENT_STATUSES,
  CHECKOUT_SESSION_STATUSES,
  PAYMENT_LINK_STATUSES,
  REFUND_STATUSES,
  SUBSCRIPTION_STATUSES,
  CHARGE_STATUSES,
  LINK_STATUSES,
  MOVEMENT_TYPES,
  TEAM_ROLES,
  TEAM_MEMBER_STATUSES,
  REPORT_TYPES,
  REPORT_STATUSES,
  COUNTRIES,
  type WebhookEndpoint,
} from "./types";
import {
  mockTransfers,
  mockWebhooks,
  mockPaymentIntents,
  mockCheckoutSessions,
  mockPaymentLinks,
  mockRefunds,
  mockTransferAccounts,
  mockSubscriptionIntents,
  mockSubscriptions,
  mockCharges,
  mockBankingLinks,
  mockMovements,
  mockRefreshIntents,
  mockTeamMembers,
  mockApiKeys,
  mockReports,
  mockInstitutions,
} from "./mocks";

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

// ══════════════════════════════════════════════════════════════
// ── Schemas ──
// ══════════════════════════════════════════════════════════════

// ── Transfers ──

const GetTransfersParameters = z.object({
  status: z.enum(TRANSFER_STATUSES).optional().describe("Filter by transfer status"),
  type: z.enum(TRANSFER_TYPES).optional().describe("Filter by transfer type: inbound or outbound"),
  counterparty_name: z.string().optional().describe("Filter by counterparty holder name"),
  currency: z.enum(CURRENCIES).optional().describe("Filter by currency"),
  min_amount_cents: z.number().optional().describe("Minimum transfer amount in cents"),
  max_amount_cents: z.number().optional().describe("Maximum transfer amount in cents"),
  date: z.string().optional().describe("Filter by transaction date (YYYY-MM-DD)"),
});

const GetTransferByIdParameters = z.object({
  transfer_id: z.string().describe("The transfer ID to look up (e.g. txn_001)"),
});

const CreateTransferParameters = z.object({
  counterparty_name: z.string().describe("Recipient's full name"),
  counterparty_rut: z.string().describe("Recipient's RUT (e.g. 12.345.678-9)"),
  counterparty_bank: z.string().describe("Recipient's bank name"),
  counterparty_account_type: z.enum(ACCOUNT_TYPES).describe("Recipient's account type"),
  counterparty_account_number: z.string().describe("Recipient's account number"),
  amount_cents: z.number().describe("Amount in cents (e.g. 10000000 for $100.000)"),
  currency: z.enum(CURRENCIES).describe("Currency: CLP or MXN"),
  comment: z.string().optional().describe("Optional comment for the transfer"),
});

// ── MFA ──

const RequestMfaParameters = z.object({
  action_summary: z.string().describe("Brief description of the pending action that requires MFA verification"),
});

const ConfirmMfaParameters = z.object({
  otp_code: z.string().describe("The 6-digit OTP code provided by the user"),
});

// ── Webhooks ──

const ListWebhooksParameters = z.object({});

const CreateWebhookParameters = z.object({
  url: z.string().describe("The URL to receive webhook events"),
  events: z.array(z.string()).describe("List of event types to subscribe to"),
  description: z.string().optional().describe("Optional description for the webhook endpoint"),
});

const DeleteWebhookParameters = z.object({
  webhook_id: z.string().describe("The webhook endpoint ID to delete (e.g. wh_001)"),
});

const UpdateWebhookParameters = z.object({
  webhook_id: z.string().describe("The webhook endpoint ID to update"),
  url: z.string().optional().describe("New URL for the webhook"),
  events: z.array(z.string()).optional().describe("New list of events to subscribe to"),
  status: z.enum(["enabled", "disabled"]).optional().describe("Enable or disable the webhook"),
  description: z.string().optional().describe("New description"),
});

const GetWebhookEventsParameters = z.object({});

// ── Payments ──

const ListPaymentIntentsParameters = z.object({
  status: z.enum(PAYMENT_INTENT_STATUSES).optional().describe("Filter by status"),
  currency: z.enum(CURRENCIES).optional().describe("Filter by currency"),
  min_amount: z.number().optional().describe("Minimum amount"),
  max_amount: z.number().optional().describe("Maximum amount"),
});

const GetPaymentIntentParameters = z.object({
  payment_intent_id: z.string().describe("The payment intent ID (e.g. pi_001)"),
});

// ── Checkout Sessions ──

const ListCheckoutSessionsParameters = z.object({
  status: z.enum(CHECKOUT_SESSION_STATUSES).optional().describe("Filter by status"),
});

const GetCheckoutSessionParameters = z.object({
  checkout_session_id: z.string().describe("The checkout session ID (e.g. cs_001)"),
});

const CreateCheckoutSessionParameters = z.object({
  amount: z.number().describe("Amount in the smallest currency unit (e.g. CLP has no decimals, so 25000 = $25.000)"),
  currency: z.enum(CURRENCIES).describe("Currency"),
  success_url: z.string().describe("URL to redirect after successful payment"),
  cancel_url: z.string().describe("URL to redirect if payment is cancelled"),
  customer_email: z.string().optional().describe("Customer email"),
  metadata: z.record(z.string(), z.union([z.string(), z.number()])).optional().describe("Additional metadata"),
});

const ExpireCheckoutSessionParameters = z.object({
  checkout_session_id: z.string().describe("The checkout session ID to expire"),
});

// ── Payment Links ──

const ListPaymentLinksParameters = z.object({
  status: z.enum(PAYMENT_LINK_STATUSES).optional().describe("Filter by status"),
});

const GetPaymentLinkParameters = z.object({
  payment_link_id: z.string().describe("The payment link ID (e.g. pl_001)"),
});

const CreatePaymentLinkParameters = z.object({
  name: z.string().describe("Name for the payment link"),
  amount: z.number().describe("Amount in the smallest currency unit"),
  currency: z.enum(CURRENCIES).describe("Currency"),
  description: z.string().optional().describe("Description"),
  expires_at: z.string().optional().describe("Expiration date (ISO 8601)"),
  metadata: z.record(z.string(), z.union([z.string(), z.number()])).optional().describe("Additional metadata"),
});

const CancelPaymentLinkParameters = z.object({
  payment_link_id: z.string().describe("The payment link ID to cancel"),
});

// ── Refunds ──

const ListRefundsParameters = z.object({
  status: z.enum(REFUND_STATUSES).optional().describe("Filter by status"),
  payment_intent_id: z.string().optional().describe("Filter by payment intent ID"),
});

const GetRefundParameters = z.object({
  refund_id: z.string().describe("The refund ID (e.g. ref_001)"),
});

const CreateRefundParameters = z.object({
  payment_intent_id: z.string().describe("The payment intent ID to refund"),
  amount: z.number().describe("Amount to refund in the smallest currency unit"),
  reason: z.string().optional().describe("Reason for the refund"),
});

// ── Transfer Accounts ──

const ListTransferAccountsParameters = z.object({
  currency: z.enum(CURRENCIES).optional().describe("Filter by currency"),
});

const GetTransferAccountParameters = z.object({
  account_id: z.string().describe("The transfer account ID (e.g. ta_001)"),
});

const CreateTransferAccountParameters = z.object({
  holder_name: z.string().describe("Account holder name"),
  holder_id: z.string().describe("Account holder ID (RUT or RFC)"),
  institution_id: z.string().describe("Bank institution ID"),
  account_type: z.enum(ACCOUNT_TYPES).describe("Account type"),
  account_number: z.string().describe("Account number"),
  currency: z.enum(CURRENCIES).describe("Currency"),
  description: z.string().optional().describe("Optional description"),
});

// ── Direct Debit: Subscription Intents ──

const ListSubscriptionIntentsParameters = z.object({
  status: z.enum(["created", "succeeded", "failed"] as const).optional().describe("Filter by status"),
});

const GetSubscriptionIntentParameters = z.object({
  subscription_intent_id: z.string().describe("The subscription intent ID (e.g. si_001)"),
});

const CreateSubscriptionIntentParameters = z.object({
  customer_name: z.string().optional().describe("Customer name"),
  customer_email: z.string().optional().describe("Customer email"),
});

// ── Direct Debit: Subscriptions ──

const ListSubscriptionsParameters = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES).optional().describe("Filter by status"),
});

const GetSubscriptionParameters = z.object({
  subscription_id: z.string().describe("The subscription ID (e.g. sub_001)"),
});

// ── Direct Debit: Charges ──

const ListChargesParameters = z.object({
  subscription_id: z.string().optional().describe("Filter by subscription ID"),
  status: z.enum(CHARGE_STATUSES).optional().describe("Filter by status"),
});

const GetChargeParameters = z.object({
  charge_id: z.string().describe("The charge ID (e.g. chg_001)"),
});

const CreateChargeParameters = z.object({
  subscription_id: z.string().describe("The subscription ID to charge"),
  amount: z.number().describe("Amount in the smallest currency unit"),
  currency: z.enum(CURRENCIES).describe("Currency"),
  description: z.string().optional().describe("Description for the charge"),
});

const CancelChargeParameters = z.object({
  charge_id: z.string().describe("The charge ID to cancel"),
});

// ── Banking Links ──

const ListBankingLinksParameters = z.object({
  status: z.enum(LINK_STATUSES).optional().describe("Filter by status"),
  institution_id: z.string().optional().describe("Filter by institution"),
});

const GetBankingLinkParameters = z.object({
  link_id: z.string().describe("The banking link ID (e.g. link_001)"),
});

const DeleteBankingLinkParameters = z.object({
  link_id: z.string().describe("The banking link ID to delete"),
});

// ── Movements ──

const ListMovementsParameters = z.object({
  account_id: z.string().describe("The bank account ID to list movements for (e.g. la_001)"),
  type: z.enum(MOVEMENT_TYPES).optional().describe("Filter by movement type: debit or credit"),
  min_amount: z.number().optional().describe("Minimum amount"),
  max_amount: z.number().optional().describe("Maximum amount"),
  since: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  until: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

// ── Refresh Intents ──

const CreateRefreshIntentParameters = z.object({
  link_id: z.string().describe("The banking link ID to refresh"),
  type: z.enum(["only_last", "historical"]).describe("Refresh type: only_last (last movements) or historical (full history)"),
});

// ── Team ──

const ListTeamMembersParameters = z.object({
  role: z.enum(TEAM_ROLES).optional().describe("Filter by role"),
  status: z.enum(TEAM_MEMBER_STATUSES).optional().describe("Filter by status"),
});

const GetTeamMemberParameters = z.object({
  member_id: z.string().describe("The team member ID (e.g. tm_001)"),
});

const InviteTeamMemberParameters = z.object({
  name: z.string().describe("Name of the person to invite"),
  email: z.string().describe("Email of the person to invite"),
  role: z.enum(TEAM_ROLES).describe("Role to assign"),
});

const UpdateTeamMemberRoleParameters = z.object({
  member_id: z.string().describe("The team member ID"),
  role: z.enum(TEAM_ROLES).describe("New role to assign"),
});

const DisableTeamMemberParameters = z.object({
  member_id: z.string().describe("The team member ID to disable"),
});

// ── API Keys ──

const GetApiKeysInfoParameters = z.object({});

// ── Reports ──

const ListReportsParameters = z.object({
  type: z.enum(REPORT_TYPES).optional().describe("Filter by report type"),
  status: z.enum(REPORT_STATUSES).optional().describe("Filter by status"),
});

const GetReportParameters = z.object({
  report_id: z.string().describe("The report ID (e.g. rpt_001)"),
});

const CreateReportParameters = z.object({
  type: z.enum(REPORT_TYPES).describe("Report type"),
  date_from: z.string().describe("Start date (YYYY-MM-DD)"),
  date_to: z.string().describe("End date (YYYY-MM-DD)"),
  format: z.enum(["csv", "xlsx"]).optional().describe("Report format (default: csv)"),
});

// ── Institutions ──

const ListInstitutionsParameters = z.object({
  country: z.enum(COUNTRIES).optional().describe("Filter by country: CL or MX"),
  product: z.string().optional().describe("Filter by supported product (e.g. payments, transfers, movements)"),
});

// ══════════════════════════════════════════════════════════════
// ── Stateless handlers (no MFA needed) ──
// ══════════════════════════════════════════════════════════════

async function getTransfers(args: z.infer<typeof GetTransfersParameters>): Promise<string> {
  let results = [...mockTransfers];
  if (args.status) results = results.filter((t) => t.status === args.status);
  if (args.type) results = results.filter((t) => t.type === args.type);
  if (args.counterparty_name) {
    results = results.filter((t) =>
      t.counterparty.holderName?.toLowerCase().includes(args.counterparty_name!.toLowerCase())
    );
  }
  if (args.currency) results = results.filter((t) => t.currency === args.currency);
  if (args.min_amount_cents !== undefined) results = results.filter((t) => t.amountCents >= args.min_amount_cents!);
  if (args.max_amount_cents !== undefined) results = results.filter((t) => t.amountCents <= args.max_amount_cents!);
  if (args.date) results = results.filter((t) => t.transactionDate === args.date);
  return JSON.stringify({ total: results.length, transfers: results });
}

async function getTransferById(args: z.infer<typeof GetTransferByIdParameters>): Promise<string> {
  const transfer = mockTransfers.find((t) => t.id === args.transfer_id);
  if (!transfer) return JSON.stringify({ error: `Transfer ${args.transfer_id} not found` });
  return JSON.stringify(transfer);
}

async function listPaymentIntents(args: z.infer<typeof ListPaymentIntentsParameters>): Promise<string> {
  let results = [...mockPaymentIntents];
  if (args.status) results = results.filter((p) => p.status === args.status);
  if (args.currency) results = results.filter((p) => p.currency === args.currency);
  if (args.min_amount !== undefined) results = results.filter((p) => p.amount >= args.min_amount!);
  if (args.max_amount !== undefined) results = results.filter((p) => p.amount <= args.max_amount!);
  return JSON.stringify({ total: results.length, payment_intents: results });
}

async function getPaymentIntent(args: z.infer<typeof GetPaymentIntentParameters>): Promise<string> {
  const pi = mockPaymentIntents.find((p) => p.id === args.payment_intent_id);
  if (!pi) return JSON.stringify({ error: `Payment intent ${args.payment_intent_id} not found` });
  return JSON.stringify(pi);
}

async function listCheckoutSessions(args: z.infer<typeof ListCheckoutSessionsParameters>): Promise<string> {
  let results = [...mockCheckoutSessions];
  if (args.status) results = results.filter((cs) => cs.status === args.status);
  return JSON.stringify({ total: results.length, checkout_sessions: results });
}

async function getCheckoutSession(args: z.infer<typeof GetCheckoutSessionParameters>): Promise<string> {
  const cs = mockCheckoutSessions.find((c) => c.id === args.checkout_session_id);
  if (!cs) return JSON.stringify({ error: `Checkout session ${args.checkout_session_id} not found` });
  return JSON.stringify(cs);
}

async function createCheckoutSession(args: z.infer<typeof CreateCheckoutSessionParameters>): Promise<string> {
  const newCs = {
    id: `cs_${String(mockCheckoutSessions.length + 1).padStart(3, "0")}`,
    amount: args.amount,
    currency: args.currency,
    status: "open" as const,
    paymentIntentId: null,
    successUrl: args.success_url,
    cancelUrl: args.cancel_url,
    url: `https://pay.fintoc.com/cs_${String(mockCheckoutSessions.length + 1).padStart(3, "0")}`,
    customerEmail: args.customer_email ?? null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    metadata: args.metadata ?? {},
  };
  mockCheckoutSessions.push(newCs as any);
  return JSON.stringify({ status: "created", checkout_session: newCs });
}

async function expireCheckoutSession(args: z.infer<typeof ExpireCheckoutSessionParameters>): Promise<string> {
  const cs = mockCheckoutSessions.find((c) => c.id === args.checkout_session_id);
  if (!cs) return JSON.stringify({ error: `Checkout session ${args.checkout_session_id} not found` });
  if (cs.status !== "open") return JSON.stringify({ error: `Checkout session is already ${cs.status}` });
  (cs as any).status = "expired";
  return JSON.stringify({ status: "expired", checkout_session: cs });
}

async function listPaymentLinks(args: z.infer<typeof ListPaymentLinksParameters>): Promise<string> {
  let results = [...mockPaymentLinks];
  if (args.status) results = results.filter((pl) => pl.status === args.status);
  return JSON.stringify({ total: results.length, payment_links: results });
}

async function getPaymentLink(args: z.infer<typeof GetPaymentLinkParameters>): Promise<string> {
  const pl = mockPaymentLinks.find((p) => p.id === args.payment_link_id);
  if (!pl) return JSON.stringify({ error: `Payment link ${args.payment_link_id} not found` });
  return JSON.stringify(pl);
}

async function createPaymentLink(args: z.infer<typeof CreatePaymentLinkParameters>): Promise<string> {
  const newPl = {
    id: `pl_${String(mockPaymentLinks.length + 1).padStart(3, "0")}`,
    name: args.name,
    description: args.description ?? null,
    amount: args.amount,
    currency: args.currency,
    status: "active" as const,
    url: `https://pay.fintoc.com/pl_${String(mockPaymentLinks.length + 1).padStart(3, "0")}`,
    paymentCount: 0,
    totalCollected: 0,
    expiresAt: args.expires_at ?? null,
    createdAt: new Date().toISOString(),
    metadata: args.metadata ?? {},
  };
  mockPaymentLinks.push(newPl as any);
  return JSON.stringify({ status: "created", payment_link: newPl });
}

async function cancelPaymentLink(args: z.infer<typeof CancelPaymentLinkParameters>): Promise<string> {
  const pl = mockPaymentLinks.find((p) => p.id === args.payment_link_id);
  if (!pl) return JSON.stringify({ error: `Payment link ${args.payment_link_id} not found` });
  if (pl.status !== "active") return JSON.stringify({ error: `Payment link is already ${pl.status}` });
  (pl as any).status = "cancelled";
  return JSON.stringify({ status: "cancelled", payment_link: pl });
}

async function listRefunds(args: z.infer<typeof ListRefundsParameters>): Promise<string> {
  let results = [...mockRefunds];
  if (args.status) results = results.filter((r) => r.status === args.status);
  if (args.payment_intent_id) results = results.filter((r) => r.paymentIntentId === args.payment_intent_id);
  return JSON.stringify({ total: results.length, refunds: results });
}

async function getRefund(args: z.infer<typeof GetRefundParameters>): Promise<string> {
  const refund = mockRefunds.find((r) => r.id === args.refund_id);
  if (!refund) return JSON.stringify({ error: `Refund ${args.refund_id} not found` });
  return JSON.stringify(refund);
}

async function listTransferAccounts(args: z.infer<typeof ListTransferAccountsParameters>): Promise<string> {
  let results = [...mockTransferAccounts];
  if (args.currency) results = results.filter((a) => a.currency === args.currency);
  return JSON.stringify({ total: results.length, accounts: results });
}

async function getTransferAccount(args: z.infer<typeof GetTransferAccountParameters>): Promise<string> {
  const account = mockTransferAccounts.find((a) => a.id === args.account_id);
  if (!account) return JSON.stringify({ error: `Transfer account ${args.account_id} not found` });
  return JSON.stringify(account);
}

async function createTransferAccount(args: z.infer<typeof CreateTransferAccountParameters>): Promise<string> {
  const inst = mockInstitutions.find((i) => i.id === args.institution_id);
  const newAccount = {
    id: `ta_${String(mockTransferAccounts.length + 1).padStart(3, "0")}`,
    holderName: args.holder_name,
    holderId: args.holder_id,
    institutionId: args.institution_id,
    institutionName: inst?.name ?? args.institution_id,
    accountType: args.account_type,
    accountNumber: args.account_number,
    currency: args.currency,
    description: args.description ?? null,
    createdAt: new Date().toISOString(),
  };
  mockTransferAccounts.push(newAccount as any);
  return JSON.stringify({ status: "created", account: newAccount });
}

async function listSubscriptionIntents(args: z.infer<typeof ListSubscriptionIntentsParameters>): Promise<string> {
  let results = [...mockSubscriptionIntents];
  if (args.status) results = results.filter((si) => si.status === args.status);
  return JSON.stringify({ total: results.length, subscription_intents: results });
}

async function getSubscriptionIntent(args: z.infer<typeof GetSubscriptionIntentParameters>): Promise<string> {
  const si = mockSubscriptionIntents.find((s) => s.id === args.subscription_intent_id);
  if (!si) return JSON.stringify({ error: `Subscription intent ${args.subscription_intent_id} not found` });
  return JSON.stringify(si);
}

async function createSubscriptionIntent(args: z.infer<typeof CreateSubscriptionIntentParameters>): Promise<string> {
  const newSi = {
    id: `si_${String(mockSubscriptionIntents.length + 1).padStart(3, "0")}`,
    status: "created" as const,
    widgetToken: `si_wt_${crypto.randomUUID().slice(0, 8)}`,
    customerName: args.customer_name ?? null,
    customerEmail: args.customer_email ?? null,
    createdAt: new Date().toISOString(),
  };
  mockSubscriptionIntents.push(newSi as any);
  return JSON.stringify({ status: "created", subscription_intent: newSi });
}

async function listSubscriptions(args: z.infer<typeof ListSubscriptionsParameters>): Promise<string> {
  let results = [...mockSubscriptions];
  if (args.status) results = results.filter((s) => s.status === args.status);
  return JSON.stringify({ total: results.length, subscriptions: results });
}

async function getSubscription(args: z.infer<typeof GetSubscriptionParameters>): Promise<string> {
  const sub = mockSubscriptions.find((s) => s.id === args.subscription_id);
  if (!sub) return JSON.stringify({ error: `Subscription ${args.subscription_id} not found` });
  return JSON.stringify(sub);
}

async function listCharges(args: z.infer<typeof ListChargesParameters>): Promise<string> {
  let results = [...mockCharges];
  if (args.subscription_id) results = results.filter((c) => c.subscriptionId === args.subscription_id);
  if (args.status) results = results.filter((c) => c.status === args.status);
  return JSON.stringify({ total: results.length, charges: results });
}

async function getCharge(args: z.infer<typeof GetChargeParameters>): Promise<string> {
  const charge = mockCharges.find((c) => c.id === args.charge_id);
  if (!charge) return JSON.stringify({ error: `Charge ${args.charge_id} not found` });
  return JSON.stringify(charge);
}

async function createCharge(args: z.infer<typeof CreateChargeParameters>): Promise<string> {
  const sub = mockSubscriptions.find((s) => s.id === args.subscription_id);
  if (!sub) return JSON.stringify({ error: `Subscription ${args.subscription_id} not found` });
  if (sub.status !== "active") return JSON.stringify({ error: `Subscription is ${sub.status}, cannot create charge` });
  const newCharge = {
    id: `chg_${String(mockCharges.length + 1).padStart(3, "0")}`,
    subscriptionId: args.subscription_id,
    amount: args.amount,
    currency: args.currency,
    status: "pending" as const,
    description: args.description ?? null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  mockCharges.push(newCharge as any);
  return JSON.stringify({ status: "created", charge: newCharge });
}

async function cancelCharge(args: z.infer<typeof CancelChargeParameters>): Promise<string> {
  const charge = mockCharges.find((c) => c.id === args.charge_id);
  if (!charge) return JSON.stringify({ error: `Charge ${args.charge_id} not found` });
  if (charge.status !== "pending") return JSON.stringify({ error: `Charge is ${charge.status}, cannot cancel` });
  (charge as any).status = "cancelled";
  return JSON.stringify({ status: "cancelled", charge });
}

async function listBankingLinks(args: z.infer<typeof ListBankingLinksParameters>): Promise<string> {
  let results = [...mockBankingLinks];
  if (args.status) results = results.filter((l) => l.status === args.status);
  if (args.institution_id) results = results.filter((l) => l.institutionId === args.institution_id);
  return JSON.stringify({ total: results.length, links: results });
}

async function getBankingLink(args: z.infer<typeof GetBankingLinkParameters>): Promise<string> {
  const link = mockBankingLinks.find((l) => l.id === args.link_id);
  if (!link) return JSON.stringify({ error: `Banking link ${args.link_id} not found` });
  return JSON.stringify(link);
}

async function listMovements(args: z.infer<typeof ListMovementsParameters>): Promise<string> {
  let results = mockMovements.filter((m) => m.accountId === args.account_id);
  if (args.type) results = results.filter((m) => m.type === args.type);
  if (args.min_amount !== undefined) results = results.filter((m) => m.amount >= args.min_amount!);
  if (args.max_amount !== undefined) results = results.filter((m) => m.amount <= args.max_amount!);
  if (args.since) results = results.filter((m) => m.postDate >= args.since!);
  if (args.until) results = results.filter((m) => m.postDate <= args.until!);
  return JSON.stringify({ total: results.length, movements: results });
}

async function createRefreshIntent(args: z.infer<typeof CreateRefreshIntentParameters>): Promise<string> {
  const link = mockBankingLinks.find((l) => l.id === args.link_id);
  if (!link) return JSON.stringify({ error: `Banking link ${args.link_id} not found` });
  if (link.status !== "active") return JSON.stringify({ error: `Banking link is ${link.status}` });
  const newRi = {
    id: `ri_${String(mockRefreshIntents.length + 1).padStart(3, "0")}`,
    linkId: args.link_id,
    type: args.type,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  mockRefreshIntents.push(newRi as any);
  return JSON.stringify({ status: "created", refresh_intent: newRi });
}

async function listTeamMembers(args: z.infer<typeof ListTeamMembersParameters>): Promise<string> {
  let results = [...mockTeamMembers];
  if (args.role) results = results.filter((m) => m.role === args.role);
  if (args.status) results = results.filter((m) => m.status === args.status);
  return JSON.stringify({ total: results.length, members: results });
}

async function getTeamMember(args: z.infer<typeof GetTeamMemberParameters>): Promise<string> {
  const member = mockTeamMembers.find((m) => m.id === args.member_id);
  if (!member) return JSON.stringify({ error: `Team member ${args.member_id} not found` });
  return JSON.stringify(member);
}

async function inviteTeamMember(args: z.infer<typeof InviteTeamMemberParameters>): Promise<string> {
  const existing = mockTeamMembers.find((m) => m.email === args.email);
  if (existing) return JSON.stringify({ error: `A team member with email ${args.email} already exists` });
  const newMember = {
    id: `tm_${String(mockTeamMembers.length + 1).padStart(3, "0")}`,
    name: args.name,
    email: args.email,
    role: args.role,
    status: "invited" as const,
    invitedAt: new Date().toISOString(),
    joinedAt: null,
  };
  mockTeamMembers.push(newMember as any);
  return JSON.stringify({ status: "invited", member: newMember });
}

async function updateTeamMemberRole(args: z.infer<typeof UpdateTeamMemberRoleParameters>): Promise<string> {
  const member = mockTeamMembers.find((m) => m.id === args.member_id);
  if (!member) return JSON.stringify({ error: `Team member ${args.member_id} not found` });
  (member as any).role = args.role;
  return JSON.stringify({ status: "updated", member });
}

async function disableTeamMember(args: z.infer<typeof DisableTeamMemberParameters>): Promise<string> {
  const member = mockTeamMembers.find((m) => m.id === args.member_id);
  if (!member) return JSON.stringify({ error: `Team member ${args.member_id} not found` });
  if (member.role === "administrator") return JSON.stringify({ error: "Cannot disable an administrator" });
  (member as any).status = "disabled";
  return JSON.stringify({ status: "disabled", member });
}

async function getApiKeysInfo(): Promise<string> {
  return JSON.stringify({
    keys: mockApiKeys,
    note: "Los valores completos de las API keys no se muestran por seguridad. Ve a 'Para Desarrolladores > API Keys' en el dashboard para verlas.",
  });
}

async function listReports(args: z.infer<typeof ListReportsParameters>): Promise<string> {
  let results = [...mockReports];
  if (args.type) results = results.filter((r) => r.type === args.type);
  if (args.status) results = results.filter((r) => r.status === args.status);
  return JSON.stringify({ total: results.length, reports: results });
}

async function getReport(args: z.infer<typeof GetReportParameters>): Promise<string> {
  const report = mockReports.find((r) => r.id === args.report_id);
  if (!report) return JSON.stringify({ error: `Report ${args.report_id} not found` });
  return JSON.stringify(report);
}

async function createReport(args: z.infer<typeof CreateReportParameters>): Promise<string> {
  const newReport = {
    id: `rpt_${String(mockReports.length + 1).padStart(3, "0")}`,
    type: args.type,
    status: "pending" as const,
    dateRange: { from: args.date_from, to: args.date_to },
    createdAt: new Date().toISOString(),
    downloadUrl: null,
    format: args.format ?? "csv",
  };
  mockReports.push(newReport as any);
  return JSON.stringify({ status: "created", report: newReport });
}

async function listInstitutions(args: z.infer<typeof ListInstitutionsParameters>): Promise<string> {
  let results = [...mockInstitutions];
  if (args.country) results = results.filter((i) => i.country === args.country);
  if (args.product) results = results.filter((i) => i.supportedProducts.includes(args.product!));
  return JSON.stringify({ total: results.length, institutions: results });
}

// ══════════════════════════════════════════════════════════════
// ── Execute pending MFA actions ──
// ══════════════════════════════════════════════════════════════

async function executePendingAction(
  type: string,
  data: Record<string, unknown>
): Promise<string> {
  if (type === "create_transfer") {
    const newTransfer = {
      id: `txn_${String(mockTransfers.length + 1).padStart(3, "0")}`,
      counterparty: {
        holderName: data.counterparty_name as string,
        holderId: data.counterparty_rut as string,
        institutionName: data.counterparty_bank as string,
        institutionId: (data.counterparty_bank as string).toLowerCase().replace(/\s+/g, "_").slice(0, 5),
        accountType: data.counterparty_account_type as string,
        accountNumber: data.counterparty_account_number as string,
        email: null,
      },
      status: "pending",
      type: "outbound",
      amountCents: data.amount_cents as number,
      currency: data.currency as string,
      metadata: {},
      transactionDate: null,
      returnReason: null,
      comment: (data.comment as string) ?? null,
      accountNumber: { number: "00-987-65432-10", accountId: "acc_001", accountDescription: "Cuenta corriente empresa" },
      trackingKey: null,
      createdAt: new Date().toISOString(),
      reversedAt: null,
      failedAt: null,
      rejectedAt: null,
      transferBatch: null,
      referenceId: null,
      receiptUrl: null,
    };
    mockTransfers.push(newTransfer as any);
    return JSON.stringify({ status: "created", transfer: newTransfer });
  }

  if (type === "delete_webhook") {
    const idx = mockWebhooks.findIndex((w) => w.id === (data.webhook_id as string));
    if (idx === -1) return JSON.stringify({ error: `Webhook ${data.webhook_id} not found` });
    const [removed] = mockWebhooks.splice(idx, 1);
    return JSON.stringify({ status: "deleted", webhook: removed });
  }

  if (type === "create_refund") {
    const newRefund = {
      id: `ref_${String(mockRefunds.length + 1).padStart(3, "0")}`,
      amount: data.amount as number,
      currency: data.currency as string,
      status: "pending" as const,
      paymentIntentId: data.payment_intent_id as string,
      reason: (data.reason as string) ?? null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    mockRefunds.push(newRefund as any);
    return JSON.stringify({ status: "created", refund: newRefund });
  }

  if (type === "delete_banking_link") {
    const idx = mockBankingLinks.findIndex((l) => l.id === (data.link_id as string));
    if (idx === -1) return JSON.stringify({ error: `Banking link ${data.link_id} not found` });
    const [removed] = mockBankingLinks.splice(idx, 1);
    return JSON.stringify({ status: "deleted", link: removed });
  }

  if (type === "invite_team_member") {
    return inviteTeamMember(data as any);
  }

  if (type === "disable_team_member") {
    return disableTeamMember(data as any);
  }

  return JSON.stringify({ error: "Unknown action type" });
}

// ══════════════════════════════════════════════════════════════
// ── Build all tools (with thread-scoped MFA handlers) ──
// ══════════════════════════════════════════════════════════════

export function buildTools(threadId: string): Tool[] {
  // ── MFA-aware handlers ──

  async function createTransfer(args: z.infer<typeof CreateTransferParameters>): Promise<string> {
    setPendingAction(threadId, { type: "create_transfer", data: args as unknown as Record<string, unknown> });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para confirmar la transferencia de $${(args.amount_cents / 100).toLocaleString("es-CL")} ${args.currency} a ${args.counterparty_name}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function requestMfa(args: z.infer<typeof RequestMfaParameters>): Promise<string> {
    const pending = getPendingAction(threadId);
    if (!pending) return JSON.stringify({ error: "No hay ninguna acción pendiente que requiera MFA." });
    return JSON.stringify({
      status: "otp_sent",
      message: "Se ha enviado un código OTP de 6 dígitos al teléfono registrado del usuario. Pídele al usuario que ingrese el código para confirmar la acción.",
    });
  }

  async function confirmMfa(args: z.infer<typeof ConfirmMfaParameters>): Promise<string> {
    const pending = getPendingAction(threadId);
    if (!pending) return JSON.stringify({ error: "No hay ninguna acción pendiente que requiera MFA." });
    if (!/^\d{6}$/.test(args.otp_code)) {
      return JSON.stringify({ error: "El código OTP debe ser exactamente 6 dígitos numéricos." });
    }
    const result = await executePendingAction(pending.type, pending.data);
    setPendingAction(threadId, null);
    return result;
  }

  async function deleteWebhook(args: z.infer<typeof DeleteWebhookParameters>): Promise<string> {
    const webhook = mockWebhooks.find((w) => w.id === args.webhook_id);
    if (!webhook) return JSON.stringify({ error: `Webhook ${args.webhook_id} not found` });
    setPendingAction(threadId, { type: "delete_webhook", data: { webhook_id: args.webhook_id } });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para eliminar el webhook "${webhook.description ?? webhook.url}" (${args.webhook_id}), se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function updateWebhook(args: z.infer<typeof UpdateWebhookParameters>): Promise<string> {
    const webhook = mockWebhooks.find((w) => w.id === args.webhook_id);
    if (!webhook) return JSON.stringify({ error: `Webhook ${args.webhook_id} not found` });
    if (args.url) webhook.url = args.url;
    if (args.events) {
      const invalidEvents = args.events.filter((e) => !WEBHOOK_EVENTS.includes(e as any));
      if (invalidEvents.length > 0) {
        return JSON.stringify({ error: `Eventos inválidos: ${invalidEvents.join(", ")}. Usa get_webhook_events para ver los eventos disponibles.` });
      }
      webhook.events = args.events;
    }
    if (args.status) webhook.status = args.status;
    if (args.description !== undefined) webhook.description = args.description ?? null;
    return JSON.stringify({ status: "updated", webhook });
  }

  async function listWebhooks(): Promise<string> {
    return JSON.stringify({ total: mockWebhooks.length, webhooks: mockWebhooks });
  }

  async function createWebhook(args: z.infer<typeof CreateWebhookParameters>): Promise<string> {
    const invalidEvents = args.events.filter((e) => !WEBHOOK_EVENTS.includes(e as any));
    if (invalidEvents.length > 0) {
      return JSON.stringify({ error: `Eventos inválidos: ${invalidEvents.join(", ")}. Usa get_webhook_events para ver los eventos disponibles.` });
    }
    const newWebhook: WebhookEndpoint = {
      id: `wh_${String(mockWebhooks.length + 1).padStart(3, "0")}`,
      url: args.url,
      status: "enabled",
      events: args.events,
      createdAt: new Date().toISOString(),
      description: args.description ?? null,
    };
    mockWebhooks.push(newWebhook);
    return JSON.stringify({ status: "created", webhook: newWebhook });
  }

  async function getWebhookEvents(): Promise<string> {
    return JSON.stringify({ events: WEBHOOK_EVENTS });
  }

  async function createRefundMfa(args: z.infer<typeof CreateRefundParameters>): Promise<string> {
    const pi = mockPaymentIntents.find((p) => p.id === args.payment_intent_id);
    if (!pi) return JSON.stringify({ error: `Payment intent ${args.payment_intent_id} not found` });
    if (pi.status !== "succeeded") return JSON.stringify({ error: `Payment intent is ${pi.status}, cannot refund` });
    setPendingAction(threadId, {
      type: "create_refund",
      data: { ...args, currency: pi.currency } as unknown as Record<string, unknown>,
    });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para crear un reembolso de $${args.amount.toLocaleString("es-CL")} ${pi.currency} del pago ${args.payment_intent_id}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function deleteBankingLinkMfa(args: z.infer<typeof DeleteBankingLinkParameters>): Promise<string> {
    const link = mockBankingLinks.find((l) => l.id === args.link_id);
    if (!link) return JSON.stringify({ error: `Banking link ${args.link_id} not found` });
    setPendingAction(threadId, { type: "delete_banking_link", data: { link_id: args.link_id } });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para eliminar el link bancario de "${link.holderName}" (${args.link_id}), se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function inviteTeamMemberMfa(args: z.infer<typeof InviteTeamMemberParameters>): Promise<string> {
    setPendingAction(threadId, { type: "invite_team_member", data: args as unknown as Record<string, unknown> });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para invitar a ${args.name} (${args.email}) como ${args.role}, se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  async function disableTeamMemberMfa(args: z.infer<typeof DisableTeamMemberParameters>): Promise<string> {
    const member = mockTeamMembers.find((m) => m.id === args.member_id);
    if (!member) return JSON.stringify({ error: `Team member ${args.member_id} not found` });
    if (member.role === "administrator") return JSON.stringify({ error: "Cannot disable an administrator" });
    setPendingAction(threadId, { type: "disable_team_member", data: { member_id: args.member_id } });
    return JSON.stringify({
      status: "mfa_required",
      message: `Para deshabilitar a ${member.name} (${member.email}), se requiere verificación MFA. Usa la herramienta request_mfa para iniciar la verificación.`,
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ── Return all tools ──
  // ══════════════════════════════════════════════════════════════

  return [
    // ── Transfers ──
    createTool({
      name: "get_transfers",
      description: "Get bank transfers. Can filter by status, type, counterparty name, currency, amount range, and date.",
      schema: GetTransfersParameters,
      handler: getTransfers,
    }),
    createTool({
      name: "get_transfer_by_id",
      description: "Get a specific transfer by its ID.",
      schema: GetTransferByIdParameters,
      handler: getTransferById,
    }),
    createTool({
      name: "create_transfer",
      description: "Create a new outbound transfer. Requires MFA verification before execution.",
      schema: CreateTransferParameters,
      handler: createTransfer,
    }),

    // ── MFA ──
    createTool({
      name: "request_mfa",
      description: "Initiates MFA verification for a pending action. Simulates sending an OTP code. Call this after a tool returns mfa_required status.",
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
      handler: listWebhooks,
    }),
    createTool({
      name: "create_webhook",
      description: "Create a new webhook endpoint. Specify the URL and list of events to subscribe to.",
      schema: CreateWebhookParameters,
      handler: createWebhook,
    }),
    createTool({
      name: "update_webhook",
      description: "Update an existing webhook endpoint. Can change URL, events, status (enable/disable), or description.",
      schema: UpdateWebhookParameters,
      handler: updateWebhook,
    }),
    createTool({
      name: "delete_webhook",
      description: "Delete a webhook endpoint by ID. Requires MFA verification.",
      schema: DeleteWebhookParameters,
      handler: deleteWebhook,
    }),
    createTool({
      name: "get_webhook_events",
      description: "List all available event types that can be used when creating or updating webhooks.",
      schema: GetWebhookEventsParameters,
      handler: getWebhookEvents,
    }),

    // ── Payments ──
    createTool({
      name: "list_payment_intents",
      description: "List payment intents. Can filter by status, currency, and amount range.",
      schema: ListPaymentIntentsParameters,
      handler: listPaymentIntents,
    }),
    createTool({
      name: "get_payment_intent",
      description: "Get a specific payment intent by ID.",
      schema: GetPaymentIntentParameters,
      handler: getPaymentIntent,
    }),

    // ── Checkout Sessions ──
    createTool({
      name: "list_checkout_sessions",
      description: "List checkout sessions. Can filter by status (open, completed, expired).",
      schema: ListCheckoutSessionsParameters,
      handler: listCheckoutSessions,
    }),
    createTool({
      name: "get_checkout_session",
      description: "Get a specific checkout session by ID.",
      schema: GetCheckoutSessionParameters,
      handler: getCheckoutSession,
    }),
    createTool({
      name: "create_checkout_session",
      description: "Create a new checkout session for accepting a payment. Returns a URL to redirect the customer.",
      schema: CreateCheckoutSessionParameters,
      handler: createCheckoutSession,
    }),
    createTool({
      name: "expire_checkout_session",
      description: "Expire/cancel an open checkout session.",
      schema: ExpireCheckoutSessionParameters,
      handler: expireCheckoutSession,
    }),

    // ── Payment Links ──
    createTool({
      name: "list_payment_links",
      description: "List payment links. Can filter by status (active, expired, cancelled).",
      schema: ListPaymentLinksParameters,
      handler: listPaymentLinks,
    }),
    createTool({
      name: "get_payment_link",
      description: "Get a specific payment link by ID with details including payment count and total collected.",
      schema: GetPaymentLinkParameters,
      handler: getPaymentLink,
    }),
    createTool({
      name: "create_payment_link",
      description: "Create a new payment link. Returns a shareable URL for collecting payments.",
      schema: CreatePaymentLinkParameters,
      handler: createPaymentLink,
    }),
    createTool({
      name: "cancel_payment_link",
      description: "Cancel an active payment link.",
      schema: CancelPaymentLinkParameters,
      handler: cancelPaymentLink,
    }),

    // ── Refunds ──
    createTool({
      name: "list_refunds",
      description: "List refunds. Can filter by status and payment intent ID.",
      schema: ListRefundsParameters,
      handler: listRefunds,
    }),
    createTool({
      name: "get_refund",
      description: "Get a specific refund by ID.",
      schema: GetRefundParameters,
      handler: getRefund,
    }),
    createTool({
      name: "create_refund",
      description: "Create a refund for a succeeded payment intent. Requires MFA verification.",
      schema: CreateRefundParameters,
      handler: createRefundMfa,
    }),

    // ── Transfer Accounts ──
    createTool({
      name: "list_transfer_accounts",
      description: "List transfer accounts (bank accounts registered for sending/receiving transfers). Can filter by currency.",
      schema: ListTransferAccountsParameters,
      handler: listTransferAccounts,
    }),
    createTool({
      name: "get_transfer_account",
      description: "Get a specific transfer account by ID.",
      schema: GetTransferAccountParameters,
      handler: getTransferAccount,
    }),
    createTool({
      name: "create_transfer_account",
      description: "Register a new bank account for transfers.",
      schema: CreateTransferAccountParameters,
      handler: createTransferAccount,
    }),

    // ── Direct Debit: Subscription Intents ──
    createTool({
      name: "list_subscription_intents",
      description: "List subscription intents (customer intents to subscribe for recurring payments).",
      schema: ListSubscriptionIntentsParameters,
      handler: listSubscriptionIntents,
    }),
    createTool({
      name: "get_subscription_intent",
      description: "Get a specific subscription intent by ID.",
      schema: GetSubscriptionIntentParameters,
      handler: getSubscriptionIntent,
    }),
    createTool({
      name: "create_subscription_intent",
      description: "Create a new subscription intent. Returns a widget token for the customer to authorize recurring payments.",
      schema: CreateSubscriptionIntentParameters,
      handler: createSubscriptionIntent,
    }),

    // ── Direct Debit: Subscriptions ──
    createTool({
      name: "list_subscriptions",
      description: "List active and cancelled subscriptions (direct debit / recurring payments).",
      schema: ListSubscriptionsParameters,
      handler: listSubscriptions,
    }),
    createTool({
      name: "get_subscription",
      description: "Get a specific subscription by ID with details including charges count and last charge date.",
      schema: GetSubscriptionParameters,
      handler: getSubscription,
    }),

    // ── Direct Debit: Charges ──
    createTool({
      name: "list_charges",
      description: "List charges (individual payments within subscriptions). Can filter by subscription ID and status.",
      schema: ListChargesParameters,
      handler: listCharges,
    }),
    createTool({
      name: "get_charge",
      description: "Get a specific charge by ID.",
      schema: GetChargeParameters,
      handler: getCharge,
    }),
    createTool({
      name: "create_charge",
      description: "Create a new charge for an active subscription.",
      schema: CreateChargeParameters,
      handler: createCharge,
    }),
    createTool({
      name: "cancel_charge",
      description: "Cancel a pending charge.",
      schema: CancelChargeParameters,
      handler: cancelCharge,
    }),

    // ── Banking Links (Data Aggregation) ──
    createTool({
      name: "list_banking_links",
      description: "List banking links (connections to users' bank accounts for data aggregation). Can filter by status and institution.",
      schema: ListBankingLinksParameters,
      handler: listBankingLinks,
    }),
    createTool({
      name: "get_banking_link",
      description: "Get a specific banking link by ID, including associated bank accounts and balances.",
      schema: GetBankingLinkParameters,
      handler: getBankingLink,
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
      description: "List bank movements (transactions) for a specific account within a banking link. Can filter by type, amount range, and date range.",
      schema: ListMovementsParameters,
      handler: listMovements,
    }),

    // ── Refresh Intents ──
    createTool({
      name: "create_refresh_intent",
      description: "Trigger a data refresh for a banking link. Use 'only_last' for recent movements or 'historical' for full history refresh.",
      schema: CreateRefreshIntentParameters,
      handler: createRefreshIntent,
    }),

    // ── Team ──
    createTool({
      name: "list_team_members",
      description: "List team members of the organization. Can filter by role and status.",
      schema: ListTeamMembersParameters,
      handler: listTeamMembers,
    }),
    createTool({
      name: "get_team_member",
      description: "Get a specific team member by ID.",
      schema: GetTeamMemberParameters,
      handler: getTeamMember,
    }),
    createTool({
      name: "invite_team_member",
      description: "Invite a new team member. Requires MFA verification.",
      schema: InviteTeamMemberParameters,
      handler: inviteTeamMemberMfa,
    }),
    createTool({
      name: "update_team_member_role",
      description: "Change a team member's role.",
      schema: UpdateTeamMemberRoleParameters,
      handler: updateTeamMemberRole,
    }),
    createTool({
      name: "disable_team_member",
      description: "Disable a team member's access. Requires MFA verification. Cannot disable administrators.",
      schema: DisableTeamMemberParameters,
      handler: disableTeamMemberMfa,
    }),

    // ── API Keys ──
    createTool({
      name: "get_api_keys_info",
      description: "Get information about the organization's API keys (type, environment, prefix, IP restrictions). Does NOT reveal the full key values.",
      schema: GetApiKeysInfoParameters,
      handler: getApiKeysInfo,
    }),

    // ── Reports ──
    createTool({
      name: "list_reports",
      description: "List available reports. Can filter by type (payout_reconciliation, daily_transactions, transfers_summary) and status.",
      schema: ListReportsParameters,
      handler: listReports,
    }),
    createTool({
      name: "get_report",
      description: "Get a specific report by ID with download URL if ready.",
      schema: GetReportParameters,
      handler: getReport,
    }),
    createTool({
      name: "create_report",
      description: "Generate a new report. Specify type, date range, and format.",
      schema: CreateReportParameters,
      handler: createReport,
    }),

    // ── Institutions ──
    createTool({
      name: "list_institutions",
      description: "List supported financial institutions. Can filter by country (CL, MX) and supported product (payments, transfers, movements).",
      schema: ListInstitutionsParameters,
      handler: listInstitutions,
    }),
  ];
}

// Keep defaultTools for backward compat
export const defaultTools: Tool[] = [
  createTool({
    name: "get_transfers",
    description: "Get bank transfers. Can filter by status, sender, recipient, amount range, and date.",
    schema: GetTransfersParameters,
    handler: getTransfers,
  }),
];
