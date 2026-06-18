# Requirements Summary

## Purpose

The Technology Operations Directory will be an internal web application that gives the Technology department one central place to record, search, review, and maintain operational information about technology systems and services.

## Supported Asset Categories

The application must support these initial categories:

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

Additional categories must be possible without redesigning the database. The initial database supports this through the `asset_types` reference table.

The final phase-one category names, definitions, inclusions, and exclusions are documented in `docs/category-definitions.md`.

## Primary Users

- Technology operations staff who maintain operational records
- Application and infrastructure owners who provide system details
- Technology leadership who need portfolio visibility
- Security or compliance reviewers who need ownership, review, and data classification context
- Support staff who need runbooks, support channels, and escalation details

## Core Capabilities

- Create, edit, view, archive, delete, and retire technology asset records.
- Search assets by name, key, description, business purpose, owner, vendor, tag, system status, criticality, and category.
- Filter and sort system records for operational review.
- Retrieve dashboard totals by category and status.
- Identify incomplete records that are missing key ownership or support fields.
- Validate records before saving, including required fields, URL format, date format, valid status, and valid category.
- Warn users when a system name duplicates another active system record.
- Record ownership by team, technical owner, and business owner.
- Track vendor relationships, support links, contract dates, and renewal timing.
- Track integrations between internal and external systems.
- Track scheduled processes, including schedules, run locations, notification channels, and runbooks.
- Track payment services without storing secrets, card numbers, bank account numbers, API keys, or regulated payment data.
- Track system status using consistent options: active, development, being replaced, maintenance only, and retired.
- Track archived records separately from system status.
- Track environments, including development, test, staging, production, disaster recovery, and other.
- Record periodic reviews and next review due dates.
- Use tags for flexible grouping and future reporting.

## Asset Record Requirements

Each asset should support these common fields:

- Asset key
- Name
- Category
- System status
- Criticality
- Data classification
- Description
- Business purpose
- Owner team
- Technical owner
- Business owner
- Primary vendor
- Production URL, if applicable
- Repository URL, if applicable
- Documentation URL
- Runbook URL
- Monitoring URL
- Support channel
- Review interval
- Last reviewed date
- Next review due date
- Tags

## Category-Specific Requirements

Software applications should support platform, language, framework, authentication method, deployment method, source control, and CI/CD details.

Websites should support public URL, domain name, CMS platform, domain owner, SSL renewal date, and analytics URL.

Servers should support host name, operating system, IP address, hosting provider, region, backup policy, and patching owner.

Databases should support engine, version, database name, host system, PII indicator, backup schedule, and retention period.

Vendor-hosted services should support hosting vendor, service URL, service tier, SLA notes, contract owner, support level, and data residency notes.

Payment services should support processor vendor, service role, payment method types, PCI scope, tokenization indicator, settlement frequency, and compliance notes.

Integrations should support source, target, integration type, direction, protocol, data description, schedule, criticality, owner team, and documentation.

Scheduled processes should support schedule kind, schedule expression, timezone, command or job name, run location, last success time, notification channel, and runbook.

Production and retired systems should support the same common asset fields, plus lifecycle and environment tracking.

## Nonfunctional Requirements

- The application should be usable from a modern desktop browser.
- The first implementation should use React with TypeScript, Node.js with Express, and SQLite.
- The database should remain portable for local development and small internal deployments.
- The application should avoid storing secrets and regulated sensitive data.
- The data model should support future categories and fields.
- Search and filtering should be fast enough for repeated operational use.
- Records should be easy to review and update on a regular cadence.

## Out of Scope for Phase One

- Authentication and role-based access control
- Full API implementation
- React frontend implementation
- Audit logging
- File attachments
- Automated notifications
- Production deployment
