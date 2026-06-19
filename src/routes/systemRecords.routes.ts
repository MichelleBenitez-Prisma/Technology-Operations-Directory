import { Router, type Response } from "express";

import {
  archiveSystemRecord,
  createSystemRecord,
  deleteSystemRecord,
  findSystemRecordById,
  getSystemRecordDashboardTotals,
  listIncompleteSystemRecords,
  listSystemRecords,
  updateSystemRecord
} from "../db/systemRecordRepository.js";
import {
  createSystemRecordSchema,
  listSystemRecordsQuerySchema,
  updateSystemRecordSchema
} from "../validation/systemRecordSchemas.js";

export const systemRecordsRouter = Router();

systemRecordsRouter.get("/dashboard-totals", (_request, response) => {
  response.json({
    data: getSystemRecordDashboardTotals()
  });
});

systemRecordsRouter.get("/incomplete", (request, response) => {
  const query = listSystemRecordsQuerySchema.parse(request.query);

  response.json({
    data: listIncompleteSystemRecords(query)
  });
});

systemRecordsRouter.get("/", (request, response) => {
  const query = listSystemRecordsQuerySchema.parse(request.query);

  response.json({
    data: listSystemRecords(query)
  });
});

systemRecordsRouter.get("/:id", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const record = findSystemRecordById(id, { includeArchived: true });

  if (!record) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: record
  });
});

systemRecordsRouter.post("/", (request, response) => {
  const input = createSystemRecordSchema.parse(request.body);
  const result = createSystemRecord(input);

  response.status(201).json(result);
});

systemRecordsRouter.put("/:id", (request, response) => {
  updateSystemRecordHandler(request.params.id, request.body, response);
});

systemRecordsRouter.patch("/:id", (request, response) => {
  updateSystemRecordHandler(request.params.id, request.body, response);
});

systemRecordsRouter.post("/:id/archive", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const record = archiveSystemRecord(id);

  if (!record) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json({
    data: record
  });
});

systemRecordsRouter.delete("/:id", (request, response) => {
  const id = parseSystemRecordId(request.params.id);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const deleted = deleteSystemRecord(id);

  if (!deleted) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.status(204).send();
});

function updateSystemRecordHandler(rawId: string | undefined, body: unknown, response: Response) {
  const id = parseSystemRecordId(rawId);

  if (!id) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const input = updateSystemRecordSchema.parse(body);
  const result = updateSystemRecord(id, input);

  if (!result) {
    response.status(404).json({
      error: "Not Found",
      message: `System record ${id} was not found.`
    });
    return;
  }

  response.json(result);
}

function parseSystemRecordId(value: string | undefined) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}
