import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
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
  headers: Headers;
};

type TestSystemRecord = {
  id: number;
  system_name: string;
  status: string;
  business_department: string | null;
  replacement_system?: string | null;
  retirement_notes?: string | null;
  archived_at?: string | null;
  quality_warnings: Array<{ code: string; message: string }>;
  quality_warning_count: number;
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

type TestReport = {
  key: string;
  count: number;
  rows: Array<Record<string, unknown>>;
};

type TestVendor = {
  id: number;
  name: string;
  description: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_portal_url: string | null;
  account_representative: string | null;
  contract_notes: string | null;
  renewal_notes: string | null;
  notes: string | null;
  archived_at: string | null;
};

type TestDependency = {
  id: number;
  source_asset_id: number;
  destination_asset_id: number;
  relationship_description: string;
  data_or_service_exchanged: string | null;
  importance_level: string;
  archived_at: string | null;
  related_system_name?: string;
};

test("system records API supports main phase two flows", async () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "tod-api-"));
  const databasePath = path.join(tempDirectory, "test.sqlite");

  process.env.NODE_ENV = "test";
  process.env.DATABASE_PATH = databasePath;
  process.env.PORT = "3001";

  createTestDatabase(databasePath);
  createTestUser(databasePath, "viewer@poweredbyprisma.com", "viewer-password", "viewer");
  createTestUser(databasePath, "admin@poweredbyprisma.com", "correct-password", "admin");

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
        display_name: "Sample Person",
        email: "sample.person@example.com",
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
        description: "Vendor used for print production support.",
        website_url: "https://vendor.example.com",
        support_email: "support@vendor.example.com",
        support_phone: "555-0100",
        support_portal_url: "https://vendor.example.com/support",
        account_representative: "Vendor Account Team",
        contract_notes: "Master agreement is tracked by Technology Operations.",
        renewal_notes: "Review renewal 90 days before contract end.",
        notes: "General vendor notes."
      }
    });
    assert.equal(createdVendor.status, 201);
    const vendorData = getResponseData<TestVendor>(createdVendor);
    assert.equal(vendorData.description, "Vendor used for print production support.");
    assert.equal(vendorData.support_email, "support@vendor.example.com");
    assert.equal(vendorData.support_phone, "555-0100");
    assert.equal(vendorData.support_portal_url, "https://vendor.example.com/support");
    assert.equal(vendorData.account_representative, "Vendor Account Team");
    assert.equal(
      vendorData.contract_notes,
      "Master agreement is tracked by Technology Operations."
    );
    assert.equal(vendorData.renewal_notes, "Review renewal 90 days before contract end.");
    const vendorId = Number(vendorData.id);

    const updatedVendor = await requestJson(baseUrl, `/api/vendors/${vendorId}`, {
      method: "PATCH",
      body: {
        renewal_notes: "Updated renewal notes."
      }
    });
    assert.equal(updatedVendor.status, 200);
    assert.equal(
      getResponseData<TestVendor>(updatedVendor).renewal_notes,
      "Updated renewal notes."
    );

    const archivedVendor = await requestJson(baseUrl, `/api/vendors/${vendorId}/archive`, {
      method: "POST"
    });
    assert.equal(archivedVendor.status, 200);
    assert.ok(getResponseData<TestVendor>(archivedVendor).archived_at);

    const visibleVendors = await requestJson(baseUrl, "/api/vendors");
    assert.equal(visibleVendors.status, 200);
    assert.ok(
      !getResponseData<TestVendor[]>(visibleVendors).some((vendor) => vendor.id === vendorId)
    );

    const allVendors = await requestJson(baseUrl, "/api/vendors?includeArchived=true");
    assert.equal(allVendors.status, 200);
    assert.ok(getResponseData<TestVendor[]>(allVendors).some((vendor) => vendor.id === vendorId));

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
    const integrationId = Number(getResponseData<{ id: number }>(createdIntegration).id);

    const updatedIntegration = await requestJson(baseUrl, `/api/integrations/${integrationId}`, {
      method: "PATCH",
      body: {
        protocol: "HTTPS",
        criticality: "critical"
      }
    });
    assert.equal(updatedIntegration.status, 200);

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
    const scheduledProcessId = Number(getResponseData<{ id: number }>(createdScheduledProcess).id);

    const archivedScheduledProcess = await requestJson(
      baseUrl,
      `/api/scheduled-processes/${scheduledProcessId}/archive`,
      { method: "POST" }
    );
    assert.equal(archivedScheduledProcess.status, 200);

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
    const reviewId = Number(getResponseData<{ id: number }>(createdReview).id);

    const updatedReview = await requestJson(baseUrl, `/api/reviews/${reviewId}`, {
      method: "PATCH",
      body: {
        review_status: "needs_updates",
        notes: "Needs dependency validation."
      }
    });
    assert.equal(updatedReview.status, 200);

    const createdTag = await requestJson(baseUrl, "/api/tags", {
      method: "POST",
      body: {
        name: "legacy-replacement",
        description: "System is part of replacement tracking."
      }
    });
    assert.equal(createdTag.status, 201);
    const tagId = Number(getResponseData<{ id: number }>(createdTag).id);

    const assignedTags = await requestJson(baseUrl, `/api/system-records/${systemId}/tags`, {
      method: "POST",
      body: {
        tagId
      }
    });
    assert.equal(assignedTags.status, 201);
    assert.ok(getResponseData<Array<{ id: number }>>(assignedTags).some((tag) => tag.id === tagId));

    const dependency = await requestJson(baseUrl, "/api/system-dependencies", {
      method: "POST",
      body: {
        source_asset_id: systemId,
        destination_asset_id: duplicateId,
        relationship_description: "Payroll sends order-impact data to the downstream system.",
        data_or_service_exchanged: "Payroll calculation status",
        importance_level: "critical",
        notes: "Used to verify Phase 5 impact view."
      }
    });
    assert.equal(dependency.status, 201);
    const dependencyData = getResponseData<TestDependency>(dependency);
    assert.equal(dependencyData.importance_level, "critical");
    const dependencyId = Number(dependencyData.id);

    const invalidDependency = await requestJson(baseUrl, "/api/system-dependencies", {
      method: "POST",
      body: {
        source_asset_id: systemId,
        destination_asset_id: systemId,
        relationship_description: "Invalid self dependency.",
        importance_level: "critical"
      }
    });
    assert.equal(invalidDependency.status, 400);

    const dependencySummary = await requestJson(
      baseUrl,
      `/api/system-records/${systemId}/dependencies`
    );
    assert.equal(dependencySummary.status, 200);
    const dependencySummaryData = getResponseData<{
      dependsOn: TestDependency[];
      dependedOnBy: TestDependency[];
    }>(dependencySummary);
    assert.ok(dependencySummaryData.dependsOn.some((record) => record.id === dependencyId));

    const updatedDependency = await requestJson(
      baseUrl,
      `/api/system-dependencies/${dependencyId}`,
      {
        method: "PATCH",
        body: {
          importance_level: "important",
          notes: "Updated dependency notes."
        }
      }
    );
    assert.equal(updatedDependency.status, 200);
    assert.equal(getResponseData<TestDependency>(updatedDependency).importance_level, "important");

    const archivedDependency = await requestJson(
      baseUrl,
      `/api/system-dependencies/${dependencyId}/archive`,
      { method: "POST" }
    );
    assert.equal(archivedDependency.status, 200);
    assert.ok(getResponseData<TestDependency>(archivedDependency).archived_at);

    const removedTags = await requestJson(
      baseUrl,
      `/api/system-records/${systemId}/tags/${tagId}`,
      {
        method: "DELETE"
      }
    );
    assert.equal(removedTags.status, 200);

    const teamList = await requestJson(baseUrl, "/api/teams?search=print");
    assert.equal(teamList.status, 200);
    assert.ok(getResponseData<Record<string, unknown>[]>(teamList).length >= 1);

    const invalidVendor = await requestJson(baseUrl, "/api/vendors", {
      method: "POST",
      body: {
        name: "Invalid Vendor",
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
    const incompleteCreatedData = getResponseData<TestSystemRecord>(incompleteCreated);
    assert.ok(incompleteCreatedData.quality_warning_count >= 1);
    assert.ok(
      incompleteCreatedData.quality_warnings.some(
        (warning) => warning.code === "missing_technical_owner"
      )
    );
    assert.ok(
      incompleteCreatedData.quality_warnings.some(
        (warning) => warning.code === "missing_last_review_date"
      )
    );

    const outdatedCreated = await requestJson(baseUrl, "/api/system-records", {
      method: "POST",
      body: {
        systemName: "Quality Warning System",
        description: "Used to verify Phase 6 warning checks.",
        categoryCode: "internal_tool",
        status: "active",
        businessDepartment: "Technology",
        departmentOwner: "Technology Operations",
        technicalOwner: "Application Development",
        renewalDate: dateOffset(30),
        lastReviewDate: dateOffset(-370)
      }
    });
    assert.equal(outdatedCreated.status, 201);
    const qualityWarningCodes = getResponseData<TestSystemRecord>(
      outdatedCreated
    ).quality_warnings.map((warning) => warning.code);
    assert.ok(qualityWarningCodes.includes("missing_vendor"));
    assert.ok(qualityWarningCodes.includes("missing_support_contact"));
    assert.ok(qualityWarningCodes.includes("missing_documentation_link"));
    assert.ok(qualityWarningCodes.includes("missing_hosting_information"));
    assert.ok(qualityWarningCodes.includes("renewal_date_approaching"));
    assert.ok(qualityWarningCodes.includes("last_review_overdue"));

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

    const reportSummaries = await requestJson(baseUrl, "/api/reports");
    assert.equal(reportSummaries.status, 200);
    assert.ok(
      getResponseData<Array<{ key: string }>>(reportSummaries).some(
        (report) => report.key === "data-quality"
      )
    );
    for (const key of ["by-owner", "by-criticality", "by-lifecycle", "review-due"]) {
      assert.ok(
        getResponseData<Array<{ key: string }>>(reportSummaries).some((report) => report.key === key)
      );
    }

    const dataQualityReport = await requestJson(baseUrl, "/api/reports/data-quality");
    assert.equal(dataQualityReport.status, 200);
    assert.ok(
      getResponseData<TestReport>(dataQualityReport).rows.some(
        (row) => row.system_name === "Incomplete Internal Tool"
      )
    );

    const missingDocumentationReport = await requestJson(
      baseUrl,
      "/api/reports/missing-documentation"
    );
    assert.equal(missingDocumentationReport.status, 200);
    assert.ok(getResponseData<TestReport>(missingDocumentationReport).count >= 1);

    const ownerReport = await requestJson(baseUrl, "/api/reports/by-owner");
    assert.equal(ownerReport.status, 200);
    assert.ok(getResponseData<TestReport>(ownerReport).rows.length >= 1);

    const csvExport = await requestText(
      baseUrl,
      "/api/system-records/export.csv?search=Payroll&sortBy=systemName&sortDirection=asc"
    );
    assert.equal(csvExport.status, 200);
    assert.match(csvExport.body, /System,Description,Category/);
    assert.match(csvExport.body, /Payroll API/);

    const csvImport = await requestCsv(
      baseUrl,
      "/api/system-records/import.csv",
      [
        "systemName,description,categoryCode,status,technicalOwner",
        "Imported CSV System,Imported from CSV,software_application,active,Data Services"
      ].join("\n")
    );
    assert.equal(csvImport.status, 201);
    assert.equal((getResponseData<{ created: unknown[]; errors: unknown[] }>(csvImport).created).length, 1);

    const documentReference = await requestJson(baseUrl, "/api/document-references", {
      method: "POST",
      body: {
        asset_id: systemId,
        title: "Support Runbook",
        url: "https://docs.example.com/support-runbook",
        document_type: "runbook"
      }
    });
    assert.equal(documentReference.status, 201);

    const customField = await requestJson(baseUrl, "/api/custom-fields", {
      method: "POST",
      body: {
        field_key: "print_site_code",
        label: "Print site code",
        field_type: "text",
        required: 0
      }
    });
    assert.equal(customField.status, 201);

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

    process.env.AUTH_REQUIRED = "true";
    process.env.NODE_ENV = "development";

    const blocked = await requestJson(baseUrl, "/api/system-records");
    assert.equal(blocked.status, 401);
    assert.match(String(blocked.body?.message), /sign in/i);

    const viewerLogin = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "viewer@poweredbyprisma.com", password: "viewer-password" }
    });
    assert.equal(viewerLogin.status, 200);
    const viewerCookie = viewerLogin.headers.get("set-cookie")?.split(";")[0];
    assert.ok(viewerCookie);

    const viewerArchive = await requestJson(baseUrl, `/api/system-records/${systemId}/archive`, {
      method: "POST",
      headers: { cookie: viewerCookie }
    });
    assert.equal(viewerArchive.status, 403);

    const badLogin = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin@poweredbyprisma.com", password: "wrong-password" }
    });
    assert.equal(badLogin.status, 401);

    const signup = await requestJson(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: {
        displayName: "New Prisma User",
        email: "new.user@poweredbyprisma.com",
        password: "new-password",
        phone: "555-0123",
        jobTitle: "Support"
      }
    });
    assert.equal(signup.status, 201);

    const resetPassword = await requestJson(baseUrl, "/api/auth/forgot-password", {
      method: "POST",
      body: { email: "new.user@poweredbyprisma.com" }
    });
    assert.equal(resetPassword.status, 200);
    assert.equal(
      (getResponseData<Record<string, unknown>>(resetPassword)).temporaryPassword,
      undefined
    );

    const loginResponse = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin@poweredbyprisma.com", password: "correct-password", remember: true }
    });
    assert.equal(loginResponse.status, 200);

    const adminCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
    assert.ok(adminCookie);

    const systemsWithAuth = await requestJson(baseUrl, "/api/system-records", {
      headers: { cookie: adminCookie }
    });
    assert.equal(systemsWithAuth.status, 200);

    const updatedProfile = await requestJson(baseUrl, "/api/auth/me/profile", {
      method: "PUT",
      headers: { cookie: adminCookie },
      body: {
        displayName: "Sample Admin",
        email: "sample.admin@poweredbyprisma.com",
        phone: "555-0199",
        jobTitle: "Technology Operations",
        profileImageData: "data:image/png;base64,AA=="
      }
    });
    assert.equal(updatedProfile.status, 200);
    assert.equal((getResponseData<Record<string, unknown>>(updatedProfile)).job_title, "Technology Operations");

    const invalidProfileEmail = await requestJson(baseUrl, "/api/auth/me/profile", {
      method: "PUT",
      headers: { cookie: adminCookie },
      body: {
        displayName: "Sample Admin",
        email: "sample.admin@example.com",
        profileImageData: ""
      }
    });
    assert.equal(invalidProfileEmail.status, 400);

    const invalidProfileImage = await requestJson(baseUrl, "/api/auth/me/profile", {
      method: "PUT",
      headers: { cookie: adminCookie },
      body: {
        displayName: "Sample Admin",
        email: "sample.admin@poweredbyprisma.com",
        profileImageData: "not-an-image"
      }
    });
    assert.equal(invalidProfileImage.status, 400);

    const archivedWithAuth = await requestJson(baseUrl, `/api/system-records/${systemId}/archive`, {
      method: "POST",
      headers: { cookie: adminCookie }
    });
    assert.equal(archivedWithAuth.status, 200);

    const database = new DatabaseSync(databasePath);
    const auditCount = database
      .prepare(
        "SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'login_success' OR change_summary IS NOT NULL"
      )
      .get() as { count: number };
    database.close();
    assert.ok(auditCount.count >= 2);
  } finally {
    await closeServer(server);
    closeDatabase();
    delete process.env.AUTH_REQUIRED;
    process.env.NODE_ENV = "test";
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test("phase seven sample records are present and avoid protected secret values", () => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "tod-seed-"));
  const databasePath = path.join(tempDirectory, "test.sqlite");

  try {
    createTestDatabase(databasePath);

    const database = new DatabaseSync(databasePath);
    const rows = database
      .prepare(
        `
        SELECT name
        FROM technology_assets
        WHERE asset_key IN (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .all(
        "DOKSHOP",
        "PACE",
        "CONTROL",
        "PAYMENT-GATEWAY",
        "STOREFRONT-IMPORTER",
        "INTERNAL-REPORTING-DB",
        "TECH-DEPT-WEBSITE"
      ) as Array<{ name: string }>;
    database.close();

    assert.deepEqual(
      rows.map((row) => row.name).sort(),
      [
        "Control",
        "DokShop",
        "Internal Reporting Database",
        "Pace",
        "Payment Gateway",
        "Storefront Importer",
        "Technology Department Website"
      ].sort()
    );

    const seedText = readFileSync(
      path.join(projectRoot, "database", "migrations", "002_seed_phase_3_demo_records.sql"),
      "utf8"
    );
    assert.doesNotMatch(seedText, /api\s*key|card\s*number|4111|sk_[a-z0-9]/i);
  } finally {
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

function createTestUser(
  databasePath: string,
  email: string,
  password: string,
  role: "viewer" | "editor" | "admin"
) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  const database = new DatabaseSync(databasePath);

  database
    .prepare(
      `
      INSERT INTO users (email, display_name, password_hash, password_salt, role)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(email, email, passwordHash, salt, role);
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
  options: { method?: string; body?: Record<string, unknown>; headers?: Record<string, string> } = {}
): Promise<JsonResponse> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
    headers: response.headers
  };
}

async function requestText(baseUrl: string, pathname: string) {
  const response = await fetch(`${baseUrl}${pathname}`);

  return {
    status: response.status,
    body: await response.text()
  };
}

async function requestCsv(baseUrl: string, pathname: string, body: string): Promise<JsonResponse> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
    headers: response.headers
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

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
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
