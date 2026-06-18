import { getDatabase, queryAll, queryOne, type QueryParams } from "./database.js";
import { findAssetTypeByCode } from "./assetTypeRepository.js";
import type { CreateSystemRecordInput, SystemRecord } from "../types/systemRecord.js";

export type ListSystemRecordsFilters = {
  search?: string;
  categoryCode?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export function listSystemRecords(filters: ListSystemRecordsFilters) {
  const where: string[] = [];
  const params: QueryParams = {
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0
  };

  if (filters.search) {
    where.push(
      `(LOWER(system_name) LIKE $search OR LOWER(description) LIKE $search OR LOWER(IFNULL(vendor, '')) LIKE $search)`
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

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return queryAll<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    ${whereClause}
    ORDER BY updated_at DESC, system_name ASC
    LIMIT $limit OFFSET $offset
    `,
    params
  );
}

export function findSystemRecordById(id: number) {
  return queryOne<SystemRecord>(
    `
    SELECT *
    FROM system_record_view
    WHERE id = $id
    `,
    { id }
  );
}

export function createSystemRecord(input: CreateSystemRecordInput) {
  const assetType = findAssetTypeByCode(input.categoryCode);

  if (!assetType) {
    const error = new Error(`Unknown category code: ${input.categoryCode}`);
    error.name = "ValidationError";
    throw error;
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

    database
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

    database.exec("COMMIT");
    return findSystemRecordById(assetId);
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
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
