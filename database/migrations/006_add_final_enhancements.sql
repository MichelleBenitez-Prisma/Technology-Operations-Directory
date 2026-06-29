CREATE TABLE IF NOT EXISTS document_references (
    id INTEGER PRIMARY KEY,
    asset_id INTEGER REFERENCES technology_assets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    document_type TEXT,
    notes TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_references_asset_id ON document_references(asset_id);
CREATE INDEX IF NOT EXISTS idx_document_references_archived ON document_references(archived_at);

CREATE TABLE IF NOT EXISTS custom_fields (
    id INTEGER PRIMARY KEY,
    asset_type_id INTEGER REFERENCES asset_types(id) ON DELETE SET NULL,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text'
        CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'url')),
    required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
    help_text TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_type_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_asset_type_id ON custom_fields(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_archived ON custom_fields(archived_at);
