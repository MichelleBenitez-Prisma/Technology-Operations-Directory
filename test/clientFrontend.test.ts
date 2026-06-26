// <reference types="node" />
import assert from "node:assert/strict";
import {afterEach, test} from "node:test";

import {
    addSystemTag,
    archiveDirectoryRecord,
    archiveSystem,
    archiveVendor,
    createDirectoryRecord,
    createVendor,
    createSystem,
    deleteSystem,
    fetchDashboardTotals,
    fetchDirectoryRecords,
    fetchReport,
    fetchReportSummaries,
    fetchSystems,
    fetchSystemCategoryDetails,
    fetchSystemDependencies,
    fetchSystemTags,
    fetchVendors,
} from "../client/src/api.ts";

import {
    buildSystemsQuery,
    buildSystemsExportUrl,
    buildVendorsQuery,
    createEmptyForm,
    createEmptyVendorForm,
    mapApiIssues,
    mapRecordToForm,
    parseReportKey,
    mapVendorToForm,
    parseRouteFromHash,
} from "../client/src/DashboardApp.tsx";

import { 
  getRecordHref, 
  getStatusCount
} from "../client/src/dashboardData.ts";

import type { DashboardTotals,
   SystemRecord,
   Vendor
} from '../client/src/types.ts';
import { create } from "node:domain";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test("dashboard helpers calculate counts and link to details pages", () => {
    const totals = {
        byStatus: [
            {status: "active", label: "Active", count: 3},
            {status: "retired", label: "retired", count: 1}
        ]
    } as DashboardTotals;

    assert.equal(getStatusCount(totals, "active"), 3);
    assert.equal(getStatusCount(totals, "being_replaced"), 0);
    assert.equal(getRecordHref({id: 42} as SystemRecord), "#/systems/42");
});

test("system list route and query and helpers preserve filters and sorting", () => {
    const route = parseRouteFromHash(
        "#/systems?search=payroll&status=active&technicalOwner=App&includeArchived=true"
    );
    const route = parseRouteFromHash("#/directory/integrations?search=api")
    const reportRoute = parseRouteFromHash("#/reports?report=missing-documentation"); 
    
    assert.equal(route.name, "systems");
    assert.equal(directoryRoute.name, "directoryList");

    if (route.name === "systems") {
        assert.equal(route.query.get("search"), "payroll");
        assert.equal(route.query.get("includeArchived"), "true");
    }

    const query = buildSystemsQuery({
        search: "payroll",
        categoryCode: "software_application",
        status: "active",
        technicalOwner: "Apps",
        vendor: "Internal",
        incompleteOnly: true,
        includeArchived: true,
        sortBy: "systemName",
        sortDirection: "asc"
    });     

    assert.equal(query.get("limit"), "100");
    assert.equal(query.get("search"), "payroll");
    assert.equal(query.get("categoryCode"), "software_application");
    assert.equal(query.get("status"), "active");
    assert.equal(query.get("technicalOwner"), "Apps");
    assert.equal(query.get("vendor"), "Internal");
    assert.equal(query.get("incompleteOnly"), "true");
    assert.equal(query.get("includeArchived"), "true");
    assert.equal(
      buildSystemRecordsExportUrl(query),
      "/api/system-records/export.csv?limit=100&sortBy=systemName&sortDirection=asc&search=payroll&categoryCode=software_application&status=active&technicalOwner=Apps&vender=Internal&incompleteOnly=true&includeArchived=true"
    );
});

test("detail and form helpers map records and validation issues", async () => {
    const record = createSystemRecord();
    const form = mapRecordToForm(record);

  assert.equal(form.systemName, "Payroll API");
  assert.equal(form.categoryCode, "software_application");
  assert.equal(form.replacementSystem, "Enterprise Payroll");
  assert.equal(form.retirementNotes, "Retain until replacement is complete.");

  const emptyForm = createEmptyForm();
  assert.equal(emptyForm.status, "active");
  assert.equal(emptyForm.systemName, "");

  const errorResponse = new Response(
    JSON.stringify({
      error: "Validation Error",
      issues: [{ path: ["systemName"], message: "This field is required." }]
    }),
    { status: 400 }
  );
  const { ApiError } = await import("../client/src/api.ts");
  const apiError = await ApiError.fromResponse(errorResponse);
  assert.deepEqual(mapApiIssues(apiError), {
    systemName: "This field is required."
  });
});

test("vendor route, query, and form helpers preserve phase four fields", () => {
  const route = parseRouteFromHash("#/vendors?search=print&includeArchived=true");

  assert.equal(route.name, "vendors");

  if (route.name === "vendors") {
    assert.equal(route.query.get("search"), "print");
  }

  const query = buildVendorsQuery({ search: "print", includeArchived: true });
  assert.equal(query.get("limit"), "100");
  assert.equal(query.get("search"), "print");
  assert.equal(query.get("includeArchived"), "true");

  const form = mapVendorToForm(createVendorRecord());
  assert.equal(form.name, "Print Vendor");
  assert.equal(form.support_email, "support@vendor.example.com");
  assert.equal(form.account_representative, "Vendor Account Team");
  assert.equal(form.contract_notes, "Contract notes.");
  assert.equal(form.renewal_notes, "Renewal notes.");

  assert.equal(createEmptyVendorForm().name, "");
});

