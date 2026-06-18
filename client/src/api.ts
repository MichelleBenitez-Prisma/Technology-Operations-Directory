import type { DashboardTotals, SystemRecord } from "./types";

type ApiEnvelope<T> = {
  data: T;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchDashboardTotals() {
  return getJson<DashboardTotals>("/api/system-records/dashboard-totals");
}

export async function fetchSystems(query = "limit=100&sortBy=updatedAt&sortDirection=desc") {
  return getJson<SystemRecord[]>(`/api/system-records?${query}`);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

