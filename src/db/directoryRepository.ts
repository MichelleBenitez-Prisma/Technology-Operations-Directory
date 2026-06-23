import { systemRecordsRouter } from "../routes/systemRecords.routes.js";
import { execute, queryAll, queryOne, type QueryParams } from "./database.js";

export type DirectoryResourceConfig = {
  tableName: string;
  listOrderBy: string;
  allowedColumns: readonly string[];
  searchableColumns?: readonly string[];
  supportsArchive?: boolean;
};

export type DirectoryListFilters = {
  search?: string | null;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  limit?: number;
  offset?: number;
};

const RESOURCE_CONFIGS = {
  assetTypes: {
    tableName: "asset_types",
    listOrderBy: "name ASC",
    allowedColumns: ["code", "name", "description"],
    searchableColumns: ["code", "name", "description"]
  },
  teams: {
    tableName: "teams",
    listOrderBy: "name ASC",
    allowedColumns: ["name", "department", "email", "description"],
    searchableColumns: ["name", "department", "email", "description"]
  },
  people: {
    tableName: "people",
    listOrderBy: "display_name ASC",
    allowedColumns: ["display_name", "email", "title", "team_id", "phone", "active"],
    searchableColumns: ["display_name", "email", "title", "phone"]
  },
  vendors: {
    tableName: "vendors",
    listOrderBy: "name ASC",
    allowedColumns: [
      "name",
      "description",
      "website_url",
      "support_url",
      "support_email",
      "support_phone",
      "support_portal_url",
      "account_manager_name",
      "account_manager_email",
      "account_representative",
      "contract_start_date",
      "contract_end_date",
      "renewal_notice_days",
      "contract_notes",
      "renewal_notes",
      "notes"
    ],
     searchableColumns: [
      "name",
      "description",
      "website_url",
      "support_url",
      "support_email",
      "support_phone",
      "support_portal_url",
      "account_manager_name",
      "account_manager_email",
      "account_representative",
      "contract_notes",
      "renewal_notes",
      "notes"
    ],
    supportsArchive: true
  },
  assetEnvironments: {
    tableName: "asset_environments",
    listOrderBy: "asset_id ASC, environment_name ASC",
    allowedColumns: ["asset_id", "environment_name", "url", "host_name", "location", "notes"],
    searchableColumns: ["environment_name", "url", "host_name", "location", "notes"]
  },
  integrations: {
    tableName: "integrations",
    listOrderBy: "name ASC",
    allowedColumns: [
      "name",
      "source_asset_id",
      "target_asset_id",
      "source_external_name",
      "target_external_name",
      "integration_type",
      "direction",
      "protocol",
      "data_description",
      "schedule_description",
      "criticality",
      "lifecycle_status",
      "owner_team_id",
      "documentation_url",
      "notes"
    ],
    searchableColumns: [
      "name",
      "source_external_name",
      "target_external_name",
      "protocol",
      "data_description",
      "notes"
    ],
    supportsArchive: true
  },
  scheduledProcesses: {
    tableName: "scheduled_processes",
    listOrderBy: "name ASC",
    allowedColumns: [
      "asset_id",
      "name",
      "schedule_kind",
      "schedule_expression",
      "schedule_timezone",
      "command_or_job_name",
      "run_location_asset_id",
      "lifecycle_status",
      "owner_team_id",
      "last_known_success_at",
      "failure_notification_channel",
      "runbook_url",
      "notes"
    ],
    searchableColumns: [
      "name",
      "schedule_expression",
      "command_or_job_name",
      "failure_notification_channel",
      "notes"
    ],
    supportsArchive: true
  },
  reviews: {
    tableName: "review_records",
    listOrderBy: "reviewed_at DESC, id DESC",
    allowedColumns: [
      "asset_id",
      "reviewed_at",
      "reviewed_by_person_id",
      "review_status",
      "notes",
      "next_review_due_at"
    ],
    searchableColumns: ["review_status", "notes"],
    supportsArchive: true
  },
  tags: {
    tableName: "tags",
    listOrderBy: "name ASC",
    allowedColumns: ["name", "description"],
    searchableColumns: ["name", "description"],
    supportsArchive: true 
  },
  systemDependcies: {
    tableName: "system_dependencies",
    listOrderBy: "importance_level ASC, id DESC",
    allowedColumns: [
      "source_asset_id",
      "destination_asset_id",
      "relationship_description",
      "data_or_service_exchange",
      "importance_level",
      "notes"
    ],
    searchableColumns: ["rekationship_description", "data_or_service_exchanged", "importance_level", "notes"],
    supportsArchive: true
  }
} as const satisfies Record<string, DirectoryResourceConfig>;

export type DirectoryResourceName = keyof typeof RESOURCE_CONFIGS;

export function getDirectoryResourceConfig(resourceName: DirectoryResourceName) {
  return RESOURCE_CONFIGS[resourceName];
}

