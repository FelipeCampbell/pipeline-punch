// ── Constants ──

export const TRANSFER_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "returned",
  "rejected",
  "return_pending",
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const TRANSFER_TYPES = ["inbound", "outbound"] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

export const ACCOUNT_TYPES = [
  "clabe",
  "debit_card",
  "mobile",
  "checking_account",
  "sight_account",
  "savings_account",
  "unknown",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CURRENCIES = ["CLP", "MXN"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const WEBHOOK_EVENTS = [
  "transfer.created",
  "transfer.succeeded",
  "transfer.failed",
  "transfer.returned",
  "payment_intent.created",
  "payment_intent.succeeded",
  "payment_intent.failed",
  "checkout_session.completed",
  "checkout_session.expired",
  "link.created",
  "link.paid",
  "link.expired",
  "subscription.activated",
  "subscription.cancelled",
  "charge.succeeded",
  "charge.failed",
] as const;

export const PAYMENT_INTENT_STATUSES = [
  "requires_payment",
  "succeeded",
  "failed",
  "expired",
] as const;
export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export const CHECKOUT_SESSION_STATUSES = [
  "open",
  "completed",
  "expired",
] as const;
export type CheckoutSessionStatus = (typeof CHECKOUT_SESSION_STATUSES)[number];

export const PAYMENT_LINK_STATUSES = [
  "active",
  "expired",
  "cancelled",
] as const;
export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUSES)[number];

export const REFUND_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "active",
  "paused",
  "cancelled",
  "pending",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_INTENT_STATUSES = [
  "created",
  "succeeded",
  "failed",
] as const;
export type SubscriptionIntentStatus =
  (typeof SUBSCRIPTION_INTENT_STATUSES)[number];

export const CHARGE_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const LINK_STATUSES = ["active", "inactive"] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const MOVEMENT_TYPES = ["debit", "credit"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const TEAM_ROLES = [
  "administrator",
  "operations",
  "developer",
  "viewer",
] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_MEMBER_STATUSES = [
  "active",
  "invited",
  "disabled",
] as const;
export type TeamMemberStatus = (typeof TEAM_MEMBER_STATUSES)[number];

export const REPORT_TYPES = [
  "payout_reconciliation",
  "daily_transactions",
  "transfers_summary",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = [
  "pending",
  "ready",
  "failed",
] as const;
export type ReportStatusType = (typeof REPORT_STATUSES)[number];

export const COUNTRIES = ["CL", "MX"] as const;
export type Country = (typeof COUNTRIES)[number];

// ── Interfaces ──

// Transfers
export interface Counterparty {
  holderName: string | null;
  holderId: string | null;
  institutionName: string;
  institutionId: string;
  accountType: AccountType;
  accountNumber: string;
  email: string | null;
}

export interface TransferBatch {
  id: string;
  description: string | null;
}

export interface BaseTransfer {
  id: string;
  counterparty: Counterparty;
  status: TransferStatus;
  type: TransferType;
  amountCents: number;
  metadata: Record<string, string | number | boolean | null>;
  transactionDate: string | null;
  returnReason: string | null;
  comment: string | null;
  accountNumber: {
    number: string;
    accountId: string;
    accountDescription: string | null;
  };
  trackingKey: string | null;
  createdAt: string;
  reversedAt: string | null;
  failedAt: string | null;
  rejectedAt: string | null;
  transferBatch: TransferBatch | null;
}

export interface TransferCLP extends BaseTransfer {
  currency: "CLP";
  referenceId: null;
  receiptUrl: null;
}

export interface TransferMXN extends BaseTransfer {
  currency: "MXN";
  referenceId: string | null;
  receiptUrl: string | null;
}

export type Transfer = TransferCLP | TransferMXN;

// Webhooks
export interface WebhookEndpoint {
  id: string;
  url: string;
  status: "enabled" | "disabled";
  events: string[];
  createdAt: string;
  description: string | null;
}

// Payments
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentIntentStatus;
  recipientAccount: {
    holderId: string;
    holderName: string;
    institutionId: string;
    number: string;
    type: AccountType;
  };
  senderAccount: {
    holderId: string | null;
    holderName: string | null;
    institutionId: string;
    number: string;
    type: AccountType;
  } | null;
  widget_token: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  transactionDate: string | null;
}

export interface CheckoutSession {
  id: string;
  amount: number;
  currency: Currency;
  status: CheckoutSessionStatus;
  paymentIntentId: string | null;
  successUrl: string;
  cancelUrl: string;
  url: string;
  customerEmail: string | null;
  expiresAt: string;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface PaymentLink {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: Currency;
  status: PaymentLinkStatus;
  url: string;
  paymentCount: number;
  totalCollected: number;
  expiresAt: string | null;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface Refund {
  id: string;
  amount: number;
  currency: Currency;
  status: RefundStatus;
  paymentIntentId: string;
  reason: string | null;
  createdAt: string;
  completedAt: string | null;
}

// Transfer Accounts
export interface TransferAccount {
  id: string;
  holderName: string;
  holderId: string;
  institutionId: string;
  institutionName: string;
  accountType: AccountType;
  accountNumber: string;
  currency: Currency;
  description: string | null;
  createdAt: string;
}

// Direct Debit
export interface SubscriptionIntent {
  id: string;
  status: SubscriptionIntentStatus;
  widgetToken: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  customerName: string;
  customerEmail: string;
  mandateId: string;
  institutionId: string;
  institutionName: string;
  accountNumber: string;
  totalCharges: number;
  lastChargeDate: string | null;
  createdAt: string;
}

export interface Charge {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: Currency;
  status: ChargeStatus;
  description: string | null;
  createdAt: string;
  paidAt: string | null;
}

// Data Aggregation (Banking Links)
export interface BankingLink {
  id: string;
  holderName: string;
  holderId: string;
  holderType: "individual" | "business";
  institutionId: string;
  institutionName: string;
  status: LinkStatus;
  createdAt: string;
  lastRefreshedAt: string | null;
  accounts: BankingLinkAccount[];
}

export interface BankingLinkAccount {
  id: string;
  name: string;
  officialName: string | null;
  number: string;
  type: AccountType;
  currency: Currency;
  balance: {
    available: number;
    current: number;
  };
}

export interface Movement {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  postDate: string;
  transactionDate: string | null;
  type: MovementType;
  accountId: string;
  recipientAccount: {
    holderName: string | null;
    holderId: string | null;
    institutionName: string | null;
    number: string | null;
  } | null;
  senderAccount: {
    holderName: string | null;
    holderId: string | null;
    institutionName: string | null;
    number: string | null;
  } | null;
  comment: string | null;
  referenceId: string | null;
}

export interface RefreshIntent {
  id: string;
  linkId: string;
  type: "only_last" | "historical";
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
}

// Team
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  invitedAt: string;
  joinedAt: string | null;
}

// API Keys
export interface ApiKeyInfo {
  type: "public" | "secret";
  environment: "test" | "live";
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  ipRestrictions: {
    enabled: boolean;
    allowedIps: string[];
  };
}

// Reports
export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatusType;
  dateRange: {
    from: string;
    to: string;
  };
  createdAt: string;
  downloadUrl: string | null;
  format: "csv" | "xlsx";
}

// Institutions
export interface Institution {
  id: string;
  name: string;
  country: Country;
  supportedProducts: string[];
  holderTypes: ("individual" | "business")[];
  status: "active" | "maintenance" | "inactive";
}
