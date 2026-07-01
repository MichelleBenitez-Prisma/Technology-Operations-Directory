import { Router, type Request, type Response } from "express";

import { logAuditEvent, type AuthUser } from "../db/authRepository.js";
import {
  archiveDirectoryRow,
  createDirectoryRow,
  deleteDirectoryRow,
  findDirectoryRowById,
  listDirectoryRows,
  updateDirectoryRow,
  type DirectoryResourceName
} from "../db/directoryRepository.js";
import {
  directoryListQuerySchema,
  parseCreateInput,
  parseUpdateInput
} from "../validation/directorySchemas.js";

export function createDirectoryRouter(resourceName: DirectoryResourceName) {
  const router = Router();

  router.get("/", (request, response) => {
    const query = directoryListQuerySchema.parse(request.query);

    response.json({
      data: listDirectoryRows(resourceName, query)
    });
  });

  if (resourceName === "vendors") {
    router.post("/import.csv", (request, response) => {
      if (typeof request.body !== "string") {
        response.status(400).json({
          error: "Validation Error",
          message: "CSV import requires a text/csv request body."
        });
        return;
      }

      response.locals.skipAudit = true;
      response.status(201);
      const result = importVendorsFromCsv(request.body);
      logDirectoryAudit(
        request,
        response,
        "create",
        "vendors",
        undefined,
        `Vendor import added ${result.created.length} vendor${result.created.length === 1 ? "" : "s"}${
          result.created.length > 0
            ? `: ${result.created.map((vendor) => String(vendor?.name ?? "Unnamed vendor")).join(", ")}`
            : ""
        }.`
      );
      response.json({
        data: result
      });
    });
  }

  router.get("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const row = findDirectoryRowById(resourceName, id);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.json({
      data: row
    });
  });

  router.post("/", (request, response) => {
    const input = parseCreateInput(resourceName, request.body);
    const row = createDirectoryRow(resourceName, input);

    if (resourceName === "vendors") {
      response.locals.skipAudit = true;
      response.status(201);
      logDirectoryAudit(
        request,
        response,
        "create",
        "vendors",
        row?.id,
        `Vendor added: ${String(row?.name ?? "Unnamed vendor")}.`
      );
    }

    response.status(201).json({
      data: row
    });
  });

  router.post("/:id/archive", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const row = archiveDirectoryRow(resourceName, id);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    if (resourceName === "vendors") {
      response.locals.skipAudit = true;
      logDirectoryAudit(
        request,
        response,
        "archive",
        "vendors",
        id,
        `Vendor archived: ${String(row.name ?? "Unnamed vendor")}.`
      );
    }

    response.json({
      data: row
    });
  });

  router.patch("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const input = parseUpdateInput(resourceName, request.body);
    const existing = resourceName === "vendors" ? findDirectoryRowById(resourceName, id) : undefined;
    const row = updateDirectoryRow(resourceName, id, input);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    if (resourceName === "vendors") {
      response.locals.skipAudit = true;
      logDirectoryAudit(
        request,
        response,
        "update",
        "vendors",
        id,
        buildVendorEditSummary(existing, row)
      );
    }

    response.json({
      data: row
    });
  });

  router.put("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const input = parseUpdateInput(resourceName, request.body);
    const existing = resourceName === "vendors" ? findDirectoryRowById(resourceName, id) : undefined;
    const row = updateDirectoryRow(resourceName, id, input);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    if (resourceName === "vendors") {
      response.locals.skipAudit = true;
      logDirectoryAudit(
        request,
        response,
        "update",
        "vendors",
        id,
        buildVendorEditSummary(existing, row)
      );
    }

    response.json({
      data: row
    });
  });

  router.delete("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const deleted = deleteDirectoryRow(resourceName, id);

    if (!deleted) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.status(204).send();
  });

  return router;
}

const vendorAuditLabels: Record<string, string> = {
  name: "Vendor name",
  account_number: "Account number",
  website_url: "Website",
  login_identifier: "Login",
  cyrious_name: "Cyrious name",
  terms_30_day: "30 day terms",
  self_promo: "Self-promo",
  rebate: "Rebate",
  nqp: "NQP",
  aim: "AIM",
  eqp_status_2023: "2023 EQP Status",
  eqp_status_2022: "2022 EQP Status",
  eqp_volume: "EQP volume",
  payment_method: "Payment method",
  invoice_searches: "Invoice searches",
  csr_sales_rep: "CSR/Sales Rep",
  rep_direct_line: "Direct line to rep",
  support_email: "Email",
  category: "Category",
  notes: "Notes"
};

