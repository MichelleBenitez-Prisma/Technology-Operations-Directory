# Category Definitions

These are the confirmed phase-one category names and definitions for the Technology Operations Directory.

Additional categories may be added later when necessary. New categories should be added through the `asset_types` reference table and documented here.

## Category Reference

| Category Name | Definition | Included | Excluded |
| --- | --- | --- | --- |
| Software Application | A software system used by employees or departments to perform business functions. | Pace, Control, CRM systems, ERP systems, desktop applications, web applications | Websites, databases, servers |
| Website | A public or internal website accessed through a web browser. | Company websites, intranet sites, department portals | Backend databases, APIs, standalone applications |
| Server | A physical or virtual machine that hosts applications, services, or data. | Windows servers, Linux servers, cloud virtual machines | Software applications, databases |
| Database | A structured data storage system used by applications and reporting tools. | SQL Server, MySQL, PostgreSQL, SQLite databases | Applications, websites, file storage systems |
| Vendor-Hosted Service | A technology service hosted and managed by an external vendor. | Microsoft 365, Salesforce, DocuSign, SaaS platforms | Internally hosted applications |
| Integration | A connection that transfers data or functionality between systems. | APIs, data feeds, system connectors, webhooks | Standalone applications or websites |
| Scheduled Process | An automated job that runs at specific times or intervals. | Batch jobs, imports, exports, nightly processes, scheduled scripts | Manual processes, interactive applications |
| Internal Tool | A tool developed or maintained primarily for internal employee use. | Custom utilities, admin dashboards, support tools | Commercial vendor software |
| Payment Service | A system used to process, validate, or manage payments. | Payment Gateway, merchant processing systems, payment portals | General business applications |
| Production System | A critical live system actively used for business operations. | Customer-facing systems, operational platforms, live databases | Test, development, or retired systems |
| Retired System | A system that is no longer in use but is kept for historical reference. | Decommissioned applications, replaced systems, archived services | Active or maintenance-only systems |

## Classification Notes

When an item fits both a functional category and an operational state, choose the category that best supports search and review.

For example, a live SQL Server database can be categorized as `Database` and marked with the `production` environment. Use `Production System` when the item is best understood as a broad live operational system rather than a specific application, website, server, or database.

For example, a decommissioned CRM application can be categorized as `Retired System` if its primary purpose in the directory is historical reference. If the team still needs detailed application ownership and technical metadata, it can remain categorized as `Software Application` with a retired lifecycle status.

Payment service records must never store card numbers, bank account numbers, passwords, API keys, signing certificates, or other secrets. Store only operational metadata and links to approved secure systems.

