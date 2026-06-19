import type {
  AssetType,
  DashboardTotals,
  SystemRecord,
  SystemRecordFormInput,
  SystemRecordMutationResult
} from "./types";

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

export async function fetchSystem(id: number) {
  return getJson<SystemRecord>(`/api/system-records/${id}`);
}

export async function fetchAssetTypes() {
  return getJson<AssetType[]>("/api/asset-types");
}

export async function createSystem(input: SystemRecordFormInput) {
  return mutateJson<SystemRecordMutationResult>("/api/system-records", "POST", input);
}

export async function updateSystem(id: number, input: SystemRecordFormInput) {
  return mutateJson<SystemRecordMutationResult>(`/api/system-records/${id}`, "PUT", input);
}

export async function archiveSystem(id: number) {
  return mutateJson<{ data: SystemRecord }>(`/api/system-records/${id}/archive`, "POST");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

async function mutateJson<T>(
  path: string,
  method: "POST" | "PUT",
  body?: SystemRecordFormInput
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  return (await response.json()) as T;
}

export class ApiError extends Error {
  issues: Array<{ path?: Array<string | number>; message: string }>;

  private constructor(message: string, issues: Array<{ path?: Array<string | number>; message: string }>) {
    super(message);
    this.name = "ApiError";
    this.issues = issues;
  }

  static async fromResponse(response: Response) {
    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
          error?: string;
          issues?: Array<{ path?: Array<string | number>; message: string }>;
        }
      | null;

    return new ApiError(
      payload?.message ?? payload?.error ?? `Request failed with status ${response.status}`,
      payload?.issues ?? []
    );
  }
}
