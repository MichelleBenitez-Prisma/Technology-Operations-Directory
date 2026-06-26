import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Download,
  Edit3,
  FileQuestion,
  ListFilter,
  Plus,
  BarChart3,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundX,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  ApiError,
  addSystemTag,
  archiveDirectoryRecord,
  archiveSystem,
  archiveVendor,
  createDirectoryRecord,
  createSystem,
  createVendor,
  deleteSystem,
  fetchAssetTypes,
  fetchDashboardTotals,
  fetchDirectoryRecord,
  fetchDirectoryRecords,
  fetchReport,
  fetchReportSummaries,
  fetchSystem,
  fetchSystemCategoryDetails,
  fetchSystemDependencies,
  fetchSystemTags,
  fetchSystems,
  fetchVendor,
  fetchVendors,
  updateDirectoryRecord,
  updateSystem,
  updateSystemCategoryDetails,
  updateVendor,
  removeSystemTag
} from "./api";
import { getRecordHref, getStatusCount, statusLabels } from "./dashboardData";
import {
  AssetType,
  CategoryDetails,
  DashboardTotals,
  DirectoryRecord,
  DirectoryResource,
  SystemRecord,
  SystemDependency,
  SystemDependencySummary,
  SystemRecordFormInput,
  SystemRecordWarning,
  SystemReport,
  SystemReportKey,
  SystemReportSummary,
  SystemStatus,
  Vendor,
  VendorFormInput
} from "./types";
import { URLSearchParams } from "url";

type LoadState = "loading" | "ready" | "error";
export type Route =
  | { name: "dashboard" }
  | { name: "reports"; query: URLSearchParams}
  | { name: "systems"; query: URLSearchParams }
  | { name: "systemDetail"; id: number }
  | { name: "newSystem" }
  | { name: "editSystem"; id: number }
  | { name: "vendors"; query: URLSearchParams }
  | { name: "vendorDetail"; id: number }
  | { name: "newVendor" }
  | { name: "editVendor"; id: number }
  | { name: "directoryHome" }
  | { name: "directoryList"; resource: DirectoryResource; query: URLSearchParams }
  | { name: "directoryDetail"; resource: DirectoryResource; id: number }
  | { name: "directoryNew"; resource: DirectoryResource }
  | { name: "directoryEdit"; resource: DirectoryResource; id: number };
  
const systemStatuses = Object.keys(statusLabels) as SystemStatus[];
const sortOptions = [
  { value: "systemName", label: "System name" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "technicalOwner", label: "Technical owner" },
  { value: "vendor", label: "Vendor" },
  { value: "lastReviewDate", label: "Last review date" },
  { value: "updatedAt", label: "Recently updated" }
];
const reportKeys: SystemReportKey[] = [
  "data-quality",
  "missing-documentation",
  "upcoming-renewals",
  "active-systems",
  "being-replaced",
  "retired-systems",
  "by-vendor",
  "by-category",
  "recently-reviewed"
];
const reportOptions = reportKeys.map((key) => ({
  key,
  label: reportLabel(key)
}));

type DirectoryField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number" | "date" | "datetime-local";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  systemSelect?: boolean;
};

function parseRoute(): Route {
  return parseRouteFromHash(window.location.hash);
}

