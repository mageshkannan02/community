import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { ApiResponse } from "../utils/api_response";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => {
      const field = issue.path.join(".");
      return field ? `${field}: ${issue.message}` : issue.message;
    });
    const message = formattedErrors.join(", ") || "Validation failed";
    return ApiResponse.error(res, message, 400, formattedErrors);
  }

  // Handle known Prisma errors
  if (err?.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target || "field";
    return ApiResponse.error(res, `A record with this ${target} already exists`, 409);
  }

  if (err?.code === "P2003") {
    return ApiResponse.error(res, "Referenced record does not exist or foreign key constraint failed", 400);
  }

  if (err?.code === "P2025") {
    return ApiResponse.error(res, "Requested record was not found", 404);
  }

  console.error(" Error:", err);
  return ApiResponse.error(
    res,
    err.message || "Something went wrong",
    500
  );
};

