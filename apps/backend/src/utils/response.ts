import { Response } from 'express';
import { ApiResponse, ApiListResponse, ApiListMeta } from '@wildlife/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
  };
  return res.status(statusCode).json(payload);
}

export function sendList<T>(res: Response, data: T[], meta?: Partial<ApiListMeta>, statusCode = 200): Response {
  const payload: ApiListResponse<T> = {
    success: true,
    data,
    meta: {
      count: data.length,
      ...meta,
    },
  };
  return res.status(statusCode).json(payload);
}
