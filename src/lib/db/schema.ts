import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { relations, sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type ModelType =
  | "chat"
  | "image"
  | "tts"
  | "stt"
  | "embedding"
  | "rerank";

export type ImageInputPolicy =
  | "strip_and_instruct"
  | "canned_response"
  | "reject_error";

export interface ModelPricing {
  // Price per single token in USD (e.g. 0.000003 = $3/1M tokens).
  // For image/tts/stt/rerank, use perUnit / perImage / perMinute / perSecond as needed.
  per1MInput?: number;
  per1MOutput?: number;
  per1MCacheRead?: number;
  per1MCacheWrite?: number;
  // Flat unit pricing (e.g., per image generated, per second of audio)
  perUnit?: number;
}

export interface ModelCapabilities {
  supportsImageInput?: boolean;
  supportsAudioInput?: boolean;
  supportsTools?: boolean;
  supportsJson?: boolean;
  supportsStreaming?: boolean;
  maxContextTokens?: number;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/*                                    User                                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").$type<"user" | "admin" | "banned">().notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    // Credit balance in micro USD (1e-6 USD). e.g. 1_000_000 = $1.00
    creditBalance: bigint("credit_balance", { mode: "bigint" }).notNull().default(0n),
    outstandingBalance: bigint("outstanding_balance", { mode: "bigint" }).notNull().default(0n),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_email_idx").on(table.email),
    roleIdx: index("user_role_idx").on(table.role),
  }),
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("session_token_idx").on(table.token),
    userIdx: index("session_user_idx").on(table.userId),
  }),
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerIdx: index("account_provider_idx").on(table.providerId, table.accountId),
    // FIX #27: Compound unique to prevent duplicate OAuth bindings.
    providerAccountIdx: uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
    userIdx: index("account_user_idx").on(table.userId),
  }),
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
    // FIX #19: Index on value for token verification lookups.
    valueIdx: index("verification_value_idx").on(table.value),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                 API Keys                                   */
/* -------------------------------------------------------------------------- */

export const apiKeys = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Only store the hash of the key. Original is shown once at creation.
    // Format: prefix `sk_` + 48 random chars, SHA-256 hashed.
    keyHash: text("key_hash").notNull().unique(),
    // Store first 8 chars for user to identify (e.g. "sk_live_a1b2c3d4")
    keyPrefix: text("key_prefix").notNull(),
    // Per-key rate limit (requests/minute). null = use default
    rpmLimit: integer("rpm_limit"),
    // Model allowlist (public model ids). null = all models allowed.
    // A non-null array is a strict whitelist: requests for models not in
    // the list are rejected with 403.
    allowedModels: text("allowed_models").array(),
    // Monthly budget in micro USD. null = unlimited
    monthlyBudget: bigint("monthly_budget", { mode: "bigint" }),
    // How much has been spent this month (reset on 1st of month)
    monthlySpent: bigint("monthly_spent", { mode: "bigint" }).notNull().default(0n),
    monthStartedAt: timestamp("month_started_at", { withTimezone: true }),
    enabled: boolean("enabled").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    hashIdx: uniqueIndex("api_key_hash_idx").on(table.keyHash),
    userIdx: index("api_key_user_idx").on(table.userId),
    prefixIdx: index("api_key_prefix_idx").on(table.keyPrefix),
  }),
);

