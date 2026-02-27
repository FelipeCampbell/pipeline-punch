/**
 * Route dispatch table.
 *
 * Maps "resource.action" keys to Rails API endpoint definitions.
 * Every endpoint from the dashboard's /api/modules/ is represented here.
 */

export interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Path template. Use :id for positional arg substitution. */
  path: string;
  /**
   * Where flags go: "query" sends them as URL params, "body" sends as JSON body.
   * Defaults: GET/DELETE -> query, POST/PUT/PATCH -> body.
   * Some routes need overrides (e.g., DELETE with body, POST with query params).
   */
  flagsIn?: "query" | "body";
  /**
   * For routes where some flags go in query and others in body,
   * list the flag names that should go in query. Rest goes in body.
   */
  queryFlags?: string[];
  /** Description shown in help */
  description?: string;
  /** Response type override */
  responseType?: "arraybuffer";
}

/**
 * Build the route key from resource + action.
 */
export function routeKey(resource: string, action: string): string {
  return `${resource}.${action}`;
}

export const routes: Record<string, RouteDefinition> = {
  // ─── User ──────────────────────────────────────────────────────────────────
  "user.show": {
    method: "GET",
    path: "/internal/v1/user",
    description: "Get current user info",
  },
  "user.create": {
    method: "POST",
    path: "/internal/v1/user",
    description: "Create user (name, last_name, jwt)",
  },
  "user.update": {
    method: "PUT",
    path: "/internal/v1/user",
    description: "Update user (name, last_name)",
  },
  "user.mfa-status": {
    method: "GET",
    path: "/internal/v1/user/mfa_status",
    description: "Get user MFA status",
  },
  "user.default-org": {
    method: "PATCH",
    path: "/internal/v1/user/default_organization",
    description: "Update default organization (default_organization_id)",
  },
  "user.login-strategy": {
    method: "GET",
    path: "/internal/v1/dashboard/user/login_strategy",
    description: "Get login strategy for email (--email)",
  },
  "user.change-password": {
    method: "POST",
    path: "/internal/v1/user/change_password",
    description: "Request password change (--email)",
  },

  // ─── Sessions ──────────────────────────────────────────────────────────────
  "sessions.create": {
    method: "POST",
    path: "/internal/v1/dashboard/sessions",
    description: "Create session from JWT (--jwt)",
  },
  "sessions.validate": {
    method: "POST",
    path: "/internal/v1/dashboard/sessions/validate",
    description: "Validate current session",
  },
  "sessions.activate": {
    method: "POST",
    path: "/internal/v1/dashboard/sessions/activate",
    description: "Activate session with MFA (--code, --should_trust_device)",
  },
  "sessions.expire": {
    method: "POST",
    path: "/internal/v1/dashboard/sessions/expire",
    description: "Expire (logout) current session",
  },
  "sessions.extend": {
    method: "POST",
    path: "/internal/v1/dashboard/sessions/extend",
    description: "Extend current session",
  },
  "sessions.ping": {
    method: "GET",
    path: "/internal/v1/dashboard/ping",
    description: "Ping dashboard (health check)",
  },

  // ─── Transfers ─────────────────────────────────────────────────────────────
  "transfers.list": {
    method: "GET",
    path: "/internal/v2/dashboard/transfers",
    description: "List transfers (--mode, --limit, --starting_after, etc.)",
  },
  "transfers.show": {
    method: "GET",
    path: "/internal/v2/dashboard/transfers/:id",
    description: "Show transfer by ID (--mode)",
  },
  "transfers.return": {
    method: "POST",
    path: "/internal/v2/dashboard/transfers/return",
    description: "Return a transfer (--transfer_id, --mode, --otp_code)",
  },
  "transfers.simulate-receive": {
    method: "POST",
    path: "/internal/v2/dashboard/simulate/receive_transfer",
    description: "Simulate receiving a transfer (--amount_units, --amount_currency, --number)",
  },
  "transfers.metadata-keys": {
    method: "GET",
    path: "/internal/v2/dashboard/transfers/metadata_keys",
    description: "Get transfer metadata keys (--mode)",
  },
  "transfers.receipt": {
    method: "GET",
    path: "/internal/v2/dashboard/transfers/:id/fintoc_receipt",
    description: "Download transfer receipt PDF (--mode)",
    responseType: "arraybuffer",
  },

  // ─── Transfer Intents ──────────────────────────────────────────────────────
  "transfer-intents.list": {
    method: "GET",
    path: "/internal/v2/dashboard/transfer_intents",
    description:
      "List transfer intents (--mode, --limit, --status, --account_id, etc.)",
  },
  "transfer-intents.create": {
    method: "POST",
    path: "/internal/v2/dashboard/transfer_intents",
    description:
      "Create transfer intent (--account_id, --amount, --currency, --counterparty.*, --metadata.*)",
  },
  "transfer-intents.batch-review": {
    method: "POST",
    path: "/internal/v2/dashboard/transfer_intents/batch_review",
    description:
      "Batch approve/reject transfer intents (--mode, --transfer_intent_ids, --decision, --otp_code)",
  },
  "transfer-intents.approvable-count": {
    method: "GET",
    path: "/internal/v2/dashboard/transfer_intents/approvable_count",
    description: "Get count of approvable transfer intents (--mode)",
  },

  // ─── Transfer Batches ──────────────────────────────────────────────────────
  "transfer-batches.list": {
    method: "GET",
    path: "/internal/v2/dashboard/transfer_batches",
    description: "List transfer batches (--mode, --limit, --status, etc.)",
  },
  "transfer-batches.show": {
    method: "GET",
    path: "/internal/v2/dashboard/transfer_batches/:id",
    description: "Show transfer batch by ID (--mode)",
  },
  "transfer-batches.create": {
    method: "POST",
    path: "/internal/v2/dashboard/transfer_batches",
    description:
      "Create transfer batch (--description, --currency, --rows, --otp_code, --mode)",
  },
  "transfer-batches.list-intents": {
    method: "GET",
    path: "/internal/v2/dashboard/transfer_batches/:id/transfer_intents",
    description: "List intents in a batch (--mode, --limit, etc.)",
  },
  "transfer-batches.review": {
    method: "POST",
    path: "/internal/v2/dashboard/transfer_batches/:id/review",
    description: "Review (approve/reject) a batch (--mode, --decision, --otp_code)",
  },
  "transfer-batches.approvable-count": {
    method: "GET",
    path: "/internal/v2/dashboard/transfer_batches/approvable_count",
    description: "Get count of approvable batches (--mode)",
  },

  // ─── Payments ──────────────────────────────────────────────────────────────
  "payments.list": {
    method: "GET",
    path: "/internal/v1/dashboard/payment_intents",
    description: "List payment intents (--mode, --limit, etc.)",
  },
  "payments.show": {
    method: "GET",
    path: "/internal/v1/dashboard/payment_intents/:id",
    description: "Show payment intent by ID (--mode)",
  },
  "payments.update": {
    method: "PATCH",
    path: "/internal/v1/dashboard/payment_intents/:id",
    queryFlags: ["mode"],
    description: "Update payment intent (--customer_email, --mode)",
  },
  "payments.export-email": {
    method: "GET",
    path: "/internal/v1/dashboard/payment_intents/send_export_email",
    description: "Send payment export email",
  },
  "payments.metadata-keys": {
    method: "GET",
    path: "/internal/v1/dashboard/payment_intents/metadata_keys",
    description: "Get payment metadata keys (--mode)",
  },

  // ─── Payments Onboarding ───────────────────────────────────────────────────
  "payments-onboarding.finalize": {
    method: "POST",
    path: "/internal/v1/dashboard/payments/onboarding/finalize",
    description: "Finalize payments onboarding",
  },
  "payments-onboarding.plan-fees": {
    method: "GET",
    path: "/internal/v1/dashboard/payments/onboarding/plan_fees",
    description: "Get plan fees",
  },

  // ─── Payouts ───────────────────────────────────────────────────────────────
  "payouts.list": {
    method: "GET",
    path: "/internal/v1/dashboard/payouts",
    description: "List payouts (--mode, etc.)",
  },
  "payouts.show": {
    method: "GET",
    path: "/internal/v1/dashboard/payouts/:id",
    description: "Show payout by ID",
  },
  "payouts.summary": {
    method: "GET",
    path: "/internal/v1/dashboard/payouts/summary",
    description: "Get payouts summary (--mode, etc.)",
  },
  "payouts.recipient-accounts": {
    method: "GET",
    path: "/internal/v1/dashboard/payouts/recipient_accounts",
    description: "List payout recipient accounts",
  },
  "payouts.default-recipient-account": {
    method: "GET",
    path: "/internal/v1/dashboard/payouts/default_recipient_account",
    description: "Get default payout recipient account",
  },
  "payouts.upsert-default-recipient-account": {
    method: "POST",
    path: "/internal/v1/dashboard/payouts/default_recipient_account",
    description:
      "Upsert default recipient account (--account_number, --holder_id, --institution_id, etc.)",
  },

  // ─── Recipients ────────────────────────────────────────────────────────────
  "recipients.list": {
    method: "GET",
    path: "/internal/v2/dashboard/recipients",
    description: "List recipients (--mode, --search, --holder_type, etc.)",
  },
  "recipients.create": {
    method: "POST",
    path: "/internal/v2/dashboard/recipients",
    description:
      "Create recipient (--mode, --alias, --holder_name, --holder_id, --account_number, etc.)",
  },
  "recipients.update": {
    method: "PATCH",
    path: "/internal/v2/dashboard/recipients/:id",
    description: "Update recipient (--mode, --alias, --holder_name, etc.)",
  },
  "recipients.delete": {
    method: "DELETE",
    path: "/internal/v2/dashboard/recipients/:id",
    description: "Delete recipient (--mode)",
  },

  // ─── Links ─────────────────────────────────────────────────────────────────
  "links.list": {
    method: "GET",
    path: "/internal/v1/dashboard/links",
    description: "List links (--mode, --institution_id, --page, --per_page, etc.)",
  },
  "links.show": {
    method: "GET",
    path: "/internal/v1/dashboard/links/:id",
    description: "Show link by ID (--mode)",
  },
  "links.update": {
    method: "PUT",
    path: "/internal/v1/dashboard/links/:id",
    description: "Update link (--link_data.active, --link_data.prevent_refresh, --mode)",
  },
  "links.delete": {
    method: "DELETE",
    path: "/internal/v1/dashboard/links/:id",
    flagsIn: "body",
    description: "Delete link (--mode)",
  },
  "links.regenerate": {
    method: "POST",
    path: "/internal/v1/dashboard/links/:id/regenerate_link_token",
    description: "Regenerate link token (--mode)",
  },
  "links.bank-accounts": {
    method: "GET",
    path: "/internal/v1/dashboard/links/:id/bank_accounts",
    description: "List bank accounts for a link (--mode, --page, --per_page, etc.)",
  },

  // ─── Account Numbers ──────────────────────────────────────────────────────
  "account-numbers.list": {
    method: "GET",
    path: "/internal/v2/dashboard/account_numbers",
    description: "List account numbers (--mode, etc.)",
  },
  "account-numbers.create": {
    method: "POST",
    path: "/internal/v2/dashboard/account_numbers",
    description:
      "Create account number (--mode, --account_id, --description, --metadata.*, --options.*)",
  },
  "account-numbers.update": {
    method: "PATCH",
    path: "/internal/v2/dashboard/account_numbers/:id",
    description:
      "Update account number (--mode, --description, --metadata.*, --status, --options.*)",
  },
  "account-numbers.metadata-keys": {
    method: "GET",
    path: "/internal/v2/dashboard/account_numbers/metadata_keys",
    description: "Get account number metadata keys (--mode)",
  },

  // ─── Core Accounts ─────────────────────────────────────────────────────────
  "accounts.list": {
    method: "GET",
    path: "/internal/v2/dashboard/accounts",
    description:
      "List accounts (--mode, --limit, --description, --account_id, --entity_id, etc.)",
  },
  "accounts.show": {
    method: "GET",
    path: "/internal/v2/dashboard/accounts/:id",
    description: "Show account by ID (--mode)",
  },
  "accounts.create": {
    method: "POST",
    path: "/internal/v2/dashboard/accounts",
    description: "Create account (--mode, --entity_id, --description)",
  },
  "accounts.update": {
    method: "PATCH",
    path: "/internal/v2/dashboard/accounts/:id",
    description: "Update account (--mode, --description)",
  },
  "accounts.block": {
    method: "POST",
    path: "/internal/v2/dashboard/accounts/:id/block",
    description: "Block account (--mode)",
  },
  "accounts.total-balance": {
    method: "GET",
    path: "/internal/v2/dashboard/accounts/total_balance",
    description: "Get total balance (--mode, --currency)",
  },
  "accounts.movements": {
    method: "GET",
    path: "/internal/v2/dashboard/accounts/:id/movements",
    description: "List account movements (--mode, --limit, etc.)",
  },

  // ─── Entities ──────────────────────────────────────────────────────────────
  "entities.list": {
    method: "GET",
    path: "/internal/v2/dashboard/entities",
    description: "List entities (--mode, --limit, --status, etc.)",
  },
  "entities.list-minimal": {
    method: "GET",
    path: "/internal/v2/dashboard/entities/minimal",
    description: "List entities (minimal) (--mode, --limit, --status, etc.)",
  },
  "entities.show": {
    method: "GET",
    path: "/internal/v2/dashboard/entities/:id",
    description: "Show entity by ID (--mode)",
  },
  "entities.create": {
    method: "POST",
    path: "/internal/v2/dashboard/entities",
    description: "Create entity (--mode, --holder_name, --holder_id)",
  },

  // ─── Organizations ─────────────────────────────────────────────────────────
  "organizations.show": {
    method: "GET",
    path: "/internal/v1/dashboard/organizations",
    description: "Get current organization",
  },
  "organizations.create": {
    method: "POST",
    path: "/internal/v1/dashboard/organizations",
    description: "Create organization (--name, --country)",
  },
  "organizations.update": {
    method: "PUT",
    path: "/internal/v1/dashboard/organizations/:id",
    description:
      "Update organization (--organization_data.technical_email, --organization_data.name, etc.)",
  },
  "organizations.update-mfa": {
    method: "PATCH",
    path: "/internal/v1/dashboard/current_organization/mfa",
    description: "Update MFA requirement (--requires_mfa)",
  },
  "organizations.update-ip-allowlist": {
    method: "PATCH",
    path: "/internal/v1/dashboard/organizations/:id/update_uses_ip_allowlist",
    queryFlags: ["mode"],
    description: "Update IP allowlist setting (--uses_ip_allowlist, --mode)",
  },

  // ─── Organization Users ────────────────────────────────────────────────────
  "organization-users.list": {
    method: "GET",
    path: "/internal/v1/dashboard/organization_users",
    description: "List organization users",
  },
  "organization-users.create": {
    method: "POST",
    path: "/internal/v1/dashboard/organization_users",
    description:
      "Create organization user (--name, --last_name, --email, --organization_role, --dashboard_role_name)",
  },
  "organization-users.update": {
    method: "PUT",
    path: "/internal/v1/dashboard/organization_users/:id",
    description:
      "Update organization user (--user_data.name, --user_data.last_name, --user_data.organization_role, etc.)",
  },
  "organization-users.delete": {
    method: "DELETE",
    path: "/internal/v1/dashboard/organization_users/:id",
    description: "Delete organization user",
  },
  "organization-users.current": {
    method: "GET",
    path: "/internal/v1/dashboard/organization_users/current_org_user",
    description: "Get current organization user",
  },
  "organization-users.resend-invitation": {
    method: "POST",
    path: "/internal/v1/dashboard/invitations/resend",
    description: "Resend invitation email (--email)",
  },

  // ─── Setup Links ───────────────────────────────────────────────────────────
  "setup-links.show": {
    method: "GET",
    path: "/internal/v1/dashboard/organizations/setup_links/:id",
    description: "Get setup link by token",
  },
  "setup-links.redeem": {
    method: "POST",
    path: "/internal/v1/dashboard/organizations/setup_links/:id/redeem",
    description: "Redeem setup link (--organization_name)",
  },

  // ─── API Keys ──────────────────────────────────────────────────────────────
  "api-keys.list": {
    method: "GET",
    path: "/internal/v1/dashboard/api_keys",
    description: "List API keys (--mode)",
  },
  "api-keys.create": {
    method: "POST",
    path: "/internal/v1/dashboard/api_keys",
    description: "Create API key (--mode)",
  },
  "api-keys.roll": {
    method: "POST",
    path: "/internal/v1/dashboard/api_keys/:id/roll",
    description: "Roll API key (--delay_hours, --mode)",
  },
  "api-keys.expire": {
    method: "POST",
    path: "/internal/v1/dashboard/api_keys/:id/expire",
    description: "Expire API key (--mode)",
  },

  // ─── Billing ───────────────────────────────────────────────────────────────
  "billing.show": {
    method: "GET",
    path: "/internal/v1/dashboard/billing/organization",
    description: "Get billing organization info",
  },
  "billing.update": {
    method: "PATCH",
    path: "/internal/v1/dashboard/billing/organization",
    description:
      "Update billing organization (--billing_emails, --business_name, --business_address, etc.)",
  },
  "billing.upsert": {
    method: "PUT",
    path: "/internal/v1/dashboard/billing/organization",
    description: "Upsert billing organization (CL: --rut, --business_name; MX: --rfc, etc.)",
  },
  "billing.invoices": {
    method: "GET",
    path: "/internal/v1/dashboard/billing/invoices",
    description: "List billing invoices",
  },
  "billing.download-invoice": {
    method: "GET",
    path: "/internal/v1/dashboard/billing/invoices/download/:id",
    description: "Download invoice files by folio",
  },
  "billing.fiscal-regimes": {
    method: "GET",
    path: "/internal/v1/dashboard/billing/fiscal_regimes",
    description: "List fiscal regimes",
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────
  "analytics.payments": {
    method: "GET",
    path: "/internal/v1/dashboard/analytics/payments",
    description: "Payment analytics (date range, filters)",
  },
  "analytics.refunds": {
    method: "GET",
    path: "/internal/v1/dashboard/analytics/refunds",
    description: "Refund analytics",
  },
  "analytics.payment-methods": {
    method: "GET",
    path: "/internal/v1/dashboard/analytics/payment_methods",
    description: "Payment methods analytics",
  },

  // ─── Webhook Endpoints ─────────────────────────────────────────────────────
  "webhook-endpoints.list": {
    method: "GET",
    path: "/internal/v1/dashboard/webhook_endpoints",
    description: "List webhook endpoints (--mode)",
  },
  "webhook-endpoints.show": {
    method: "GET",
    path: "/internal/v1/dashboard/webhook_endpoints/:id",
    description: "Show webhook endpoint (--mode)",
  },
  "webhook-endpoints.create": {
    method: "POST",
    path: "/internal/v1/dashboard/webhook_endpoints",
    queryFlags: ["mode"],
    description: "Create webhook endpoint (--name, --url, --enabled_events, --mode)",
  },
  "webhook-endpoints.update": {
    method: "PUT",
    path: "/internal/v1/dashboard/webhook_endpoints/:id",
    queryFlags: ["mode"],
    description: "Update webhook endpoint (--name, --url, --enabled_events, --disabled, --mode)",
  },
  "webhook-endpoints.delete": {
    method: "DELETE",
    path: "/internal/v1/dashboard/webhook_endpoints/:id",
    description: "Delete webhook endpoint (--mode)",
  },
  "webhook-endpoints.secret": {
    method: "GET",
    path: "/internal/v1/dashboard/webhook_endpoints/:id/secret",
    description: "Get webhook endpoint secret (--mode)",
  },
  "webhook-endpoints.test": {
    method: "POST",
    path: "/internal/v1/dashboard/webhook_endpoints/:id/test",
    queryFlags: ["mode"],
    description: "Send test webhook (--event, --mode)",
  },

  // ─── Webhook Event Messages ────────────────────────────────────────────────
  "webhook-events.list": {
    method: "GET",
    path: "/internal/v1/dashboard/webhook_event_messages",
    description: "List webhook event messages (--mode, --limit, etc.)",
  },
  "webhook-events.show": {
    method: "GET",
    path: "/internal/v1/dashboard/webhook_event_messages/:id",
    description: "Show webhook event message (--mode)",
  },

  // ─── Banks ─────────────────────────────────────────────────────────────────
  "banks.list": {
    method: "GET",
    path: "/internal/v1/dashboard/banks",
    description: "List banks (--country)",
  },

  // ─── Charges ───────────────────────────────────────────────────────────────
  "charges.list": {
    method: "GET",
    path: "/internal/v1/dashboard/charges",
    description: "List charges",
  },

  // ─── Subscriptions ─────────────────────────────────────────────────────────
  "subscriptions.list": {
    method: "GET",
    path: "/internal/v1/dashboard/subscriptions",
    description: "List subscriptions",
  },

  // ─── Refunds ───────────────────────────────────────────────────────────────
  "refunds.create": {
    method: "POST",
    path: "/internal/v1/dashboard/refunds",
    queryFlags: ["mode"],
    description: "Create refund (--resource_type, --resource_id, --amount, --mode)",
  },
  "refunds.cancel": {
    method: "POST",
    path: "/internal/v1/dashboard/refunds/:id/cancel",
    description: "Cancel refund (--mode)",
  },

  // ─── Exports ───────────────────────────────────────────────────────────────
  "exports.show": {
    method: "GET",
    path: "/internal/v1/dashboard/exports/:id",
    description: "Show export by ID (--mode)",
  },
  "exports.show-v2": {
    method: "GET",
    path: "/internal/v2/dashboard/exports/:id",
    description: "Show export by ID v2 (--mode)",
  },
  "exports.create": {
    method: "POST",
    path: "/internal/v1/dashboard/payment_intents/export",
    description: "Create payment export (--product, --file_type, --export_format, --mode)",
  },
  "exports.create-transfers": {
    method: "POST",
    path: "/internal/v2/dashboard/transfers/export",
    description: "Create transfers export (--product, --file_type, --export_format, --mode)",
  },
  "exports.create-transfer-intents": {
    method: "POST",
    path: "/internal/v2/dashboard/transfer_intents/export",
    description: "Create transfer intents export",
  },
  "exports.create-account-movements": {
    method: "POST",
    path: "/internal/v2/dashboard/movements/export",
    description: "Create account movements export",
  },

  // ─── Invitations ───────────────────────────────────────────────────────────
  "invitations.show": {
    method: "GET",
    path: "/internal/v1/dashboard/invitations/:id",
    description: "Get invitation by token",
  },
  "invitations.accept": {
    method: "GET",
    path: "/internal/v1/dashboard/invitations/:id/accept",
    description: "Accept invitation by token",
  },

  // ─── Allowed CIDR Blocks ───────────────────────────────────────────────────
  "cidr-blocks.list": {
    method: "GET",
    path: "/internal/v1/dashboard/allowed_cidr_blocks",
    description: "List allowed CIDR blocks (--mode)",
  },
  "cidr-blocks.create": {
    method: "POST",
    path: "/internal/v1/dashboard/allowed_cidr_blocks",
    description: "Create allowed CIDR block (--mode, --cidr_block)",
  },
  "cidr-blocks.delete": {
    method: "DELETE",
    path: "/internal/v1/dashboard/allowed_cidr_blocks/:id",
    description: "Delete allowed CIDR block (--mode)",
  },

  // ─── JWS Public Keys ──────────────────────────────────────────────────────
  "jws-keys.list": {
    method: "GET",
    path: "/internal/v1/dashboard/jws_public_keys",
    description: "List JWS public keys (--mode)",
  },
  "jws-keys.create": {
    method: "POST",
    path: "/internal/v1/dashboard/jws_public_keys",
    description:
      "Create JWS public key (--mode, --key_text, --otp_code, --previous_key_expiration_delay_hours)",
  },

  // ─── Shopify ───────────────────────────────────────────────────────────────
  "shopify.create": {
    method: "POST",
    path: "/internal/v1/dashboard/shopify/shops",
    description: "Create Shopify shop (--shop_domain, --country)",
  },

  // ─── OTPs (MFA) ───────────────────────────────────────────────────────────
  "otps.create": {
    method: "POST",
    path: "/internal/v1/dashboard/mfa/otp",
    description: "Create OTP (returns provisioning URI)",
  },
  "otps.validate": {
    method: "POST",
    path: "/internal/v1/dashboard/mfa/otp/validate",
    description: "Validate OTP (--code)",
  },
  "otps.deactivate": {
    method: "DELETE",
    path: "/internal/v1/dashboard/mfa/otp",
    description: "Deactivate OTP",
  },

  // ─── Trusted Devices ──────────────────────────────────────────────────────
  "trusted-devices.revoke-all": {
    method: "POST",
    path: "/internal/v1/dashboard/trusted_devices/revoke_all",
    description: "Revoke all trusted devices",
  },

  // ─── Debt Collection ──────────────────────────────────────────────────────
  "debt-collection.organizations": {
    method: "GET",
    path: "/internal/v1/dashboard/debt_collection/organizations",
    description: "List debt collection organizations (--page, --per_page)",
  },
  "debt-collection.initiate-commitment": {
    method: "POST",
    path: "/internal/v1/dashboard/debt_collection/organizations/:id/commitment_conversation",
    description: "Initiate commitment conversation",
  },

  // ─── Clarifications ───────────────────────────────────────────────────────
  "clarifications.create": {
    method: "POST",
    path: "/internal/v1/dashboard/clarifications",
    description:
      "Create clarification (--default_title, --movement_id, --mode, --clarification_type, --clarification_reason, --affected_resource)",
  },

  // ─── Roles ─────────────────────────────────────────────────────────────────
  "roles.list": {
    method: "GET",
    path: "/internal/v1/dashboard/roles",
    description: "List roles",
  },

  // ─── Policies ──────────────────────────────────────────────────────────────
  "policies.list": {
    method: "GET",
    path: "/internal/v1/dashboard/policies",
    description: "List policies",
  },
};

/**
 * Get a list of all available commands for help text.
 */
export function getAvailableCommands(): string[] {
  return Object.entries(routes).map(([key, route]) => {
    const [resource, action] = key.split(".");
    return `fintoc ${resource} ${action}${route.description ? ` — ${route.description}` : ""}`;
  });
}

export interface GroupedAction {
  action: string;
  command: string;
  method: string;
  description: string;
}

/**
 * Get commands grouped by resource, with structured action info.
 */
export function getGroupedCommands(): Record<string, GroupedAction[]> {
  const grouped: Record<string, GroupedAction[]> = {};

  for (const [key, route] of Object.entries(routes)) {
    const [resource, action] = key.split(".");
    if (!resource || !action) continue;

    if (!grouped[resource]) {
      grouped[resource] = [];
    }

    grouped[resource].push({
      action,
      command: `fintoc ${resource} ${action}`,
      method: route.method,
      description: route.description || "",
    });
  }

  return grouped;
}

/**
 * Render a concise CLI-style help text.
 * Reads like a real `--help` — usage, resources list, examples.
 */
export function renderHelpText(): string {
  const grouped = getGroupedCommands();
  const resources = Object.keys(grouped);

  // Wrap resources into lines of ~60 chars, indented by 4 spaces
  const resourceLines: string[] = [];
  let currentLine = "    ";
  for (let i = 0; i < resources.length; i++) {
    const sep = i === 0 ? "" : ", ";
    const candidate = currentLine + sep + resources[i];
    if (candidate.length > 64 && currentLine.trim().length > 0) {
      resourceLines.push(currentLine + ",");
      currentLine = "    " + resources[i];
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine.trim().length > 0) {
    resourceLines.push(currentLine);
  }

  return [
    "Fintoc CLI",
    "",
    "  Usage:  fintoc <resource> <action> [<id>] [--flag value ...]",
    "",
    "  Resources:",
    ...resourceLines,
    "",
    "  Examples:",
    "    fintoc transfers list --mode live --limit 10",
    "    fintoc transfers show tra_123 --mode live",
    "    fintoc recipients create --holder_name \"John\" --account_number 123456",
    "    fintoc webhook-endpoints list --mode test",
    "",
    "  Run \"fintoc <resource> help\" to see all actions for a resource.",
    "",
  ].join("\n");
}

/**
 * Render CLI-style help text for a single resource.
 */
export function renderResourceHelpText(resource: string, actions: GroupedAction[]): string {
  const lines: string[] = [];

  // Find the longest full command for alignment
  let maxCmdLen = 0;
  for (const a of actions) {
    const len = `fintoc ${resource} ${a.action}`.length;
    if (len > maxCmdLen) maxCmdLen = len;
  }
  const colWidth = maxCmdLen + 6; // 2 indent + 4 gutter

  lines.push(`Fintoc CLI — ${resource}`);
  lines.push("");

  for (const a of actions) {
    const cmd = `  fintoc ${resource} ${a.action}`;
    const padded = cmd.padEnd(colWidth);
    lines.push(`${padded}[${a.method}]  ${a.description}`);
  }

  lines.push("");
  return lines.join("\n");
}
