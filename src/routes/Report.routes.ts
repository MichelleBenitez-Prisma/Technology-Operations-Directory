import { Router } from "express";

import {
  getSystemReport,
  listSystemReportSummaries,
  SYSTEM_REPORT_KEYS,
  type SystemReportKey
} from "../db/systemRecordRepository.js";

export const reportsRouter = Router();

reportsRouter.get("/", (_request, response) => {
  response.json({
    data: listSystemReportSummaries()
  });
});

reportsRouter.get("/:reportKey", (request, response) => {
  const reportKey = parseSystemReportKey(request.params.reportKey);

  if (!reportKey) {
    response.status(404).json({
      error: "Not Found",
      message: `Report ${request.params.reportKey} was not found.`
    });
    return;
  }

  response.json({
    data: getSystemReport(reportKey)
  });
});

function parseSystemReportKey(value: string | undefined): SystemReportKey | undefined {
  return SYSTEM_REPORT_KEYS.find((key) => key === value);
}