export function listDirectoryRows(
  resourceName: DirectoryResourceName,
  filters: DirectoryListFilters
) {
  const config = getDirectoryResourceConfig(resourceName);
  const where: string[] = [];
  const params: QueryParams = {
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0
  };

  if (filters.search && config.searchableColumns?.length) {
    const searchParts = config.searchableColumns.map(
      (column) => `LOWER(IFNULL(${column}, '')) LIKE $search`
    );
    where.push(`(${searchParts.join(" OR ")})`);
    params.search = `%${filters.search.toLowerCase()}%`;
  }

  if (config.supportsArchive) {
    if (filters.archivedOnly) {
      where.push("archived_at IS NOT NULL");
    } else if (!filters.includeArchived) {
      where.push("archived_at IS NULL");
    }
  }

  return queryAll<Record<string, unknown>>(
    `
    SELECT *
    FROM ${config.tableName}
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${config.listOrderBy}
    LIMIT $limit OFFSET $offset
    `,
    params
  );
}

export function findDirectoryRowById(resourceName: DirectoryResourceName, id: number) {
  const config = getDirectoryResourceConfig(resourceName);

  return queryOne<Record<string, unknown>>(
    `
    SELECT *
    FROM ${config.tableName}
    WHERE id = $id
    `,
    { id }
  );
}

export function createDirectoryRow(
  resourceName: DirectoryResourceName,
  input: Record<string, unknown>
) {
  const config = getDirectoryResourceConfig(resourceName);
  const values = pickAllowedValues(config, input);
  const columns = Object.keys(values);

  if (columns.length === 0) {
    throwValidationError("At least one field must be provided.");
  }

  const placeholders = columns.map((column) => `$${column}`);
  const result = execute(
    `
    INSERT INTO ${config.tableName} (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    `,
    values
  );

  return findDirectoryRowById(resourceName, Number(result.lastInsertRowid));
}

export function updateDirectoryRow(
  resourceName: DirectoryResourceName,
  id: number,
  input: Record<string, unknown>
) {
  const existing = findDirectoryRowById(resourceName, id);

  if (!existing) {
    return undefined;
  }

  const config = getDirectoryResourceConfig(resourceName);
  const values = pickAllowedValues(config, input);
  const columns = Object.keys(values);

  if (columns.length === 0) {
    throwValidationError("At least one field must be provided.");
  }

  values.id = id;
  const assignments = columns.map((column) => `${column} = $${column}`);

  execute(
    `
    UPDATE ${config.tableName}
    SET ${assignments.join(", ")}
    WHERE id = $id
    `,
    values
  );

  return findDirectoryRowById(resourceName, id);
}

export function deleteDirectoryRow(resourceName: DirectoryResourceName, id: number) {
  const existing = findDirectoryRowById(resourceName, id);

  if (!existing) {
    return false;
  }

  const config = getDirectoryResourceConfig(resourceName);

  execute(
    `
    DELETE FROM ${config.tableName}
    WHERE id = $id
    `,
    { id }
  );

  return true;
}

export function archiveDirectoryRow(resourceName: DirectoryResourceName, id: number) {
  const config = getDirectoryResourceConfig(resourceName);

  // Some resource configs don't include the supportsArchive flag in their type.
  // Treat missing flag as not supporting archive.
  if (!("supportsArchive" in config) || !config.supportsArchive) {
    throwValidationError("This resource does not support archive.");
  }

  const existing = findDirectoryRowById(resourceName, id);

  if (!existing) {
    return undefined;
  }

  execute(
    `
    UPDATE ${config.tableName}
    SET archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $id
    `,
    { id }
  );

  return findDirectoryRowById(resourceName, id);
}

export function searchTechnologyAssets(searchTerm: string, limit = 25) {
  const normalized = searchTerm.trim();

  if (!normalized) {
    return [];
  }

  const ftsQuery = normalized
    .split(/\s+/)
    .map((part) => `${part.replace(/"/g, '""')}*`)
    .join(" ");

  return queryAll<Record<string, unknown>>(
    `
    SELECT
      technology_assets.id,
      technology_assets.asset_key,
      technology_assets.name,
      technology_assets.description,
      asset_types.code AS category_code,
      asset_types.name AS category_name,
      technology_assets.lifecycle_status AS status,
      technology_assets.archived_at,
      bm25(asset_search) AS rank
    FROM asset_search
    JOIN technology_assets ON technology_assets.id = asset_search.rowid
    JOIN asset_types ON asset_types.id = technology_assets.asset_type_id
    WHERE asset_search MATCH $query
    ORDER BY rank ASC, technology_assets.name ASC
    LIMIT $limit
    `,
    {
      query: ftsQuery,
      limit
    }
  );
}

function pickAllowedValues(config: DirectoryResourceConfig, input: Record<string, unknown>) {
  const values: QueryParams = {};

  for (const column of config.allowedColumns) {
    if (Object.prototype.hasOwnProperty.call(input, column)) {
      values[column] = normalizeValue(input[column]);
    }
  }

  return values;
}

function normalizeValue(value: unknown) {
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