function humanizeField(value: string){
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function optionValues(values: string[]) {
  return values.map((value) => ({ value, label: humanizeField(value) }));
}

function dependencyFields(): DirectoryField[] {
  return [
    { name: "source_asset_id", label: "Source system", systemSelect: true, required: true },
    { name: "destination_asset_id", label: "Destination system", systemSelect: true, required: true },
    { name: "relationship_description", label: "Relationship description", required: true },
    { name: "data_or_service_exchanged", label: "Data or service exchanged", type: "textarea" },
    {
      name: "importance_level",
      label: "Importance level",
      type: "select",
      options: optionValues(["critical", "important", "standard"]),
      required: true
    },
    { name: "notes", label: "Notes", type: "textarea" }
  ];
}

const directoryConfigs: Record<
  DirectoryResource,
  { title: string; singular: string; fields: DirectoryField[]; summaryFields: string[] }
> = {
  integrations: {
    title: "Integrations",
    singular: "Integration",
    summaryFields: ["name", "source_asset_id", "target_asset_id", "criticality"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "source_asset_id", label: "Source system", systemSelect: true },
      { name: "target_asset_id", label: "Target system", systemSelect: true },
      { name: "source_external_name", label: "Source external name" },
      { name: "target_external_name", label: "Target external name" },
      { name: "integration_type", label: "Integration type" },
      { name: "direction", label: "Direction", type: "select", options: optionValues(["inbound", "outbound", "bidirectional"]) },
      { name: "protocol", label: "Protocol" },
      { name: "data_description", label: "Data description", type: "textarea" },
      { name: "schedule_description", label: "Schedule description", type: "textarea" },
      { name: "criticality", label: "Criticality", type: "select", options: optionValues(["low", "medium", "high", "critical"]) },
      { name: "documentation_url", label: "Documentation URL" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "scheduled-processes": {
    title: "Scheduled Processes",
    singular: "Scheduled Process",
    summaryFields: ["name", "asset_id", "schedule_kind", "lifecycle_status"],
    fields: [
      { name: "asset_id", label: "Related system", systemSelect: true },
      { name: "name", label: "Name", required: true },
      { name: "schedule_kind", label: "Schedule kind", type: "select", options: optionValues(["cron", "fixed_interval", "manual", "event_driven", "other"]) },
      { name: "schedule_expression", label: "Schedule expression" },
      { name: "schedule_timezone", label: "Schedule timezone" },
      { name: "command_or_job_name", label: "Command or job name" },
      { name: "run_location_asset_id", label: "Run location system", systemSelect: true },
      { name: "failure_notification_channel", label: "Failure notification channel" },
      { name: "runbook_url", label: "Runbook URL" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  reviews: {
    title: "Reviews",
    singular: "Review",
    summaryFields: ["asset_id", "reviewed_at", "review_status", "next_review_due_at"],
    fields: [
      { name: "asset_id", label: "Related system", systemSelect: true, required: true },
      { name: "reviewed_at", label: "Reviewed at", type: "datetime-local" },
      { name: "review_status", label: "Review status", type: "select", options: optionValues(["approved", "needs_updates", "retirement_candidate"]) },
      { name: "next_review_due_at", label: "Next review due", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  tags: {
    title: "Tags",
    singular: "Tag",
    summaryFields: ["name", "description"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "description", label: "Description", type: "textarea" }
    ]
  },
  "system-dependencies": {
    title: "System Dependencies",
    singular: "System Dependency",
    summaryFields: ["source_asset_id", "destination_asset_id", "importance_level"],
    fields: dependencyFields()
  }
};

export function DashboardApp() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  useEffect(() => {
    const updateRoute = () => setRoute(parseRoute());
    window.addEventListener("hashchange", updateRoute);

    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    void fetchAssetTypes()
      .then(setAssetTypes)
      .catch((error) => console.error(error));
  }, []);

  function navigate(hash: string) {
    window.location.hash = hash;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Technology Department</p>
          <h1>Technology Operations Directory</h1>
        </div>
        <nav className="top-actions" aria-label="Primary">
          <a className="secondary-link" href="#">
            Dashboard
          </a>
          <a className="secondary-link" href="#/systems">
            <ListFilter size={16} aria-hidden="true" />
            Systems
          </a>
          <a className="secondary-link" href="#/vendors">
            <ListFilter size={16} aria-hidden="true" />
            Vendors
          </a>  
            <a className="secondary-link" href="#/directory">
            <ListFilter size={16} aria-hidden="true" />
            Directory
          </a>
          <a className= "secondary_link" href="#/report">
            <BarChart3 size={16} aria-hidden="true"/>
            Reports
          </a>
          <a className="primary-link" href="#/systems/new">
            <Plus size={16} aria-hidden="true" />
            Add System
          </a>
        </nav>
      </header>

      {route.name === "dashboard" ? <DashboardHome navigate={navigate} /> : null}
      {route.name === "reports" ? <ReportsPage initialQuery={route.query} /> : null}
      {route.name === "systems" ? (
        <SystemsList assetTypes={assetTypes} initialQuery={route.query} navigate={navigate} />
      ) : null}
      {route.name === "systemDetail" ? (
        <SystemDetail id={route.id} assetTypes={assetTypes} navigate={navigate} />
      ) : null}
      {route.name === "newSystem" ? (
        <SystemForm assetTypes={assetTypes} mode="create" navigate={navigate} />
      ) : null}
      {route.name === "editSystem" ? (
        <SystemForm assetTypes={assetTypes} mode="edit" systemId={route.id} navigate={navigate} />
      ) : null}
      {route.name === "vendors" ? <VendorsList initialQuery={route.query} /> : null}
      {route.name === "vendorDetail" ? <VendorDetail id={route.id} navigate={navigate} /> : null}
      {route.name === "newVendor" ? <VendorForm mode="create" navigate={navigate} /> : null}
      {route.name === "editVendor" ? (
       <VendorForm mode="edit" vendorId={route.id} navigate={navigate} /> 
      ) : null}
      {route.name === "directoryHome" ? <DirectoryHome /> : null}
      {route.name === "directoryList" ? (
        <DirectoryList resource={route.resource} initialQuery={route.query} />
      ) : null}
      {route.name === "directoryDetail" ? (
        <DirectoryDetail resource={route.resource} id={route.id} navigate={navigate} />
      ) : null}
      {route.name === "directoryNew" ? (
        <DirectoryForm resource={route.resource} mode="create" navigate={navigate} />
      ) : null}
      {route.name === "directoryEdit" ? (
        <DirectoryForm resource={route.resource} mode="edit" id={route.id} navigate={navigate} />
      ) : null} 
    </main>
  );
}

function DashboardHome({ navigate }: { navigate: (hash: string) => void }) {
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoadState("loading");

    try {
      const [nextTotals, nextSystems] = await Promise.all([
        fetchDashboardTotals(),
        fetchSystems()
      ]);

      setTotals(nextTotals);
      setSystems(nextSystems);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }

  function openSearchResults() {
    const query = new URLSearchParams();

    if (searchTerm.trim()) {
      query.set("search", searchTerm.trim());
    }

    navigate(`/systems${query.toString() ? `?${query.toString()}` : ""}`);
  }

  const missingDocumentation = totals?.missingDocumentationRecords ?? [];
  const withoutTechnicalOwner = totals?.withoutTechnicalOwnerRecords ?? [];
  const upcomingRenewals = totals?.upcomingRenewals ?? [];
  const recentlyUpdated = totals?.recentlyUpdated ?? [];
  const filteredSystems = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return systems.slice(0, 8);
    }

    return systems
      .filter((system) => {
        return [
          system.system_name,
          system.description,
          system.category_name,
          system.business_department,
          system.technical_owner,
          system.vendor,
          system.hosting_location
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .slice(0, 8);
  }, [searchTerm, systems]);

  return (
    <>
      <section className="toolbar" aria-label="Directory search">
        <div className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search systems, owners, departments, vendors..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                openSearchResults();
              }
            }}
          />
        </div>
        <button className="icon-button" onClick={openSearchResults}>
          <Search size={16} aria-hidden="true" />
          Search
        </button>
        <button className="icon-button" onClick={() => void loadDashboard()} title="Refresh dashboard">
          <RefreshCcw size={18} aria-hidden="true" />
          Refresh
        </button>
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load dashboard data. Confirm the backend API is running on port 3001.</span>
        </section>
      ) : null}

      <section className="metric-grid" aria-label="Directory overview">
        <MetricCard
          label="Total Systems"
          value={totals?.total ?? 0}
          href="#/systems"
          icon={<CircleDot size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Active Systems"
          value={getStatusCount(totals, "active")}
          href="#/reports?report=active-systems"
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
          tone="good"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Being Replaced"
          value={getStatusCount(totals, "being_replaced")}
          href="#/reports?report=being_replaced"
          icon={<RefreshCcw size={22} aria-hidden="true" />}
          tone="watch"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Retired Systems"
          value={getStatusCount(totals, "retired")}
          href="#/reports?report=retired-systems"
          icon={<Archive size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Missing Documentation"
          value={totals?.missingDocumentation ?? 0}
          href="#/reports?report=missing-owners"
          icon={<FileQuestion size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Without Technical Owner"
          value={totals?.withoutTechnicalOwner ?? 0}
          href="#/reports?report=missing-owners"
          icon={<UserRoundX size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
      </section>

      <section className="content-grid">
        <Panel title="Upcoming Renewals" subtitle="Next 90 days" icon={<CalendarClock size={18} />}>
          <RecordList
            records={upcomingRenewals.slice(0, 6)}
            emptyText="No renewals are due in the next 90 days."
            detail={(record) => (
              <>
                <span>{record.vendor ?? "No vendor"}</span>
                <span>{formatDate(record.renewal_date)}</span>
              </>
            )}
          />
          <a className="inline-link" hrefLang="#/reports?report=upcoming-renwals">
            View renewal report
          </a>
        </Panel>

        <Panel title="Recently Updated" subtitle="Latest record changes" icon={<Clock3 size={18} />}>
          <RecordList
            records={recentlyUpdated}
            emptyText="No system records have been updated yet."
            detail={(record) => (
              <>
                <span>{statusLabels[record.status]}</span>
                <span>{formatDateTime(record.updated_at)}</span>
              </>
            )}
          />
        </Panel>

        <Panel
          title="Needs Attention"
          subtitle="Documentation and ownership gaps"
          icon={<AlertTriangle size={18} />}
          wide
        >
          <div className="attention-grid">
            <AttentionColumn
              title="Missing Documentation"
              records={missingDocumentation.slice(0, 5)}
              emptyText="Every visible system has documentation."
            />
            <AttentionColumn
              title="No Technical Owner"
              records={withoutTechnicalOwner.slice(0, 5)}
              emptyText="Every visible system has a technical owner."
            />
          </div>
        </Panel>

        <Panel title="Directory Search" subtitle="Quick scan" wide>
          <SystemTable records={filteredSystems} />
        </Panel>
      </section>
    </>
  );
}

function ReportsPage({ initialQuery }: { initialQuery: URLSearchParams }) {
  const initialReport = parseReportKey(initialQuery.get("report"));
  const [summaries, setSummaries] = useState<SystemReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<SystemReportKey>(initialReport);
  const [report, setReport] = useState<SystemReport | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    void fetchReportSummaries()
      .then(setSummaries)
      .catch((error) => console.error(error));
  }, []);

   useEffect(() => {
    window.history.replaceState(null, "", `#/reports?report=${selectedReport}`);
    setLoadState("loading");

    void fetchReport(selectedReport)
      .then((nextReport) => {
        setReport(nextReport);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [selectedReport]);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h2>Reports</h2>
        </div>
        <a className="secondary-link" href="#/systems">
          <ListFilter size={16} aria-hidden="true" />
          Systems
        </a>
      </section>

      <section className="filter-bar" aria-label="Report selector">
        <label className="field">
          <span>Report</span>
          <select
            value={selectedReport}
            onChange={(event) => setSelectedReport(parseReportKey(event.target.value))}
          >
            {reportOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="report-card-grid" aria-label="Available reports">
        {summaries.map((summary) => (
          <a
            className={`report-card ${summary.key === selectedReport ? "selected" : ""}`}
            href={`#/reports?report=${summary.key}`}
            key={summary.key}
            onClick={(event) => {
              event.preventDefault();
              setSelectedReport(summary.key);
            }}
          >
            <strong>{summary.count}</strong>
            <span>{summary.title}</span>
          </a>
        ))}
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load this report.</span>
        </section>
      ) : null}

      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${report?.count ?? 0} results`}</strong>
          <span>{report?.description ?? "Select a report to review matching records."}</span>
        </div>
        {report ? <ReportTable report={report} /> : null}
      </section>
    </>
  );
}

function ReportTable({ report }: { report: SystemReport }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {report.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, index) => (
            <tr key={`${row.id ?? "group"}-${index}`}>
              {report.columns.map((column) => (
                <td key={column.key}>{formatReportCell(column.key, row[column.key], row)}</td>
              ))}
            </tr>
          ))}
          {report.rows.length === 0 ? (
            <tr>
              <td colSpan={report.columns.length} className="empty-table">
                No matching report results.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SystemsList({
  assetTypes,
  initialQuery,
  navigate
}: {
  assetTypes: AssetType[];
  initialQuery: URLSearchParams;
  navigate: (hash: string) => void;
}) {
  const [records, setRecords] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [filters, setFilters] = useState(() => ({
    search: initialQuery.get("search") ?? "",
    categoryCode: initialQuery.get("categoryCode") ?? "",
    status: initialQuery.get("status") ?? "",
    technicalOwner: initialQuery.get("technicalOwner") ?? "",
    vendor: initialQuery.get("vendor") ?? "",
    incompleteOnly: initialQuery.get("incompleteOnly") === "true",
    includeArchived: initialQuery.get("includeArchived") === "true",
    sortBy: initialQuery.get("sortBy") ?? "systemName",
    sortDirection: initialQuery.get("sortDirection") ?? "asc"
  }));

  useEffect(() => {
    const query = buildSystemsQuery(filters);
    window.history.replaceState(null, "", `#/systems?${query.toString()}`);
    setLoadState("loading");

    void fetchSystems(query.toString())
      .then((nextRecords) => {
        setRecords(nextRecords);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [filters]);

  const ownerOptions = useMemo(() => uniqueNonEmpty(records.map((record) => record.technical_owner)), [records]);
  const vendorOptions = useMemo(() => uniqueNonEmpty(records.map((record) => record.vendor)), [records]);
  const exportUrl = buildSystemRecordsExportUrl(buildSystemsQuery(filters));

  function updateFilter(name: keyof typeof filters, value: string | boolean) {
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      categoryCode: "",
      status: "",
      technicalOwner: "",
      vendor: "",
      incompleteOnly: false,
      includeArchived: false,
      sortBy: "systemName",
      sortDirection: "asc"
    });
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h2>Systems List</h2>
        </div>
        <a className="primary-link" href="#/systems/new">
          <Plus size={16} aria-hidden="true" />
          Add System
        </a>
      </section>

      <section className="filter-bar" aria-label="System list filters">
        <label className="field search-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Name or description"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            value={filters.categoryCode}
            onChange={(event) => updateFilter("categoryCode", event.target.value)}
          >
            <option value="">All categories</option>
            {assetTypes.map((assetType) => (
              <option key={assetType.code} value={assetType.code}>
                {assetType.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            {systemStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Technical owner</span>
          <select
            value={filters.technicalOwner}
            onChange={(event) => updateFilter("technicalOwner", event.target.value)}
          >
            <option value="">All owners</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Vendor</span>
          <select value={filters.vendor} onChange={(event) => updateFilter("vendor", event.target.value)}>
            <option value="">All vendors</option>
            {vendorOptions.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={filters.sortBy} onChange={(event) => updateFilter("sortBy", event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact-field">
          <span>Direction</span>
          <select
            value={filters.sortDirection}
            onChange={(event) => updateFilter("sortDirection", event.target.value)}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.incompleteOnly}
            onChange={(event) => updateFilter("incompleteOnly", event.target.checked)}
          />
          Incomplete only
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(event) => updateFilter("includeArchived", event.target.checked)}
          />
          Include archived
        </label>
        <button className="icon-button" onClick={clearFilters}>
          <X size={16} aria-hidden="true" />
          Reset
        </button>
        <a className="icon_button" href={exportUrl}>
          <Download size={16} aria-hidden="true" />
          export CSV
        </a>
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load system records.</span>
        </section>
      ) : null}

      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${records.length} systems`}</strong>
          <span>Open a row to review details or make changes.</span>
        </div>
        <SystemTable records={records} showVendor showLastReview showArchived />
      </section>
    </>
  );
}
function VendorsList({ initialQuery }: { initialQuery: URLSearchParams }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [filters, setFilters] = useState(() => ({
    search: initialQuery.get("search") ?? "",
    includeArchived: initialQuery.get("includeArchived") === "true"
  }));

 useEffect(() => {
    const query = buildVendorsQuery(filters);
    window.history.replaceState(null, "", `#/vendors?${query.toString()}`);
    setLoadState("loading");

    void fetchVendors(query.toString())
      .then((nextVendors) => {
        setVendors(nextVendors);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [filters]);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h2>Vendor Directory</h2>
        </div>
        <a className="primary-link" href="#/vendors/new">
          <Plus size={16} aria-hidden="true" />
          Add Vendor
        </a>  
     </section>

     <section className="filter-bar" aria-label="Vendor list filters">
        <label className="field search-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Vendor name, support, contract notes..."
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(event) =>
              setFilters((current) => ({ ...current, includeArchived: event.target.checked }))
            }
          />
          Include archived
        </label>
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load vendors.</span>
        </section>
      ) : null}

      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${vendors.length} vendors`}</strong>
          <span>Open a vendor to review support and contract information.</span>
        </div>
        <div className="table-wrap">
          <table> 
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Website</th>
                <th>Support</th>
                <th>Representative</th>
                <th>Archived</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <a href={`#/vendors/${vendor.id}`}>{vendor.name}</a>
                  </td>
                  <td>{vendor.website_url ?? "Not Recorded"}</td>
                  <td>{vendor.support_email ?? vendor.support_phone ?? "Not Recorded"}</td>
                  <td>{vendor.account_representative ?? "Not Recorded"}</td>
                  <td>{vendor.archived_at ? formatDateTime(vendor.archived_at) : "No"}</td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No matching vendors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function VendorDetail({ id, navigate }: { id: number; navigate: (hash: string) => void }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    setLoadState("loading");

    void fetchVendor(id)
      .then(async (nextVendor) => {
        setVendor(nextVendor);
        setSystems(
          await fetchSystems(
            `vendor=${encodeURIComponent(nextVendor.name)}&includeArchived=true&limit=100&sortBy=systemName&sortDirection=asc`
          )
        );
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [id]);

  async function archiveCurrentVendor() {
    if (!vendor || vendor.archived_at) {
      return;
    }

    const confirmed = window.confirm(`Archive ${vendor.name}? This keeps the vendor for history.`);

    if (!confirmed) {
      return;
    }

    setIsArchiving(true);

    try {
      const result = await archiveVendor(vendor.id);
      setVendor(result.data);
    } catch (error) {
      console.error(error);
      window.alert("Unable to archive this vendor.");
    } finally {
      setIsArchiving(false);
    }
   }

  if (loadState === "loading") {
    return <section className="panel wide">Loading vendor...</section>;
  }

  if (loadState === "error" || !vendor) {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this vendor.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Vendor detail</p>
          <h2>{vendor.name}</h2>
        </div>
        <div className="top-actions">
          <a className="secondary-link" href="#/vendors">
            Vendors
          </a>
          <button className="secondary-link" onClick={() => navigate(`/vendors/${vendor.id}/edit`)}>
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </button>
          <button
            className="danger-button"
            disabled={Boolean(vendor.archived_at) || isArchiving}
            onClick={() => void archiveCurrentVendor()}
          >
            <Archive size={16} aria-hidden="true" />
            {vendor.archived_at ? "Archived" : "Archive"}
          </button>
        </div>
      </section>
      {vendor.archived_at ? (
        <section className="notice archived">
          <Archive size={20} aria-hidden="true" />
          <span>Archived on {formatDateTime(vendor.archived_at)}.</span>
        </section>
      ) : null}

      <section className="detail-grid">
        <DetailSection title="Vendor information">
          <DetailItem label="Vendor name" value={vendor.name} />
          <DetailItem label="Description" value={vendor.description} />
          <DetailItem label="Website" value={vendor.website_url} isLink />
          <DetailItem label="Support email" value={vendor.support_email} />
          <DetailItem label="Support phone number" value={vendor.support_phone} />
          <DetailItem label="Support portal" value={vendor.support_portal_url} isLink />
        </DetailSection>

        <DetailSection title="Contract and notes">
          <DetailItem label="Account representative" value={vendor.account_representative} />
          <DetailItem label="Contract start date" value={formatDate(vendor.contract_start_date)} />
          <DetailItem label="Contract end date" value={formatDate(vendor.contract_end_date)} />
          <DetailItem
            label="Renewal notice days"
            value={vendor.renewal_notice_days === null ? null : String(vendor.renewal_notice_days)}
          />
          <DetailItem label="Contract notes" value={vendor.contract_notes} />
          <DetailItem label="Renewal notes" value={vendor.renewal_notes} />
          <DetailItem label="General notes" value={vendor.notes} />
        </DetailSection>

        <section className="panel detail-section wide">
          <h3>Connected systems</h3>
          <SystemTable records={systems} showVendor showLastReview showArchived />
        </section>
      </section>
    </>
  );
}

function VendorForm({
  mode,
  vendorId,
  navigate
}: {
  mode: "create" | "edit";
  vendorId?: number;
  navigate: (hash: string) => void;
}) {
  const [form, setForm] = useState<VendorFormInput>(createEmptyVendorForm());
  const [loadState, setLoadState] = useState<LoadState>(mode === "edit" ? "loading" : "ready");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !vendorId) {
      return;
    }

    setLoadState("loading");
    void fetchVendor(vendorId)
      .then((nextVendor) => {
        setForm(mapVendorToForm(nextVendor));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [mode, vendorId]);

  function updateField(name: keyof VendorFormInput, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

 async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setMessage("");

    try {
      const result =
        mode === "create" ? await createVendor(form) : await updateVendor(Number(vendorId), form);

      navigate(`/vendors/${result.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(mapApiIssues(error));
        setMessage(error.message);
      } else {
        console.error(error);
        setMessage("Unable to save the vendor.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading vendor form...</section>;
  }

  if (loadState === "error") {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this vendor for editing.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Vendor directory</p>
          <h2>{mode === "create" ? "Add Vendor" : "Edit Vendor"}</h2>
        </div>
      </section>

      <form className="record-form" onSubmit={(event) => void saveRecord(event)}>
        {message ? (
          <section className={`notice ${Object.keys(errors).length > 0 ? "error" : "success"}`}>
            <span>{message}</span>
          </section>
        ) : null}
        <FormSection title="Vendor information">
          <VendorTextField
            label="Vendor name"
            name= "name"
            value={form.name}
            onChange={updateField}
            error={errors.name}
            required
          />
          <VendorTextField label="Website" name="website_url" value={form.website_url} onChange={updateField} error={errors.website_url} />
          <VendorTextField label="Support email" name="support_email" value={form.support_email} onChange={updateField} />
          <VendorTextField label="Support phone number" name="support_phone" value={form.support_phone} onChange={updateField} />
          <VendorTextField label="Support portal" name="support_portal_url"  value={form.support_portal_url} onChange={updateField} error={errors.support_portal_url} />
          <VendorTextField label="Account representative" name="account_representative" value={form.account_representative} onChange={updateField} />
          <VendorTextArea label="Description" name="description" value={form.description} onChange={updateField} />
        </FormSection>

        <FormSection title="Contract and notes">
          <VendorTextField label="Contract start date" name="contract_start_date" type="date" value={form.contract_start_date} onChange={updateField} error={errors.contract_start_date} />
          <VendorTextField label="Contract end date" name="contract_end_date" type="date" value={form.contract_end_date} onChange={updateField} error={errors.contract_end_date} />
          <VendorTextField label="Renewal notice days" name="renewal_notice_days" type="number" value={form.renewal_notice_days} onChange={updateField} error={errors.renewal_notice_days} />
          <VendorTextArea label="Contract notes" name="contract_notes" value={form.contract_notes} onChange={updateField} />
          <VendorTextArea label="Renewal notes" name="renewal_notes" value={form.renewal_notes} onChange={updateField} />
          <VendorTextArea label="General notes" name="notes" value={form.notes} onChange={updateField} />
        </FormSection>

        <div className="form-actions">
          <a className="secondary-link" href={mode === "edit" && vendorId ? `#/vendors/${vendorId}` : "#/vendors"}>
            Cancel
          </a>
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Vendor"}
          </button>
        </div>
      </form>
    </>
  );
}

function DirectoryHome() {
  const [dependencies, setDependencies] = useState<DirectoryRecord[]>([]);
  const [systems, setSystems] = useState<SystemRecord[]>([]);

  useEffect(() =>{
    void fetchDirectoryRecords("system-dependencies", "limit=8")
      .then(setDependencies)
      .catch((error) => console.error(error));
    void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
      .then(setSystems)
      .catch((error) => console.error(error));
  }, []);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Phase 5</p>
          <h2>Directory Workflows</h2>
        </div>
      </section>
      <section className="metric-grid">
        {(Object.keys(directoryConfigs) as DirectoryResource[]).map((resource) => (
          <a className="metric-card neutral" href={`#/directory/${resource}`} key={resource}>
            <span className="metric-icon">
              <ListFilter size={20} aria-hidden="true" />
            </span>
            <span className="metric-value">{directoryConfigs[resource].title}</span>
            <span className="metric-label">Manage records</span>
          </a>
        ))}
      </section>
      <section className="panel wide">
        <div className ="list-summary">
          <strong>Dependency Map</strong>
          <span>Quick impact view for system connected by Phase 5 dependencies.</span>
        </div>
        <div className="dependency-map">
          {dependencies.map((dependency) => (
            <a className="dependencies-map-row" href={`#/directory/system-dependencies/${dependency.id}`} key={String(dependency.id)}>
              <span>{systemNameById(systems, dependency.source_asset_id)}</span>
              <span> className={`status-pill ${dependency.importance_level ?? "standard"}`}
                {formatDirectoryValue(dependency.importance_level)}
              </span>
              <span>{systemNameById(systems, dependency.destination_asset_id)}</span>
              <small>{formatDirectoryValue(dependency.relationship_description)}</small>
            </a>
          ))}
          {dependencies.length === 0 ? (
            <p className="empty-state">No system dependencies are recorded yet.</p>
          ):null}
        </div>
      </section>
    </>
  );
}
function DirectoryList({
  resource,
  initialQuery
}: {
  resource: DirectoryResource;
  initialQuery: URLSearchParams;
}) {
  const config = directoryConfigs[resource];
  const [records, setRecords] = useState<DirectoryRecord[]>([]);
  const [search, setSearch] = useState(initialQuery.get("search") ?? "");
  const [includeArchived, setIncludeArchived] = useState(initialQuery.get("includeArchived") === "true");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [systems, setSystems] = useState<SystemRecord[]>([]);

  useEffect(() => {
    const query = new URLSearchParams({ limit: "100" });

    if (search.trim()) {
      query.set("search", search.trim());
    }
 if (includeArchived) {
      query.set("includeArchived", "true");
    }

    window.history.replaceState(null, "", `#/directory/${resource}?${query.toString()}`);
    setLoadState("loading");
    void fetchDirectoryRecords(resource, query.toString())
      .then((nextRecords) => {
        setRecords(nextRecords);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [resource, search, includeArchived]);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Directory workflow</p>
          <h2>{config.title}</h2>
        </div>
        <a className="primary-link" href={`#/directory/${resource}/new`}>
          <Plus size={16} aria-hidden="true" />
          Add {config.singular}
        </a>
      </section>
      <section className="filter-bar">
        <label className="field search-field">
          <span>Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Include archived
        </label>
      </section>
      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load records.</span>
        </section>
      ) : null}
      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${records.length} records`}</strong>
          <span>Open a row to view or edit details.</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.summaryFields.map((field) => (
                  <th key={field}>{humanizeField(field)}</th>
                ))}
                <th>Archived</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={String(record.id)}>
                  {config.summaryFields.map((field, index) => (
                    <td key={field}>
                      {index === 0 ? (
                        <a href={`#/directory/${resource}/${record.id}`}>{formatDirectoryValue(record[field])}</a>
                      ) : (
                        formatDirectoryValue(record[field])
                      )}
                       </td>
                  ))}
                  <td>{record.archived_at ? formatDateTime(String(record.archived_at)) : "No"}</td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td colSpan={config.summaryFields.length + 1} className="empty-table">
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DirectoryDetail({
  resource,
  id,
  navigate
}: {
  resource: DirectoryResource;
  id: number;
  navigate: (hash: string) => void;
}) {
  const config = directoryConfigs[resource];
  const [record, setRecord] = useState<DirectoryRecord | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    setLoadState("loading");
    void fetchDirectoryRecord(resource, id)
      .then((nextRecord) => {
        setRecord(nextRecord);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [resource, id]);

  async function archiveRecord() {
    const confirmed = window.confirm(`Archive this ${config.singular.toLowerCase()}?`);

    if (!confirmed) {
      return;
    }

    await archiveDirectoryRecord(resource, id);
    navigate(`/directory/${resource}`);
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading record...</section>;
  }

  if (loadState === "error" || !record) {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load record.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{config.title}</p>
          <h2>{config.singular} #{id}</h2>
        </div>
        <div className="top-actions">
          <a className="secondary-link" href={`#/directory/${resource}`}>
            {config.title}
          </a>
          <a className="secondary-link" href={`#/directory/${resource}/${id}/edit`}>
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </a>
          <button className="danger-button" onClick={() => void archiveRecord()}>
            <Archive size={16} aria-hidden="true" />
            Archive
          </button>
        </div>
      </section>
      <DetailSection title={`${config.singular} details`} wide>
        {config.fields.map((field) => (
          <DetailItem key={field.name} label={field.label} value={formatDirectoryValue(record[field.name])} />
        ))}
      </DetailSection>
    </>
  );
}

function DirectoryForm({
  resource,
  mode,
  id,
  navigate
}: {
  resource: DirectoryResource;
  mode: "create" | "edit";
  id?: number;
  navigate: (hash: string) => void;
}) {
  const config = directoryConfigs[resource];
  const [form, setForm] = useState<Record<string, string>>(() => createDirectoryForm(config.fields));
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(mode === "edit" ? "loading" : "ready");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config.fields.some((field) => field.systemSelect)) {
      void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
        .then(setSystems)
        .catch((error) => console.error(error));
    }
  }, [config.fields]);

  useEffect(() => {
    if (mode !== "edit" || !id) {
      return;
    }

    setLoadState("loading");
    void fetchDirectoryRecord(resource, id)
      .then((record) => {
        setForm(recordToStringForm(record));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [mode, resource, id]);

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = formToDirectoryRecord(form, config.fields);
      const result =
        mode === "create"
          ? await createDirectoryRecord(resource, payload)
          : await updateDirectoryRecord(resource, Number(id), payload);

      navigate(`/directory/${resource}/${result.data.id}`);
    } catch (error) {
      console.error(error);
      window.alert(`Unable to save ${config.singular.toLowerCase()}.`);
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading form...</section>;
  }

  if (loadState === "error") {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this record for editing.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{config.title}</p>
          <h2>{mode === "create" ? `Add ${config.singular}` : `Edit ${config.singular}`}</h2>
        </div>
      </section>
      <form className="record-form" onSubmit={(event) => void saveRecord(event)}>
        <FormSection title={`${config.singular} information`}>
          {config.fields.map((field) => (
            <DirectoryFieldInput
              key={field.name}
              field={field}
              value={form[field.name] ?? ""}
              systems={systems}
              onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
            />
          ))}
        </FormSection>
        <div className="form-actions">
          <a className="secondary-link" href={mode === "edit" && id ? `#/directory/${resource}/${id}` : `#/directory/${resource}`}>
            Cancel
          </a>
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </>
  );
}

function SystemDetail({
  id,
  assetTypes,
  navigate
}: {
  id: number;
  assetTypes: AssetType[];
  navigate: (hash: string) => void;
}) {
  const [record, setRecord] = useState<SystemRecord | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLoadState("loading");

    void fetchSystem(id)
      .then((nextRecord) => {
        setRecord(nextRecord);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [id]);

  async function archiveCurrentSystem() {
    if (!record || record.archived_at) {
      return;
    }

    const confirmed = window.confirm(`Archive ${record.system_name}? This keeps the record for history.`);

    if (!confirmed) {
      return;
    }

    setIsArchiving(true);

    try {
      const result = await archiveSystem(record.id);
      setRecord(result.data);
    } catch (error) {
      console.error(error);
      window.alert("Unable to archive this system record.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function deleteCurrentSystem() {
    if (!record) {
      return;
    }

    const confirmed = window.confirm(`Delete ${record.system_name}? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteSystem(record.id);
      navigate("/systems");
    } catch (error) {
      console.error(error);
      window.alert("Unable to delete this system record.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading system record...</section>;
  }

  if (loadState === "error" || !record) {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this system record.</span>
      </section>
    );
  }

  const categoryName =
    assetTypes.find((assetType) => assetType.code === record.category_code)?.name ?? record.category_name;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">System detail</p>
          <h2>{record.system_name}</h2>
        </div>
        <div className="top-actions">
          <a className="secondary-link" href="#/systems">
            Systems
          </a>
          <button className="secondary-link" onClick={() => navigate(`/systems/${record.id}/edit`)}>
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </button>
          <button
            className="danger-button"
            disabled={Boolean(record.archived_at) || isArchiving}
            onClick={() => void archiveCurrentSystem()}
          >
            <Archive size={16} aria-hidden="true" />
            {record.archived_at ? "Archived" : "Archive"}
          </button>
          <button
            className="danger-button"
            disabled={isDeleting}
            onClick={() => void deleteCurrentSystem()}
          >
            <Trash2 size={16} aria-hidden="true" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>

      {record.archived_at ? (
        <section className="notice archived">
          <Archive size={20} aria-hidden="true" />
          <span>Archived on {formatDateTime(record.archived_at)}. The record remains available for history.</span>
        </section>
      ) : null}

      {record.quality_warnings.length > 0 ? (
        <section className="notice warning quality-summary">
        <AlertTriangle size={20} aria-hidden="true"/>
        <div>
          <strong>{record.quality_warning_count} data-quality warning(s)</strong>
          <ul>
            {record.quality_warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
       </section>
      ) : null}

      <section className="detail-grid">
        <DetailSection title="General information">
          <DetailItem label="Name" value={record.system_name} />
          <DetailItem label="Description" value={record.description} />
          <DetailItem label="Category" value={categoryName} />
          <DetailItem label="Status" value={statusLabels[record.status]} />
          <DetailItem label="Business department" value={record.business_department} />
        </DetailSection>

        <DetailSection title="Ownership and support">
          <DetailItem label="Department owner" value={record.department_owner} />
          <DetailItem label="Technical owner" value={record.technical_owner} />
          <DetailItem label="Vendor" value={record.vendor} />
          <DetailItem label="Support contact" value={record.support_contact} />
        </DetailSection>

        <DetailSection title="Technical information">
          <DetailItem label="Hosting location" value={record.hosting_location} />
          <DetailItem label="Server name" value={record.server_name} />
          <DetailItem label="Database name" value={record.database_name} />
          <DetailItem label="Production URL" value={record.production_url} isLink />
          <DetailItem label="Test URL" value={record.test_url} isLink />
        </DetailSection>

        <DetailSection title="Documentation">
          <DetailItem label="Documentation link" value={record.documentation_url} isLink />
          <DetailItem label="Password-vault reference" value={record.password_vault_reference} />
          <DetailItem label="Troubleshooting notes" value={record.notes} />
        </DetailSection>

        <DetailSection title="Lifecycle information" wide>
          <DetailItem label="Renewal date" value={formatDate(record.renewal_date)} />
          <DetailItem label="Last review date" value={formatDate(record.last_review_date)} />
          <DetailItem label="Replacement system" value={record.replacement_system} />
          <DetailItem label="Retirement notes" value={record.retirement_notes} />
        </DetailSection>

        <CategoryDetailSection systemId={record.id} />
        <SystemTagsSection systemId={record.id} />
        <SystemDependenciesSection system={record} />
      </section>
    </>
  );
}

function CategoryDetailSection({ systemId }: { systemId: number }) {
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchSystemCategoryDetails(systemId)
      .then((nextDetails) => {
        setDetails(nextDetails);
        setForm(recordToStringForm(nextDetails.fields ?? {}));
      })
      .catch((error) => console.error(error));
  }, [systemId]);

  if (!details?.fields) {
    return null;
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const result = await updateSystemCategoryDetails(systemId, formToDirectoryRecord(form));
      setDetails(result.data);
      setForm(recordToStringForm(result.data.fields ?? {}));
    } catch (error) {
      console.error(error);
      window.alert("Unable to save category details.");
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <section className="panel detail-section wide">
      <h3>{details.categoryName} details</h3>
      <form className="form-grid" onSubmit={(event) => void saveDetails(event)}>
        {Object.keys(details.fields).map((field) => (
          <label className="field" key={field}>
            <span>{humanizeField(field)}</span>
            <input
              value={form[field] ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
            />
          </label>
        ))}
        <div className="form-actions full-field">
          <button className="secondary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </form>
    </section>
  );
}

function SystemTagsSection({ systemId }: { systemId: number }) {
  const [assignedTags, setAssignedTags] = useState<DirectoryRecord[]>([]);
  const [allTags, setAllTags] = useState<DirectoryRecord[]>([]);
  const [selectedTagId, setSelectedTagId] = useState("");

  useEffect(() => {
    void loadTags();
    void fetchDirectoryRecords("tags", "limit=100")
      .then(setAllTags)
      .catch((error) => console.error(error));
  }, [systemId]);

  async function loadTags() {
    try {
      setAssignedTags(await fetchSystemTags(systemId));
    } catch (error) {
      console.error(error);
    }
  }

  async function assignTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
      if (!selectedTagId) {
      return;
    }

    const result = await addSystemTag(systemId, Number(selectedTagId));
    setAssignedTags(result.data);
    setSelectedTagId("");
  }

  async function unassignTag(tagId: number) {
    await removeSystemTag(systemId, tagId);
    await loadTags();
  }

  const assignedIds = new Set(assignedTags.map((tag) => Number(tag.id)));
  const availableTags = allTags.filter((tag) => !assignedIds.has(Number(tag.id)));

  return (
    <section className="panel detail-section wide">
      <h3>Tags</h3>
      <div className="tag-list">
        {assignedTags.map((tag) => (
          <span className="status-pill neutral" key={String(tag.id)}>
            {formatDirectoryValue(tag.name)}
            <button type="button" onClick={() => void unassignTag(Number(tag.id))}>
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        {assignedTags.length === 0 ? <p className="empty-state">No tags assigned.</p> : null}
      </div>
      <form className="filter-bar" onSubmit={(event) => void assignTag(event)}>
        <label className="field">
          <span>Add tag</span>
          <select value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)}>
            <option value="">Select tag</option>
            {availableTags.map((tag) => (
              <option key={String(tag.id)} value={String(tag.id)}>
                {formatDirectoryValue(tag.name)}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-link" type="submit">
          Add Tag
        </button>
      </form>
    </section>
  );
}
function SystemDependenciesSection({ system }: { system: SystemRecord }) {
  const [summary, setSummary] = useState<SystemDependencySummary>({ dependsOn: [], dependedOnBy: [] });
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [form, setForm] = useState<Record<string, string>>(() =>
    createDependencyForm(system.id)
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadDependencies();
    void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
      .then(setSystems)
      .catch((error) => console.error(error));
  }, [system.id]);

  async function loadDependencies() {
    try {
      setSummary(await fetchSystemDependencies(system.id));
    } catch (error) {
      console.error(error);
    }
  }

  function editDependency(dependency: SystemDependency) {
    setEditingId(dependency.id);
    setForm({
      source_asset_id: String(dependency.source_asset_id),
      destination_asset_id: String(dependency.destination_asset_id),
      relationship_description: dependency.relationship_description,
      data_or_service_exchanged: dependency.data_or_service_exchanged ?? "",
      importance_level: dependency.importance_level,
      notes: dependency.notes ?? ""
    });
  }
async function saveDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = createDependencyPayload(form);

      if (editingId) {
        await updateDirectoryRecord("system-dependencies", editingId, payload);
      } else {
        await createDirectoryRecord("system-dependencies", payload);
      }

      setEditingId(null);
      setForm(createDependencyForm(system.id));
      await loadDependencies();
    } catch (error) {
      console.error(error);
      window.alert("Unable to save dependency.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveDependency(id: number) {
    const confirmed = window.confirm("Archive this dependency?");

    if (!confirmed) {
      return;
    }

    await archiveDirectoryRecord("system-dependencies", id);
    await loadDependencies();
  }

  return (
    <section className="panel detail-section wide">
      <h3>Dependencies</h3>
      <div className="dependency-columns">
        <DependencyList
          title="This system depends on"
          dependencies={summary.dependsOn}
          emptyText="No upstream dependencies recorded."
          onEdit={editDependency}
          onArchive={(id) => void archiveDependency(id)}
        />
        <DependencyList
          title="Systems affected if this system stops working"
          dependencies={summary.dependedOnBy}
          emptyText="No downstream impact recorded."
          onEdit={editDependency}
          onArchive={(id) => void archiveDependency(id)}
        />
      </div>

      
      <form className="record-form compact-form" onSubmit={(event) => void saveDependency(event)}>
        <FormSection title={editingId ? "Edit dependency" : "Add dependency"}>
          {dependencyFields().map((field) => (
            <DirectoryFieldInput
              key={field.name}
              field={field}
              value={form[field.name] ?? ""}
              systems={systems}
              onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
            />
          ))}
        </FormSection>
        <div className="form-actions">
          {editingId ? (
            <button
              className="secondary-link"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(createDependencyForm(system.id));
              }}
            >
              Cancel
            </button>
          ) : null}
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Dependency"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DependencyList({
  title,
  dependencies,
  emptyText,
  onEdit,
  onArchive
}: {
  title: string;
  dependencies: SystemDependency[];
  emptyText: string;
  onEdit: (dependency: SystemDependency) => void;
  onArchive: (id: number) => void;
}) {
  return (
    <div className="attention-column">
      <h3>{title}</h3>
      {dependencies.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <ul>
          {dependencies.map((dependency) => (
            <li key={dependency.id}>
              <a href={`#/systems/${dependency.related_system_id}`}>
                {dependency.related_system_name}
              </a>
              <span className={`status-pill ${dependency.importance_level}`}>{dependency.importance_level}</span>
              <span>{dependency.relationship_description}</span>
              <span>{dependency.data_or_service_exchanged ?? "No data or service recorded"}</span>
              <span>{dependency.notes ?? "No notes"}</span>
              <div className="top-actions">
                <button className="secondary-link" type="button" onClick={() => onEdit(dependency)}>
                  Edit
                </button>
                <button className="danger-button" type="button" onClick={() => onArchive(dependency.id)}>
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SystemForm({
  assetTypes,
  mode,
  systemId,
  navigate
}: {
  assetTypes: AssetType[];
  mode: "create" | "edit";
  systemId?: number;
  navigate: (hash: string) => void;
}) {
  const [form, setForm] = useState<SystemRecordFormInput>(createEmptyForm());
  const [loadState, setLoadState] = useState<LoadState>(mode === "edit" ? "loading" : "ready");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<SystemRecordWarning[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (form.categoryCode || assetTypes.length === 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      categoryCode: assetTypes[0].code
    }));
  }, [assetTypes, form.categoryCode]);

  useEffect(() => {
    if (mode !== "edit" || !systemId) {
      return;
    }

    setLoadState("loading");
    void fetchSystem(systemId)
      .then((record) => {
        setForm(mapRecordToForm(record));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [mode, systemId]);

  function updateField(name: keyof SystemRecordFormInput, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function saveSystem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setWarnings([]);
    setMessage("");

    try {
      const result =
        mode === "create" ? await createSystem(form) : await updateSystem(Number(systemId), form);

      setWarnings(result.warnings);
      setMessage("System record saved.");
      navigate(`/systems/${result.data.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(mapApiIssues(error));
        setMessage(error.message);
      } else {
        console.error(error);
        setMessage("Unable to save the system record.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading form...</section>;
  }

  if (loadState === "error") {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this system record for editing.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">System record</p>
          <h2>{mode === "create" ? "Add System" : "Edit System"}</h2>
        </div>
      </section>

      <form className="record-form" onSubmit={(event) => void saveSystem(event)}>
        {message ? (
          <section className={`notice ${Object.keys(errors).length > 0 ? "error" : "success"}`}>
            <span>{message}</span>
          </section>
        ) : null}
        {warnings.map((warning) => (
          <section className="notice warning" key={warning.code}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{warning.message}</span>
          </section>
        ))}

        <FormSection title="General information">
          <TextField
            label="System name"
            name="systemName"
            value={form.systemName}
            onChange={updateField}
            error={errors.systemName}
            required
          />
          <label className="field">
            <span>Category *</span>
            <select
              value={form.categoryCode}
              onChange={(event) => updateField("categoryCode", event.target.value)}
              required
            >
              <option value="">Select category</option>
              {assetTypes.map((assetType) => (
                <option key={assetType.code} value={assetType.code}>
                  {assetType.name}
                </option>
              ))}
            </select>
            {errors.categoryCode ? <em>{errors.categoryCode}</em> : null}
          </label>
          <label className="field">
            <span>Status *</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              required
            >
              {systemStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            {errors.status ? <em>{errors.status}</em> : null}
          </label>
          <TextAreaField
            label="Description"
            name="description"
            value={form.description}
            onChange={updateField}
            error={errors.description}
            required
          />
        </FormSection>

        <FormSection title="Ownership and support">
          <TextField label="Business department" name="businessDepartment" value={form.businessDepartment} onChange={updateField} />
          <TextField label="Department owner" name="departmentOwner" value={form.departmentOwner} onChange={updateField} />
          <TextField label="Technical owner" name="technicalOwner" value={form.technicalOwner} onChange={updateField} />
          <TextField label="Vendor" name="vendor" value={form.vendor} onChange={updateField} />
          <TextField label="Support contact" name="supportContact" value={form.supportContact} onChange={updateField} />
        </FormSection>

        <FormSection title="Technical information">
          <TextField label="Hosting location" name="hostingLocation" value={form.hostingLocation} onChange={updateField} />
          <TextField label="Server name" name="serverName" value={form.serverName} onChange={updateField} />
          <TextField label="Database name" name="databaseName" value={form.databaseName} onChange={updateField} />
          <TextField label="Production URL" name="productionUrl" value={form.productionUrl} onChange={updateField} error={errors.productionUrl} />
          <TextField label="Test URL" name="testUrl" value={form.testUrl} onChange={updateField} error={errors.testUrl} />
          <TextField label="Documentation link" name="documentationLink" value={form.documentationLink} onChange={updateField} error={errors.documentationLink} />
          <TextField label="Password-vault reference" name="passwordVaultReference" value={form.passwordVaultReference} onChange={updateField} />
        </FormSection>

        <FormSection title="Lifecycle information">
          <TextField label="Renewal date" name="renewalDate" type="date" value={form.renewalDate} onChange={updateField} error={errors.renewalDate} />
          <TextField label="Last review date" name="lastReviewDate" type="date" value={form.lastReviewDate} onChange={updateField} error={errors.lastReviewDate} />
          <TextField label="Replacement system" name="replacementSystem" value={form.replacementSystem} onChange={updateField} />
          <TextAreaField label="Retirement notes" name="retirementNotes" value={form.retirementNotes} onChange={updateField} />
          <TextAreaField label="Notes" name="notes" value={form.notes} onChange={updateField} />
        </FormSection>

        <div className="form-actions">
          <a className="secondary-link" href={mode === "edit" && systemId ? `#/systems/${systemId}` : "#/systems"}>
            Cancel
          </a>
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save System"}
          </button>
        </div>
      </form>
    </>
  );
}

function MetricCard({
  label,
  value,
  href,
  icon,
  tone = "neutral",
  loading
}: {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
  tone?: "neutral" | "good" | "watch" | "risk";
  loading: boolean;
}) {
  return (
    <a className={`metric-card ${tone}`} href={href}>
      <span className="metric-icon">{icon}</span>
      <span className="metric-value">{loading ? "..." : value.toLocaleString()}</span>
      <span className="metric-label">{label}</span>
    </a>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  wide,
  children
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${wide ? "wide" : ""}`}>
      <header className="panel-header">
        <div>
          <h2>
            {icon}
            {title}
          </h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function RecordList({
  records,
  emptyText,
  detail
}: {
  records: SystemRecord[];
  emptyText: string;
  detail: (record: SystemRecord) => React.ReactNode;
}) {
  if (records.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="record-list">
      {records.map((record) => (
        <li key={record.id}>
          <a href={getRecordHref(record)}>{record.system_name}</a>
          <div className="record-meta">{detail(record)}</div>
        </li>
      ))}
    </ul>
  );
}

function AttentionColumn({
  title,
  records,
  emptyText
}: {
  title: string;
  records: SystemRecord[];
  emptyText: string;
}) {
  return (
    <div className="attention-column">
      <h3>{title}</h3>
      {records.length > 0 ? (
        <ul>
          {records.map((record) => (
            <li key={record.id}>
              <a href={getRecordHref(record)}>{record.system_name}</a>
              <span>{record.business_department ?? record.category_name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{emptyText}</p>
      )}
    </div>
  );
}

function SystemTable({
  records,
  showVendor,
  showLastReview,
  showArchived
}: {
  records: SystemRecord[];
  showVendor?: boolean;
  showLastReview?: boolean;
  showArchived?: boolean;
}) {
  const columnCount = 
    5 + 1 + (showVendor ? 1 : 0) + (showLastReview ? 1 : 0) + (showArchived ? 1 : 0);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Category</th>
            <th>Status</th>
            <th>Technical owner</th>
            {showVendor ? <th>Vendor</th> : null}
            <th>Department</th>
            <th>Warnings</th>
            {showLastReview ? <th>Last review</th> : null}
            {showArchived ? <th>Archived</th> : null}
          </tr>
        </thead>
        <tbody>
          {records.map((system) => (
            <tr key={system.id}>
              <td>
                <a href={getRecordHref(system)}>{system.system_name}</a>
              </td>
              <td>{system.category_name}</td>
              <td>
                <span className={`status-pill ${system.status}`}>{statusLabels[system.status]}</span>
              </td>
              <td>{system.technical_owner ?? "Not assigned"}</td>
              {showVendor ? <td>{system.vendor ?? "Not assigned"}</td> : null}
              <td>{system.business_department ?? "Not assigned"}</td>
              <td>
                {system.quality_warning_count > 0 ? (
                  <span className="quality-badge">{system.quality_warning_count}</span>
                ) : (
                  "None"
                )}
              </td>
              {showLastReview ? <td>{formatDate(system.last_review_date)}</td> : null}
              {showArchived ? <td>{system.archived_at ? formatDateTime(system.archived_at) : "No"}</td> : null}
            </tr>
          ))}
          {records.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="empty-table">
                No matching systems found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DetailSection({
  title,
  wide,
  children
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel detail-section ${wide ? "wide" : ""}`}>
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

function DetailItem({ label, value, isLink }: { label: string; value: string | null; isLink?: boolean }) {
  const displayValue = value?.trim() ? value : "Not recorded";

  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {isLink && value?.trim() ? (
          <a href={value} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          displayValue
        )}
      </dd>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  required
}: {
  label: string;
  name: keyof SystemRecordFormInput;
  value: string;
  onChange: (name: keyof SystemRecordFormInput, value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
      />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  error,
  required
}: {
  label: string;
  name: keyof SystemRecordFormInput;
  value: string;
  onChange: (name: keyof SystemRecordFormInput, value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="field full-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <textarea value={value} onChange={(event) => onChange(name, event.target.value)} required={required} />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function VendorTextField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  required
}: {
  label: string;
  name: keyof VendorFormInput;
  value: string;
  onChange: (name: keyof VendorFormInput, value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
      />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function VendorTextArea({
  label,
  name,
  value,
  onChange,
  error
}: {
  label: string;
  name: keyof VendorFormInput;
  value: string;
  onChange: (name: keyof VendorFormInput, value: string) => void;
  error?: string;
}) {
  return (
    <label className="field full-field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(name, event.target.value)} />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function DirectoryFieldInput({
  field,
  value,
  systems,
  onChange
}: {
  field: DirectoryField;
  value: string;
  systems: SystemRecord[];
  onChange: (value: string) => void;
}) {
  if (field.systemSelect) {
    return (
      <label className="field">
        <span>
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required}>
          <option value="">Select system</option>
          {systems.map((system) => (
            <option key={system.id} value={system.id}>
              {system.system_name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="field full-field">
        <span>{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} required={field.required} />
      </label>
    );
  }

   if (field.type === "select") {
    return (
      <label className="field">
        <span>
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required}>
          <option value="">Select value</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      <span>
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <input
        type={field.type ?? "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    </label>
  );
}

export function parseRouteFromHash(rawHash: string): Route {
  const hash = rawHash.replace(/^#/, "");
  const [pathPart, queryPart] = hash.split("?");
  const path = pathPart || "/";
  const query = new URLSearchParams(queryPart ?? "");
  const segments = path.split("/").filter(Boolean);

   if (segments[0] === "reports") {
    return {name: "reports", query};
   }

   if (segments[0] === "directory") {
    if (segments.length === 1) {
      return { name: "directoryHome" };
    }

    const resource = parseDirectoryResource(segments[1]);

    if (!resource) {
      return { name: "directoryHome" };
    }

    if (segments.length === 2) {
      return { name: "directoryList", resource, query };
    }

    if (segments[2] === "new") {
      return { name: "directoryNew", resource };
    }

    const id = Number(segments[2]);

    if (Number.isInteger(id) && id > 0 && segments[3] === "edit") {
      return { name: "directoryEdit", resource, id };
    }

    if (Number.isInteger(id) && id > 0) {
      return { name: "directoryDetail", resource, id };
    }

    return { name: "directoryList", resource, query };
  }

  if (segments[0] === "vendors") {
    if (segments.length === 1) {
      return { name: "vendors", query };
    }

    if (segments[1] === "new") {
      return { name: "newVendor" };
    }

    const vendorId = Number(segments[1]);

    if (Number.isInteger(vendorId) && vendorId > 0 && segments[2] === "edit") {
      return { name: "editVendor", id: vendorId };
    }

    if (Number.isInteger(vendorId) && vendorId > 0) {
      return { name: "vendorDetail", id: vendorId };
    }

    return { name: "vendors", query };
  }
  if (segments[0] !== "systems") {
    return { name: "dashboard" };
  }

  if (segments.length === 1) {
    return { name: "systems", query };
  }

  if (segments[1] === "new") {
    return { name: "newSystem" };
  }

  const id = Number(segments[1]);

  if (Number.isInteger(id) && id > 0 && segments[2] === "edit") {
    return { name: "editSystem", id };
  }

  if (Number.isInteger(id) && id > 0) {
    return { name: "systemDetail", id };
  }

  return { name: "systems", query };
}

export function buildSystemsQuery(filters: {
  search: string;
  categoryCode: string;
  status: string;
  technicalOwner: string;
  vendor: string;
  incompleteOnly: boolean;
  includeArchived: boolean;
  sortBy: string;
  sortDirection: string;
}) {
  const query = new URLSearchParams({
    limit: "100",
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection
  });

  for (const key of ["search", "categoryCode", "status", "technicalOwner", "vendor"] as const) {
    if (filters[key]) {
      query.set(key, filters[key]);
    }
  }

  if (filters.incompleteOnly) {
    query.set("incompleteOnly", "true");
  }

  if (filters.includeArchived) {
    query.set("includeArchived", "true");
  }

  return query;
}

export function buildSystemsExportUrl(query: URLSearchParams) {
  const queryString = query.toString();

  return `/api/system-records/export.csv${queryString ? `?${queryString}` : ""}`;
}


export function parseReportKey(value: string | null | undefined): SystemReportKey {
  return reportKeys.find((key) => key === value) ?? "data-quality";
}

function reportLabel(key: SystemReportKey) {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatReportCell(
  key: string,
  value: string | number | null | undefined,
  row: Record<string, string | number | null>
){
  if (key === "system_name" && row.id) {
    return <a href={`#/systems/${row.id}`}>{value ?? "Not recorded"}</a>;
  }

  if (key == "status" && typeof value === "string" && value in statusLabels){
    return statusLabels[value as SystemStatus];
  }

  if (key.includes("date") && typeof value === "string"){
    return formatDate(value);
  }

  return value ?? "Not recorded";
}

export function buildVendorsQuery(filters: { search: string; includeArchived: boolean }) {
  const query = new URLSearchParams({
    limit: "100"
  });

  if (filters.search.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.includeArchived) {
    query.set("includeArchived", "true");
  }

  return query;
}

function parseDirectoryResource(value: string | undefined): DirectoryResource | undefined {
  return (Object.keys(directoryConfigs) as DirectoryResource[]).find((resource) => resource === value);
}

function createDependencyForm(systemId: number) {
  return {
    source_asset_id: String(systemId),
    destination_asset_id: "",
    relationship_description: "",
    data_or_service_exchanged: "",
    importance_level: "standard",
    notes: ""
  };
}

function createDependencyPayload(form: Record<string, string>): DirectoryRecord {
  return {
    source_asset_id: Number(form.source_asset_id),
    destination_asset_id: Number(form.destination_asset_id),
    relationship_description: form.relationship_description,
    data_or_service_exchanged: form.data_or_service_exchanged,
    importance_level: form.importance_level || "standard",
    notes: form.notes
  };
}

function createDirectoryForm(fields: DirectoryField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.name === "importance_level" ? "standard" : ""])
  );
}

function recordToStringForm(record: DirectoryRecord) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value === null ? "" : String(value)])
  );
}

function formToDirectoryRecord(form: Record<string, string>, fields?: DirectoryField[]): DirectoryRecord {
  const numericFields = new Set(fields?.filter((field) => field.type === "number" || field.systemSelect).map((field) => field.name));

  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      value.trim() === "" ? null : numericFields.has(key) ? Number(value) : value
    ])
  );
}

 export function createEmptyForm(): SystemRecordFormInput {
  return {
    systemName: "",
    description: "",
    categoryCode: "",
    status: "active",
    businessDepartment: "",
    departmentOwner: "",
    technicalOwner: "",
    vendor: "",
    supportContact: "",
    hostingLocation: "",
    serverName: "",
    databaseName: "",
    productionUrl: "",
    testUrl: "",
    documentationLink: "",
    passwordVaultReference: "",
    renewalDate: "",
    lastReviewDate: "",
    replacementSystem: "",
    retirementNotes: "",
    notes: ""
  };
}

function mapRecordToForm(record: SystemRecord): SystemRecordFormInput {
  return {
    systemName: record.system_name,
    description: record.description,
    categoryCode: record.category_code,
    status: record.status,
    businessDepartment: record.business_department ?? "",
    departmentOwner: record.department_owner ?? "",
    technicalOwner: record.technical_owner ?? "",
    vendor: record.vendor ?? "",
    supportContact: record.support_contact ?? "",
    hostingLocation: record.hosting_location ?? "",
    serverName: record.server_name ?? "",
    databaseName: record.database_name ?? "",
    productionUrl: record.production_url ?? "",
    testUrl: record.test_url ?? "",
    documentationLink: record.documentation_url ?? "",
    passwordVaultReference: record.password_vault_reference ?? "",
    renewalDate: record.renewal_date ?? "",
    lastReviewDate: record.last_review_date ?? "",
    replacementSystem: record.replacement_system ?? "",
    retirementNotes: record.retirement_notes ?? "",
    notes: record.notes ?? ""
  };
}

export function createEmptyVendorForm(): VendorFormInput {
  return {
    name: "",
    description: "",
    website_url: "",
    support_email: "",
    support_phone: "",
    support_portal_url: "",
    account_representative: "", 
    contract_start_date: "",
    contract_end_date: "",
    renewal_notice_days: "",
    contract_notes: "",
    renewal_notes: "",
    notes: ""
  };
}

export function mapVendorToForm(vendor: Vendor): VendorFormInput {
  return {
    name: vendor.name,
    description: vendor.description ?? "",
    website_url: vendor.website_url ?? "",
    support_email: vendor.support_email ?? "",
    support_phone: vendor.support_phone ?? "",
    support_portal_url: vendor.support_portal_url ?? "",
    account_representative: vendor.account_representative ?? "",
    contract_start_date: vendor.contract_start_date ??"",
    contract_end_date: vendor.contract_end_date ?? "",
    renewal_notice_days: vendor.renewal_notice_days === null ? "" : String(vendor.renewal_notice_days),
    contract_notes: vendor.contract_notes ?? "",
    renewal_notes: vendor.renewal_notes ?? "",
    notes: vendor.notes ?? ""
  };
}
function mapApiIssues(error: ApiError) {
  if (error.issues.length === 0) {
    return {};
  }

  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path?.[0] ?? "form"), issue.message])
  );
}

function uniqueNonEmpty(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort(
    (left, right) => left.localeCompare(right)
  );
}

function formatDirectoryValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return String(value);
}
function formatDirectoryFieldValue(
  fieldName: string,
  value: string | number | null | undefined,
  systems: SystemRecord[]
){

  if (fieldName.endsWith("_asset_id") || fieldName === "asset_id") {
    const system = systems.find((record) => record.id === Number(value));
    return system?.system_name ?? formatDirectoryValue(value);
  }

  return formatDirectoryValue(value);
}

function systemNameById(systems: SystemRecord[], id: string | number | null | undefined) {
  const system = systems.find((record) => record.id === Number(id));

  return system?.system_name ?? formatDirectoryValue(id);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

