ALTER TABLE integrations
ADD COLUMN archived_at TEXT;

ALTER TABLE scheduled_processes
ADD COLUMN archived_at TEXT;

ALTER TABLE review_records
ADD COLUMN archived_at TEXT;

ALTER TABLE review_records
ADD COLUMN updated_at TEXT;

ALTER TABLE tags
ADD COLUMN archived_at TEXT;

ALTER TABLE tags
ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS system_dependencies (
    id INTEGER PRIMARY KEY,
    source_asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    destination_asset_id INTEGER NOT NULL REFERENCES technology_assets(id) ON DELETE CASCADE,
    relationship_description TEXT NOT NULL,
    data_or_service_exchanged TEXT,
    importance_level TEXT NOT NULL DEFAULT 'standard'
        CHECK (importance_level IN ('critical', 'important', 'standard')),
    notes TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (source_asset_id <> destination_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_system_dependencies_source ON system_dependencies(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_system_dependencies_destination ON system_dependencies(destination_asset_id);
CREATE INDEX IF NOT EXISTS idx_system_dependencies_archived ON system_dependencies(archived_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_dependencies_unique_active
ON system_dependencies (
    source_asset_id,
    destination_asset_id,
    relationship_description,
    IFNULL(data_or_service_exchanged, '')
)
WHERE archived_at IS NULL;

INSERT OR IGNORE INTO system_dependencies (
    source_asset_id,
    destination_asset_id,
    relationship_description,
    data_or_service_exchanged,
    importance_level,
    notes
)
VALUES
    (
        (SELECT id FROM technology_assets WHERE asset_key = 'DOKSHOP'),
        (SELECT id FROM technology_assets WHERE asset_key = 'PACE'),
        'Storefront sends order information to production.',
        'Order details and job ticket data',
        'critical',
        'If DokShop fails, production order intake may be delayed.'
    ),
    (
        (SELECT id FROM technology_assets WHERE asset_key = 'TECH-DEPT-WEBSITE'),
        (SELECT id FROM technology_assets WHERE asset_key = 'CONTROL'),
        'Website depends on an internal API.',
        'Status and control API responses',
        'important',
        'Useful for impact review during legacy replacement.'
    ),
    (
        (SELECT id FROM technology_assets WHERE asset_key = 'INTERNAL-REPORTING-DB'),
        (SELECT id FROM technology_assets WHERE asset_key = 'PACE'),
        'Reporting database depends on production system data.',
        'Production job and billing data extracts',
        'standard',
        'Reporting may be stale if the production system is unavailable.'
    );