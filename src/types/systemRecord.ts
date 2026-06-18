export const SYSTEM_STATUSES = [
  "planned",
  "active",
  "maintenance",
  "deprecated",
  "retired",
  "archived"
] as const;

export type SystemStatus = (typeof SYSTEM_STATUSES)[number];

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
  created_at: string;
  updated_at: string;
};

export type CreateSystemRecordInput = {
  systemName: string;
  description: string;
  categoryCode: string;
  status: SystemStatus;
  businessDepartment?: string;
  departmentOwner?: string;
  technicalOwner?: string;
  vendor?: string;
  supportContact?: string;
  hostingLocation?: string;
  serverName?: string;
  databaseName?: string;
  productionUrl?: string;
  testUrl?: string;
  documentationLink?: string;
  passwordVaultReference?: string;
  renewalDate?: string;
  lastReviewDate?: string;
  notes?: string;
};

