import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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

database.exec("PRAGMA foreign_keys = ON;");
database.exec(schemaSql);
database.exec(seedSql);

const assetTypeCount = database
  .prepare("SELECT COUNT(*) AS count FROM asset_types")
  .get().count;

database.close();

console.log(`Database ready: ${databasePath}`);
console.log(`Seeded asset types: ${assetTypeCount}`);

