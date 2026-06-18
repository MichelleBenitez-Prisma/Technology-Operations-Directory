PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO asset_types (code, name, description) VALUES
    ('software_application', 'Software Application', 'A software system used by employees or departments to perform business functions.'),
    ('website', 'Website', 'A public or internal website accessed through a web browser.'),
    ('server', 'Server', 'A physical or virtual machine that hosts applications, services, or data.'),
    ('database', 'Database', 'A structured data storage system used by applications and reporting tools.'),
    ('vendor_hosted_service', 'Vendor-Hosted Service', 'A technology service hosted and managed by an external vendor.'),
    ('integration', 'Integration', 'A connection that transfers data or functionality between systems.'),
    ('scheduled_process', 'Scheduled Process', 'An automated job that runs at specific times or intervals.'),
    ('internal_tool', 'Internal Tool', 'A tool developed or maintained primarily for internal employee use.'),
    ('payment_service', 'Payment Service', 'A system used to process, validate, or manage payments.'),
    ('production_system', 'Production System', 'A critical live system actively used for business operations.'),
    ('retired_system', 'Retired System', 'A system that is no longer in use but is kept for historical reference.'),
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
