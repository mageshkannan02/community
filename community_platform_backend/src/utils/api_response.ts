import { Response } from "express";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    pagination?: PaginationMeta
  ) {
    const payload: any = {
      success: true,
    };

    if (message) payload.message = message;
    if (data !== undefined) payload.data = data;
    if (pagination) payload.pagination = pagination;

    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message: string = "Internal Server Error",
    statusCode: number = 500,
    errors?: any
  ) {
    const payload: any = {
      success: false,
      error: {
        message,
      },
    };

    if (errors) payload.error.details = errors;

    return res.status(statusCode).json(payload);
  }
}
