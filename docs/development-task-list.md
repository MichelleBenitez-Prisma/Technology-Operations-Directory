# Development Task List

## Phase One: Planning and Database Foundation

- [x] Create initial repository structure.
- [x] Create initial README.
- [x] Design initial SQLite schema.
- [x] Seed supported asset categories.
- [x] Write requirements summary.
- [x] Create basic wireframes.
- [x] Create database diagram.
- [x] Create initial development task list.
- [ ] Review requirements with Technology stakeholders.
- [x] Confirm final phase-one category names and definitions.

## Phase Two: Backend Foundation

- [x] Scaffold Node.js, Express, and TypeScript backend.
- [x] Add SQLite database connection module.
- [x] Add migration runner for schema changes.
- [x] Add seed script for reference data.
- [x] Add environment configuration files.
- [x] Add backend linting and formatting.
- [x] Add health check endpoint.

## Phase Three: Core API

- [x] Build CRUD endpoints for system records.
- [x] Add archive and delete behavior for system records.
- [x] Add system record search.
- [x] Add system record filters.
- [x] Add system record sorting.
- [x] Add dashboard totals endpoint.
- [x] Add incomplete records endpoint.
- [x] Add backend validation before saving system records.
- [x] Add duplicate system name warnings.
- [x] Add basic backend API documentation.
- [x] Add tests for main system record API functions.
- [x] Build endpoints for asset types.
- [x] Build endpoints for teams and people.
- [x] Build endpoints for vendors.
- [x] Build endpoints for asset environments.
- [x] Build endpoints for integrations.
- [x] Build endpoints for scheduled processes.
- [x] Build endpoints for reviews.
- [x] Build endpoints for tags.
- [x] Add search endpoint using SQLite FTS5.
- [x] Add validation and error handling.
- [x] Add API tests.

## Phase Three: Core User Interface

- [x] Scaffold React and Vite dashboard client.
- [x] Build main Technology Operations dashboard.
- [x] Show total systems, active systems, systems being replaced, and retired systems.
- [x] Show systems missing documentation and systems without a technical owner.
- [x] Show upcoming renewals.
- [x] Show recently updated records.
- [x] Link dashboard items to related records or filtered API lists where practical.
- [x] Add quick dashboard search for system records.
- [x] Serve production dashboard build from Express.
- [x] Build searchable systems list.
- [x] Add category, status, technical owner, vendor, incomplete, archive, and sort controls to systems list.
- [x] Build detailed system record pages.
- [x] Build add and edit system forms.
- [x] Add archive action from the system detail page.
- [x] Add replacement system and retirement notes fields for system lifecycle tracking.
- [x] Add delete action to the system detail page if permanent deletion is still required in the UI.
- [x] Add stronger frontend tests for dashboard, list, detail, form validation, and archive behavior.
- [x] Add sample records for visual review and demonstration.
- [x] Add user-facing documentation for using the Phase Three screens.

## Phase Four: Frontend Foundation

- [x] Scaffold React with TypeScript.
- [x] Choose styling approach: standard CSS.
- [x] Create application shell and navigation.
- [x] Create shared table, badge, and dashboard components.
- [x] Add API client layer.
- [x] Add frontend routing.

## Phase Five: Directory Workflows

- [x] Add system dependency records.
- [x] Show upstream and downstream dependencies on system detail pages.
- [x] Add category-specific detail sections.
- [x] Build integration detail workflow.
- [x] Build scheduled process workflow.
- [x] Build review workflow.
- [x] Add tag management.

## Phase Six: Data Quality and Reporting

- [x] Add data-quality checks for missing or outdated system record details.
- [x] Add warning indicators to system list and system detail screens.
- [x] Add reports page for active, replacement, retired, documentation, owner, renewal, vendor, category, review, and data-quality reports.
- [x] Add CSV export for filtered system lists.
- [x] Link dashboard alerts to matching report results.

## Phase Seven: Security and Operations

- [x] Add regression tests for required fields, invalid values, search, filters, sorting, add/edit/archive flows, database errors, empty data, and friendly errors.
- [x] Verify sample records for DokShop, Pace, Control, Payment Gateway, Storefront Importer, Internal Reporting Database, and Technology Department Website.
- [x] Add authentication.
- [x] Add role-based access control.
- [x] Add audit logging for important record changes.
- [x] Add backup and restore guidance for SQLite database file.
- [x] Add production deployment notes.
- [x] Add monitoring and error logging.
- [x] Add documentation for administrators.

## Phase Eight: Future Enhancements

## Final Phase: Documentation and Cleanup

- [x] Add user documentation for opening the app, systems, vendors, dependencies, reports, and exports.
- [x] Add developer documentation for install, software requirements, database setup, frontend/backend startup, project organization, API usage, database field changes, reports, backup, restore, and troubleshooting.
- [x] Consolidate repetitive phase documentation into a current project guide.
- [x] Document code standards for names, file organization, comments, duplication, and error handling.

- [x] Add CSV import.
- [x] Add relationship map visualization.
- [x] Add review due-date notifications.
- [x] Add attachment links or document references.
- [x] Add richer reporting by owner, criticality, and lifecycle.
- [x] Add custom field administration for future asset categories.
