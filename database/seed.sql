PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO asset_types (code, name, description) VALUES
    ('software_application', 'Software Application', 'Business or technical software application.'),
    ('website', 'Website', 'Public or internal website.'),
    ('server', 'Server', 'Physical, virtual, or cloud server.'),
    ('database', 'Database', 'Database instance, schema, or managed database service.'),
    ('vendor', 'Vendor', 'External vendor, provider, or managed platform.'),
    ('integration', 'Integration', 'System-to-system connection or data exchange.'),
    ('scheduled_process', 'Scheduled Process', 'Recurring job, automation, or batch process.'),
    ('internal_tool', 'Internal Tool', 'Tool used by internal teams.'),
    ('other', 'Other', 'Tracked technology item that does not fit another category.');

INSERT OR IGNORE INTO teams (name, department, email, description) VALUES
    ('Technology Operations', 'Technology', NULL, 'Owns operational readiness, reviews, and support processes.'),
    ('Application Development', 'Technology', NULL, 'Builds and maintains internally developed applications.'),
    ('Infrastructure', 'Technology', NULL, 'Owns servers, hosting, networking, and platform infrastructure.'),
    ('Data Services', 'Technology', NULL, 'Owns databases, reporting, and data movement.'),
    ('Security', 'Technology', NULL, 'Owns security review and compliance guidance.');

INSERT OR IGNORE INTO tags (name, description) VALUES
    ('business-critical', 'Important to core business operations.'),
    ('contains-pii', 'Stores or processes personally identifiable information.'),
    ('vendor-managed', 'Primarily operated by an external vendor.'),
    ('requires-review', 'Needs additional validation or missing key details.'),
    ('production', 'Used in a production environment.');

