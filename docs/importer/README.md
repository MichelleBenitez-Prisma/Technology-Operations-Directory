# CSV Importer README

The CSV importers let users add system and vendor records from spreadsheet files.

## System Import

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

## Vendor Import

Open **Vendors**, choose **Import CSV**, and select a `.csv` file.

Required vendor columns:

- `name`
- `accountNumber`
- `website`
- `login`
- `eqpStatus2023`

Example:

```csv
name,accountNumber,website,login,eqpStatus2023,terms30Day,nqp,aim,email,category
Vendor Name,A-100,https://vendor.example.com,vendor@example.com,Approved,yes,no,yes,rep@example.com,Paper
```

Supported vendor columns:

- `accountNumber`
- `website`
- `login`
- `cyriousName`
- `terms30Day`
- `selfPromo`
- `rebate`
- `nqp`
- `aim`
- `eqpStatus2023`
- `eqpStatus2022`
- `eqpVolume`
- `paymentMethod`
- `invoiceSearches`
- `csrSalesRep`
- `repDirectLine`
- `email`
- `category`
- `notes`

Snake_case alternatives such as `account_number`, `website_url`, `login_identifier`, and `cyrious_name` are also accepted.

Yes/no fields accept `yes`, `no`, `true`, `false`, `1`, or `0`.

The vendor `login` column must contain only a non-secret login identifier, such as an email address. Do not import passwords, API keys, tokens, or payment credentials.
