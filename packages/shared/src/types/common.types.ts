/**
 * Common API response and error types
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Standard API error response
 */
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}
