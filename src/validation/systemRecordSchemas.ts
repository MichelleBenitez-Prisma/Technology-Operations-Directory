import { z } from "zod";

import { SYSTEM_STATUSES } from "../types/systemRecord.js";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);
const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.").optional()
);
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().optional()
);

export const createSystemRecordSchema = z.object({
  systemName: requiredText,
  description: requiredText,
  categoryCode: requiredText,
  status: z.enum(SYSTEM_STATUSES),
  businessDepartment: optionalText,
  departmentOwner: optionalText,
  technicalOwner: optionalText,
  vendor: optionalText,
  supportContact: optionalText,
  hostingLocation: optionalText,
  serverName: optionalText,
  databaseName: optionalText,
  productionUrl: optionalUrl,
  testUrl: optionalUrl,
  documentationLink: optionalUrl,
  passwordVaultReference: optionalText,
  renewalDate: optionalDate,
  lastReviewDate: optionalDate,
  notes: optionalText
});

export const listSystemRecordsQuerySchema = z.object({
  search: optionalText,
  categoryCode: optionalText,
  status: z.enum(SYSTEM_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

