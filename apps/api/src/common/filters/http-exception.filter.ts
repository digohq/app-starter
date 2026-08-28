import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Error response structure for consistent API error responses
 */
interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/**
 * Global exception filter for consistent error handling across all endpoints.
 *
 * Features:
 * - Catches all exceptions (HttpException and unknown errors)
 * - Returns consistent error response format
 * - Logs server errors (5xx) with stack traces
 * - Maps HTTP status codes to error codes
 *
 * @example Response format:
 * ```json
 * {
 *   "statusCode": 404,
 *   "code": "NOT_FOUND",
 *   "message": "Event not found",
 *   "timestamp": "2026-01-15T22:59:29.000Z",
 *   "path": "/api/events/abc123"
 * }
 * ```
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract message from various exception response formats
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, any>;

        // Handle NestJS validation pipe errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message;
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        } else if (responseObj.error) {
          message = responseObj.error;
        }

        // Use custom code if provided
        if (responseObj.code) {
          code = responseObj.code;
        } else {
          code = this.getCodeFromStatus(status);
        }
      }
    } else if (exception instanceof Error) {
      // Handle non-HTTP errors
      message = exception.message || 'Internal server error';
    }

    // Ensure code is set based on status if not already determined
    if (code === 'INTERNAL_ERROR' && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      code = this.getCodeFromStatus(status);
    }

    // Log server errors (5xx) with stack traces
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      // Log client errors at warn level (without stack trace)
      this.logger.warn(`${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Maps HTTP status codes to human-readable error codes
   */
  private getCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [HttpStatus.GATEWAY_TIMEOUT]: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }
}