function buildVendorEditSummary(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
) {
  const vendorName = String(after?.name ?? before?.name ?? "Unnamed vendor");

  if (!before || !after) {
    return `Vendor edited: ${vendorName}.`;
  }

  const changes = Object.entries(vendorAuditLabels)
    .filter(([field]) => formatAuditValue(before[field]) !== formatAuditValue(after[field]))
    .map(([field, label]) => `${label} from ${formatAuditValue(before[field])} to ${formatAuditValue(after[field])}`);

  if (changes.length === 0) {
    return `Vendor edited: ${vendorName}. No visible fields changed.`;
  }

  const visibleChanges = changes.slice(0, 5).join("; ");
  const extraCount = changes.length - 5;

  return `Vendor edited: ${vendorName} changed ${visibleChanges}${
    extraCount > 0 ? `; and ${extraCount} more field${extraCount === 1 ? "" : "s"}` : ""
  }.`;
}

function formatAuditValue(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "blank";
  }

  if (text === "1") {
    return "yes";
  }

  if (text === "0") {
    return "no";
  }

  return text;
}

function logDirectoryAudit(
  request: Request,
  response: Response,
  action: string,
  entityType: string,
  entityId: unknown,
  changeSummary: string
) {
  const user = response.locals.authUser as AuthUser | undefined;

  logAuditEvent({
    userId: user?.id,
    action,
    entityType,
    entityId: entityId == null ? undefined : String(entityId),
    method: request.method,
    path: request.originalUrl,
    statusCode: response.statusCode,
    requestId: response.locals.requestId as string | undefined,
    changeSummary
  });
}

function importVendorsFromCsv(csvText: string) {
  const rows = parseCsv(csvText);
  const created: Array<Record<string, unknown> | undefined> = [];
  const errors: Array<{ row: number; message: string }> = [];

  rows.forEach((row, index) => {
    try {
      const input = parseCreateInput("vendors", mapVendorCsvRow(row));
      created.push(createDirectoryRow("vendors", input));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import row.";
      errors.push({
        row: index + 2,
        message: /UNIQUE constraint failed: vendors\.name/i.test(message)
          ? "Vendor name already exists."
          : message
      });
    }
  });

  return { created, errors };
}

function mapVendorCsvRow(row: Record<string, string>) {
  return {
    name: row.name ?? row.Name,
    account_number: row.accountNumber ?? row.account_number ?? row["Account Number"],
    website_url: row.website ?? row.website_url ?? row.Website,
    login_identifier: row.login ?? row.login_identifier ?? row.Login,
    cyrious_name: row.cyriousName ?? row.cyrious_name ?? row["Cyrious Name"],
    terms_30_day: parseCsvBoolean(row.terms30Day ?? row.terms_30_day ?? row["30 Day Terms"]),
    self_promo: row.selfPromo ?? row.self_promo ?? row["Self-Promo"],
    rebate: row.rebate ?? row.Rebate,
    nqp: parseCsvBoolean(row.nqp ?? row.NQP),
    aim: parseCsvBoolean(row.aim ?? row.AIM),
    eqp_status_2023: row.eqpStatus2023 ?? row.eqp_status_2023 ?? row["2023 EQP Status"],
    eqp_status_2022: row.eqpStatus2022 ?? row.eqp_status_2022 ?? row["2022 EQP Status"],
    eqp_volume: row.eqpVolume ?? row.eqp_volume ?? row["EQP Volume"],
    payment_method: row.paymentMethod ?? row.payment_method ?? row["Payment Method"],
    invoice_searches: row.invoiceSearches ?? row.invoice_searches ?? row["Invoice Searches"],
    csr_sales_rep: row.csrSalesRep ?? row.csr_sales_rep ?? row["CSR/Sales Rep"],
    rep_direct_line: row.repDirectLine ?? row.rep_direct_line ?? row["Direct Line to Rep"],
    support_email: row.email ?? row.support_email ?? row.Email,
    category: row.category ?? row.Category,
    notes: row.notes ?? row.Notes
  };
}

function parseCsvBoolean(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  return ["1", "true", "yes", "y"].includes(normalized) ? 1 : 0;
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

function parseId(value: string | undefined) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}
