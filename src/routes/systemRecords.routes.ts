import { Router } from "express";

import {
  createSystemRecord,
  findSystemRecordById,
  listSystemRecords
} from "../db/systemRecordRepository.js";
import {
  createSystemRecordSchema,
  listSystemRecordsQuerySchema
} from "../validation/systemRecordSchemas.js";

export const systemRecordsRouter = Router();

systemRecordsRouter.get("/", (request, response) => {
  const query = listSystemRecordsQuerySchema.parse(request.query);

  response.json({
    data: listSystemRecords(query)
  });
});

systemRecordsRouter.get("/:id", (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({
      error: "Validation Error",
      message: "System record id must be a positive integer."
    });
    return;
  }

  const record = findSystemRecordById(id);

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
  const record = createSystemRecord(input);

  response.status(201).json({
    data: record
  });
});

