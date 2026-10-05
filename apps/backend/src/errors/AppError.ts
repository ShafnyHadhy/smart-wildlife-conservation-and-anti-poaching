import { ApiErrorDetail } from '@wildlife/shared';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = 'INTERNAL_ERROR',
    details?: ApiErrorDetail[],
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ApiErrorDetail[]) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} with identifier '${identifier}' was not found` : `${resource} was not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ApiErrorDetail[]) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: ApiErrorDetail[]) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: ApiErrorDetail[]) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}
