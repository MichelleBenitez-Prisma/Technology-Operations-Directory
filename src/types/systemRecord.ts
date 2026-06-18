export const SYSTEM_STATUSES = [
  "active",
  "development",
  "being_replaced",
  "maintenance_only",
  "retired"
] as const;

export type SystemStatus = (typeof SYSTEM_STATUSES)[number];

export const SYSTEM_STATUS_LABELS: Record<SystemStatus, string> = {
  active: "Active",
  development: "Development",
  being_replaced: "Being Replaced",
  maintenance_only: "Maintenance Only",
  retired: "Retired"
};

export const SYSTEM_RECORD_SORT_FIELDS = [
  "systemName",
  "category",
  "status",
  "businessDepartment",
  "departmentOwner",
  "technicalOwner",
  "vendor",
  "hostingLocation",
  "renewalDate",
  "lastReviewDate",
  "updatedAt",
  "createdAt"
] as const;

export type SystemRecordSortField = (typeof SYSTEM_RECORD_SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

export type SystemRecord = {
  id: number;
  asset_key: string;
  system_name: string;
  description: string;
  category_code: string;
  category_name: string;
  status: SystemStatus;
  business_department: string | null;
  department_owner: string | null;
  technical_owner: string | null;
  vendor: string | null;
  support_contact: string | null;
  hosting_location: string | null;
  server_name: string | null;
  database_name: string | null;
  production_url: string | null;
  test_url: string | null;
  documentation_url: string | null;
  password_vault_reference: string | null;
  renewal_date: string | null;
  last_review_date: string | null;
  notes: string | null;
  archived_at: string | null;
  is_incomplete: 0 | 1;
  missing_fields: string;
  created_at: string;
  updated_at: string;
};

export type CreateSystemRecordInput = {
  systemName: string;
  description: string;
  categoryCode: string;
  status: SystemStatus;
  businessDepartment?: string | null;
  departmentOwner?: string | null;
  technicalOwner?: string | null;
  vendor?: string | null;
  supportContact?: string | null;
  hostingLocation?: string | null;
  serverName?: string | null;
  databaseName?: string | null;
  productionUrl?: string | null;
  testUrl?: string | null;
  documentationLink?: string | null;
  passwordVaultReference?: string | null;
  renewalDate?: string | null;
  lastReviewDate?: string | null;
  notes?: string | null;
};

export type UpdateSystemRecordInput = Partial<CreateSystemRecordInput>;
