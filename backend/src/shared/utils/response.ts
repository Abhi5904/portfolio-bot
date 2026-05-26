import type { Response } from "express";

export interface ApiResponse<T = unknown> {
  status: "success";
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    status: "success",
    message,
    ...(data !== undefined && { data }),
  };

  return res.status(statusCode).json(response);
};

export const paginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode: number = 200,
  extras?: Record<string, unknown>
): Response => {
  const totalPages = Math.ceil(total / limit);

  const response = {
    status: "success",
    message,
    data,
    ...extras,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  return res.status(statusCode).json(response);
};
