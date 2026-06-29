import { Router, type Request, type Response } from "express";

import { logAuditEvent, type AuthUser } from "../db/authRepository.js";
import {
  addSystemRecordTag,
  archiveSystemRecord,
  createSystemRecord,
  deleteSystemRecord,
  findSystemRecordById,
  getSystemRecordCategoryDetails,
  getSystemRecordDashboardTotals,
  listIncompleteSystemRecords,
  listSystemRecordsForExport,
  listSystemRecordDependencies,
  listSystemRecordTags,
  removeSystemRecordTag,
  listSystemRecords,
  updateSystemRecordCategoryDetails,
  updateSystemRecord
} from "../db/systemRecordRepository.js";
import {
  createSystemRecordSchema,
  listSystemRecordsQuerySchema,
  updateSystemRecordSchema
} from "../validation/systemRecordSchemas.js";

export const systemRecordsRouter = Router();

systemRecordsRouter.get("/dashboard-totals", (_request, response) => {
  response.json({
    data: getSystemRecordDashboardTotals()
  });
});

systemRecordsRouter.get("/incomplete", (request, response) => {
  const query = listSystemRecordsQuerySchema.parse(request.query);

  response.json({
    data: listIncompleteSystemRecords(query)
  });
});

systemRecordsRouter.get("/", (request, response) => {
  const query = listSystemRecordsQuerySchema.parse(request.query);

  response.json({
    data: listSystemRecords(query)
  });
});

systemRecordsRouter.get("/export.csv", (request, response) => {
  const query = listSystemRecordsQuerySchema.parse(request.query);
  const records = listSystemRecordsForExport(query);

  response
    .status(200)
    .setHeader("Content-Type", "text/csv; charset=utf-8")
    .setHeader("Content-Disposition", 'attachment; filename="system-records.csv"')
    .send(systemRecordsToCsv(records));
});

systemRecordsRouter.post("/import.csv", (request, response) => {
  if (typeof request.body !== "string") {
    response.status(400).json({
      error: "Validation Error",
      message: "CSV import requires a text/csv request body."
    });
    return;
  }

  const result = importSystemRecordsFromCsv(request.body);
  const status = result.errors.length > 0 && result.created.length === 0 ? 400 : 201;

  response.status(status).json({
    data: result
  });
});

systemRecordsRouter.get("/:id/dependencies", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  if (!findSystemRecordById(id, { includeArchived: true })) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: listSystemRecordDependencies(id)
  });
});

systemRecordsRouter.get("/:id/category-details", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const details = getSystemRecordCategoryDetails(id);

  if (!details) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: details
  });
});

systemRecordsRouter.get("/:id/tags", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  if (!findSystemRecordById(id, { includeArchived: true })) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: listSystemRecordTags(id)
  });
});

systemRecordsRouter.post("/:id/tags", (request, response) => {
  const id = parseSystemRecordId(request.params.id);
  const tagId = parseSystemRecordId(
    (request.body as { tagId?: string | number }).tagId?.toString()
  );

  if (!id || !tagId) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id and tag id must be positive integers."
    });
    return;
  }

  const tags = addSystemRecordTag(id, tagId);

  if (!tags) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.status(201).json({
    data: tags
  });
});

systemRecordsRouter.delete("/:id/tags/:tagId", (request, response) => {
  const id = parseSystemRecordId(request.params.id);
  const tagId = parseSystemRecordId(request.params.tagId);

  if (!id || !tagId) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id and tag id must be positive integers."
    });
    return;
  }

  const tags = removeSystemRecordTag(id, tagId);

  if (!tags) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: tags
  });
});

systemRecordsRouter.put("/:id/category-details", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const details = updateSystemRecordCategoryDetails(id, request.body as Record<string, unknown>);

  if (!details) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: details
  });
});

systemRecordsRouter.get("/:id", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const record = findSystemRecordById(id, { includeArchived: true });

  if (!record) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: record
  });
});

systemRecordsRouter.post("/", (request, response) => {
  const input = createSystemRecordSchema.parse(request.body);
  const result = createSystemRecord(input);

  response.locals.skipAudit = true;
  logSystemAudit(request, response, "create", result.data.id, `Created system record "${result.data.system_name}".`);
  response.status(201).json(result);
});

systemRecordsRouter.put("/:id", (request, response) => {
  updateSystemRecordHandler(request, response);
});

systemRecordsRouter.patch("/:id", (request, response) => {
  updateSystemRecordHandler(request, response);
});

systemRecordsRouter.post("/:id/archive", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const before = findSystemRecordById(id, { includeArchived: true });
  const record = archiveSystemRecord(id);

  if (!record) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.locals.skipAudit = true;
  logSystemAudit(request, response, "archive", id, `Archived system record "${before?.system_name ?? record.system_name}".`);
  response.json({
    data: record
  });
});

systemRecordsRouter.delete("/:id", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const before = findSystemRecordById(id, { includeArchived: true });
  const deleted = deleteSystemRecord(id);

  if (!deleted) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.locals.skipAudit = true;
  logSystemAudit(request, response, "delete", id, `Deleted system record "${before?.system_name ?? id}".`);
  response.status(204).send();
});

function updateSystemRecordHandler(request: Request, response: Response) {
  const id = parseSystemRecordId(String(request.params.id ?? ""));

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const before = findSystemRecordById(id, { includeArchived: true });
  const input = updateSystemRecordSchema.parse(request.body);
  const result = updateSystemRecord(id, input);

  if (!result) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.locals.skipAudit = true;
  logSystemAudit(request, response, "update", id, summarizeSystemRecordChanges(before, result.data));
  response.json(result);
}

