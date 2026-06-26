INSERT OR IGNORE INTO asset_types (code, name, description)
VALUES
    ('software_application', 'Software Application', 'A software system used by employees or departments to perform business functions.'),
    ('website', 'Website', 'A public or internal website accessed through a web browser.'),
    ('database', 'Database', 'A structured data storage system used by applications and reporting tools.'),
    ('scheduled_process', 'Scheduled Process', 'An automated job that runs at specific times or intervals.'),
    ('internal_tool', 'Internal Tool', 'A tool developed or maintained primarily for internal employee use.'),
    ('payment_service', 'Payment Service', 'A system used to process, validate, or manage payments.'),
    ('production_system', 'Production System', 'A critical live system actively used for business operations.');

INSERT OR IGNORE INTO technology_assets (
    asset_key,
    name,
    asset_type_id,
    lifecycle_status,
    description,
    production_url,
    documentation_url,
    support_channel,
    last_reviewed_at
)
VALUES
    ('DOKSHOP', 'DokShop', (SELECT id FROM asset_types WHERE code = 'software_application'), 'being_replaced', 'Legacy storefront order management system used by print operations.', 'https://dokshop.example.com', 'https://docs.example.com/dokshop', 'Technology Support', '2026-05-15'),
    ('PACE', 'Pace', (SELECT id FROM asset_types WHERE code = 'production_system'), 'active', 'Production workflow and job tracking system for printing operations.', 'https://pace.example.com', 'https://docs.example.com/pace', 'Technology Operations', '2026-06-01'),
    ('CONTROL', 'Control', (SELECT id FROM asset_types WHERE code = 'internal_tool'), 'maintenance_only', 'Internal control and reporting tool kept online during replacement planning.', 'https://control.example.com', NULL, 'Application Development', NULL),
    ('PAYMENT-GATEWAY', 'Payment Gateway', (SELECT id FROM asset_types WHERE code = 'payment_service'), 'active', 'Routes payment authorization requests to the approved processor.', 'https://payments.example.com', 'https://docs.example.com/payment-gateway', 'Finance Systems Support', '2026-04-20'),
    ('STOREFRONT-IMPORTER', 'Storefront Importer', (SELECT id FROM asset_types WHERE code = 'scheduled_process'), 'active', 'Nightly import process that moves storefront orders into production systems.', NULL, 'https://docs.example.com/storefront-importer', 'Data Services', '2026-05-30'),
    ('INTERNAL-REPORTING-DB', 'Internal Reporting Database', (SELECT id FROM asset_types WHERE code = 'database'), 'active', 'Reporting database used by Technology and operations leadership.', NULL, 'https://docs.example.com/internal-reporting-db', 'Data Services', '2026-06-10'),
    ('TECH-DEPT-WEBSITE', 'Technology Department Website', (SELECT id FROM asset_types WHERE code = 'website'), 'retired', 'Former internal Technology department website retained for historical reference.', 'https://technology.example.com', NULL, NULL, '2025-12-01');

INSERT OR IGNORE INTO system_record_details (
    asset_id,
    business_department,
    department_owner,
    technical_owner,
    vendor,
    support_contact,
    hosting_location,
    server_name,
    database_name,
    test_url,
    password_vault_reference,
    renewal_date,
    replacement_system,
    retirement_notes,
    notes
)
VALUES
    ((SELECT id FROM technology_assets WHERE asset_key = 'DOKSHOP'), 'Print Operations', 'Operations Leadership', 'Application Development', 'Internal', 'Technology Support', 'On-premises', 'DOKSHOP-APP-01', 'DokShopDb', 'https://test-dokshop.example.com', 'Vault/Technology/DokShop', '2026-07-31', 'Acquirer Storefront Platform', 'Track until all storefront order workflows are moved to the acquiring company platform.', 'Demo record for replacement tracking.'),
    ((SELECT id FROM technology_assets WHERE asset_key = 'PACE'), 'Print Operations', 'Plant Operations', 'Technology Operations', 'EFI', 'Technology Operations', 'Vendor-hosted', NULL, 'PaceProduction', 'https://test-pace.example.com', 'Vault/Technology/Pace', '2026-08-15', NULL, NULL, 'Demo production system with complete ownership information.'),
    ((SELECT id FROM technology_assets WHERE asset_key = 'CONTROL'), 'Technology', 'Technology Leadership', NULL, 'Internal', 'Application Development', 'Azure', 'CONTROL-APP-01', 'ControlDb', NULL, 'Vault/Technology/Control', NULL, 'Enterprise Control Portal', 'Retain in maintenance-only mode until reports are replaced.', 'Missing technical owner and documentation for dashboard attention states.'),
    ((SELECT id FROM technology_assets WHERE asset_key = 'PAYMENT-GATEWAY'), 'Finance', 'Finance Operations', 'Application Development', 'Approved Processor', 'Finance Systems Support', 'Vendor-hosted', NULL, NULL, 'https://test-payments.example.com', 'Vault/Technology/PaymentGateway', '2026-09-01', NULL, NULL, 'Do not store payment credentials or card data in this directory.'),
    ((SELECT id FROM technology_assets WHERE asset_key = 'STOREFRONT-IMPORTER'), 'Print Operations', 'Operations Leadership', 'Data Services', 'Internal', 'Data Services', 'Windows Task Scheduler', 'BATCH-01', 'OrderImportDb', NULL, 'Vault/Technology/StorefrontImporter', NULL, 'Acquirer Order Integration', 'Retire after order feeds are moved to the new platform.', 'Runs nightly and should be reviewed with storefront replacement work.'),
    ((SELECT id FROM technology_assets WHERE asset_key = 'INTERNAL-REPORTING-DB'), 'Technology', 'Technology Operations', 'Data Services', 'Internal', 'Data Services', 'SQL Server', 'SQL-RPT-01', 'TechnologyReporting', NULL, 'Vault/Technology/InternalReportingDb', NULL, NULL, NULL, 'Supports dashboard and leadership reporting examples.'),
    ((SELECT id FROM technology_assets WHERE asset_key = 'TECH-DEPT-WEBSITE'), 'Technology', 'Technology Operations', 'Technology Operations', 'Internal', 'Technology Support', 'Legacy IIS', 'WEB-LEGACY-01', NULL, NULL, NULL, NULL, 'Corporate Intranet Technology Hub', 'Retired after acquisition. Keep record for old inventory and redirect history.', 'Retired sample record.');
