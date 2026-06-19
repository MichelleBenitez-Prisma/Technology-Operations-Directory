import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Validation Error",
      issues: error.issues
    });
    return;
  }

  if (error instanceof Error && error.name === "ValidationError") {
    response.status(400).json({
      error: "Validation Error",
      message: error.message
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred."
  });
};
