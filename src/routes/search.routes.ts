import { Router } from "express";

import { searchTechnologyAssets } from "../db/directoryRepository.js";
import { searchQuerySchema } from "../validation/directorySchemas.js";

export const searchRouter = Router();

searchRouter.get("/", (request, response) => {
  const query = searchQuerySchema.parse(request.query);

  response.json({
    data: searchTechnologyAssets(query.query, query.limit)
  });
});