export const rateLimitBuckets = pgTable(
  "api_rate_limit_bucket",
  {
    apiKeyId: text("api_key_id").primaryKey().references(() => apiKeys.id, { onDelete: "cascade" }),
    tokens: integer("tokens").notNull(),
    refillRemainder: bigint("refill_remainder", { mode: "bigint" }).notNull().default(0n),
    refilledAt: timestamp("refilled_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    tokensCheck: check("api_rate_limit_bucket_tokens_nonnegative", sql`${table.tokens} >= 0`),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                   Models                                   */
/* -------------------------------------------------------------------------- */

export const models = pgTable(
  "model",
  {
    id: text("id").primaryKey(),
    // Public name users see (e.g. "my-gpt-4o"). Used in /v1/models.
    publicId: text("public_id").notNull().unique(),
    // Actual upstream model name in 9router
    upstreamId: text("upstream_id").notNull(),
    type: text("type").$type<ModelType>().notNull().default("chat"),
    description: text("description"),
    // Display/provider label for catalog (e.g. "OpenAI", "Anthropic", "Custom")
    provider: text("provider"),
    // Pricing JSON (see ModelPricing)
    pricing: jsonb("pricing").$type<ModelPricing>().notNull().default({}),
    // Capabilities (see ModelCapabilities)
    capabilities: jsonb("capabilities")
      .$type<ModelCapabilities>()
      .notNull()
      .default({}),
    // How to handle image input if the model doesn't support it
    imagePolicy: text("image_policy")
      .$type<ImageInputPolicy>()
      .notNull()
      .default("strip_and_instruct"),
    // Custom canned response text (used when imagePolicy = canned_response)
    cannedResponseText: text("canned_response_text"),
    // Custom instruction to inject when stripping image (used for strip_and_instruct)
    stripInstruction: text("strip_instruction"),
    // Show in public catalog /v1/models
    enabled: boolean("enabled").notNull().default(true),
    // Display order on catalog
    sortOrder: integer("sort_order").notNull().default(0),
    // Tags for catalog filtering
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    publicIdIdx: uniqueIndex("model_public_id_idx").on(table.publicId),
    typeIdx: index("model_type_idx").on(table.type),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                Usage Logs                                  */
/* -------------------------------------------------------------------------- */

export type UsageStatus = "ok" | "error" | "canned" | "rejected";

export const usageLogs = pgTable(
  "usage_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    modelId: text("model_id")
      .references(() => models.id, { onDelete: "set null" }),
    // Public model name used in request (e.g. "my-gpt-4o")
    modelPublicId: text("model_public_id").notNull(),
    // Which API format was used (openai/anthropic/images/audio/embedding)
    apiFormat: text("api_format")
      .$type<"openai" | "anthropic" | "images" | "audio" | "embedding" | "rerank">()
      .notNull(),
    // OpenAI-style: "chat.completion" etc
    endpoint: text("endpoint").notNull(),
    // Whether response was streamed
    streamed: boolean("streamed").notNull().default(false),
    // Token counts (0 for non-chat endpoints)
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    // Cost in micro USD for this request
    costMicroUsd: bigint("cost_micro_usd", { mode: "bigint" }).notNull().default(0n),
    // Status: ok / error / canned / rejected
    status: text("status").$type<UsageStatus>().notNull().default("ok"),
    // HTTP status code returned to client
    httpStatus: integer("http_status").notNull().default(200),
    // Error message if status != ok
    errorMessage: text("error_message"),
    // Latency in ms
    latencyMs: integer("latency_ms"),
    // IP of the client
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("usage_log_user_idx").on(table.userId),
    keyIdx: index("usage_log_key_idx").on(table.apiKeyId),
    modelIdx: index("usage_log_model_idx").on(table.modelId),
    createdIdx: index("usage_log_created_idx").on(table.createdAt),
    // FIX #20: Composite index for dashboard queries filtered by user + time range.
    userCreatedIdx: index("usage_log_user_created_idx").on(table.userId, table.createdAt),
  }),
);

/* -------------------------------------------------------------------------- */
/*                              Credit Transactions                           */
/* -------------------------------------------------------------------------- */

export type CreditTxType =
  | "topup"
  | "deduction"
  | "refund"
  | "adjustment"
  | "signup_bonus";

export const billingReservations = pgTable(
  "billing_reservation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
    reservedMicroUsd: bigint("reserved_micro_usd", { mode: "bigint" }).notNull(),
    actualMicroUsd: bigint("actual_micro_usd", { mode: "bigint" }),
    chargedMicroUsd: bigint("charged_micro_usd", { mode: "bigint" }),
    outstandingMicroUsd: bigint("outstanding_micro_usd", { mode: "bigint" }),
    billingMonth: timestamp("billing_month", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usageLogId: text("usage_log_id").references(() => usageLogs.id, { onDelete: "set null" }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("billing_reservation_user_idx").on(table.userId),
    apiKeyIdx: index("billing_reservation_api_key_idx").on(table.apiKeyId),
    openExpiryIdx: index("billing_reservation_open_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.finalizedAt} is null`),
    reservedCheck: check("billing_reservation_reserved_nonnegative", sql`${table.reservedMicroUsd} >= 0`),
    settlementCheck: check(
      "billing_reservation_settlement_coherent",
      sql`(${table.finalizedAt} is null and ${table.actualMicroUsd} is null and ${table.chargedMicroUsd} is null and ${table.outstandingMicroUsd} is null and ${table.usageLogId} is null) or (${table.finalizedAt} is not null and ${table.actualMicroUsd} >= 0 and ${table.chargedMicroUsd} >= 0 and ${table.outstandingMicroUsd} >= 0 and ${table.actualMicroUsd} = ${table.chargedMicroUsd} + ${table.outstandingMicroUsd})`,
    ),
  }),
);

export const creditTransactions = pgTable(
  "credit_transaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<CreditTxType>().notNull(),
    // Amount in micro USD (positive for credit, negative for deduction)
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    // Balance after this transaction
    balanceAfter: bigint("balance_after", { mode: "bigint" }).notNull(),
    // Admin note (e.g. "Top-up $10 manual", "Refund for failed request")
    note: text("note"),
    // Related usage log id (for deductions)
    usageLogId: text("usage_log_id").references(() => usageLogs.id, {
      onDelete: "set null",
    }),
    // Admin who performed this (null if system)
    performedByUserId: text("performed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("credit_tx_user_idx").on(table.userId),
    typeIdx: index("credit_tx_type_idx").on(table.type),
    createdIdx: index("credit_tx_created_idx").on(table.createdAt),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  apiKeys: many(apiKeys),
  usageLogs: many(usageLogs),
  creditTransactions: many(creditTransactions),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
  usageLogs: many(usageLogs),
}));

export const modelsRelations = relations(models, ({ many }) => ({
  usageLogs: many(usageLogs),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, { fields: [usageLogs.userId], references: [users.id] }),
  apiKey: one(apiKeys, { fields: [usageLogs.apiKeyId], references: [apiKeys.id] }),
  model: one(models, { fields: [usageLogs.modelId], references: [models.id] }),
  creditTransaction: one(creditTransactions, {
    fields: [usageLogs.id],
    references: [creditTransactions.usageLogId],
  }),
}));

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type Account = InferSelectModel<typeof accounts>;
export type Verification = InferSelectModel<typeof verifications>;
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;
export type Model = InferSelectModel<typeof models>;
export type NewModel = InferInsertModel<typeof models>;
export type UsageLog = InferSelectModel<typeof usageLogs>;
export type NewUsageLog = InferInsertModel<typeof usageLogs>;
export type BillingReservation = InferSelectModel<typeof billingReservations>;
export type NewBillingReservation = InferInsertModel<typeof billingReservations>;
export type CreditTransaction = InferSelectModel<typeof creditTransactions>;
export type NewCreditTransaction = InferInsertModel<typeof creditTransactions>;
