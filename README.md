# Technology Operations Directory

Internal React, Express, TypeScript, and SQLite application for the Technology Department to track systems, vendors, dependencies, reviews, reporting, and operational record quality.

The directory is designed for operational metadata only. It must not store passwords, API keys, authentication tokens, private certificates, payment card data, database credentials, or unnecessary employee personal information. Password-manager references such as `Vault/Technology/DokShop` are allowed; actual credentials are not.

## Current Capabilities

- Dashboard with system totals, renewal alerts, data-quality alerts, quick search, update activity, and a built-in user guide.
- Searchable systems list with filters, sorting, archive visibility, CSV export, and CSV import.
- Add, view, edit, archive, and delete system records.
- System detail pages with general information, ownership/support, technical information, documentation, lifecycle fields, category-specific details, dependencies, and record actions.
- Vendor directory with vendor list, search, add/edit forms, detail pages, archive behavior, and connected systems by vendor name.
- Directory workflows for integrations, scheduled processes, reviews, system dependencies, document references, tags, and custom fields.
- Data-quality warnings and reports for missing documentation, missing owners, renewals, lifecycle, vendor/category/owner/criticality groupings, review due dates, and recent reviews.
- Authentication, administrator-managed roles and permissions, session cookies, audit logging, request IDs, backup/restore guidance, and production deployment notes.
- Profile settings for full name, email, phone, job title, and profile picture.

## Project Structure

```text
client/src/              React dashboard, API helpers, types, and CSS
src/                     Express API, routes, middleware, validation, repositories
database/                Base schema, seed data, and numbered migrations
scripts/                 Database initialization and migration scripts
test/                    Node test suite for API and frontend helper behavior
docs/                    Project guide, API reference, diagrams, task list, requirements
data/                    Local SQLite database files; ignored by Git
dist/                    Production build output; ignored by Git
```

Use `docs/project-guide.md` first for user, developer, administrator, backup, restore, and troubleshooting documentation. Use `docs/api.md` for endpoint details.

## Required Software

- Node.js 24 or newer
- npm
- Git
- SQLite support through Node’s built-in `node:sqlite`

## Local Setup

```bash
npm install
npm run db:init
npm run db:migrate
```

Start the API and client in separate terminals:

```bash
npm run dev:api
npm run dev:client
```

Open:

```text
http://127.0.0.1:5173
```

Development login is bypassed unless `AUTH_REQUIRED=true` is set. When auth is bypassed, the app uses a local development admin user.

## Build, Test, And Database Commands

```bash
npm run typecheck          # Type-check backend code
npm run typecheck:client   # Type-check React client
npm run typecheck:test     # Type-check tests
npm test                   # Run Node test suite
npm run test:e2e           # Run Playwright browser smoke tests
npm run build              # Build API and production client
npm start                  # Apply migrations and run built server
npm run db:migrate:status  # Show migration state
npm run db:reset           # Rebuild local database from scratch
```

## Authentication And Roles

For production, set:

```bash
AUTH_REQUIRED=true
INITIAL_ADMIN_EMAIL=<admin email>
INITIAL_ADMIN_PASSWORD=<one-time setup password>
APP_BASE_URL=https://<your deployed app>
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASSWORD=<smtp password>
SMTP_FROM="Technology Operations Directory <no-reply@poweredbyprisma.com>"
```

After the first administrator exists, remove or rotate the setup password value. Roles are:

- `viewer`: read-only
- `editor`: add, edit, archive, and manage organization-level directory resources
- `admin`: manage users, permissions, server-wide settings, deletes, and administrator-level resources

Sessions use an HttpOnly `tod_session` cookie. The application stores password hashes and session token hashes, not plaintext passwords or plaintext session tokens.

Admins manage user access in Profile Settings. New self-service signups start as read-only until an admin grants Editor or Admin access. Admins can also remove editor users from dashboard access.

Forgot-password uses an emailed one-time reset link. The reset token is stored only as a hash, expires after 30 minutes, and is marked used after a successful password reset. Configure SMTP before production launch; otherwise reset emails cannot be delivered.

## Security Rules

- Do not commit `.env`, SQLite database files, logs, screenshots with sensitive content, or generated `dist/` output unless intentionally required.
- Do not store passwords, API keys, authentication tokens, private certificates, payment information, database credentials, or unnecessary employee personal information.
- Store only the name/location of approved password-manager entries in `passwordVaultReference`.
- Sample data must use fake systems, fake vendors, fake URLs, and safe placeholder contact data.
- Forgot-password must never return temporary passwords or reset tokens in API responses or logs.

## Main API Areas

- `/health`
- `/api/auth`
- `/api/asset-types`
- `/api/system-records` and `/api/systems`
- `/api/vendors`
- `/api/reports`
- `/api/search`
- `/api/teams`, `/api/people`, `/api/asset-environments`
- `/api/integrations`, `/api/system-dependencies`, `/api/scheduled-processes`, `/api/reviews`, `/api/tags`
- `/api/document-references`, `/api/custom-fields`

See `docs/api.md` for request/response details.

## SQLite Backup And Restore

Before maintenance, stop writes to the app and copy the SQLite file configured by `DATABASE_PATH`.

```bash
cp data/technology_operations_directory.sqlite backups/technology_operations_directory-YYYY-MM-DD.sqlite
```

To restore, stop the app, replace the configured database file with the selected backup, restart the app, and run:

```bash
npm run db:migrate:status
```

## Production Deployment

For Render or another Node host:

- Use Node 24 or newer.
- Use `npm start` as the start command.
- Configure persistent disk storage for the SQLite database.
- Keep secrets in environment variables, not Git.
- Keep `/health` public for platform checks.
- Run `npm run build` before deployment when validating locally.

`npm start` applies pending migrations before starting the server.

## Current Known Gaps

- Stakeholder review is still unchecked in `docs/development-task-list.md`.
- Password reset email delivery requires production SMTP settings.
- Authentication is bypassed by default for development. Production must set `AUTH_REQUIRED=true`.
- Browser-level/mobile visual testing is limited; current tests focus on API behavior and frontend helper logic.
- Tags still exist as a directory workflow for future filtering/grouping, even if they are not central to the current dashboard success criteria.

## Verification Status

Recent local verification completed successfully:

```bash
npm run typecheck
npm run typecheck:client
npm run typecheck:test
npm test
npm run build
npm run test:e2e
```