test("client API calls dashboard, list, create, archive, and delete endpoints", async () => {
  const calls: Array<{ method: string; url: string; body?: string }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({
      method: init?.method ?? "GET",
      url: String(input),
      body: typeof init?.body === "string" ? init.body : undefined
    });

    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    const url = String(input)
    const data =
      url.includes("/tags") && init?.method === "POST"
        ? [{id: 1, name: "legacy"}]
        : url.includes("/api/vendors") && init?.method === "POST"
        ?createVendorRecord()
        :url.includes("/api/system-dependencies") && init?.method === "POST"
          ? createDirectoryRecordFixture()
        : init?.method === "POST"
          ? createSystemRecord()
          : [];

    return new Response(JSON.stringify({ data: init?.method === "POST" ? createSystemRecord() : [] }), {
      headers: { "Content-Type": "application/json" },
      status: init?.method === "POST" ? 201 : 200
    });
  };

  await fetchDashboardTotals();
  await fetchSystems("search=payroll");
  await fetchReportSummaries();
  await fetchReport("data-quality");
  await fetchSystemDependencies(42);
  await fetchSystemCategoryDetails(42);
  await fetchSystemTags(42);
  await createSystem(createEmptyForm());
  await archiveSystem(7);
  await deleteSystem(7);
  await fetchVendors("search=print&includeArchived=true");
  await createVendor(createEmptyVendorForm());
  await archiveVendor(9);
  await fetchDirectoryRecords("integrations", "search=api");
  await createDirectoryRecord("system-dependencies", createDirectoryRecordFixture());
  await archiveDirectoryRecords("system-dependencies", 11);
  await addSystemTag(42, 1);
  

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url}`),
    [
      "GET /api/system-records/dashboard-totals",
      "GET /api/system-records?search=payroll",
      "GET /api/reports",
      "GET /api/reports/data-quality",
      "GET /api/system-records/42/dependencies",
      "GET /api/system-records/42/category-details",
      "GET /api/system-records/42/tags",
      "POST /api/system-records",
      "POST /api/system-records/7/archive",
      "DELETE /api/system-records/7",
      "GET /api/vendors?search=print&includeArchived=true",
      "POST /api/vendors",
      "POST /api/vendors/9/archive",
      "POST /api/vendors/9/archive",
      "GET /api/integrations?search=api",
      "POST /api/system-dependencies",
      "POST /api/system-dependencies/11/archive",
      "POST /api/system-records/42/tags"
    ]
  );
});

function createSystemRecord(): SystemRecord {
  return {
    id: 42,
    asset_key: "PAYROLL-API",
    system_name: "Payroll API",
    description: "Provides payroll data.",
    category_code: "software_application",
    category_name: "Software Application",
    status: "active",
    business_department: "Finance",
    department_owner: "Finance Ops",
    technical_owner: "Apps",
    vendor: "Internal",
    support_contact: "Technology Support",
    hosting_location: "Azure",
    server_name: "PAYROLL-APP-01",
    database_name: "PayrollDb",
    production_url: "https://payroll.example.com",
    test_url: "https://test-payroll.example.com",
    documentation_url: "https://docs.example.com/payroll",
    password_vault_reference: "Vault/Payroll",
    renewal_date: "2026-12-31",
    last_review_date: "2026-06-18",
    replacement_system: "Enterprise Payroll",
    retirement_notes: "Retain until replacement is complete.",
    notes: "Troubleshooting notes.",
    archived_at: null,
    is_incomplete: 0,
    missing_fields: "",
    quality_warning: [],
    quality_warning_count: 0,
    created_at: "2026-06-18T00:00:00.000Z",
    updated_at: "2026-06-18T00:00:00.000Z"
  };
}

function createVendorRecord(): Vendor {
  return {
    id: 9,
    name: "Print Vendor",
    description: "Vendor description.",
    website_url: "https://vendor.example.com",
    support_url: null,
    support_email: "support@vendor.example.com",
    support_phone: "555-0100",
    support_portal_url: "https://vendor.example.com/support",
    account_manager_name: null,
    account_manager_email: null,
    account_representative: "Vendor Account Team",
    contract_start_date: null,
    contract_end_date: null,
    renewal_notice_days: null,
    contract_notes: "Contract notes.",
    renewal_notes: "Renewal notes.",
    notes: "General notes.",
    archived_at: null,
    created_at: "2026-06-18T00:00:00.000Z",
    updated_at: "2026-06-18T00:00:00.000Z"
  };
}

function createDirectoryRecordFixture() {
  return {
    id: 11,
    source_asset_id: 42,
    destination_asset_id: 43,
    relationship_description: "Website depends on API.",
    data_or_service_exchanged: "API responses",
    importance_level: "critical",
    notes: "Impact test.",
    archived_at: null
  };
}