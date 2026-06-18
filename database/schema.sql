PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS asset_types (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    department TEXT,
    email TEXT,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE,
    title TEXT,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    website_url TEXT,
    support_url TEXT,
    account_manager_name TEXT,
    account_manager_email TEXT,
    contract_start_date TEXT,
    contract_end_date TEXT,
    renewal_notice_days INTEGER NOT NULL DEFAULT 90 CHECK (renewal_notice_days >= 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technology_assets (
    id INTEGER PRIMARY KEY,
    asset_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    asset_type_id INTEGER NOT NULL REFERENCES asset_types(id),
    lifecycle_status TEXT NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('active', 'development', 'being_replaced', 'maintenance_only', 'retired')),
    criticality TEXT NOT NULL DEFAULT 'medium'
        CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    data_classification TEXT NOT NULL DEFAULT 'internal'
        CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
    description TEXT,
    business_purpose TEXT,
    owner_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    technical_owner_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    business_owner_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    primary_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    production_url TEXT,
    repository_url TEXT,
    documentation_url TEXT,
    runbook_url TEXT,
    monitoring_url TEXT,
    support_channel TEXT,
    review_interval_days INTEGER NOT NULL DEFAULT 180 CHECK (review_interval_days > 0),
    last_reviewed_at TEXT,
    next_review_due_at TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_environments (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    environment_name TEXT NOT NULL
        CHECK (environment_name IN ('development', 'test', 'staging', 'production', 'disaster_recovery', 'other')),
    url TEXT,
    host_name TEXT,
    location TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (asset_id, environment_name, url, host_name)
);

CREATE TABLE IF NOT EXISTS application_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    platform TEXT,
    programming_language TEXT,
    framework TEXT,
    authentication_method TEXT,
    deployment_method TEXT,
    source_control_url TEXT,
    ci_cd_url TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS website_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    public_url TEXT,
    domain_name TEXT,
    cms_platform TEXT,
    domain_owner TEXT,
    ssl_renewal_date TEXT,
    analytics_url TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS server_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    host_name TEXT,
    operating_system TEXT,
    operating_system_version TEXT,
    ip_address TEXT,
    hosting_provider TEXT,
    region TEXT,
    backup_policy TEXT,
    patching_owner_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS database_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    engine TEXT,
    engine_version TEXT,
    database_name TEXT,
    host_asset_id INTEGER REFERENCES technology_assets(id) ON DELETE SET NULL,
    contains_pii INTEGER NOT NULL DEFAULT 0 CHECK (contains_pii IN (0, 1)),
    backup_schedule TEXT,
    retention_days INTEGER CHECK (retention_days IS NULL OR retention_days >= 0),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS vendor_service_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    hosting_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    service_url TEXT,
    service_tier TEXT,
    sla_description TEXT,
    contract_owner_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    support_level TEXT,
    data_residency TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS payment_service_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    processor_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
    payment_service_role TEXT
        CHECK (payment_service_role IS NULL OR payment_service_role IN ('processor', 'gateway', 'merchant_account', 'billing', 'fraud', 'settlement', 'other')),
    payment_method_types TEXT,
    pci_scope TEXT NOT NULL DEFAULT 'unknown'
        CHECK (pci_scope IN ('out_of_scope', 'saq_a', 'saq_a_ep', 'saq_d', 'unknown')),
    tokenization_enabled INTEGER NOT NULL DEFAULT 0 CHECK (tokenization_enabled IN (0, 1)),
    settlement_frequency TEXT,
    compliance_notes TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS system_record_details (
    asset_id INTEGER PRIMARY KEY REFERENCES technology_assets(id) ON DELETE CASCADE,
    business_department TEXT,
    department_owner TEXT,
    technical_owner TEXT,
    vendor TEXT,
    support_contact TEXT,
    hosting_location TEXT,
    server_name TEXT,
    database_name TEXT,
    test_url TEXT,
    password_vault_reference TEXT,
    renewal_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_vendors (
    asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'provider'
        CHECK (relationship_type IN ('provider', 'support', 'hosting', 'implementation', 'consulting', 'other')),
    contract_reference TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (asset_id, vendor_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    source_asset_id INTEGER REFERENCES technology_assets(id) ON DELETE SET NULL,
    target_asset_id INTEGER REFERENCES technology_assets(id) ON DELETE SET NULL,
    source_external_name TEXT,
    target_external_name TEXT,
    integration_type TEXT NOT NULL DEFAULT 'api'
        CHECK (integration_type IN ('api', 'file_transfer', 'database', 'webhook', 'message_queue', 'etl', 'manual', 'other')),
    direction TEXT NOT NULL DEFAULT 'bidirectional'
        CHECK (direction IN ('inbound', 'outbound', 'bidirectional')),
    protocol TEXT,
    data_description TEXT,
    schedule_description TEXT,
    criticality TEXT NOT NULL DEFAULT 'medium'
        CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    lifecycle_status TEXT NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('active', 'development', 'being_replaced', 'maintenance_only', 'retired')),
    owner_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    documentation_url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        source_asset_id IS NOT NULL
        OR source_external_name IS NOT NULL
    ),
    CHECK (
        target_asset_id IS NOT NULL
        OR target_external_name IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS scheduled_processes (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER REFERENCES technology_assets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    schedule_kind TEXT NOT NULL DEFAULT 'cron'
        CHECK (schedule_kind IN ('cron', 'fixed_interval', 'manual', 'event_driven', 'other')),
    schedule_expression TEXT,
    schedule_timezone TEXT NOT NULL DEFAULT 'UTC',
    command_or_job_name TEXT,
    run_location_asset_id INTEGER REFERENCES technology_assets(id) ON DELETE SET NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('active', 'development', 'being_replaced', 'maintenance_only', 'retired')),
    owner_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    last_known_success_at TEXT,
    failure_notification_channel TEXT,
    runbook_url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_records (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    review_status TEXT NOT NULL DEFAULT 'approved'
        CHECK (review_status IN ('approved', 'needs_updates', 'retirement_candidate')),
    notes TEXT,
    next_review_due_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (asset_id, tag_id)
);

CREATE TABLE IF NOT EXISTS asset_attributes (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    attribute_name TEXT NOT NULL,
    attribute_value TEXT,
    is_sensitive INTEGER NOT NULL DEFAULT 0 CHECK (is_sensitive IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (asset_id, attribute_name)
);

CREATE VIRTUAL TABLE IF NOT EXISTS asset_search USING fts5(
    asset_key,
    name,
    description,
    business_purpose,
    content='technology_assets',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS technology_assets_ai
AFTER INSERT ON technology_assets
BEGIN
    INSERT INTO asset_search(rowid, asset_key, name, description, business_purpose)
    VALUES (new.id, new.asset_key, new.name, new.description, new.business_purpose);
END;

CREATE TRIGGER IF NOT EXISTS technology_assets_ad
AFTER DELETE ON technology_assets
BEGIN
    INSERT INTO asset_search(asset_search, rowid, asset_key, name, description, business_purpose)
    VALUES ('delete', old.id, old.asset_key, old.name, old.description, old.business_purpose);
END;

CREATE TRIGGER IF NOT EXISTS technology_assets_au
AFTER UPDATE ON technology_assets
BEGIN
    INSERT INTO asset_search(asset_search, rowid, asset_key, name, description, business_purpose)
    VALUES ('delete', old.id, old.asset_key, old.name, old.description, old.business_purpose);

    INSERT INTO asset_search(rowid, asset_key, name, description, business_purpose)
    VALUES (new.id, new.asset_key, new.name, new.description, new.business_purpose);
END;

CREATE VIEW IF NOT EXISTS system_record_view AS
SELECT
    technology_assets.id,
    technology_assets.asset_key,
    technology_assets.name AS system_name,
    technology_assets.description,
    asset_types.code AS category_code,
    asset_types.name AS category_name,
    technology_assets.lifecycle_status AS status,
    system_record_details.business_department,
    system_record_details.department_owner,
    system_record_details.technical_owner,
    system_record_details.vendor,
    system_record_details.support_contact,
    system_record_details.hosting_location,
    system_record_details.server_name,
    system_record_details.database_name,
    technology_assets.production_url,
    system_record_details.test_url,
    technology_assets.documentation_url,
    system_record_details.password_vault_reference,
    system_record_details.renewal_date,
    technology_assets.last_reviewed_at AS last_review_date,
    system_record_details.notes,
    technology_assets.archived_at,
    CASE
        WHEN NULLIF(TRIM(technology_assets.name), '') IS NULL
            OR NULLIF(TRIM(IFNULL(technology_assets.description, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(asset_types.code, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(technology_assets.lifecycle_status, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.business_department, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.department_owner, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.technical_owner, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.support_contact, '')), '') IS NULL
        THEN 1
        ELSE 0
    END AS is_incomplete,
    TRIM(
        CASE WHEN NULLIF(TRIM(technology_assets.name), '') IS NULL THEN 'system_name,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(technology_assets.description, '')), '') IS NULL THEN 'description,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(asset_types.code, '')), '') IS NULL THEN 'category,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(technology_assets.lifecycle_status, '')), '') IS NULL THEN 'status,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.business_department, '')), '') IS NULL THEN 'business_department,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.department_owner, '')), '') IS NULL THEN 'department_owner,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.technical_owner, '')), '') IS NULL THEN 'technical_owner,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.support_contact, '')), '') IS NULL THEN 'support_contact,' ELSE '' END,
        ','
    ) AS missing_fields,
    technology_assets.created_at,
    technology_assets.updated_at
