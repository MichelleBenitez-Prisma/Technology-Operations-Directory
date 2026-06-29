export type SystemStatus =
  | "active"
  | "development"
  | "being_replaced"
  | "maintenance_only"
  | "retired";

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

export type SystemRecordFormInput = {
  systemName: string;
  description: string;
  categoryCode: string;
  status: SystemStatus;
  businessDepartment: string;
  departmentOwner: string;
  technicalOwner: string;
  vendor: string;
  supportContact: string;
  hostingLocation: string;
  serverName: string;
  databaseName: string;
  productionUrl: string;
  testUrl: string;
  documentationLink: string;
  passwordVaultReference: string;
  renewalDate: string;
  lastReviewDate: string;
  replacementSystem: string;
  retirementNotes: string;
  notes: string;
};

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

export type AssetType = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type Vendor = {
  id: number;
  name: string;
  description: string | null;
  website_url: string | null;
  support_url: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_portal_url: string | null;
  account_manager_name: string | null;
  account_manager_email: string | null;
  account_representative: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  renewal_notice_days: number | null;
  contract_notes: string | null;
  renewal_notes: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VendorFormInput = {
  name: string;
  description: string;
  website_url: string;
  support_email: string;
  support_phone: string;
  support_portal_url: string;
  account_representative: string;
  contract_start_date: string;
  contract_end_date: string;
  renewal_notice_days: string;
  contract_notes: string;
  renewal_notes: string;
  notes: string;
};

export type AuthUser = {
  id: number;
  email: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  profile_image_data: string | null;
  role: "viewer" | "editor" | "admin";
};

export type DirectoryResource =
  | "integrations"
  | "scheduled-processes"
  | "reviews"
  | "tags"
  | "system-dependencies"
  | "document-references"
  | "custom-fields";

export type DirectoryRecord = Record<string, string | number | null>;

export type DependencyImportance = "critical" | "important" | "standard";

export type SystemDependency = {
  id: number;
  source_asset_id: number;
  destination_asset_id: number;
  relationship_description: string;
  data_or_service_exchanged: string | null;
  importance_level: DependencyImportance;
  notes: string | null;
  archived_at: string | null;
  related_system_id: number;
  related_system_name: string;
  related_category_name: string;
  related_status: SystemStatus;
};

export type SystemDependencySummary = {
  dependsOn: SystemDependency[];
  dependedOnBy: SystemDependency[];
};

export type CategoryDetails = {
  categoryCode: string;
  categoryName: string;
  fields: DirectoryRecord | null;
};

export type DashboardTotals = {
  total: number;
  archived: number;
  incomplete: number;
  missingDocumentation: number;
  withoutTechnicalOwner: number;
  byStatus: Array<{
    status: SystemStatus;
    label: string;
    count: number;
  }>;
  byCategory: Array<{
    category_code: string;
    category_name: string;
    count: number;
  }>;
  upcomingRenewals: SystemRecord[];
  recentlyUpdated: SystemRecord[];
  missingDocumentationRecords: SystemRecord[];
  withoutTechnicalOwnerRecords: SystemRecord[];
};

export type SystemReportKey =
  | "active-systems"
  | "being-replaced"
  | "retired-systems"
  | "missing-documentation"
  | "missing-owners"
  | "upcoming-renewals"
  | "by-vendor"
  | "by-category"
  | "by-owner"
  | "by-criticality"
  | "by-lifecycle"
  | "recently-reviewed"
  | "review-due"
  | "data-quality";

export type SystemReportSummary = {
  key: SystemReportKey;
  title: string;
  description: string;
  count: number;
};

export type SystemReport = SystemReportSummary & {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null>>;
};
