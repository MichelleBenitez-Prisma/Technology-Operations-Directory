# Phase Three User Guide

This guide explains how Technology department users work with the Phase Three screens in the Technology Operations Directory.

## Open the Application

For local development, start both services:

```bash
npm run dev:api
npm run dev:client
```

Open:

```text
http://127.0.0.1:5173
```

The production build is served by Express after `npm run build` and `npm start`.

## Dashboard

Use the dashboard to review the directory at a glance. It shows total systems, active systems, systems being replaced, retired systems, missing documentation, missing technical owners, upcoming renewals, recently updated records, and records needing attention.

Use the search box to quickly search systems, owners, departments, vendors, and hosting information. Dashboard alert cards link to the matching report results when practical. 

## Systems List

Open `#/systems` or use the **Systems** button.

The systems list supports:

- Search by system name or description.
- Filter by category, status, technical owner, and vendor.
- Show incomplete records only.
- Include archived records when needed.
- Sort records by name, category, status, owner, vendor, last review date, or update date.
- Export the current filtered list to CSV. 

Select a system name to open its detail page. The warning count shows records with missing or outdated information. 

## System Detail Page

Each system detail page is organized into:

- General information
- Ownership and support
- Technical information
- Documentation
- Lifecycle information

Use **Edit** to update a record. Use **Archive** when a record should remain available for historical tracking. Use **Delete** only when a record should be permanently removed.

System detail pages show data-quality warning when important information is missing or outdated. Warnings include missing description, technical owner, vendor, support contact, documentation link, hosting information, last review date, approaching renewal dates, and overdue revire dates.

## Reports

Open `#/reports` or use the **Reports** button.

The reports page includes active systems, systems being replaced, retired systems, systems missing documentation, system missing owners, upcoming renewals, system grouped by vendors, systems grouped by category, recently reviewed systems, and all data-quality warnings. Select a report card or report dropdown value to review the matching records.

## Add or Edit a System

Use **Add System** to create a new record. Required fields are marked with `*`: system name, category, status, and description.

URLs must begin with `http://` or `https://`. Dates should use the date picker or `YYYY-MM-DD` format. The app shows validation messages when required fields, URLs, or dates need correction.

## Vendor Directory

Open `#/vendors` or use the **Vendors** button.

The vendor list supports search and an option to include archived vendors. Use **Add Vendor** to create a vendor record. Vendor records include name, description, website, support email, support phone number, support portal, account representative, contract notes, renewal notes, and general notes.

Select a vendor name to open the vendor detail page. The detail page shows vendor support and contract information, plus connected systems whose system record vendor name matches the selected vendor.

Use **Edit** to update vendor information. Use **Archive** when the vendor should be hidden from the default list but retained for history.

## Phase 5 Directory and Dependencies

Open `#/directory` or use the **Directory** button to manafe integrations, scheduled processes, reviews, tags, and system dependencies.

Each system detail page now includes dependency impact information. **This system depends on** shows upstream system the current record needs. **Systems affected if this system stops working** shows downstream system that may be impacted by a outage.

Dependency records include source system, destiniation system, relationship description, data or service exchanged, importance level, and notes. Importance levels are `critical`, `important`, and `standard`.

System detail pages also show category-specific fields when the category supports them, plus assigned tags. Use tag management in the directory to create tags, then assign or remove them from the system detail page. 

## Demo Records

Sample records are included for visual review and demonstration, including DokShop, Pace, Control, Payment Gateway, Storefront Importer, Internal Reporting Database, and Technology Department Website. These records use example URLs and do not contain real credentials or payment data.