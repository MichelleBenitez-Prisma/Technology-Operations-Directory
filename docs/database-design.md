# Initial Database Design

This design uses one central asset catalog with optional detail tables. That gives the directory a common search and review experience while still allowing different technology types to capture different operational facts.

## Primary Tables

### `technology_assets`

Central record for every tracked system or operational item.

Examples:

- Software application
- Website
- Server
- Database
- Vendor-hosted service
- Integration
- Scheduled process
- Internal tool
- Payment service
- Production system
- Retired system

Important fields include name, asset key, type, system status, criticality, ownership, URLs, review dates, archive timestamp, and support links.

### `asset_types`

Reference table for supported directory categories.

Initial values:

- `software_application`
- `website`
- `server`
- `database`
- `vendor_hosted_service`
- `integration`
- `scheduled_process`
- `internal_tool`
- `payment_service`
- `production_system`
- `retired_system`
- `other`

Production and retired state can also be represented with `asset_environments.environment_name` and `technology_assets.lifecycle_status`. The separate asset types exist because stakeholders may need to catalog broad production or retired systems that do not fit cleanly into another type. Archived records are tracked separately with `technology_assets.archived_at`.

Final business definitions for these categories are documented in `docs/category-definitions.md`.

### `teams` and `people`

Ownership and contact records. Assets can point to owner teams and individual business or technical owners.

### `vendors`

Third-party providers, support URLs, renewal dates, and account contact notes.

### Detail Tables

The following tables extend `technology_assets` when a record needs type-specific information:

- `application_details`
- `website_details`
- `server_details`
- `database_details`
- `vendor_service_details`
- `payment_service_details`

Payment service records must not store card numbers, bank account numbers, passwords, API keys, signing certificates, or other regulated secrets.

### `integrations`

Tracks system-to-system connections, including source, target, direction, protocol, schedule, criticality, owner, and documentation.

### `scheduled_processes`

Tracks recurring jobs and automations, including schedule, timezone, run location, last success date, failure notification channel, and runbook URL.

### `review_records`

Stores review history for assets. This supports the ongoing process of checking whether records are still accurate, missing information, or candidates for retirement.

### `tags` and `asset_tags`

Flexible labels for filtering and grouping assets across categories.

### `asset_search`

SQLite FTS5 virtual table used for full-text search over the main asset catalog.

## Design Principles

- Keep one central searchable catalog.
- Use reference tables for consistent categories.
- Avoid storing secrets.
- Track accountability through teams and people.
- Keep review history separate from the current asset record.
- Allow records to exist before all details are known.
- Support both internal systems and external vendor-managed systems.
- Keep categories data-driven so new asset types can be added without a database redesign.

## Phase One Boundaries

This schema is intentionally practical for a first version. Later phases may add authentication, audit logs, role-based access, file attachments, dependency mapping, and richer review workflows. Schema changes should be added through the migration runner in `scripts/migrate-database.mjs`.