FROM technology_assets
JOIN asset_types ON asset_types.id = technology_assets.asset_type_id
LEFT JOIN system_record_details ON system_record_details.asset_id = technology_assets.id;

CREATE INDEX IF NOT EXISTS idx_people_team_id ON people(team_id);
CREATE INDEX IF NOT EXISTS idx_assets_type_id ON technology_assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner_team_id ON technology_assets(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_assets_technical_owner ON technology_assets(technical_owner_person_id);
CREATE INDEX IF NOT EXISTS idx_assets_business_owner ON technology_assets(business_owner_person_id);
CREATE INDEX IF NOT EXISTS idx_assets_primary_vendor ON technology_assets(primary_vendor_id);
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle_status ON technology_assets(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON technology_assets(criticality);
CREATE INDEX IF NOT EXISTS idx_assets_next_review_due ON technology_assets(next_review_due_at);
CREATE INDEX IF NOT EXISTS idx_assets_archived_at ON technology_assets(archived_at);
CREATE INDEX IF NOT EXISTS idx_environments_asset_id ON asset_environments(asset_id);
CREATE INDEX IF NOT EXISTS idx_vendor_service_hosting_vendor ON vendor_service_details(hosting_vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_service_processor_vendor ON payment_service_details(processor_vendor_id);
CREATE INDEX IF NOT EXISTS idx_system_record_business_department ON system_record_details(business_department);
CREATE INDEX IF NOT EXISTS idx_system_record_vendor ON system_record_details(vendor);
CREATE INDEX IF NOT EXISTS idx_system_record_server_name ON system_record_details(server_name);
CREATE INDEX IF NOT EXISTS idx_system_record_database_name ON system_record_details(database_name);
CREATE INDEX IF NOT EXISTS idx_integrations_source_asset ON integrations(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_integrations_target_asset ON integrations(target_asset_id);
CREATE INDEX IF NOT EXISTS idx_integrations_owner_team ON integrations(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_processes_asset_id ON scheduled_processes(asset_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_processes_owner_team ON scheduled_processes(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_review_records_asset_id ON review_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_attributes_asset_id ON asset_attributes(asset_id);
