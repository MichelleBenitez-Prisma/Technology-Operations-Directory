import { findAssetTypeByCode } from "./assetTypeRepository.js";
import { getDatabase, queryAll, queryOne, type QueryParams } from "./database.js";
import { SYSTEM_STATUSES, SYSTEM_STATUS_LABELS } from "../types/systemRecord.js";
import type {
  CreateSystemRecordInput,
  SortDirection,
  SystemRecord,
  SystemRecordMutationResult,
  SystemRecordSortField,
  SystemRecordWarning,
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
  replacementSystem: "replacement_system",
  retirementNotes: "retirement_notes",
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

export function findSystemRecordById(id: number, options: { includeArchived?: boolean } = {}) {
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

export function listSystemRecordDependencies(id: number) {
  const dependsOn = queryAll<Record<string, unknown>>(
    `
    SELECT
      system_dependencies.*,
      destination.id AS related_system_id,
      destination.system_name AS related_system_name,
      destination.category_name AS related_category_name,
      destination.status AS related_status
    FROM system_dependencies
    JOIN system_record_view AS destination ON destination.id = system_dependencies.destination_asset_id
    WHERE system_dependencies.source_asset_id = $id
      AND system_dependencies.archived_at IS NULL
    ORDER BY
      CASE system_dependencies.importance_level
        WHEN 'critical' THEN 1
        WHEN 'important' THEN 2
        ELSE 3
      END,
      destination.system_name ASC
    `,
    { id }
  );

  const dependedOnBy = queryAll<Record<string, unknown>>(
    `
    SELECT
      system_dependencies.*,
      source.id AS related_system_id,
      source.system_name AS related_system_name,
      source.category_name AS related_category_name,
      source.status AS related_status
    FROM system_dependencies
    JOIN system_record_view AS source ON source.id = system_dependencies.source_asset_id
    WHERE system_dependencies.destination_asset_id = $id
      AND system_dependencies.archived_at IS NULL
    ORDER BY
      CASE system_dependencies.importance_level
        WHEN 'critical' THEN 1
        WHEN 'important' THEN 2
        ELSE 3
      END,
      source.system_name ASC
    `,
    { id }
  );

  return {
    dependsOn,
    dependedOnBy
  };
}

export function listSystemRecordTags(id: number) {
  return queryAll<Record<string, unknown>>(
    `
    SELECT tags.id, tags.name, tags.description
    FROM asset_tags
    JOIN tags ON tags.id = asset_tags.tag_id
    WHERE asset_tags.asset_id = $id
      AND IFNULL(tags.archived_at, '') = ''
    ORDER BY tags.name ASC
    `,
    { id }
  );
}

export function addSystemRecordTag(id: number, tagId: number) {
  if (!findSystemRecordById(id, { includeArchived: true })) {
    return undefined;
  }

  getDatabase()
    .prepare(
      `
      INSERT OR IGNORE INTO asset_tags (asset_id, tag_id)
      VALUES ($id, $tagId)
      `
    )
    .run({ id, tagId });

  return listSystemRecordTags(id);
}

export function removeSystemRecordTag(id: number, tagId: number) {
  if (!findSystemRecordById(id, { includeArchived: true })) {
    return undefined;
  }

  getDatabase()
    .prepare(
      `
      DELETE FROM asset_tags
      WHERE asset_id = $id AND tag_id = $tagId
      `
    )
    .run({ id, tagId });

  return listSystemRecordTags(id);
}

const CATEGORY_DETAIL_CONFIGS: Record<string, { tableName: string; columns: readonly string[] }> = {
  website: {
    tableName: "website_details",
    columns: ["domain_name", "cms_platform", "analytics_url", "notes"]
  },
  server: {
    tableName: "server_details",
    columns: [
      "host_name",
      "operating_system",
      "operating_system_version",
      "ip_address",
      "hosting_provider",
      "region",
      "backup_policy",
      "notes"
    ]
  },
  database: {
    tableName: "database_details",
    columns: ["engine", "engine_version", "database_name", "contains_pii", "backup_schedule", "retention_days", "notes"]
  },
  vendor_hosted_service: {
    tableName: "vendor_service_details",
    columns: ["service_url", "service_tier", "sla_description", "support_level", "data_residency", "notes"]
  },
  payment_service: {
    tableName: "payment_service_details",
    columns: [
      "payment_service_role",
      "payment_method_types",
      "pci_scope",
      "tokenization_enabled",
      "settlement_frequency",
      "compliance_notes",
      "notes"
    ]
  }
};

export function getSystemRecordCategoryDetails(id: number) {
  const record = findSystemRecordById(id, { includeArchived: true });

  if (!record) {
    return undefined;
  }

  const config = CATEGORY_DETAIL_CONFIGS[record.category_code];

  if (!config) {
    return {
      categoryCode: record.category_code,
      categoryName: record.category_name,
      fields: null
    };
  }

  const row = queryOne<Record<string, unknown>>(
    `
    SELECT ${config.columns.join(", ")}
    FROM ${config.tableName}
    WHERE asset_id = $id
    `,
    { id }
  );

  return {
    categoryCode: record.category_code,
    categoryName: record.category_name,
    fields: row ?? Object.fromEntries(config.columns.map((column) => [column, null]))
  };
}

export function updateSystemRecordCategoryDetails(id: number, input: Record<string, unknown>) {
  const record = findSystemRecordById(id, { includeArchived: true });

  if (!record) {
    return undefined;
  }

  const config = CATEGORY_DETAIL_CONFIGS[record.category_code];

  if (!config) {
    throwValidationError(`Category ${record.category_code} does not support extra details.`);
  }

  const values: QueryParams = { id };

  for (const column of config.columns) {
    if (Object.prototype.hasOwnProperty.call(input, column)) {
      values[column] = normalizeCategoryValue(input[column]);
    }
  }

  const columns = Object.keys(values).filter((column) => column !== "id");

  if (columns.length === 0) {
    throwValidationError("At least one category detail field must be provided.");
  }

  const database = getDatabase();
  database.exec("BEGIN");

  try {
    database.prepare(`INSERT OR IGNORE INTO ${config.tableName} (asset_id) VALUES ($id)`).run({ id });
    database
      .prepare(
        `
        UPDATE ${config.tableName}
        SET ${columns.map((column) => `${column} = $${column}`).join(", ")}
        WHERE asset_id = $id
        `
      )
      .run(values);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return getSystemRecordCategoryDetails(id);
}

export function createSystemRecord(input: CreateSystemRecordInput): SystemRecordMutationResult {
  const assetType = findAssetTypeByCode(input.categoryCode);

  if (!assetType) {
    throwValidationError(`Unknown category code: ${input.categoryCode}`);
  }

  const warnings = buildDuplicateSystemNameWarnings(input.systemName);
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
    const record = findSystemRecordById(assetId, { includeArchived: true });

    if (!record) {
      throw new Error(`System record ${assetId} was created but could not be read.`);
    }

    return {
      data: record,
      warnings
    };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function updateSystemRecord(
  id: number,
  input: UpdateSystemRecordInput
): SystemRecordMutationResult | undefined {
  const existing = findSystemRecordById(id, { includeArchived: true });

  if (!existing) {
    return undefined;
  }

  const warnings = buildDuplicateSystemNameWarnings(input.systemName ?? existing.system_name, id);
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
    const record = findSystemRecordById(id, { includeArchived: true });

    if (!record) {
      throw new Error(`System record ${id} was updated but could not be read.`);
    }

    return {
      data: record,
      warnings
    };
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
  const total =
    queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM system_record_view WHERE archived_at IS NULL"
    )?.count ?? 0;
  const archived =
    queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM system_record_view WHERE archived_at IS NOT NULL"
    )?.count ?? 0;
  const incomplete =
    queryOne<{ count: number }>(
      `
    SELECT COUNT(*) AS count
    FROM system_record_view
    WHERE archived_at IS NULL
      AND is_incomplete = 1
    `
    )?.count ?? 0;
  const missingDocumentation =
    queryOne<{ count: number }>(
      `
    SELECT COUNT(*) AS count
    FROM system_record_view
    WHERE archived_at IS NULL
      AND NULLIF(TRIM(IFNULL(documentation_url, '')), '') IS NULL
    `
    )?.count ?? 0;
  const withoutTechnicalOwner =
    queryOne<{ count: number }>(
      `
    SELECT COUNT(*) AS count
    FROM system_record_view
    WHERE archived_at IS NULL
      AND NULLIF(TRIM(IFNULL(technical_owner, '')), '') IS NULL
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
  const byStatusLookup = new Map(byStatusRows.map((row) => [row.status, row.count] as const));
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
  const upcomingRenewals = queryAll<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    WHERE archived_at IS NULL
      AND renewal_date IS NOT NULL
      AND DATE(renewal_date) BETWEEN DATE('now') AND DATE('now', '+90 days')
    ORDER BY renewal_date ASC, system_name ASC
    LIMIT 8
    `
  );
  const recentlyUpdated = queryAll<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    WHERE archived_at IS NULL
    ORDER BY updated_at DESC, system_name ASC
    LIMIT 8
    `
  );
  const missingDocumentationRecords = queryAll<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    WHERE archived_at IS NULL
      AND NULLIF(TRIM(IFNULL(documentation_url, '')), '') IS NULL
    ORDER BY system_name ASC
    LIMIT 8
    `
  );
  const withoutTechnicalOwnerRecords = queryAll<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    WHERE archived_at IS NULL
      AND NULLIF(TRIM(IFNULL(technical_owner, '')), '') IS NULL
    ORDER BY system_name ASC
    LIMIT 8
    `
  );

  return {
    total,
    archived,
    incomplete,
    missingDocumentation,
    withoutTechnicalOwner,
    byStatus,
    byCategory,
    upcomingRenewals,
    recentlyUpdated,
    missingDocumentationRecords,
    withoutTechnicalOwnerRecords
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
        replacement_system,
        retirement_notes,
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
        $replacementSystem,
        $retirementNotes,
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
      replacementSystem: input.replacementSystem ?? null,
      retirementNotes: input.retirementNotes ?? null,
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
    queryOne<{ id: number }>("SELECT id FROM technology_assets WHERE asset_key = $assetKey", {
      assetKey: candidate
    })
  ) {
    candidate = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function buildDuplicateSystemNameWarnings(
  systemName: string,
  excludeSystemId?: number
): SystemRecordWarning[] {
  const trimmedName = systemName.trim();

  if (trimmedName.length === 0) {
    return [];
  }

  const params: QueryParams = {
    systemName: trimmedName
  };
  const excludeClause = excludeSystemId ? "AND id <> $excludeSystemId" : "";

  if (excludeSystemId) {
    params.excludeSystemId = excludeSystemId;
  }

  const duplicateRows = queryAll<{ id: number; system_name: string }>(
    `
    SELECT id, system_name
    FROM system_record_view
    WHERE archived_at IS NULL
      AND LOWER(TRIM(system_name)) = LOWER(TRIM($systemName))
      ${excludeClause}
    ORDER BY system_name
    `,
    params
  );

  if (duplicateRows.length === 0) {
    return [];
  }

  return [
    {
      code: "duplicate_system_name",
      message:
        "Another active system record already uses this system name. Review the matching records before saving another copy.",
      matchingSystemIds: duplicateRows.map((row) => row.id)
    }
  ];
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

function normalizeCategoryValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number" || value === null) {
    return value;
  }

  return null;
}

function throwValidationError(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
