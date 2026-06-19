import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const databasePath = path.resolve(
  projectRoot,
  process.env.DATABASE_PATH ?? "data/technology_operations_directory.sqlite"
);
const migrationsDirectory = path.join(projectRoot, "database", "migrations");
const statusOnly = process.argv.includes("--status");

mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA foreign_keys = ON;");
database.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrations = getMigrationSources();
const appliedMigrations = getAppliedMigrations(database);
const pendingMigrations = [];

for (const migration of migrations) {
  const appliedMigration = appliedMigrations.get(migration.version);

  if (!appliedMigration) {
    pendingMigrations.push(migration);
    continue;
  }

  if (appliedMigration.checksum !== migration.checksum) {
    database.close();
    throw new Error(
      `Migration checksum mismatch for ${migration.version}. ` +
        "Create a new migration instead of editing an applied migration."
    );
  }
}

if (statusOnly) {
  printStatus(migrations, appliedMigrations, pendingMigrations);
  database.close();
  process.exit(0);
}

for (const migration of pendingMigrations) {
  console.log(`Applying migration ${migration.version}: ${migration.name}`);
  database.exec("BEGIN;");

  try {
    database.exec(migration.sql);
    database
      .prepare(
        `
        INSERT INTO schema_migrations (version, name, checksum)
        VALUES ($version, $name, $checksum)
        `
      )
      .run({
        version: migration.version,
        name: migration.name,
        checksum: migration.checksum
      });
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    database.close();
    throw error;
  }
}

if (pendingMigrations.length === 0) {
  console.log("Database schema is up to date.");
} else {
  console.log(`Applied migrations: ${pendingMigrations.length}`);
}

database.close();

function getMigrationSources() {
  const schemaPath = path.join(projectRoot, "database", "schema.sql");
  const migrationFiles = existsSync(migrationsDirectory)
    ? readdirSync(migrationsDirectory)
        .filter((fileName) => fileName.toLowerCase().endsWith(".sql"))
        .sort((left, right) => left.localeCompare(right))
    : [];

  return [
    createMigrationSource("000_initial_schema", "Initial schema", schemaPath),
    ...migrationFiles.map((fileName) => {
      const migrationPath = path.join(migrationsDirectory, fileName);
      const version = path.basename(fileName, path.extname(fileName));

      return createMigrationSource(version, fileName, migrationPath);
    })
  ];
}

function createMigrationSource(version, name, migrationPath) {
  const sql = readFileSync(migrationPath, "utf8");

  return {
    version,
    name,
    path: migrationPath,
    sql,
    checksum: createHash("sha256").update(sql).digest("hex")
  };
}

function getAppliedMigrations(databaseConnection) {
  const rows = databaseConnection
    .prepare("SELECT version, name, checksum, applied_at FROM schema_migrations")
    .all();

  return new Map(rows.map((row) => [row.version, row]));
}

function printStatus(migrations, appliedMigrations, pendingMigrations) {
  console.log(`Database: ${databasePath}`);
  console.log(`Applied migrations: ${appliedMigrations.size}`);
  console.log(`Pending migrations: ${pendingMigrations.length}`);

  for (const migration of migrations) {
    const state = appliedMigrations.has(migration.version) ? "applied" : "pending";
    console.log(`${state.padEnd(8)} ${migration.version} ${migration.name}`);
  }
}
