import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}, z.string().trim().nullable().optional());

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  },
  z
    .string()
    .trim()
    .url("Use a valid URL format.")
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "URL must begin with http:// or https://."
    )
    .nullable()
    .optional()
);

const optionalDate = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}, z.string().trim().refine(isValidDateString, "Use YYYY-MM-DD format with a real calendar date.").nullable().optional());

const optionalDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}, z.string().trim().nullable().optional());

const optionalId = z.preprocess((value) => {
  if (value === "" || value === null) {
    return null;
  }

  return value;
}, z.number().int().positive().nullable().optional());

const optionalActive = z.preprocess(
  (value) => {
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    return value;
  },
  z.union([z.literal(0), z.literal(1)]).optional()
);

const listQuerySchema = z.object({
  search: optionalText,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const assetTypeSchema = z.object({
  code: z.string().trim().min(1, "This field is required.").optional(),
  name: z.string().trim().min(1, "This field is required.").optional(),
  description: optionalText
});

const teamSchema = z.object({
  name: z.string().trim().min(1, "This field is required.").optional(),
  department: optionalText,
  email: optionalText,
  description: optionalText
});

const personSchema = z.object({
  display_name: z.string().trim().min(1, "This field is required.").optional(),
  email: optionalText,
  title: optionalText,
  team_id: optionalId,
  phone: optionalText,
  active: optionalActive
});

const vendorSchema = z.object({
  name: z.string().trim().min(1, "This field is required.").optional(),
  website_url: optionalUrl,
  support_url: optionalUrl,
  account_manager_name: optionalText,
  account_manager_email: optionalText,
  contract_start_date: optionalDate,
  contract_end_date: optionalDate,
  renewal_notice_days: z.number().int().min(0).optional(),
  notes: optionalText
});

const assetEnvironmentSchema = z.object({
  asset_id: z.number().int().positive().optional(),
  environment_name: z
    .enum(["development", "test", "staging", "production", "disaster_recovery", "other"])
    .optional(),
  url: optionalUrl,
  host_name: optionalText,
  location: optionalText,
  notes: optionalText
});

const integrationSchema = z.object({
  name: z.string().trim().min(1, "This field is required.").optional(),
  source_asset_id: optionalId,
  target_asset_id: optionalId,
  source_external_name: optionalText,
  target_external_name: optionalText,
  integration_type: z
    .enum([
      "api",
      "file_transfer",
      "database",
      "webhook",
      "message_queue",
      "etl",
      "manual",
      "other"
    ])
    .optional(),
  direction: z.enum(["inbound", "outbound", "bidirectional"]).optional(),
  protocol: optionalText,
  data_description: optionalText,
  schedule_description: optionalText,
  criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
  lifecycle_status: z
    .enum(["active", "development", "being_replaced", "maintenance_only", "retired"])
    .optional(),
  owner_team_id: optionalId,
  documentation_url: optionalUrl,
  notes: optionalText
});

const scheduledProcessSchema = z.object({
  asset_id: optionalId,
  name: z.string().trim().min(1, "This field is required.").optional(),
  schedule_kind: z.enum(["cron", "fixed_interval", "manual", "event_driven", "other"]).optional(),
  schedule_expression: optionalText,
  schedule_timezone: optionalText,
  command_or_job_name: optionalText,
  run_location_asset_id: optionalId,
  lifecycle_status: z
    .enum(["active", "development", "being_replaced", "maintenance_only", "retired"])
    .optional(),
  owner_team_id: optionalId,
  last_known_success_at: optionalDateTime,
  failure_notification_channel: optionalText,
  runbook_url: optionalUrl,
  notes: optionalText
});

const reviewSchema = z.object({
  asset_id: z.number().int().positive().optional(),
  reviewed_at: optionalDateTime,
  reviewed_by_person_id: optionalId,
  review_status: z.enum(["approved", "needs_updates", "retirement_candidate"]).optional(),
  notes: optionalText,
  next_review_due_at: optionalDate
});

const tagSchema = z.object({
  name: z.string().trim().min(1, "This field is required.").optional(),
  description: optionalText
});

export const directorySchemas = {
  assetTypes: assetTypeSchema,
  teams: teamSchema,
  people: personSchema,
  vendors: vendorSchema,
  assetEnvironments: assetEnvironmentSchema,
  integrations: integrationSchema,
  scheduledProcesses: scheduledProcessSchema,
  reviews: reviewSchema,
  tags: tagSchema
};

export const directoryListQuerySchema = listQuerySchema;

const requiredCreateFields: Record<keyof typeof directorySchemas, string[]> = {
  assetTypes: ["code", "name"],
  teams: ["name"],
  people: ["display_name"],
  vendors: ["name"],
  assetEnvironments: ["asset_id", "environment_name"],
  integrations: ["name"],
  scheduledProcesses: ["name"],
  reviews: ["asset_id"],
  tags: ["name"]
};

export const searchQuerySchema = z.object({
  query: z.string().trim().min(1, "Search query is required."),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export function parseCreateInput(resourceName: keyof typeof directorySchemas, body: unknown) {
  const value = requireAtLeastOne(directorySchemas[resourceName].parse(body)) as Record<
    string,
    unknown
  >;

  for (const field of requiredCreateFields[resourceName]) {
    if (!Object.prototype.hasOwnProperty.call(value, field) || value[field] === null) {
      const error = new Error(`${field} is required.`);
      error.name = "ValidationError";
      throw error;
    }
  }

  if (resourceName === "integrations" && !value.source_asset_id && !value.source_external_name) {
    const error = new Error("source_asset_id or source_external_name is required.");
    error.name = "ValidationError";
    throw error;
  }

  if (resourceName === "integrations" && !value.target_asset_id && !value.target_external_name) {
    const error = new Error("target_asset_id or target_external_name is required.");
    error.name = "ValidationError";
    throw error;
  }

  return value;
}

export function parseUpdateInput(resourceName: keyof typeof directorySchemas, body: unknown) {
  return requireAtLeastOne(directorySchemas[resourceName].partial().parse(body)) as Record<
    string,
    unknown
  >;
}

function requireAtLeastOne<T extends Record<string, unknown>>(value: T) {
  if (Object.keys(value).length === 0) {
    const error = new Error("At least one field must be provided.");
    error.name = "ValidationError";
    throw error;
  }

  return value;
}

function isValidDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
