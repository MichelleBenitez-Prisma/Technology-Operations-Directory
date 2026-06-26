import { findAssetTypeByCode } from "./assetTypeRepository.js";
import { getDatabase, queryAll, queryOne, type QueryParams } from "./database.js";
import { SYSTEM_STATUSES, SYSTEM_STATUS_LABELS } from "../types/systemRecord.js";
import type {
  CreateSystemRecordInput,
  SortDirection,
  SystemRecord,
  SystemRecordQualityWarning, 
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

export const SYSTEM_REPORT_KEYS = [
  "active-systems",
  "being-replaced",
  "retired-systems",
  "missing-documentation",
  "upcoming-renewals",
  "by-vendor",
  "by-category",
  "recently-reviewed",
  "data-quality"
] as const;

export type SystemReportKey = (typeof SYSTEM_REPORT_KEYS)[number];

export type SystemReportSummary = {
  key: SystemReportKey;
  title: string;
  description: string;
  count: number;
};

export type systemReport = SystemReportSummary & {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
};

type SystemRecordRow = SystemRecord & {
  review_interval_days?: number | null;

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

const SYSTEM_RECORD_SELECT =
  "system_record_view.*, (SELECT review_interval_days FROM technology_assets WHERE technology_assets.id = system_record_view.id) AS review_interval_days";
const SYSTEM_RECORD_FROM = "system_record_view";

const SYSTEM_REPORT_DEFINITIONS: Record<
  SystemReportKey,
  { title: string; description: string }
> = {
  "active-systems": {
    title: "Active Systems",
    description: "Systems currently in active use."
  },
  "being-replaced": {
    title: "Systems Being Replaced",
    description: "Systems marked for replacement planning."
  },
  "retired-systems": {
    title: "Retired Systems",
    description: "Systems marked retired but still tracked in the directory."
  },
  "missing-documentation": {
    title: "Systems Missing Documentation",
    description: "Systems without a documentation link."
  },
  "missing-owners": {
    title: "Systems Missing Owners",
    description: "Systems without a technical owner."
  },
  "upcoming-renewals": {
    title: "Upcoming Renewals",
    description: "Renewal dates in the next 90 days."
  },
  "by-vendor": {
    title: "Systems Grouped By Vendor",
    description: "Active systems counted by vendor."
  },
  "by-category": {
    title: "Systems Grouped By Category",
    description: "Active systems counted by category."
  },
  "recently-reviewed": {
    title: "Recently Reviewed Systems",
    description: "Systems reviewed in the last 90 days."
  },
  "data-quality": {
    title: "Data Quality Warnings",
    description: "Systems with incomplete or outdated operational details."
  }
};


export function listSystemRecords(filters: ListSystemRecordsFilters) {
  const { whereClause, params } = buildSystemRecordWhereClause(filters);
  const sortBy = filters.sortBy ?? "updatedAt";
  const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
  const sortColumn = SORT_COLUMNS[sortBy];

  params.limit = filters.limit ?? 50;
  params.offset = filters.offset ?? 0;

  return enrichSystemRecords(
    queryAll<SystemRecordRow>(
    `
    SELECT ${SYSTEM_RECORD_SELECT}
    FROM ${SYSTEM_RECORD_FROM}
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}, system_name ASC
    LIMIT $limit OFFSET $offset
    `,
    params
    )
  );
}

export function listIncompleteSystemRecords(filters: ListSystemRecordsFilters) {
  return listSystemRecords({
    ...filters,
    incompleteOnly: true
  });
}

export function listSystemRecordsForExport(filters: ListSystemRecordsFilters){
  const { whereClause, params} = buildSystemRecordWhereClause(filters);
  const sortBy = filters.sortBy ?? "updatedAt";
  const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
  const sortColumn =  SORT_COLUMNS[sortBy];

  return enrichSystemRecords(
    queryAll<SystemRecordRow>(
      `
      SELECET ${SYSTEM_RECORD_SELECT}
      FROM${SYSTEM_RECORD_FROM}
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}, system_name ASC
      `,
      params
    )
  );
}

export function findSystemRecordById(id: number, options: { includeArchived?: boolean } = {}) {
  const archivedClause = options.includeArchived ? "" : "AND archived_at IS NULL";

  const record = queryOne<SystemRecordRow>(
    `
    SELECT ${SYSTEM_RECORD_SELECT}
    FROM ${SYSTEM_RECORD_FROM}
    WHERE id = $id
    ${archivedClause}
    `,
    { id }
  );
  return record ? enrichSystemRecord(record) : underfined;
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
  const upcomingRenewals = enrichSystemRecord(
    queryAll<SystemRecordRow>(
    `
    SELECT ${SYSTEM_RECORD_SELECT}
    FROM ${SYSTEM_RECORD_FROM}
    WHERE archived_at IS NULL
      AND renewal_date IS NOT NULL
      AND DATE(renewal_date) BETWEEN DATE('now') AND DATE('now', '+90 days')
    ORDER BY renewal_date ASC, system_name ASC
    LIMIT 8
    `
    )
  );
  const recentlyUpdated = enrichSystemRecords(
    queryAll<SystemRecordRow>(
    `
    SELECT ${SYSTEM_RECORD_SELECT}
    FROM ${SYSTEM_RECORD_FROM}
    WHERE archived_at IS NULL
    ORDER BY updated_at DESC, system_name ASC
    LIMIT 8
    `
    )
  );
  const missingDocumentationRecords = enrichSystemRecords(
    queryAll<SystemRecordRow>(
    `
    SELECT ${SYSTEM_RECORD_SELECT}
    FROM ${SYSTEM_RECORD_FROM}
    WHERE archived_at IS NULL
      AND NULLIF(TRIM(IFNULL(documentation_url, '')), '') IS NULL
    ORDER BY system_name ASC
    LIMIT 8
    `
    )
  );
  const withoutTechnicalOwnerRecords = enrichSystemRecords(
    queryAll<SystemRecordRow>(
    `
    SELECT  ${SYSTEM_RECORD_SELECT}
    FROM ${SYSTEM_RECORD_FROM}
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

export function listSystemReportSummaries(): SystemReportSummary[] {
  return SYSTEM_REPORT_KEYS.map((key) => {
    const report = getSystemReport(key);

    return {
      key,
      title: report.title,
      description: report.description,
      count: report.count
    };
  });
}

export function getSystemReport(key: SystemReportKey): SystemReport {
  const definition = SYSTEM_REPORT_DEFINITIONS[key];
  const rows = getSystemReportRows(key);

  return {
    key,
    title: definition.title,
    description: definition.description,
    count: rows.length,
    columns: getSystemReportColumns(key),
    rows
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

function getSystemReportRows(key: SystemReportKey): Array<Record<string, unknown>> {
  if (key === "by-vendor") {
    return queryAll<Record<string, unknown>>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(vendor), ''), 'Not assigned') AS vendor,
        COUNT(*) AS system_count
      FROM system_record_view
      WHERE archived_at IS NULL
      GROUP BY COALESCE(NULLIF(TRIM(vendor), ''), 'Not assigned')
      ORDER BY system_count DESC, vendor ASC
      `
    );
  }

  if (key === "by-category") {
    return queryAll<Record<string, unknown>>(
      `
      SELECT
        category_name,
        COUNT(*) AS system_count
      FROM system_record_view
      WHERE archived_at IS NULL
      GROUP BY category_name
      ORDER BY system_count DESC, category_name ASC
      `
    );
  }
  const records = listSystemRecordsForExport({
    includeArchived: false,
    sortBy: key === "upcoming-renewals" ? "renewalDate" : "systemName",
    sortDirection: "asc"
  });

  if (key === "active-systems") {
    return records.filter((record) => record.status === "active").map(toSystemReportRow);
  }

  if (key === "being-replaced") {
    return records.filter((record) => record.status === "being_replaced").map(toSystemReportRow);
  }

  if (key === "retired-systems") {
    return records.filter((record) => record.status === "retired").map(toSystemReportRow);
  }

  if (key === "missing-documentation") {
    return records
      .filter((record) => hasQualityWarning(record, "missing_documentation_link"))
      .map(toSystemReportRow);
  }

  if (key === "missing-owners") {
    return records
      .filter((record) => hasQualityWarning(record, "missing_technical_owner"))
      .map(toSystemReportRow);
  }
  if (key === "upcoming-renewals") {
    return records
      .filter((record) => hasQualityWarning(record, "renewal_date_approaching"))
      .map(toSystemReportRow);
  }

  if (key === "recently-reviewed") {
    const oldestRecentReview = Date.now() - 90 * 24 * 60 * 60 * 1000;

    return records
      .filter((record) => {
        const reviewedAt = parseDateOnly(record.last_review_date);

        return reviewedAt !== null && reviewedAt.getTime() >= oldestRecentReview;
      })
      .map(toSystemReportRow);
  }

  return records
    .filter((record) => record.quality_warning_count > 0)
    .sort((left, right) => {
      return right.quality_warning_count - left.quality_warning_count || left.system_name.localeCompare(right.system_name);
    })
    .map(toSystemReportRow);
}

function getSystemReportColumns(key: SystemReportKey) {
  if (key === "by-vendor") {
    return [
      { key: "vendor", label: "Vendor" },
      { key: "system_count", label: "Systems" }
    ];
  }
if (key === "by-category") {
    return [
      { key: "category_name", label: "Category" },
      { key: "system_count", label: "Systems" }
    ];
  }

  return [
    { key: "system_name", label: "System" },
    { key: "status", label: "Status" },
    { key: "category_name", label: "Category" },
    { key: "technical_owner", label: "Technical owner" },
    { key: "vendor", label: "Vendor" },
    { key: "renewal_date", label: "Renewal date" },
    { key: "last_review_date", label: "Last review" },
    { key: "quality_warning_messages", label: "Warnings" }
  ];
}

function toSystemReportRow(record: SystemRecord): Record<string, unknown> {
  return {
    id: record.id,
    system_name: record.system_name,
    status: record.status,
    category_name: record.category_name,
    technical_owner: record.technical_owner,
    vendor: record.vendor,
    renewal_date: record.renewal_date,
    last_review_date: record.last_review_date,
    quality_warning_count: record.quality_warning_count,
    quality_warning_messages: record.quality_warnings.map((warning) => warning.message).join("; ")
  };
}
function hasQualityWarning(record: SystemRecord, code: SystemRecordQualityWarning["code"]) {
  return record.quality_warnings.some((warning) => warning.code === code);
}

function enrichSystemRecords(records: SystemRecordRow[]): SystemRecord[] {
  return records.map(enrichSystemRecord);
}

function enrichSystemRecord(row: SystemRecordRow): SystemRecord {
  const { review_interval_days: reviewIntervalDays, ...record } = row;
  const qualityWarnings = buildSystemRecordQualityWarnings(record, reviewIntervalDays ?? 180);

  return {
    ...record,
    quality_warnings: qualityWarnings,
    quality_warning_count: qualityWarnings.length
  };
}

function buildSystemRecordQualityWarnings(
  record: Omit<SystemRecord, "quality_warnings" | "quality_warning_count">,
  reviewIntervalDays: number
): SystemRecordQualityWarning[] {
  const warnings: SystemRecordQualityWarning[] = [];

  if (!hasText(record.description)) {
    warnings.push({
      code: "missing_description",
      message: "Description is missing."
    });
  }

  if (!hasText(record.technical_owner)) {
    warnings.push({
      code: "missing_technical_owner",
      message: "Technical owner is missing."
    });
  }

  if (!hasText(record.vendor)) {
    warnings.push({
      code: "missing_vendor",
      message: "Vendor information is missing."
    });
  }

  if (!hasText(record.support_contact)) {
    warnings.push({
      code: "missing_support_contact",
      message: "Support contact is missing."
    });
  }

  if (!hasText(record.documentation_url)) {
    warnings.push({
      code: "missing_documentation_link",
      message: "Documentation link is missing."
    });
  }

  if (!hasText(record.hosting_location)) {
    warnings.push({
      code: "missing_hosting_information",
      message: "Hosting information is missing."
    });
  }

  const lastReviewDate = parseDateOnly(record.last_review_date);

  if (!lastReviewDate) {
    warnings.push({
      code: "missing_last_review_date",
      message: "Last review date is missing."
    });
} else {
    const reviewAgeDays = Math.floor((Date.now() - lastReviewDate.getTime()) / (24 * 60 * 60 * 1000));

    if (reviewAgeDays > reviewIntervalDays) {
      warnings.push({
        code: "last_review_overdue",
        message: `Last review is older than the allowed ${reviewIntervalDays}-day review period.`
      });
    }
  }

  const renewalDate = parseDateOnly(record.renewal_date);

  if (renewalDate) {
    const today = startOfToday();
    const ninetyDaysFromNow = today.getTime() + 90 * 24 * 60 * 60 * 1000;
    const renewalTime = renewalDate.getTime();

    if (renewalTime >= today.getTime() && renewalTime <= ninetyDaysFromNow) {
      warnings.push({
        code: "renewal_date_approaching",
        message: "Renewal date is approaching within 90 days."
      });
    }
  }

  return warnings;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
