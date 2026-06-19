# Technology Operations Directory

The Technology Operations Directory is an internal web application for the Technology department to record, search, and review operational information about systems across the organization.

The directory is intended to cover software applications, websites, servers, databases, vendor-hosted services, integrations, scheduled processes, internal tools, payment services, production systems, and retired systems in one searchable place.

## Recommended Stack

- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: SQLite
- Source control: Git and GitHub
- Development environment: Visual Studio Code
- Styling: Standard CSS, Bootstrap, or Tailwind CSS

## Phase One Scope

Phase one establishes the foundation for the application:

- Initial SQLite database design
- Reference data for supported technology asset types
- Requirements summary, basic wireframes, database diagram, and development task list
- Starter Git repository
- Initial project README

Phase two begins the application code with a Node.js, Express, and TypeScript backend scaffold.

## Repository Structure

```text
.
+-- database/
|   +-- migrations/
|   +-- schema.sql
|   +-- seed.sql
+-- docs/
|   +-- database-design.md
|   +-- category-definitions.md
|   +-- api.md
|   +-- database-diagram.md
|   +-- development-task-list.md
|   +-- phase-2-audit.md
|   +-- phase-2-deliverables.md
|   +-- phase-3-ui.md
|   +-- requirements-summary.md
|   +-- wireframes.md
+-- scripts/
|   +-- init-database.mjs
|   +-- migrate-database.mjs
+-- src/
|   +-- app.ts
|   +-- server.ts
|   +-- config/
|   +-- db/
|   +-- middleware/
|   +-- routes/
|   +-- types/
|   +-- validation/
+-- .env.example
+-- .gitattributes
+-- .gitignore
+-- .prettierignore
+-- .prettierrc.json
+-- eslint.config.js
+-- package.json
+-- README.md
+-- tsconfig.json
```

## GitHub Repository Setup

Recommended repository name:

```text
technology-operations-directory
```

Recommended visibility:

```text
Private
```

After creating the empty GitHub repository, connect this local repository and push the first commit:

```bash
git remote add origin https://github.com/<owner-or-org>/technology-operations-directory.git
git push -u origin main
```

## Initial Database Design

The database is centered on `technology_assets`, a shared record for anything the Technology department needs to track. Specialized tables add detail for applications, websites, servers, and databases without forcing every asset type into the same set of columns.

Core concepts:

- `technology_assets`: central catalog entries
- `asset_types`: supported categories such as application, website, server, database, vendor-hosted service, integration, scheduled process, internal tool, payment service, production system, retired system, and other future categories
- `teams` and `people`: ownership and accountability
- `vendors`: third-party providers and contract context
- `integrations`: connections between internal or external systems
- `scheduled_processes`: recurring jobs, automations, and operational tasks
- `review_records`: periodic validation history
- `tags` and `asset_tags`: flexible grouping and filtering
- `asset_search`: SQLite full-text search index for directory search

Planning deliverables:

- `docs/requirements-summary.md`
- `docs/category-definitions.md`
- `docs/wireframes.md`
- `docs/database-diagram.md`
- `docs/development-task-list.md`
- `docs/phase-2-audit.md`
- `docs/phase-2-deliverables.md`
- `docs/phase-3-ui.md`

See `docs/database-design.md` for the table-by-table design notes.

## Create the SQLite Database

From the repository root:

```bash
mkdir -p data
sqlite3 data/technology_operations_directory.sqlite ".read database/schema.sql"
sqlite3 data/technology_operations_directory.sqlite ".read database/seed.sql"
```

The `data/` directory is ignored by Git so local SQLite databases are not committed.

You can also build the local SQLite database with the Node.js script:

```bash
npm run db:init
```

Use this to rebuild the database from scratch:

```bash
npm run db:reset
```

Schema changes after the baseline should be added as numbered `.sql` files in
`database/migrations/` and applied with:

```bash
npm run db:migrate
```

Check the database migration state with:

```bash
npm run db:migrate:status
```

## Backend API

The phase-two backend scaffold uses Node.js, Express, and TypeScript.

Initial scripts:

```bash
npm install
npm run db:init
npm run db:migrate:status
npm run lint:api
npm run format:api:check
npm test
npm run dev
```

Frontend dashboard development:

```bash
npm run dev:api
npm run dev:client
```

Open:

```text
http://127.0.0.1:5173
```

Production build:

```bash
npm run build
npm start
```

Initial endpoints:

- `GET /health`
- `GET /api/asset-types`
- `GET /api/system-records`
- `GET /api/system-records/:id`
- `POST /api/system-records`
- `PUT /api/system-records/:id`
- `PATCH /api/system-records/:id`
- `POST /api/system-records/:id/archive`
- `DELETE /api/system-records/:id`
- `GET /api/system-records/incomplete`
- `GET /api/system-records/dashboard-totals`
- `GET /api/systems`
- `GET /api/systems/:id`
- `POST /api/systems`
- `PUT /api/systems/:id`
- `PATCH /api/systems/:id`
- `POST /api/systems/:id/archive`
- `DELETE /api/systems/:id`
- `GET /api/systems/incomplete`
- `GET /api/systems/dashboard-totals`

See `docs/api.md` for request and response details.

System status values:

- `active`
- `development`
- `being_replaced`
- `maintenance_only`
- `retired`

Archive is tracked separately with `archived_at`; it is not a system status.

List endpoints support:

- Search: `search`
- Filters: `categoryCode`, `status`, `businessDepartment`, `vendor`, `technicalOwner`, `hostingLocation`, `incompleteOnly`, `includeArchived`, `archivedOnly`
- Sorting: `sortBy` and `sortDirection`
- Pagination: `limit` and `offset`

Initial system record fields:

- `systemName`
- `description`
- `categoryCode`
- `status`
- `businessDepartment`
- `departmentOwner`
- `technicalOwner`
- `vendor`
- `supportContact`
- `hostingLocation`
- `serverName`
- `databaseName`
- `productionUrl`
- `testUrl`
- `documentationLink`
- `passwordVaultReference`
- `renewalDate`
- `lastReviewDate`
- `notes`

`systemName`, `description`, `categoryCode`, and `status` are required by the initial API validation.

Validation before save:

- Required fields cannot be empty.
- URLs must use `http://` or `https://` and valid URL formatting.
- Dates must use a real `YYYY-MM-DD` calendar date.
- Status must be one of the defined system status values.
- Category must exist in `asset_types`.
- Duplicate active system names are allowed, but create and update responses include a warning.

Create and update responses use this shape:

```json
{
  "data": {
    "id": 1,
    "system_name": "Example System"
  },
  "warnings": [
    {
      "code": "duplicate_system_name",
      "message": "Another active system record already uses this system name. Review the matching records before saving another copy.",
      "matchingSystemIds": [2]
    }
  ]
}
```

## Suggested Next Phases

1. Build detailed system record pages and edit forms.
2. Build API routes for vendors, integrations, scheduled processes, tags, and reviews.
3. Add review workflows.
4. Add authentication and role-based access before storing sensitive internal data.

## Security Notes

Do not store passwords, API keys, private certificates, or other secrets in this directory. Store only operational metadata and links to approved secret-management locations.
