import { z } from "zod";

import {
  SYSTEM_RECORD_SORT_FIELDS,
  SYSTEM_STATUSES
} from "../types/systemRecord.js";

const requiredText = z.string().trim().min(1);
const nullableText = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  },
  z.string().trim().nullable().optional()
);
const nullableDate = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  },
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
    .nullable()
    .optional()
);
const nullableUrl = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  },
  z.string().trim().url().nullable().optional()
);
const optionalBoolean = z.preprocess((value) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());

export const createSystemRecordSchema = z.object({
  systemName: requiredText,
  description: requiredText,
  categoryCode: requiredText,
  status: z.enum(SYSTEM_STATUSES),
  businessDepartment: nullableText,
  departmentOwner: nullableText,
  technicalOwner: nullableText,
  vendor: nullableText,
  supportContact: nullableText,
  hostingLocation: nullableText,
  serverName: nullableText,
  databaseName: nullableText,
  productionUrl: nullableUrl,
  testUrl: nullableUrl,
  documentationLink: nullableUrl,
  passwordVaultReference: nullableText,
  renewalDate: nullableDate,
  lastReviewDate: nullableDate,
  notes: nullableText
});

export const updateSystemRecordSchema = createSystemRecordSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided."
  });

export const listSystemRecordsQuerySchema = z.object({
  search: nullableText,
  categoryCode: nullableText,
  status: z.enum(SYSTEM_STATUSES).optional(),
  businessDepartment: nullableText,
  vendor: nullableText,
  technicalOwner: nullableText,
  hostingLocation: nullableText,
  includeArchived: optionalBoolean.default(false),
  archivedOnly: optionalBoolean.default(false),
  incompleteOnly: optionalBoolean.default(false),
  sortBy: z.enum(SYSTEM_RECORD_SORT_FIELDS).default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