const systemAuditFields = [
  ["system_name", "Name"],
  ["description", "Description"],
  ["category_code", "Category"],
  ["status", "Status"],
  ["business_department", "Business department"],
  ["department_owner", "Department owner"],
  ["technical_owner", "Technical owner"],
  ["vendor", "Vendor"],
  ["support_contact", "Support contact"],
  ["hosting_location", "Hosting location"],
  ["server_name", "Server name"],
  ["database_name", "Database name"],
  ["production_url", "Production URL"],
  ["test_url", "Test URL"],
  ["documentation_url", "Documentation link"],
  ["renewal_date", "Renewal date"],
  ["last_review_date", "Last review date"],
  ["replacement_system", "Replacement system"],
  ["retirement_notes", "Retirement notes"],
  ["notes", "Notes"]
] as const;

function summarizeSystemRecordChanges(
  before: ReturnType<typeof findSystemRecordById>,
  after: NonNullable<ReturnType<typeof findSystemRecordById>>
) {
  if (!before) {
    return `Updated system record "${after.system_name}".`;
  }

  const changes = systemAuditFields
    .filter(([key]) => formatAuditValue(before[key]) !== formatAuditValue(after[key]))
    .map(([key, label]) => `${label} from "${formatAuditValue(before[key])}" to "${formatAuditValue(after[key])}"`);

  if (changes.length === 0) {
    return `Updated system record "${after.system_name}".`;
  }

  const visibleChanges = changes.slice(0, 6).join("; ");
  const extraCount = changes.length - 6;

  return `Changed ${visibleChanges}${extraCount > 0 ? `; and ${extraCount} more field${extraCount === 1 ? "" : "s"}` : ""}.`;
}

function formatAuditValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : "blank";
}

function logSystemAudit(
  request: Request,
  response: Response,
  action: string,
  entityId: number,
  changeSummary: string
) {
  const user = response.locals.authUser as AuthUser | undefined;

  logAuditEvent({
    userId: user?.id,
    action,
    entityType: "system-records",
    entityId: String(entityId),
    method: request.method,
    path: request.originalUrl,
    statusCode: response.statusCode,
    requestId: response.locals.requestId as string | undefined,
    changeSummary
  });
}

function parseSystemRecordId(value: string | undefined) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function systemRecordsToCsv(records: ReturnType<typeof listSystemRecordsForExport>) {
  const columns = [
    ["system_name", "System"],
    ["description", "Description"],
    ["category_name", "Category"],
    ["status", "Status"],
    ["business_department", "Business department"],
    ["department_owner", "Department owner"],
    ["technical_owner", "Technical owner"],
    ["vendor", "Vendor"],
    ["support_contact", "Support contact"],
    ["hosting_location", "Hosting location"],
    ["documentation_url", "Documentation URL"],
    ["renewal_date", "Renewal date"],
    ["last_review_date", "Last review date"],
    ["quality_warning_count", "Warning count"],
    ["quality_warning_messages", "Warnings"]
  ] as const;

  const lines = [
    columns.map(([, label]) => escapeCsvValue(label)).join(","),
    ...records.map((record) => {
      const row = {
        ...record,
        quality_warning_messages: record.quality_warnings
          .map((warning) => warning.message)
          .join("; ")
      };

      return columns.map(([key]) => escapeCsvValue(row[key] ?? "")).join(",");
    })
  ];

  return `${lines.join("\r\n")}\r\n`;
}

function escapeCsvValue(value: unknown) {
  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function importSystemRecordsFromCsv(csvText: string) {
  const rows = parseCsv(csvText);
  const created: ReturnType<typeof createSystemRecord>[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  rows.forEach((row, index) => {
    try {
      const input = createSystemRecordSchema.parse({
        systemName: row.systemName ?? row.system_name ?? row.System,
        description: row.description ?? row.Description,
        categoryCode: row.categoryCode ?? row.category_code ?? row.CategoryCode,
        status: row.status ?? row.Status,
        businessDepartment: row.businessDepartment ?? row.business_department,
        departmentOwner: row.departmentOwner ?? row.department_owner,
        technicalOwner: row.technicalOwner ?? row.technical_owner,
        vendor: row.vendor ?? row.Vendor,
        supportContact: row.supportContact ?? row.support_contact,
        hostingLocation: row.hostingLocation ?? row.hosting_location,
        serverName: row.serverName ?? row.server_name,
        databaseName: row.databaseName ?? row.database_name,
        productionUrl: row.productionUrl ?? row.production_url,
        testUrl: row.testUrl ?? row.test_url,
        documentationLink: row.documentationLink ?? row.documentation_url,
        passwordVaultReference: row.passwordVaultReference ?? row.password_vault_reference,
        renewalDate: row.renewalDate ?? row.renewal_date,
        lastReviewDate: row.lastReviewDate ?? row.last_review_date,
        replacementSystem: row.replacementSystem ?? row.replacement_system,
        retirementNotes: row.retirementNotes ?? row.retirement_notes,
        notes: row.notes ?? row.Notes
      });

      created.push(createSystemRecord(input));
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : "Unable to import row."
      });
    }
  });

  return { created, errors };
}

function parseCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0] ?? "");

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);

    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}
