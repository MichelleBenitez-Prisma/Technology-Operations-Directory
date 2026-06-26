import { Router, type Response } from "express";

import {
  addSystemRecordTag,
  archiveSystemRecord,
  createSystemRecord,
  deleteSystemRecord,
  findSystemRecordById,
  getSystemRecordCategoryDetails,
  getSystemRecordDashboardTotals,
  listIncompleteSystemRecords,
  listSystemRecordDependencies,
  listSystemRecordsForExport,
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
  const tagId = parseSystemRecordId((request.body as { tagId?: string | number }).tagId?.toString());

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

  response.status(201).json(result);
});

systemRecordsRouter.put("/:id", (request, response) => {
  updateSystemRecordHandler(request.params.id, request.body, response);
});

systemRecordsRouter.patch("/:id", (request, response) => {
  updateSystemRecordHandler(request.params.id, request.body, response);
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

  const record = archiveSystemRecord(id);

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

systemRecordsRouter.delete("/:id", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const deleted = deleteSystemRecord(id);

  if (!deleted) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.status(204).send();
});

function updateSystemRecordHandler(rawId: string | undefined, body: unknown, response: Response) {
  const id = parseSystemRecordId(rawId);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const input = updateSystemRecordSchema.parse(body);
  const result = updateSystemRecord(id, input);

  if (!result) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json(result);
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
        quality_warning_messages: record.quality_warnings.map((warning) => warning.message).join("; ")
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