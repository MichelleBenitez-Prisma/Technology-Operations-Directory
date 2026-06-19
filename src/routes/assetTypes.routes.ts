import { Router } from "express";

import { listAssetTypes } from "../db/assetTypeRepository.js";

export const assetTypesRouter = Router();

assetTypesRouter.get("/", (_request, response) => {
  response.json({
    data: listAssetTypes()
  });
});
