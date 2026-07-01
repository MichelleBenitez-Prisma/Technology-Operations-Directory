# Backend API Documentation

This document describes the phase-two backend API for the Technology Operations Directory.

## Base URL

Local development:

```text
http://localhost:3001
```

## Response Format

Successful read responses return:

```json
{
  "data": {}
}
```

Create and update responses return:

```json
{
  "data": {},
  "warnings": []
}
```

Validation errors return:

```json
{
  "error": "Validation Error",
  "issues": []
}
```

Unauthorized requests return:

```json
{
  "error": "Unauthorized",
  "message": "Please sign in to continue."
}
```

Forbidden requests return:

```json
{
  "error": "Forbidden",
  "message": "editor access is required for this action."
}
```

Repository-level validation errors, such as an unknown category, return:

```json
{
  "error": "Validation Error",
  "message": "Unknown category code: example"
}
```

## System Status Values

Use these API values:

| API Value          | Display Label    |
| ------------------ | ---------------- |
| `active`           | Active           |
| `development`      | Development      |
| `being_replaced`   | Being Replaced   |
| `maintenance_only` | Maintenance Only |
| `retired`          | Retired          |

Archived records are tracked separately with `archived_at`.

## Authentication

Authentication uses an HttpOnly `tod_session` cookie.

| Method | Path                        | Purpose                               |
| ------ | --------------------------- | ------------------------------------- |
| `POST` | `/api/auth/login`           | Sign in with email/password           |
| `POST` | `/api/auth/logout`          | Clear the current session             |
| `GET`  | `/api/auth/me`              | Return the signed-in user             |
| `GET`  | `/api/auth/users`           | Admin-only list of active users       |
| `PATCH` | `/api/auth/users/:id/role` | Admin-only role update                |
| `POST` | `/api/auth/forgot-password` | Email a one-time password reset link  |
| `POST` | `/api/auth/reset-password`  | Set a new password with a reset token |

Password reset links require SMTP configuration. Reset tokens are stored only as hashes, expire after 30 minutes, and are single-use.

Roles:

- `viewer`: read-only access.
- `editor`: create, update, archive, and organization-level directory access.
- `admin`: delete, user access, server-wide settings, and administrator-level resource access.

The current user response includes a `permissions` array. Admins can use Profile Settings to grant active users either `editor` or `admin` access.

`/health` remains public for deployment health checks. Other API routes require a valid session when `AUTH_REQUIRED` is enabled.

## Validation Rules

- `systemName`, `description`, `categoryCode`, and `status` are required when creating a system record.
- Required text fields cannot be empty or whitespace only.
- URLs must begin with `http://` or `https://` and use valid URL formatting.
- Dates must use a real `YYYY-MM-DD` calendar date.
- `status` must match one of the allowed system status values.
- `categoryCode` must exist in `asset_types`.
- Duplicate active system names do not block saving, but create and update responses include a warning.

Duplicate name warning:

```json
{
  "code": "duplicate_system_name",
  "message": "Another active system record already uses this system name. Review the matching records before saving another copy.",
  "matchingSystemIds": [1]
}
```

## Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "technology-operations-directory-api"
}
```

### List Asset Types

```http
GET /api/asset-types
```

Returns seeded system categories.

Asset types also support:

```http
GET /api/asset-types/:id
POST /api/asset-types
PUT /api/asset-types/:id
PATCH /api/asset-types/:id
DELETE /api/asset-types/:id
```

### Directory Resource Endpoints

The supporting directory tables use the same basic endpoint pattern:

```http
GET /api/<resource>
GET /api/<resource>/:id
POST /api/<resource>
PUT /api/<resource>/:id
PATCH /api/<resource>/:id
DELETE /api/<resource>/:id
```

Supported resources:

- `teams`
- `people`
- `vendors`
- `asset-environments`
- `integrations`
- `system-dependencies`
- `scheduled-processes`
- `reviews`
- `tags`

List endpoints support:

| Parameter         | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `search`          | Searches the main text fields for the resource.                |
| `includeArchived` | Includes archived records for resources that support archive.  |
| `archivedOnly`    | Returns only archived records for resources that support archive. |
| `limit`           | Page size, from 1 to 100.                                      |
| `offset`          | Starting row offset.                                           |

### Phase 5 Dependencies

```http
GET /api/system-records/:id/dependencies
GET /api/system-records/:id/category-details
PUT /api/system-records/:id/category-details
GET /api/system-records/:id/tags
POST /api/system-records/:id/tags
DELETE /api/system-records/:id/tags/:tagId
POST /api/system-dependencies
PUT /api/system-dependencies/:id
POST /api/system-dependencies/:id/archive
```

Dependency records include `source_asset_id`, `destination_asset_id`,
`relationship_description`, `data_or_service_exchanged`, `importance_level`, and
`notes`. `importance_level` must be `critical`, `important`, or `standard`.

The dependency summary endpoint returns `dependsOn` and `dependedOnBy` lists so a
system detail page can show upstream dependencies and downstream impact.

### Vendor Directory

```http
POST /api/vendors/:id/archive
```

Archives a vendor by setting `archived_at`. Vendor list responses exclude archived vendors by default.

Vendor create and update requests support:

- `name`
- `description`
- `website_url`
- `support_email`
- `support_phone`
- `support_portal_url`
- `account_representative`
- `contract_start_date`
- `contract_end_date`
- `renewal_notice_days`
- `contract_notes`
- `renewal_notes`
- `notes`

Existing compatibility fields are still accepted, including `support_url`,
`account_manager_name`, and `account_manager_email`.

### Global Asset Search

```http
GET /api/search?query=payroll
```

Searches technology assets through the SQLite FTS5 `asset_search` index and
returns matching asset ids, keys, names, descriptions, categories, statuses, and
archive state.

### Create System Record

```http
POST /api/system-records
```

Alias:

```http
POST /api/systems
```

Request body:

```json
{
  "systemName": "Payroll API",
  "description": "Provides payroll data to internal systems.",
  "categoryCode": "software_application",
  "status": "active",
  "businessDepartment": "Finance",
  "departmentOwner": "Finance Operations",
  "technicalOwner": "Application Development",
  "vendor": "Internal",
  "supportContact": "Technology Support",
  "hostingLocation": "Azure",
  "serverName": "PAYROLL-APP-01",
  "databaseName": "PayrollDb",
  "productionUrl": "https://payroll.example.com",
  "testUrl": "https://test-payroll.example.com",
  "documentationLink": "https://docs.example.com/payroll-api",
  "passwordVaultReference": "Vault/Technology/PayrollApi",
  "renewalDate": "2026-12-31",
  "lastReviewDate": "2026-06-18",
  "replacementSystem": "Enterprise Payroll Platform",
  "retirementNotes": "Retain until replacement reporting is fully validated.",
  "notes": "Initial record."
}
```

### Retrieve System Record

```http
GET /api/system-records/:id
```

Alias:

```http
GET /api/systems/:id
```

### Update System Record

```http
PUT /api/system-records/:id
PATCH /api/system-records/:id
```

Alias:

```http
PUT /api/systems/:id
PATCH /api/systems/:id
```

Request body may include any editable system record fields.

Example:

```json
{
  "status": "maintenance_only",
  "businessDepartment": "Finance Operations"
}
```

### Archive System Record

```http
POST /api/system-records/:id/archive
```

Alias:

```http
POST /api/systems/:id/archive
```

Sets `archived_at` and keeps the record available for historical lookup.

### Delete System Record

```http
DELETE /api/system-records/:id
```

Alias:

```http
DELETE /api/systems/:id
```

Permanently deletes the system record.

### List, Search, Filter, Sort

```http
GET /api/system-records
```

Aliases:

```http
GET /api/systems
```

Supported query parameters:

| Parameter            | Description                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `search`             | Searches system name, description, category, department, owner, vendor, support, hosting, server, database, and notes. |
| `categoryCode`       | Filters by category code.                                                                                              |
| `status`             | Filters by system status.                                                                                              |
| `businessDepartment` | Filters by business department.                                                                                        |
| `vendor`             | Filters by vendor.                                                                                                     |
| `technicalOwner`     | Filters by technical owner.                                                                                            |
| `hostingLocation`    | Filters by hosting location.                                                                                           |
| `includeArchived`    | Includes archived records when `true`.                                                                                 |
| `archivedOnly`       | Returns only archived records when `true`.                                                                             |
| `incompleteOnly`     | Returns only incomplete records when `true`.                                                                           |
| `sortBy`             | Sort field.                                                                                                            |
| `sortDirection`      | `asc` or `desc`.                                                                                                       |
| `limit`              | Page size, from 1 to 100.                                                                                              |
| `offset`             | Starting row offset.                                                                                                   |

Supported `sortBy` values:

- `systemName`
- `category`
- `status`
- `businessDepartment`
- `departmentOwner`
- `technicalOwner`
- `vendor`
- `hostingLocation`
- `renewalDate`
- `lastReviewDate`
- `updatedAt`
- `createdAt`

Example:

```http
GET /api/system-records?search=payroll&status=active&sortBy=systemName&sortDirection=asc
```

### Incomplete Records

```http
GET /api/system-records/incomplete
```

Alias:

```http
GET /api/systems/incomplete
```

Returns records missing important ownership or support fields.

System record responses include computed data-quality fields:

- `quality_warnings`: warning objects with `code` and user-facing `message`.
- `quality_warning_count`: total warnings for the record.

Warnings cover missing description, technical owner, vendor, support contact, documentation link, hosting information, last review date, approaching renewal dates, and overdue review dates.

### CSV Export

```http
GET /api/system-records/export.csv
```

Alias:

```http
GET /api/systems/export.csv
```

Exports matching system records as CSV. The endpoint accepts the same search, filter, and sort parameters as `GET /api/system-records`; pagination is ignored so the export contains all matching rows.

### Dashboard Totals

```http
GET /api/system-records/dashboard-totals
```

Alias:

```http
GET /api/systems/dashboard-totals
```

Returns:

- Total active-directory records
- Archived record count
- Incomplete record count
- Missing documentation count
- Systems without technical owner count
- Counts by status
- Counts by category
- Upcoming renewals
- Recently updated records
- Missing documentation records
- Records without technical owner

## Reports

```http
GET /api/reports
```

Returns report summaries with keys, titles, descriptions, and counts.

```http
GET /api/reports/:reportKey
```

Supported report keys:

- `active-systems`
- `being-replaced`
- `retired-systems`
- `missing-documentation`
- `missing-owners`
- `upcoming-renewals`
- `by-vendor`
- `by-category`
- `recently-reviewed`
- `data-quality`

Report detail responses include `columns` and `rows` for the dashboard reports page.

## Local Commands

```bash
npm install
npm run db:reset
npm run typecheck
npm test
npm run dev
```
