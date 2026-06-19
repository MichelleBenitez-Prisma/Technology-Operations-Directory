# Database Migrations

Place schema-change migrations in this folder as numbered `.sql` files.

Recommended file naming:

```text
001_add_example_table.sql
002_add_review_due_index.sql
```

Run pending migrations with:

```bash
npm run db:migrate
```

Check migration status with:

```bash
npm run db:migrate:status
```

The migration runner treats `database/schema.sql` as the baseline migration named
`000_initial_schema`. After that baseline is recorded, new files in this folder are
applied in filename order.
