import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
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
const reset = process.argv.includes("--reset");

if (reset && existsSync(databasePath)) {
  rmSync(databasePath);
}

mkdirSync(path.dirname(databasePath), { recursive: true });

const schemaSql = readFileSync(path.join(projectRoot, "database", "schema.sql"), "utf8");
const seedSql = readFileSync(path.join(projectRoot, "database", "seed.sql"), "utf8");

const database = new DatabaseSync(databasePath);
const migrationsDirectory = path.join(projectRoot, "database", "migrations");

database.exec("PRAGMA foreign_keys = ON;");
database.exec(schemaSql);
database.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
database
  .prepare(
    `
    INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
    VALUES ($version, $name, $checksum)
    `
  )
  .run({
    version: "000_initial_schema",
    name: "Initial schema",
    checksum: createHash("sha256").update(schemaSql).digest("hex")
  });
database.exec(seedSql);

const migrationFiles = existsSync(migrationsDirectory)
  ? readdirSync(migrationsDirectory)
      .filter((fileName) => fileName.toLowerCase().endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right))
  : [];

for (const fileName of migrationFiles) {
  const version = path.basename(fileName, path.extname(fileName));
  const migrationPath = path.join(migrationsDirectory, fileName);
  const migrationSql = readFileSync(migrationPath, "utf8");

  database.exec(migrationSql);
  database
    .prepare(
      `
      INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
      VALUES ($version, $name, $checksum)
      `
    )
    .run({
      version,
      name: fileName,
      checksum: createHash("sha256").update(migrationSql).digest("hex")
    });
}

const assetTypeCount = database.prepare("SELECT COUNT(*) AS count FROM asset_types").get().count;

database.close();

console.log(`Database ready: ${databasePath}`);
console.log(`Seeded asset types: ${assetTypeCount}`);
