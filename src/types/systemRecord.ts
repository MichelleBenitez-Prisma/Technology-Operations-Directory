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

export type SystemRecordWarning = {
  code: "duplicate_system_name";
  message: string;
  matchingSystemIds: number[];
};

export type SystemRecordQualityWarning = {
  code:
    | "missing_description"
    | "missing_technical_owner"
    | "missing_vendor"
    | "missing_support_contact"
    | "missing_documentation_link"
    | "missing_hosting_information"
    | "missing_last_review_date"
    | "renewal_date_approaching"
    | "last_review_overdue";
  message: string;
};

export type SystemRecordMutationResult = {
  data: SystemRecord;
  warnings: SystemRecordWarning[];
};

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
  replacement_system: string | null;
  retirement_notes: string | null;
  notes: string | null;
  archived_at: string | null;
  is_incomplete: 0 | 1;
  missing_fields: string;
  quality_warnings: SystemRecordQualityWarning[];
  quality_warning_count: number;
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
  replacementSystem?: string | null;
  retirementNotes?: string | null;
  notes?: string | null;
};

export type UpdateSystemRecordInput = Partial<CreateSystemRecordInput>;
