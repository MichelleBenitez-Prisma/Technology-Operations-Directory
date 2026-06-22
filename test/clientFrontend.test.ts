// <reference types="node" />
import assert from "node:assert/strict";
import {afterEach, test} from "node:test";

import {
    archiveSystem,
    createSystem,
    deleteSystem,
    fetchDashboardTotals,
    fetchSystems,
} from "../client/src/api.ts";
import {
    buildSystemsQuery,
    createEmptyForm,
    mapApiIssues,
    mapRecordToForm,
    parseRouteFromHash,
} from "../client/src/DashboardApp.tsx";
import { getRecordHref, getStatusCount } from "../client/src/dashboardData.ts";
import type { DashboardTotals, SystemRecord } from '../client/src/types.ts';

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

    assert.equal(route.name, "systems");

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

    return new Response(JSON.stringify({ data: init?.method === "POST" ? createSystemRecord() : [] }), {
      headers: { "Content-Type": "application/json" },
      status: init?.method === "POST" ? 201 : 200
    });
  };

  await fetchDashboardTotals();
  await fetchSystems("search=payroll");
  await createSystem(createEmptyForm());
  await archiveSystem(7);
  await deleteSystem(7);

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url}`),
    [
      "GET /api/system-records/dashboard-totals",
      "GET /api/system-records?search=payroll",
      "POST /api/system-records",
      "POST /api/system-records/7/archive",
      "DELETE /api/system-records/7"
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
    created_at: "2026-06-18T00:00:00.000Z",
    updated_at: "2026-06-18T00:00:00.000Z"
  };
}
