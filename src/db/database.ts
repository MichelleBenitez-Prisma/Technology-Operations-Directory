import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { env } from "../config/env.js";

let database: DatabaseSync | undefined;

export type QueryParams = Record<string, string | number | null>;

export function getDatabase() {
  if (!existsSync(env.databasePath)) {
    throw new Error(
      `SQLite database was not found at ${env.databasePath}. Run npm run db:init before starting the API.`
    );
  }

  if (!database) {
    database = new DatabaseSync(env.databasePath);
    database.exec("PRAGMA foreign_keys = ON;");
  }

  return database;
}

export function queryAll<T>(sql: string, params: QueryParams = {}) {
  return getDatabase().prepare(sql).all(params) as T[];
}

export function queryOne<T>(sql: string, params: QueryParams = {}) {
  return getDatabase().prepare(sql).get(params) as T | undefined;
}

export function execute(sql: string, params: QueryParams = {}) {
  return getDatabase().prepare(sql).run(params);
}
