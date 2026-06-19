import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import type { Server } from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

type JsonResponse = {
  status: number;
  body: Record<string, unknown> | undefined;
};

type TestSystemRecord = {
  id: number;
  system_name: string;
  status: string;
  business_department: string | null;
  replacement_system?: string | null;
  retirement_notes?: string | null;
  archived_at?: string | null;
};

type TestWarning = {
  code: string;
  matchingSystemIds: number[];
};

type TestDashboardTotals = {
  total: number;
  byStatus: unknown[];
  incomplete: number;
  missingDocumentation: number;
  withoutTechnicalOwner: number;
  upcomingRenewals: unknown[];
  recentlyUpdated: unknown[];
};

test("system records API supports main phase two flows", async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "tod-api-"));
  const databasePath = path.join(tempDirectory, "test.sqlite");

  process.env.NODE_ENV = "test";
  process.env.DATABASE_PATH = databasePath;
  process.env.PORT = "3001";

  createTestDatabase(databasePath);

  const { createApp } = await import("../src/app.js");
  const { closeDatabase } = await import("../src/db/database.js");

  const server = createApp().listen(0);
  await once(server, "listening");

  const baseUrl = getBaseUrl(server);

  try {
    const health = await requestJson(baseUrl, "/health");
    assert.equal(health.status, 200);
    assert.equal(health.body?.status, "ok");

    const assetTypes = await requestJson(baseUrl, "/api/asset-types");
    assert.equal(assetTypes.status, 200);
    assert.ok((assetTypes.body?.data as unknown[]).length >= 12);

    const invalidRecord = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: {
        systemName: " ",
        description: " ",
        categoryCode: "software_application",
        status: "planned",
        productionUrl: "not-a-url",
        renewalDate: "2026-99-99"
      }
    });
    assert.equal(invalidRecord.status, 400);
    assert.equal(invalidRecord.body?.error, "Validation Error");

    const invalidCategory = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: {
        systemName: "Unknown Category System",
        description: "Should fail because the category is not seeded.",
        categoryCode: "unknown_category",
        status: "active"
      }
    });
    assert.equal(invalidCategory.status, 400);
    assert.match(String(invalidCategory.body?.message), /Unknown category code/);

    const createPayload = {
      systemName: "Payroll API",
      description: "Provides payroll data to internal systems.",
      categoryCode: "software_application",
      status: "active",
      businessDepartment: "Finance",
      departmentOwner: "Finance Operations",
      technicalOwner: "Application Development",
      vendor: "Internal",
      supportContact: "Technology Support",
      hostingLocation: "Azure",
      serverName: "PAYROLL-APP-01",
      databaseName: "PayrollDb",
      productionUrl: "https://payroll.example.com",
      testUrl: "https://test-payroll.example.com",
      documentationLink: "https://docs.example.com/payroll-api",
      passwordVaultReference: "Vault/Technology/PayrollApi",
      renewalDate: "2026-12-31",
      lastReviewDate: "2026-06-18",
      replacementSystem: "Enterprise Payroll Platform",
      retirementNotes: "Retain until replacement reporting is fully validated.",
      notes: "Initial API test record."
    };

    const created = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: createPayload
    });
    assert.equal(created.status, 201);
    const createdData = getResponseData<TestSystemRecord>(created);
    assert.equal(createdData.system_name, "Payroll API");
    assert.equal(createdData.replacement_system, "Enterprise Payroll Platform");
    assert.equal(
      createdData.retirement_notes,
      "Retain until replacement reporting is fully validated."
    );
    assert.deepEqual(getResponseWarnings(created), []);
    const systemId = Number(createdData.id);

    const duplicate = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: {
        ...createPayload,
        status: "development"
      }
    });
    assert.equal(duplicate.status, 201);
    const duplicateWarnings = getResponseWarnings(duplicate);
    assert.equal(duplicateWarnings[0]?.code, "duplicate_system_name");
    assert.deepEqual(duplicateWarnings[0]?.matchingSystemIds, [systemId]);
    const duplicateId = Number(getResponseData<TestSystemRecord>(duplicate).id);

    const retrieved = await requestJson(baseUrl, `/api/system-records/${systemId}`);
    assert.equal(retrieved.status, 200);
    assert.equal(getResponseData<TestSystemRecord>(retrieved).id, systemId);

    const searched = await requestJson(baseUrl, "/api/system-records?search=payroll");
    assert.equal(searched.status, 200);
    assert.ok(getResponseData<TestSystemRecord[]>(searched).length >= 2);

    const globalSearch = await requestJson(baseUrl, "/api/search?query=payroll");
    assert.equal(globalSearch.status, 200);
    assert.ok(getResponseData<Record<string, unknown>[]>(globalSearch).length >= 1);

    const createdTeam = await requestJson(baseUrl, "/api/teams", {
      method: "POST",
      body: {
        name: "Print Systems",
        department: "Technology",
        email: "print-systems@example.com",
        description: "Supports printing-company legacy systems."
      }
    });
    assert.equal(createdTeam.status, 201);
    const teamId = Number(getResponseData<{ id: number }>(createdTeam).id);

    const createdPerson = await requestJson(baseUrl, "/api/people", {
      method: "POST",
      body: {
        display_name: "Michelle Benitez",
        email: "michelle.benitez@example.com",
        title: "Technology Operations",
        team_id: teamId,
        active: 1
      }
    });
    assert.equal(createdPerson.status, 201);
    const personId = Number(getResponseData<{ id: number }>(createdPerson).id);

    const createdVendor = await requestJson(baseUrl, "/api/vendors", {
      method: "POST",
      body: {
        name: "Print Vendor",
        website_url: "https://vendor.example.com",
        support_url: "https://vendor.example.com/support",
        renewal_notice_days: 60
      }
    });
    assert.equal(createdVendor.status, 201);

    const createdEnvironment = await requestJson(baseUrl, "/api/asset-environments", {
      method: "POST",
      body: {
        asset_id: systemId,
        environment_name: "production",
        url: "https://payroll.example.com",
        host_name: "PAYROLL-APP-01",
        location: "Azure"
      }
    });
    assert.equal(createdEnvironment.status, 201);

    const createdIntegration = await requestJson(baseUrl, "/api/integrations", {
      method: "POST",
      body: {
        name: "Payroll to Reporting",
        source_asset_id: systemId,
        target_external_name: "Reporting Platform",
        integration_type: "api",
        direction: "outbound",
        owner_team_id: teamId
      }
    });
    assert.equal(createdIntegration.status, 201);

    const createdScheduledProcess = await requestJson(baseUrl, "/api/scheduled-processes", {
      method: "POST",
      body: {
        asset_id: systemId,
        name: "Payroll nightly export",
        schedule_kind: "cron",
        schedule_expression: "0 1 * * *",
        schedule_timezone: "America/Chicago",
        owner_team_id: teamId
      }
    });
    assert.equal(createdScheduledProcess.status, 201);

    const createdReview = await requestJson(baseUrl, "/api/reviews", {
      method: "POST",
      body: {
        asset_id: systemId,
        reviewed_by_person_id: personId,
        review_status: "approved",
        next_review_due_at: "2026-12-18"
      }
    });
    assert.equal(createdReview.status, 201);

    const createdTag = await requestJson(baseUrl, "/api/tags", {
      method: "POST",
      body: {
        name: "legacy-replacement",
        description: "System is part of replacement tracking."
      }
    });
    assert.equal(createdTag.status, 201);

    const teamList = await requestJson(baseUrl, "/api/teams?search=print");
    assert.equal(teamList.status, 200);
    assert.ok(getResponseData<Record<string, unknown>[]>(teamList).length >= 1);

    const invalidVendor = await requestJson(baseUrl, "/api/vendors", {
      method: "POST",
      body: {
        website_url: "not-a-url"
      }
    });
    assert.equal(invalidVendor.status, 400);

    const filtered = await requestJson(
      baseUrl,
      "/api/system-records?categoryCode=software_application&status=active&businessDepartment=Finance"
    );
    assert.equal(filtered.status, 200);
    assert.ok(
      getResponseData<TestSystemRecord[]>(filtered).some((record) => record.id === systemId)
    );

    const sorted = await requestJson(
      baseUrl,
      "/api/system-records?sortBy=systemName&sortDirection=asc"
    );
    assert.equal(sorted.status, 200);
    assert.ok(Array.isArray(sorted.body?.data));

    const updated = await requestJson(baseUrl, `/api/system-records/${systemId}`, {
      method: "PATCH",
      body: {
        status: "maintenance_only",
        businessDepartment: "Finance Operations",
        replacementSystem: "Acquirer Payroll Suite",
        retirementNotes: "Inventory record retained for IT replacement tracking."
      }
    });
    assert.equal(updated.status, 200);
    const updatedData = getResponseData<TestSystemRecord>(updated);
    assert.equal(updatedData.status, "maintenance_only");
    assert.equal(updatedData.business_department, "Finance Operations");
    assert.equal(updatedData.replacement_system, "Acquirer Payroll Suite");
    assert.equal(
      updatedData.retirement_notes,
      "Inventory record retained for IT replacement tracking."
    );

    const incompleteCreated = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: {
        systemName: "Incomplete Internal Tool",
        description: "Missing ownership and support details.",
        categoryCode: "internal_tool",
        status: "development"
      }
    });
    assert.equal(incompleteCreated.status, 201);

    const incomplete = await requestJson(baseUrl, "/api/system-records/incomplete");
    assert.equal(incomplete.status, 200);
    assert.ok(
      getResponseData<TestSystemRecord[]>(incomplete).some(
        (record) => record.system_name === "Incomplete Internal Tool"
      )
    );

    const dashboard = await requestJson(baseUrl, "/api/system-records/dashboard-totals");
    assert.equal(dashboard.status, 200);
    const dashboardData = getResponseData<TestDashboardTotals>(dashboard);
    assert.ok(dashboardData.total >= 3);
    assert.equal(dashboardData.byStatus.length, 5);
    assert.ok(dashboardData.incomplete >= 1);
    assert.ok(dashboardData.missingDocumentation >= 1);
    assert.ok(dashboardData.withoutTechnicalOwner >= 1);
    assert.ok(Array.isArray(dashboardData.upcomingRenewals));
    assert.ok(Array.isArray(dashboardData.recentlyUpdated));

    const archived = await requestJson(baseUrl, `/api/system-records/${duplicateId}/archive`, {
      method: "POST"
    });
    assert.equal(archived.status, 200);
    assert.ok(getResponseData<TestSystemRecord>(archived).archived_at);

    const archivedOnly = await requestJson(baseUrl, "/api/system-records?archivedOnly=true");
    assert.equal(archivedOnly.status, 200);
    assert.ok(
      getResponseData<TestSystemRecord[]>(archivedOnly).some((record) => record.id === duplicateId)
    );

    const deleted = await requestJson(baseUrl, `/api/system-records/${duplicateId}`, {
      method: "DELETE"
    });
    assert.equal(deleted.status, 204);

    const deletedLookup = await requestJson(baseUrl, `/api/system-records/${duplicateId}`);
    assert.equal(deletedLookup.status, 404);
  } finally {
    await closeServer(server);
    closeDatabase();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

function createTestDatabase(databasePath: string) {
  const database = new DatabaseSync(databasePath);
  const schemaSql = readFileSync(path.join(projectRoot, "database", "schema.sql"), "utf8");
  const seedSql = readFileSync(path.join(projectRoot, "database", "seed.sql"), "utf8");
  const migrationsDirectory = path.join(projectRoot, "database", "migrations");

  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(schemaSql);
  database.exec(seedSql);

  if (existsSync(migrationsDirectory)) {
    const migrationFiles = readdirSync(migrationsDirectory)
      .filter((fileName) => fileName.toLowerCase().endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));

    for (const fileName of migrationFiles) {
      database.exec(readFileSync(path.join(migrationsDirectory, fileName), "utf8"));
    }
  }

  database.close();
}

function getBaseUrl(server: Server) {
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port.");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function requestJson(
  baseUrl: string,
  pathname: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<JsonResponse> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined
  };
}

function getResponseData<T>(response: JsonResponse) {
  assert.ok(response.body);
  assert.ok("data" in response.body);

  return response.body.data as T;
}

function getResponseWarnings(response: JsonResponse) {
  assert.ok(response.body);

  return (response.body.warnings ?? []) as TestWarning[];
}

async function closeServer(server: Server) {
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
