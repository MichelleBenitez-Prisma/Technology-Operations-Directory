import type {
  AssetType,
  AuditLogEvent,
  AuthUser,
  CategoryDetails,
  DashboardTotals,
  DirectoryRecord,
  DirectoryResource,
  SystemReport,
  SystemReportSummary,
  SystemRecord,
  SystemDependencySummary,
  SystemRecordFormInput,
  SystemRecordMutationResult,
  Vendor,
  VendorFormInput
} from "./types";

type ApiEnvelope<T> = {
  data: T;
};

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "";

export async function fetchDashboardTotals() {
  return getJson<DashboardTotals>("/api/system-records/dashboard-totals");
}

export async function fetchCurrentUser() {
  return getJson<AuthUser>("/api/auth/me");
}

export async function fetchActivity() {
  return getJson<AuditLogEvent[]>("/api/auth/activity");
}

export async function login(email: string, password: string) {
  return mutateJson<{ data: AuthUser }>("/api/auth/login", "POST", { email, password });
}

export async function loginWithRemember(email: string, password: string, remember: boolean) {
  return mutateJson<{ data: AuthUser }>("/api/auth/login", "POST", { email, password, remember });
}

export async function logout() {
  await mutateEmpty("/api/auth/logout", "POST");
}

export async function signUp(input: {
  displayName: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
}) {
  return mutateJson<{ data: AuthUser }>("/api/auth/signup", "POST", input);
}

export async function requestPasswordReset(email: string) {
  return mutateJson<{ data: { message: string } }>(
    "/api/auth/forgot-password",
    "POST",
    { email }
  );
}

export async function resetPassword(token: string, password: string) {
  return mutateJson<{ data: { message: string } }>(
    "/api/auth/reset-password",
    "POST",
    { token, password }
  );
}

export async function updateProfile(input: {
  displayName: string;
  email: string;
  phone: string;
  jobTitle: string;
  profileImageData: string;
}) {
  return mutateJson<{ data: AuthUser }>("/api/auth/me/profile", "PUT", input);
}

export async function fetchSystems(query = "limit=100&sortBy=updatedAt&sortDirection=desc") {
  return getJson<SystemRecord[]>(`/api/system-records?${query}`);
}

export async function fetchSystem(id: number) {
  return getJson<SystemRecord>(`/api/system-records/${id}`);
}

export async function fetchSystemDependencies(id: number) {
  return getJson<SystemDependencySummary>(`/api/system-records/${id}/dependencies`);
}

export async function fetchSystemCategoryDetails(id: number) {
  return getJson<CategoryDetails>(`/api/system-records/${id}/category-details`);
}

export async function fetchSystemTags(id: number) {
  return getJson<DirectoryRecord[]>(`/api/system-records/${id}/tags`);
}

export async function addSystemTag(id: number, tagId: number) {
  return mutateJson<{ data: DirectoryRecord[] }>(`/api/system-records/${id}/tags`, "POST", {
    tagId
  });
}

export async function removeSystemTag(id: number, tagId: number) {
  await mutateEmpty(`/api/system-records/${id}/tags/${tagId}`, "DELETE");
}

export async function updateSystemCategoryDetails(id: number, input: DirectoryRecord) {
  return mutateJson<{ data: CategoryDetails }>(
    `/api/system-records/${id}/category-details`,
    "PUT",
    input
  );
}

export async function fetchAssetTypes() {
  return getJson<AssetType[]>("/api/asset-types");
}

export async function fetchReportSummaries() {
  return getJson<SystemReportSummary[]>("/api/reports");
}

export async function fetchReport(reportKey: string) {
  return getJson<SystemReport>(`/api/reports/${reportKey}`);
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

export async function deleteSystem(id: number) {
  await mutateEmpty(`/api/system-records/${id}`, "DELETE");
}

export async function importSystemsCsv(csvText: string) {
  const response = await fetch(`${API_BASE_URL}/api/system-records/import.csv`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "text/csv" },
    body: csvText
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  return (await response.json()) as {
    data: { created: SystemRecordMutationResult[]; errors: Array<{ row: number; message: string }> };
  };
}

export async function fetchVendors(query = "limit=100") {
  return getJson<Vendor[]>(`/api/vendors?${query}`);
}

export async function fetchVendor(id: number) {
  return getJson<Vendor>(`/api/vendors/${id}`);
}

export async function createVendor(input: VendorFormInput) {
  return mutateJson<{ data: Vendor }>("/api/vendors", "POST", input);
}

export async function updateVendor(id: number, input: VendorFormInput) {
  return mutateJson<{ data: Vendor }>(`/api/vendors/${id}`, "PUT", input);
}

export async function archiveVendor(id: number) {
  return mutateJson<{ data: Vendor }>(`/api/vendors/${id}/archive`, "POST");
}

export async function importVendorsCsv(csvText: string) {
  const response = await fetch(`${API_BASE_URL}/api/vendors/import.csv`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "text/csv" },
    body: csvText
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  return (await response.json()) as {
    data: { created: Vendor[]; errors: Array<{ row: number; message: string }> };
  };
}

export async function fetchDirectoryRecords(resource: DirectoryResource, query = "limit=100") {
  return getJson<DirectoryRecord[]>(`/api/${resource}?${query}`);
}

export async function fetchDirectoryRecord(resource: DirectoryResource, id: number) {
  return getJson<DirectoryRecord>(`/api/${resource}/${id}`);
}

export async function createDirectoryRecord(resource: DirectoryResource, input: DirectoryRecord) {
  return mutateJson<{ data: DirectoryRecord }>(`/api/${resource}`, "POST", input);
}

export async function updateDirectoryRecord(
  resource: DirectoryResource,
  id: number,
  input: DirectoryRecord
) {
  return mutateJson<{ data: DirectoryRecord }>(`/api/${resource}/${id}`, "PUT", input);
}

export async function archiveDirectoryRecord(resource: DirectoryResource, id: number) {
  return mutateJson<{ data: DirectoryRecord }>(`/api/${resource}/${id}/archive`, "POST");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

async function mutateJson<T>(
  path: string,
  method: "POST" | "PUT",
  body?:
    | SystemRecordFormInput
    | VendorFormInput
    | DirectoryRecord
    | { email: string; password: string }
    | { email: string; password: string; remember: boolean }
    | { token: string; password: string }
    | {
        displayName: string;
        email: string;
        password: string;
        phone: string;
        jobTitle: string;
      }
    | { email: string }
    | {
        displayName: string;
        email: string;
        phone: string;
        jobTitle: string;
        profileImageData: string;
      }
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  return (await response.json()) as T;
}

async function mutateEmpty(path: string, method: "DELETE" | "POST"): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include"
  });

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }
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
