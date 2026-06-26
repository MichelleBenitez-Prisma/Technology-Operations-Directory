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

- [x] Build dashboard view.
- [x] Build asset search and list view.
- [x] Build asset detail view.
- [x] Build add and edit asset forms.
- [x] Add category-specific detail sections.
- [x] Build vendor detail workflow.
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

- [ ] Add authentication.
- [ ] Add role-based access control.
- [ ] Add audit logging for important record changes.
- [ ] Add backup and restore guidance for SQLite database file.
- [ ] Add production deployment notes.
- [ ] Add monitoring and error logging.
- [ ] Add documentation for administrators.

## Phase Eight: Future Enhancements

- [ ] Add CSV import and export.
- [ ] Add relationship map visualization.
- [ ] Add review due-date notifications.
- [ ] Add attachment links or document references.
- [ ] Add richer reporting by owner, category, criticality, vendor, and lifecycle.
- [ ] Add custom field administration for future asset categories.
