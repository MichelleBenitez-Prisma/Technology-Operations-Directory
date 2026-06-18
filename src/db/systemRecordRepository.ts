import { findAssetTypeByCode } from "./assetTypeRepository.js";
import { getDatabase, queryAll, queryOne, type QueryParams } from "./database.js";
import { SYSTEM_STATUSES, SYSTEM_STATUS_LABELS } from "../types/systemRecord.js";
import type {
  CreateSystemRecordInput,
  SortDirection,
  SystemRecord,
  SystemRecordSortField,
  UpdateSystemRecordInput
} from "../types/systemRecord.js";

export type ListSystemRecordsFilters = {
  search?: string | null;
  categoryCode?: string | null;
  status?: string;
  businessDepartment?: string | null;
  vendor?: string | null;
  technicalOwner?: string | null;
  hostingLocation?: string | null;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  incompleteOnly?: boolean;
  sortBy?: SystemRecordSortField;
  sortDirection?: SortDirection;
  limit?: number;
  offset?: number;
};

const SORT_COLUMNS: Record<SystemRecordSortField, string> = {
  systemName: "system_name",
  category: "category_name",
  status: "status",
  businessDepartment: "business_department",
  departmentOwner: "department_owner",
  technicalOwner: "technical_owner",
  vendor: "vendor",
  hostingLocation: "hosting_location",
  renewalDate: "renewal_date",
  lastReviewDate: "last_review_date",
  updatedAt: "updated_at",
  createdAt: "created_at"
};

const SYSTEM_DETAIL_FIELDS = {
  businessDepartment: "business_department",
  departmentOwner: "department_owner",
  technicalOwner: "technical_owner",
  vendor: "vendor",
  supportContact: "support_contact",
  hostingLocation: "hosting_location",
  serverName: "server_name",
  databaseName: "database_name",
  testUrl: "test_url",
  passwordVaultReference: "password_vault_reference",
  renewalDate: "renewal_date",
  notes: "notes"
} as const;

export function listSystemRecords(filters: ListSystemRecordsFilters) {
  const { whereClause, params } = buildSystemRecordWhereClause(filters);
  const sortBy = filters.sortBy ?? "updatedAt";
  const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
  const sortColumn = SORT_COLUMNS[sortBy];

  params.limit = filters.limit ?? 50;
  params.offset = filters.offset ?? 0;

  return queryAll<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}, system_name ASC
    LIMIT $limit OFFSET $offset
    `,
    params
  );
}

export function listIncompleteSystemRecords(filters: ListSystemRecordsFilters) {
  return listSystemRecords({
    ...filters,
    incompleteOnly: true
  });
}

export function findSystemRecordById(
  id: number,
  options: { includeArchived?: boolean } = {}
) {
  const archivedClause = options.includeArchived ? "" : "AND archived_at IS NULL";

  return queryOne<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    WHERE id = $id
    ${archivedClause}
    `,
    { id }
  );
}

