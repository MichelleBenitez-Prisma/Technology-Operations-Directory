ALTER TABLE vendors
ADD COLUMN description TEXT;

ALTER TABLE vendors
ADD COLUMN support_email TEXT;

ALTER TABLE vendors
ADD COLUMN support_phone TEXT;

ALTER TABLE vendors
ADD COLUMN support_portal_url TEXT;

ALTER TABLE vendors
ADD COLUMN account_representative TEXT;

ALTER TABLE vendors
ADD COLUMN contract_notes TEXT;

ALTER TABLE vendors
ADD COLUMN renewal_notes TEXT;

ALTER TABLE vendors
ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_vendors_archived_at ON vendors(archived_at);