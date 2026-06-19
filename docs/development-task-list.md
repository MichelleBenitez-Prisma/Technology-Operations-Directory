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
- [ ] Build endpoints for asset types.
- [ ] Build endpoints for teams and people.
- [ ] Build endpoints for vendors.
- [ ] Build endpoints for asset environments.
- [ ] Build endpoints for integrations.
- [ ] Build endpoints for scheduled processes.
- [ ] Build endpoints for reviews.
- [ ] Build endpoints for tags.
- [ ] Add search endpoint using SQLite FTS5.
- [ ] Add validation and error handling.
- [ ] Add API tests.

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
- [ ] Build detailed system record pages.
- [ ] Build add and edit system forms.

## Phase Four: Frontend Foundation

- [x] Scaffold React with TypeScript.
- [ ] Choose styling approach: standard CSS, Bootstrap, or Tailwind CSS.
- [x] Create application shell and navigation.
- [x] Create shared table, badge, and dashboard components.
- [x] Add API client layer.
- [ ] Add frontend routing.

## Phase Five: Directory Workflows

- [ ] Build dashboard view.
- [ ] Build asset search and list view.
- [ ] Build asset detail view.
- [ ] Build add and edit asset forms.
- [ ] Add category-specific detail sections.
- [ ] Build vendor detail workflow.
- [ ] Build integration detail workflow.
- [ ] Build scheduled process workflow.
- [ ] Build review workflow.
- [ ] Add tag management.

## Phase Six: Security and Operations

- [ ] Add authentication.
- [ ] Add role-based access control.
- [ ] Add audit logging for important record changes.
- [ ] Add backup and restore guidance for SQLite database file.
- [ ] Add production deployment notes.
- [ ] Add monitoring and error logging.
- [ ] Add documentation for administrators.

## Phase Seven: Future Enhancements

- [ ] Add CSV import and export.
- [ ] Add relationship map visualization.
- [ ] Add review due-date notifications.
- [ ] Add attachment links or document references.
- [ ] Add richer reporting by owner, category, criticality, vendor, and lifecycle.
- [ ] Add custom field administration for future asset categories.
