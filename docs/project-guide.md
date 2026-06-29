# Technology Operations Directory Guide

This guide explains how users operate the Technology Operations Directory and how future developers maintain it.

## User Documentation

### Open the Application

For local development, start both services from the repository root:

```bash
npm run dev:api
npm run dev:client
```

Open `http://127.0.0.1:5173`. In production, open the deployed application URL. Authentication is currently bypassed for development unless `AUTH_REQUIRED=true` is set.

### Add a System

Select **Add System**. Complete the required fields: system name, category, status, and description. Add ownership, support, technical, documentation, lifecycle, replacement, and retirement details when available. Save the form. The app shows validation messages for missing required fields, invalid URLs, invalid dates, and duplicate active system names.

### Edit a System

Open **Systems**, select a system name, then choose **Edit**. Update the needed fields and save. Use the detail page to confirm the updated general information, ownership, technical details, documentation, lifecycle information, dependencies, tags, and category-specific details.

### Archive a System

Open the system detail page and choose **Archive**. Archived systems are hidden from the default list but remain available when archived records are included. Use delete only when a record should be permanently removed.

### Search and Filter

Open **Systems**. Use search for names, descriptions, owners, departments, vendors, and hosting details. Use filters for category, status, technical owner, vendor, incomplete records, and archived records. Use sort controls to order by name, category, status, owner, vendor, review date, or update date.

### Add a Vendor

Open **Vendors** and choose **Add Vendor**. Enter vendor name, description, website, support email, support phone, support portal, account representative, contract notes, renewal notes, and general notes. Vendor detail pages show connected systems when the system vendor text matches the vendor name.

### Create a Dependency

Open a system detail page or **Directory > System Dependencies**. Add source system, destination system, relationship description, data or service exchanged, importance level, and notes. Importance must be `critical`, `important`, or `standard`. System detail pages show what the current system depends on and what may be affected if it stops working.

The Directory home also includes a relationship map preview for recently recorded dependencies.

### Run Reports

Open **Reports**. Select a report card or dropdown option for active systems, systems being replaced, retired systems, missing documentation, missing owners, upcoming renewals, vendor/category groupings, recent reviews, or data-quality warnings.

Additional reports group systems by owner, criticality, and lifecycle status. The review-due report helps identify systems missing review dates or past their allowed review period.

### Export Data

Open **Systems**, apply any search, filter, and sort settings needed, then choose **Export CSV**. The export respects the selected list settings where practical and includes all matching rows.

### Import Data

Open **Systems** and choose **Import CSV**. The CSV should include headers that match system form fields such as `systemName`, `description`, `categoryCode`, `status`, `technicalOwner`, `vendor`, and `documentationLink`. Imported rows are validated the same way as manually entered systems.

### Add Document References and Custom Fields

Open **Directory > Document References** to add links to runbooks, support documents, contracts, or other approved references. Do not upload or store protected documents, passwords, API keys, or payment data.

Open **Directory > Custom Fields** to define future category-specific fields. Use clear field keys, labels, field types, and help text so future developers can map those fields into category-specific screens.

## Developer Documentation

### Required Software

- Node.js 24 or newer
- npm
- Git
- A terminal such as Git Bash or PowerShell
- SQLite support through Node's built-in `node:sqlite`

### Install the Application

```bash
npm install
```

Copy `.env.example` to `.env` for local configuration. Keep `.env` out of Git.

### Create the Database

```bash
npm run db:init
npm run db:migrate
```

Use `npm run db:migrate:status` to confirm pending migrations. Use `npm run db:reset` only for local rebuilds because it removes the local database file.

### Start the Backend

```bash
npm run dev:api
```

The API runs on the configured `PORT`, defaulting to `3001`.

### Start the Frontend

```bash
npm run dev:client
```

Open `http://127.0.0.1:5173`.

### Project Organization

- `src/`: Express API, routes, middleware, validation, repositories, and server startup.
- `client/src/`: React dashboard, API helpers, shared types, and CSS.
- `database/`: baseline schema, seed data, and migrations.
- `scripts/`: database initialization and migration scripts.
- `test/`: Node API and client helper tests.
- `docs/`: project guide, API reference, database notes, category definitions, and task list.

### API Overview

The API returns JSON envelopes shaped like `{ "data": ... }` for successful reads. Create and update responses may include `warnings`. Validation errors return `400`, missing records return `404`, unauthorized requests return `401`, and role failures return `403`.

Main route groups:

- `/health`
- `/api/auth`
- `/api/system-records`
- `/api/vendors`
- `/api/system-dependencies`
- `/api/reports`
- `/api/search`
- directory routes such as `/api/teams`, `/api/people`, `/api/integrations`, `/api/scheduled-processes`, `/api/reviews`, and `/api/tags`

See `docs/api.md` for request fields and endpoint details.

### Add Database Fields

Add schema changes as a new numbered SQL migration in `database/migrations/`. Update the matching repository in `src/db/`, validation schema in `src/validation/`, shared types, API docs, and UI form/detail sections if users should see or edit the field. Run type checks, tests, build, and a fresh migration check.

### Add a New Report

Add the report key and query logic in the system record repository, expose it through the reports route, add the shared type/key if needed, add the report option in the React reports page, and add API/client tests for the new report result.

### Back Up the Database

Stop writes to the app, then copy the configured SQLite file:

```bash
cp data/technology_operations_directory.sqlite backups/technology_operations_directory-YYYY-MM-DD.sqlite
```

Use a persistent disk for production database storage.

### Restore the Database

Stop the app, replace the configured SQLite file with the selected backup, restart the app, and run:

```bash
npm run db:migrate:status
```

If migrations are pending, run `npm run db:migrate`.

### Troubleshooting

- Database missing: run `npm run db:init` and confirm `DATABASE_PATH`.
- Render migration failure: check the exact SQL error and run `npm run db:migrate` against a fresh local database.
- Dashboard blocked by login: keep `AUTH_REQUIRED=false` during development; set `AUTH_REQUIRED=true` only when preparing for launch.
- Vite client not opening: confirm `npm run dev:client` is running and use `http://127.0.0.1:5173`.
- API not responding: confirm `npm run dev:api`, `PORT`, and `/health`.
- Validation errors: check required fields, URL format, date format, status values, and category code.
- TypeScript errors: run `npm run typecheck`, `npm run typecheck:client`, and `npm run typecheck:test`.

## Code Documentation Standards

Use meaningful names, keep related behavior in logical files, and avoid unnecessary duplication. Prefer clear validation and repository helpers over scattered inline logic. Add short comments only when the purpose is not obvious, such as security-sensitive checks, migration constraints, or non-trivial report logic. Errors should return useful messages without exposing secrets, passwords, API keys, payment data, or stack traces to users.
