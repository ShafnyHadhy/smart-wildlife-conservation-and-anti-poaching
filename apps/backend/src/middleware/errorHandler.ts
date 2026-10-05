import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ApiErrorResponse } from '@wildlife/shared';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Always log server errors with request context
  console.error(`[API Error] ${req.method} ${req.path}:`, {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    details: err.details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Known domain errors
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Common PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': {
        const detail = err.detail || 'Unique constraint violation';
        const response: ApiErrorResponse = {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'A duplicate record already exists with the provided unique identifier or key.',
            details: [{ message: detail }],
          },
        };
        res.status(409).json(response);
        return;
      }
      case '23503': {
        const detail = err.detail || 'Foreign key constraint violation';
        const response: ApiErrorResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Referenced entity does not exist or cannot be modified.',
            details: [{ message: detail }],
          },
        };
        res.status(400).json(response);
        return;
      }
      case '23514': {
        const response: ApiErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Record violates a database check constraint.',
            details: [{ message: err.message }],
          },
        };
        res.status(400).json(response);
        return;
      }
      case '22P02': {
        const response: ApiErrorResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid input format (e.g. malformed UUID or numeric parameter).',
            details: [{ message: err.message }],
          },
        };
        res.status(400).json(response);
        return;
      }
      default:
        break;
    }
  }

  // Fallback for unexpected server errors

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred. Please try again later.',
    },
  };

  res.status(500).json(response);
}
