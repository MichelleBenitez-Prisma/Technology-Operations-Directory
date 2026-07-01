# CSV Importer README

The CSV importer lets users add system records from the Systems page.

## How To Use

1. Open **Systems**.
2. Choose **Import CSV**.
3. Select a `.csv` file from your computer.
4. Review the import message for created rows or row-level errors.

Imported rows are validated the same way as manually entered system records.

## Required Columns

Use these headers for a basic import:

```csv
systemName,description,categoryCode,status
DokShop,Storefront order system,software_application,active
```

Required fields:

- `systemName`
- `description`
- `categoryCode`
- `status`

## Optional Columns

The importer also accepts:

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
- `replacementSystem`
- `retirementNotes`
- `notes`

Snake_case alternatives such as `system_name`, `category_code`, and `documentation_url` are also accepted.

## Safety Rules

Do not import passwords, API keys, authentication tokens, private certificates, payment information, database credentials, or protected employee information.

For credentials, import only an approved password-manager reference such as `Vault/Technology/SystemName`.

## Common Errors

- Missing required fields.
- Invalid URL format.
- Invalid date format. Use `YYYY-MM-DD`.
- Unknown `categoryCode`.
- Unsupported `status` value.

