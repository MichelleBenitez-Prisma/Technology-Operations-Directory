import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileQuestion,
  RefreshCcw,
  Search,
  ShieldAlert,
  UserRoundX
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { fetchDashboardTotals, fetchSystems } from "./api";
import {
  getRecordHref,
  getStatusCount,
  statusLabels
} from "./dashboardData";
import type { DashboardTotals, SystemRecord } from "./types";

type LoadState = "loading" | "ready" | "error";

export function DashboardApp() {
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
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Technology Department</p>
          <h1>Technology Operations Directory</h1>
        </div>
        <button className="icon-button" onClick={() => void loadDashboard()} title="Refresh dashboard">
          <RefreshCcw size={18} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </header>

      <section className="toolbar" aria-label="Directory search">
        <div className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search systems, owners, departments, vendors..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <a className="secondary-link" href="/api/system-records?sortBy=updatedAt&sortDirection=desc">
          Open API list
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
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
          href="/api/system-records"
          icon={<CircleDot size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Active Systems"
          value={getStatusCount(totals, "active")}
          href="/api/system-records?status=active"
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
          tone="good"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Being Replaced"
          value={getStatusCount(totals, "being_replaced")}
          href="/api/system-records?status=being_replaced"
          icon={<RefreshCcw size={22} aria-hidden="true" />}
          tone="watch"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Retired Systems"
          value={getStatusCount(totals, "retired")}
          href="/api/system-records?status=retired"
          icon={<Archive size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Missing Documentation"
          value={totals?.missingDocumentation ?? 0}
          href="/api/system-records?incompleteOnly=true"
          icon={<FileQuestion size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Without Technical Owner"
          value={totals?.withoutTechnicalOwner ?? 0}
          href="/api/system-records?incompleteOnly=true"
          icon={<UserRoundX size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
      </section>

      <section className="content-grid">
        <Panel
          title="Upcoming Renewals"
          subtitle="Next 90 days"
          icon={<CalendarClock size={18} aria-hidden="true" />}
        >
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

        <Panel
          title="Recently Updated"
          subtitle="Latest record changes"
          icon={<Clock3 size={18} aria-hidden="true" />}
        >
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
          icon={<AlertTriangle size={18} aria-hidden="true" />}
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>System</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {filteredSystems.map((system) => (
                  <tr key={system.id}>
                    <td>
                      <a href={getRecordHref(system)}>{system.system_name}</a>
                    </td>
                    <td>{system.category_name}</td>
                    <td>
                      <span className={`status-pill ${system.status}`}>
                        {statusLabels[system.status]}
                      </span>
                    </td>
                    <td>{system.technical_owner ?? "Not assigned"}</td>
                    <td>{system.business_department ?? "Not assigned"}</td>
                  </tr>
                ))}
                {filteredSystems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table">
                      No matching systems found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </main>
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
