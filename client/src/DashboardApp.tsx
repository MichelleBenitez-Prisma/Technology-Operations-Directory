import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Edit3,
  FileQuestion,
  ListFilter,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundX,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  ApiError,
  archiveSystem,
  createSystem,
  deleteSystem,
  fetchAssetTypes,
  fetchDashboardTotals,
  fetchSystem,
  fetchSystems,
  updateSystem
} from "./api";
import { getRecordHref, getStatusCount, statusLabels } from "./dashboardData";
import type {
  AssetType,
  DashboardTotals,
  SystemRecord,
  SystemRecordFormInput,
  SystemRecordWarning,
  SystemStatus
} from "./types";

type LoadState = "loading" | "ready" | "error";
type Route =
  | { name: "dashboard" }
  | { name: "systems"; query: URLSearchParams }
  | { name: "systemDetail"; id: number }
  | { name: "newSystem" }
  | { name: "editSystem"; id: number };

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
          <a className="primary-link" href="#/systems/new">
            <Plus size={16} aria-hidden="true" />
            Add System
          </a>
        </nav>
      </header>

      {route.name === "dashboard" ? <DashboardHome navigate={navigate} /> : null}
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
          href="#/systems?status=active"
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
          tone="good"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Being Replaced"
          value={getStatusCount(totals, "being_replaced")}
          href="#/systems?status=being_replaced"
          icon={<RefreshCcw size={22} aria-hidden="true" />}
          tone="watch"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Retired Systems"
          value={getStatusCount(totals, "retired")}
          href="#/systems?status=retired"
          icon={<Archive size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Missing Documentation"
          value={totals?.missingDocumentation ?? 0}
          href="#/systems?incompleteOnly=true"
          icon={<FileQuestion size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Without Technical Owner"
          value={totals?.withoutTechnicalOwner ?? 0}
          href="#/systems?incompleteOnly=true"
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

function SystemsList({
  assetTypes,
  initialQuery
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
          <p className="eyebrow">Phase 3</p>
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
      navigate("#/systems");
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
      </section>
    </>
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

  async function saveSystem(event: React.FormEvent<HTMLFormElement>) {
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
              {showLastReview ? <td>{formatDate(system.last_review_date)}</td> : null}
              {showArchived ? <td>{system.archived_at ? formatDateTime(system.archived_at) : "No"}</td> : null}
            </tr>
          ))}
          {records.length === 0 ? (
            <tr>
              <td colSpan={showVendor || showLastReview || showArchived ? 8 : 5} className="empty-table">
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

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = hash.split("?");
  const path = pathPart || "/";
  const query = new URLSearchParams(queryPart ?? "");
  const segments = path.split("/").filter(Boolean);

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

function buildSystemsQuery(filters: {
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

function createEmptyForm(): SystemRecordFormInput {
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
