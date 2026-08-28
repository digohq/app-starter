import type { ApiError } from '@app-starter/shared';

/**
 * Checks if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'statusCode' in error &&
    'message' in error &&
    typeof (error as ApiError).statusCode === 'number' &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Gets a user-friendly error message from an error
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  // Check if error has statusCode property (from Error object with statusCode attached)
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as any).statusCode;
    if (typeof statusCode === 'number') {
      switch (statusCode) {
        case 404:
          return 'The requested resource was not found.';
        case 403:
          return "You don't have permission to access this resource.";
        case 401:
          return 'Please log in to access this resource.';
        case 500:
          return 'A server error occurred. Please try again later.';
        case 0:
          return 'Network error. Please check your connection and try again.';
      }
    }
  }

  if (isApiError(error)) {
    switch (error.statusCode) {
      case 404:
        return 'The requested resource was not found.';
      case 403:
        return "You don't have permission to access this resource.";
      case 401:
        return 'Please log in to access this resource.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 0:
        return 'Network error. Please check your connection and try again.';
      default:
        return error.message || defaultMessage;
    }
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  return defaultMessage;
}

/**
 * Gets a user-friendly error message for event-specific errors
 */
export function getEventErrorMessage(error: unknown): string {
  // Check if error has statusCode property (from Error object with statusCode attached)
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as any).statusCode;
    if (typeof statusCode === 'number') {
      switch (statusCode) {
        case 404:
          return 'Event not found. The event may have been removed or the link is incorrect.';
        case 403:
          return "You don't have permission to view this event. Please contact the event organizer.";
        case 401:
          return 'Please log in to view this private event.';
        case 500:
          return 'A server error occurred while loading the event. Please try again later.';
        case 0:
          return 'Network error. Please check your connection and try again.';
      }
    }
  }

  if (isApiError(error)) {
    switch (error.statusCode) {
      case 404:
        return 'Event not found. The event may have been removed or the link is incorrect.';
      case 403:
        return "You don't have permission to view this event. Please contact the event organizer.";
      case 401:
        return 'Please log in to view this private event.';
      case 500:
        return 'A server error occurred while loading the event. Please try again later.';
      case 0:
        return 'Network error. Please check your connection and try again.';
      default:
        return error.message || 'An error occurred while loading the event details.';
    }
  }

  if (error instanceof Error) {
    return error.message || 'An error occurred while loading the event details.';
  }

  return 'An error occurred while loading the event details.';
}