export function createSystemRecord(input: CreateSystemRecordInput) {
  const assetType = findAssetTypeByCode(input.categoryCode);

  if (!assetType) {
    throwValidationError(`Unknown category code: ${input.categoryCode}`);
  }

  const database = getDatabase();
  database.exec("BEGIN");

  try {
    const assetKey = createUniqueAssetKey(input.systemName);

    const assetResult = database
      .prepare(
        `
        INSERT INTO technology_assets (
          asset_key,
          name,
          asset_type_id,
          lifecycle_status,
          description,
          production_url,
          documentation_url,
          support_channel,
          last_reviewed_at
        )
        VALUES (
          $assetKey,
          $systemName,
          $assetTypeId,
          $status,
          $description,
          $productionUrl,
          $documentationLink,
          $supportContact,
          $lastReviewDate
        )
        `
      )
      .run({
        assetKey,
        systemName: input.systemName,
        assetTypeId: assetType.id,
        status: input.status,
        description: input.description,
        productionUrl: input.productionUrl ?? null,
        documentationLink: input.documentationLink ?? null,
        supportContact: input.supportContact ?? null,
        lastReviewDate: input.lastReviewDate ?? null
      });

    const assetId = Number(assetResult.lastInsertRowid);

    insertSystemRecordDetails(assetId, input);

    database.exec("COMMIT");
    return findSystemRecordById(assetId, { includeArchived: true });
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function updateSystemRecord(id: number, input: UpdateSystemRecordInput) {
  const existing = findSystemRecordById(id, { includeArchived: true });

  if (!existing) {
    return undefined;
  }

  const database = getDatabase();
  database.exec("BEGIN");

  try {
    const assetUpdates: string[] = [];
    const assetParams: QueryParams = { id };

    if (hasField(input, "systemName")) {
      assetUpdates.push("name = $systemName");
      assetParams.systemName = input.systemName ?? null;
    }

    if (hasField(input, "description")) {
      assetUpdates.push("description = $description");
      assetParams.description = input.description ?? null;
    }

    if (hasField(input, "categoryCode")) {
      const assetType = findAssetTypeByCode(input.categoryCode ?? "");

      if (!assetType) {
        throwValidationError(`Unknown category code: ${input.categoryCode}`);
      }

      assetUpdates.push("asset_type_id = $assetTypeId");
      assetParams.assetTypeId = assetType.id;
    }

    if (hasField(input, "status")) {
      assetUpdates.push("lifecycle_status = $status");
      assetParams.status = input.status ?? null;
    }

    if (hasField(input, "productionUrl")) {
      assetUpdates.push("production_url = $productionUrl");
      assetParams.productionUrl = input.productionUrl ?? null;
    }

    if (hasField(input, "documentationLink")) {
      assetUpdates.push("documentation_url = $documentationLink");
      assetParams.documentationLink = input.documentationLink ?? null;
    }

    if (hasField(input, "supportContact")) {
      assetUpdates.push("support_channel = $supportContact");
      assetParams.supportContact = input.supportContact ?? null;
    }

    if (hasField(input, "lastReviewDate")) {
      assetUpdates.push("last_reviewed_at = $lastReviewDate");
      assetParams.lastReviewDate = input.lastReviewDate ?? null;
    }

    if (assetUpdates.length > 0) {
      assetUpdates.push("updated_at = CURRENT_TIMESTAMP");
      database
        .prepare(
          `
          UPDATE technology_assets
          SET ${assetUpdates.join(", ")}
          WHERE id = $id
          `
        )
        .run(assetParams);
    }

    updateSystemRecordDetails(id, input);

    database.exec("COMMIT");
    return findSystemRecordById(id, { includeArchived: true });
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function archiveSystemRecord(id: number) {
  const existing = findSystemRecordById(id, { includeArchived: true });

  if (!existing) {
    return undefined;
  }

  getDatabase()
    .prepare(
      `
      UPDATE technology_assets
      SET archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $id
      `
    )
    .run({ id });

  return findSystemRecordById(id, { includeArchived: true });
}

export function deleteSystemRecord(id: number) {
  const existing = findSystemRecordById(id, { includeArchived: true });

  if (!existing) {
    return false;
  }

  getDatabase()
    .prepare(
      `
      DELETE FROM technology_assets
      WHERE id = $id
      `
    )
    .run({ id });

  return true;
}

export function getSystemRecordDashboardTotals() {
  const total = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM system_record_view WHERE archived_at IS NULL"
  )?.count ?? 0;
  const archived = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM system_record_view WHERE archived_at IS NOT NULL"
  )?.count ?? 0;
  const incomplete = queryOne<{ count: number }>(
    `
    SELECT COUNT(*) AS count
    FROM system_record_view
    WHERE archived_at IS NULL
      AND is_incomplete = 1
    `
  )?.count ?? 0;
  const byStatusRows = queryAll<{ status: string; count: number }>(
    `
    SELECT status, COUNT(*) AS count
    FROM system_record_view
    WHERE archived_at IS NULL
    GROUP BY status
    ORDER BY status
    `
  );
  const byStatusLookup = new Map(
    byStatusRows.map((row) => [row.status, row.count] as const)
  );
  const byStatus = SYSTEM_STATUSES.map((status) => ({
    status,
    label: SYSTEM_STATUS_LABELS[status],
    count: byStatusLookup.get(status) ?? 0
  }));
  const byCategory = queryAll<{
    category_code: string;
    category_name: string;
    count: number;
  }>(
    `
    SELECT category_code, category_name, COUNT(*) AS count
    FROM system_record_view
    WHERE archived_at IS NULL
    GROUP BY category_code, category_name
    ORDER BY category_name
    `
  );

  return {
    total,
    archived,
    incomplete,
    byStatus,
    byCategory
  };
}

function buildSystemRecordWhereClause(filters: ListSystemRecordsFilters) {
  const where: string[] = [];
  const params: QueryParams = {};

  if (filters.archivedOnly) {
    where.push("archived_at IS NOT NULL");
  } else if (!filters.includeArchived) {
    where.push("archived_at IS NULL");
  }

  if (filters.incompleteOnly) {
    where.push("is_incomplete = 1");
  }

  if (filters.search) {
    where.push(
      `(
        LOWER(system_name) LIKE $search
        OR LOWER(IFNULL(description, '')) LIKE $search
        OR LOWER(IFNULL(category_name, '')) LIKE $search
        OR LOWER(IFNULL(business_department, '')) LIKE $search
        OR LOWER(IFNULL(department_owner, '')) LIKE $search
        OR LOWER(IFNULL(technical_owner, '')) LIKE $search
        OR LOWER(IFNULL(vendor, '')) LIKE $search
        OR LOWER(IFNULL(support_contact, '')) LIKE $search
        OR LOWER(IFNULL(hosting_location, '')) LIKE $search
        OR LOWER(IFNULL(server_name, '')) LIKE $search
        OR LOWER(IFNULL(database_name, '')) LIKE $search
        OR LOWER(IFNULL(notes, '')) LIKE $search
      )`
    );
    params.search = `%${filters.search.toLowerCase()}%`;
  }

  if (filters.categoryCode) {
    where.push("category_code = $categoryCode");
    params.categoryCode = filters.categoryCode;
  }

  if (filters.status) {
    where.push("status = $status");
    params.status = filters.status;
  }

  if (filters.businessDepartment) {
    where.push("business_department = $businessDepartment");
    params.businessDepartment = filters.businessDepartment;
  }

  if (filters.vendor) {
    where.push("vendor = $vendor");
    params.vendor = filters.vendor;
  }

  if (filters.technicalOwner) {
    where.push("technical_owner = $technicalOwner");
    params.technicalOwner = filters.technicalOwner;
  }

  if (filters.hostingLocation) {
    where.push("hosting_location = $hostingLocation");
    params.hostingLocation = filters.hostingLocation;
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

function insertSystemRecordDetails(assetId: number, input: CreateSystemRecordInput) {
  getDatabase()
    .prepare(
      `
      INSERT INTO system_record_details (
        asset_id,
        business_department,
        department_owner,
        technical_owner,
        vendor,
        support_contact,
        hosting_location,
        server_name,
        database_name,
        test_url,
        password_vault_reference,
        renewal_date,
        notes
      )
      VALUES (
        $assetId,
        $businessDepartment,
        $departmentOwner,
        $technicalOwner,
        $vendor,
        $supportContact,
        $hostingLocation,
        $serverName,
        $databaseName,
        $testUrl,
        $passwordVaultReference,
        $renewalDate,
        $notes
      )
      `
    )
    .run({
      assetId,
      businessDepartment: input.businessDepartment ?? null,
      departmentOwner: input.departmentOwner ?? null,
      technicalOwner: input.technicalOwner ?? null,
      vendor: input.vendor ?? null,
      supportContact: input.supportContact ?? null,
      hostingLocation: input.hostingLocation ?? null,
      serverName: input.serverName ?? null,
      databaseName: input.databaseName ?? null,
      testUrl: input.testUrl ?? null,
      passwordVaultReference: input.passwordVaultReference ?? null,
      renewalDate: input.renewalDate ?? null,
      notes: input.notes ?? null
    });
}

function updateSystemRecordDetails(id: number, input: UpdateSystemRecordInput) {
  const detailUpdates: string[] = [];
  const detailParams: QueryParams = { id };

  getDatabase()
    .prepare("INSERT OR IGNORE INTO system_record_details (asset_id) VALUES ($id)")
    .run({ id });

  for (const [inputField, columnName] of Object.entries(SYSTEM_DETAIL_FIELDS)) {
    const field = inputField as keyof typeof SYSTEM_DETAIL_FIELDS;

    if (hasField(input, field)) {
      detailUpdates.push(`${columnName} = $${field}`);
      detailParams[field] = input[field] ?? null;
    }
  }

  if (detailUpdates.length === 0) {
    return;
  }

  detailUpdates.push("updated_at = CURRENT_TIMESTAMP");
  getDatabase()
    .prepare(
      `
      UPDATE system_record_details
      SET ${detailUpdates.join(", ")}
      WHERE asset_id = $id
      `
    )
    .run(detailParams);
}

function createUniqueAssetKey(systemName: string) {
  const baseKey = slugify(systemName);
  let candidate = baseKey;
  let suffix = 2;

  while (
    queryOne<{ id: number }>(
      "SELECT id FROM technology_assets WHERE asset_key = $assetKey",
      { assetKey: candidate }
    )
  ) {
    candidate = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "SYSTEM";
}

function hasField<T extends object>(input: T, field: keyof T) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function throwValidationError(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
