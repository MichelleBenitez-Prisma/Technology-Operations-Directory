import { queryAll, queryOne } from "./database.js";

export type AssetTypeRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export function listAssetTypes() {
  return queryAll<AssetTypeRow>(
    `
    SELECT id, code, name, description
    FROM asset_types
    ORDER BY name
    `
  );
}

export function findAssetTypeByCode(code: string) {
  return queryOne<AssetTypeRow>(
    `
    SELECT id, code, name, description
    FROM asset_types
    WHERE code = $code
    `,
    { code }
  );
}

