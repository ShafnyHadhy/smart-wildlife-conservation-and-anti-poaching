import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';
import { ApiErrorDetail } from '@wildlife/shared';

function formatZodError(error: ZodError): ApiErrorDetail[] {
  return error.errors.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Validates request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodError(error);
        const primaryMessage = details[0]?.message || 'Invalid request body';
        next(new ValidationError(primaryMessage, details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodError(error);
        const primaryMessage = details[0]?.message || 'Invalid query parameters';
        next(new ValidationError(primaryMessage, details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates request URL parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodError(error);
        const primaryMessage = details[0]?.message || 'Invalid route parameters';
        next(new ValidationError(primaryMessage, details));
      } else {
        next(error);
      }
    }
  };
}
