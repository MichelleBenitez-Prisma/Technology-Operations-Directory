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
- `scheduled-processes`
- `reviews`
- `tags`

List endpoints support:

| Parameter        | Description                                     |
| -----------------| ----------------------------------------------- |
| `search`         | Searches the main text fields for the resource. |
| `includeArchived`| Includes archived vendors when `true`.          |
| `archivedOnly`   | Returns only archived vendors when `true`.      |
| `limit`          | Page size, from 1 to 100.                       |
| `offset`         | Starting row offset.                            |

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
- `contract_notes`
- `renewal_notes`
- `notes`

Existing compatibility fields are still accepted, including `support_url`,
`account_manager_name`, `account_manager_email`, `contract_start_date`,
`contract_end_date`, and `renewal_notice_days`.

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

## Local Commands

```bash
npm install
npm run db:reset
npm run typecheck
npm test
npm run dev
```
