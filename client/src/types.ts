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
  notes: string | null;
  archived_at: string | null;
  is_incomplete: 0 | 1;
  missing_fields: string;
  created_at: string;
  updated_at: string;
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
