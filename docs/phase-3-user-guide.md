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

Use the search box to quickly search systems, owners, departments, vendors, and hosting information. Dashboard cards link to filtered system lists where practical.

## Systems List

Open `#/systems` or use the **Systems** button.

The systems list supports:

- Search by system name or description.
- Filter by category, status, technical owner, and vendor.
- Show incomplete records only.
- Include archived records when needed.
- Sort records by name, category, status, owner, vendor, last review date, or update date.

Select a system name to open its detail page.

## System Detail Page

Each system detail page is organized into:

- General information
- Ownership and support
- Technical information
- Documentation
- Lifecycle information

Use **Edit** to update a record. Use **Archive** when a record should remain available for historical tracking. Use **Delete** only when a record should be permanently removed.

## Add or Edit a System

Use **Add System** to create a new record. Required fields are marked with `*`: system name, category, status, and description.

URLs must begin with `http://` or `https://`. Dates should use the date picker or `YYYY-MM-DD` format. The app shows validation messages when required fields, URLs, or dates need correction.

## Vendor Directory

Open `#/vendors` or use the **Vendors** button.

The vendor list supports search and an option to include archived vendors. Use **Add Vendor** to create a vendor record. Vendor records include name, description, website, support email, support phone number, support portal, account representative, contract notes, renewal notes, and general notes.

Select a vendor name to open the vendor detail page. The detail page shows vendor support and contract information, plus connected systems whose system record vendor name matches the selected vendor.

Use **Edit** to update vendor information. Use **Archive** when the vendor should be hidden from the default list but retained for history.


## Demo Records

Sample records are included for visual review and demonstration, including DokShop, Pace, Control, Payment Gateway, Storefront Importer, Internal Reporting Database, and Technology Department Website. These records use example URLs and do not contain real credentials or payment data.