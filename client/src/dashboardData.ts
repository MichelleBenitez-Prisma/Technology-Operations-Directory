import type { DashboardTotals, SystemRecord, SystemStatus } from "./types";

export const statusLabels: Record<SystemStatus, string> = {
  active: "Active",
  development: "Development",
  being_replaced: "Being Replaced",
  maintenance_only: "Maintenance Only",
  retired: "Retired"
};

export function getStatusCount(totals: DashboardTotals | null, status: SystemStatus) {
  return totals?.byStatus.find((item) => item.status === status)?.count ?? 0;
}

export function getSystemsMissingDocumentation(records: SystemRecord[]) {
  return records.filter(
    (record) => !record.archived_at && !record.documentation_url?.trim()
  );
}

export function getSystemsWithoutTechnicalOwner(records: SystemRecord[]) {
  return records.filter(
    (record) => !record.archived_at && !record.technical_owner?.trim()
  );
}

export function getUpcomingRenewals(records: SystemRecord[], daysAhead = 90) {
  const now = new Date();
  const start = startOfDay(now).getTime();
  const end = start + daysAhead * 24 * 60 * 60 * 1000;

  return records
    .filter((record) => {
      if (!record.renewal_date || record.archived_at) {
        return false;
      }

      const renewalDate = new Date(`${record.renewal_date}T00:00:00`);
      const renewalTime = renewalDate.getTime();

      return renewalTime >= start && renewalTime <= end;
    })
    .sort((left, right) => {
      return String(left.renewal_date).localeCompare(String(right.renewal_date));
    });
}

export function getRecentlyUpdated(records: SystemRecord[], limit = 6) {
  return [...records]
    .filter((record) => !record.archived_at)
    .sort((left, right) => {
      return (
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    })
    .slice(0, limit);
}

export function getRecordHref(record: SystemRecord) {
  return `/api/system-records/${record.id}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

