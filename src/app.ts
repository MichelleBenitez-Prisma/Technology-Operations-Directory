import { existsSync } from "node:fs";
import path from "node:path";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { ensureInitialAdmin } from "./db/authRepository.js";
import { auditMutations, requestContext, requireApiRole, requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { assetTypesRouter } from "./routes/assetTypes.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { createDirectoryRouter } from "./routes/directory.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { systemRecordsRouter } from "./routes/systemRecords.routes.js";

export function createApp() {
  const app = express();
  const clientBuildPath = path.resolve(process.cwd(), "dist", "client");
  const clientIndexPath = path.join(clientBuildPath, "index.html");

  app.use(helmet());
  app.use(cors());
  app.use(express.text({ type: ["text/csv", "application/csv"], limit: "1mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  ensureInitialAdmin();

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api", requireAuth, requireApiRole, auditMutations);
  app.use("/api/asset-types", assetTypesRouter);
  app.use("/api/teams", createDirectoryRouter("teams"));
  app.use("/api/people", createDirectoryRouter("people"));
  app.use("/api/vendors", createDirectoryRouter("vendors"));
  app.use("/api/asset-environments", createDirectoryRouter("assetEnvironments"));
  app.use("/api/integrations", createDirectoryRouter("integrations"));
  app.use("/api/system-dependencies", createDirectoryRouter("systemDependencies"));
  app.use("/api/document-references", createDirectoryRouter("documentReferences"));
  app.use("/api/custom-fields", createDirectoryRouter("customFields"));
  app.use("/api/scheduled-processes", createDirectoryRouter("scheduledProcesses"));
  app.use("/api/reviews", createDirectoryRouter("reviews"));
  app.use("/api/tags", createDirectoryRouter("tags"));
  app.use("/api/reports", reportsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/system-records", systemRecordsRouter);
  app.use("/api/systems", systemRecordsRouter);

  if (existsSync(clientIndexPath)) {
    app.use(express.static(clientBuildPath));
    app.use((request, response, next) => {
      if (request.method === "GET" && request.accepts("html")) {
        response.sendFile(clientIndexPath);
        return;
      }

      next();
    });
  }

  app.use((request, response) => {
    response.status(404).json({
      error: "Not Found",
      message: `No route found for ${request.method} ${request.originalUrl}`
    });
  });

  app.use(errorHandler);

  return app;
}
