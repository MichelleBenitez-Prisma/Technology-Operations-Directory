import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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
  body: Record<string, any> | undefined;
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
      notes: "Initial API test record."
    };

    const created = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: createPayload
    });
    assert.equal(created.status, 201);
    assert.equal(created.body?.data.system_name, "Payroll API");
    assert.deepEqual(created.body?.warnings, []);
    const systemId = Number(created.body?.data.id);

    const duplicate = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: {
        ...createPayload,
        status: "development"
      }
    });
    assert.equal(duplicate.status, 201);
    assert.equal(duplicate.body?.warnings[0].code, "duplicate_system_name");
    assert.deepEqual(duplicate.body?.warnings[0].matchingSystemIds, [systemId]);
    const duplicateId = Number(duplicate.body?.data.id);

    const retrieved = await requestJson(baseUrl, `/api/system-records/${systemId}`);
    assert.equal(retrieved.status, 200);
    assert.equal(retrieved.body?.data.id, systemId);

    const searched = await requestJson(
      baseUrl,
      "/api/system-records?search=payroll"
    );
    assert.equal(searched.status, 200);
    assert.ok((searched.body?.data as any[]).length >= 2);

    const filtered = await requestJson(
      baseUrl,
      "/api/system-records?categoryCode=software_application&status=active&businessDepartment=Finance"
    );
    assert.equal(filtered.status, 200);
    assert.ok(
      (filtered.body?.data as any[]).some((record) => record.id === systemId)
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
        businessDepartment: "Finance Operations"
      }
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body?.data.status, "maintenance_only");
    assert.equal(updated.body?.data.business_department, "Finance Operations");

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
      (incomplete.body?.data as any[]).some(
        (record) => record.system_name === "Incomplete Internal Tool"
      )
    );

    const dashboard = await requestJson(
      baseUrl,
      "/api/system-records/dashboard-totals"
    );
    assert.equal(dashboard.status, 200);
    assert.ok(dashboard.body?.data.total >= 3);
    assert.equal(dashboard.body?.data.byStatus.length, 5);
    assert.ok(dashboard.body?.data.incomplete >= 1);

    const archived = await requestJson(
      baseUrl,
      `/api/system-records/${duplicateId}/archive`,
      {
        method: "POST"
      }
    );
    assert.equal(archived.status, 200);
    assert.ok(archived.body?.data.archived_at);

    const archivedOnly = await requestJson(
      baseUrl,
      "/api/system-records?archivedOnly=true"
    );
    assert.equal(archivedOnly.status, 200);
    assert.ok(
      (archivedOnly.body?.data as any[]).some(
        (record) => record.id === duplicateId
      )
    );

    const deleted = await requestJson(baseUrl, `/api/system-records/${duplicateId}`, {
      method: "DELETE"
    });
    assert.equal(deleted.status, 204);

    const deletedLookup = await requestJson(
      baseUrl,
      `/api/system-records/${duplicateId}`
    );
    assert.equal(deletedLookup.status, 404);
  } finally {
    await closeServer(server);
    closeDatabase();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

function createTestDatabase(databasePath: string) {
  const database = new DatabaseSync(databasePath);
  const schemaSql = readFileSync(
    path.join(projectRoot, "database", "schema.sql"),
    "utf8"
  );
  const seedSql = readFileSync(
    path.join(projectRoot, "database", "seed.sql"),
    "utf8"
  );

  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(schemaSql);
  database.exec(seedSql);
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
