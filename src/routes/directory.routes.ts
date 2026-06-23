import { Router } from "express";

import {
  archiveDirectoryRow,
  createDirectoryRow,
  deleteDirectoryRow,
  findDirectoryRowById,
  listDirectoryRows,
  updateDirectoryRow,
  type DirectoryResourceName
} from "../db/directoryRepository.js";
import {
  directoryListQuerySchema,
  parseCreateInput,
  parseUpdateInput
} from "../validation/directorySchemas.js";

export function createDirectoryRouter(resourceName: DirectoryResourceName) {
  const router = Router();

  router.get("/", (request, response) => {
    const query = directoryListQuerySchema.parse(request.query);

    response.json({
      data: listDirectoryRows(resourceName, query)
    });
  });

  router.get("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const row = findDirectoryRowById(resourceName, id);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.json({
      data: row
    });
  });

  router.post("/", (request, response) => {
    const input = parseCreateInput(resourceName, request.body);
    const row = createDirectoryRow(resourceName, input);

    response.status(201).json({
      data: row
    });
  });

   router.post("/:id/archive", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const row = archiveDirectoryRow(resourceName, id);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.json({
      data: row
    });
  });
  router.patch("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const input = parseUpdateInput(resourceName, request.body);
    const row = updateDirectoryRow(resourceName, id, input);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.json({
      data: row
    });
  });

  router.put("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const input = parseUpdateInput(resourceName, request.body);
    const row = updateDirectoryRow(resourceName, id, input);

    if (!row) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.json({
      data: row
    });
  });

  router.delete("/:id", (request, response) => {
    const id = parseId(request.params.id);

    if (!id) {
      response.status(400).json({
        error: "Validation Error",
        message: "Id must be a positive integer."
      });
      return;
    }

    const deleted = deleteDirectoryRow(resourceName, id);

    if (!deleted) {
      response.status(404).json({
        error: "Not Found",
        message: `Record ${id} was not found.`
      });
      return;
    }

    response.status(204).send();
  });

  return router;
}

function parseId(value: string | undefined) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}
