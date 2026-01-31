/**
 * API Error Types
 * Mirrors backend error structure from internal/common/response.go
 */

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: APIError;
    meta: ResponseMeta;
}

export interface APIError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ResponseMeta {
    request_id: string;
}

/**
 * Transport module specific error codes
 * Mirrors backend/internal/transport/errors.go
 */
export enum TransportErrorCode {
    // Route Errors
    ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
    INVALID_ROUTE_ID = 'INVALID_ROUTE_ID',

    // Trip Errors
    TRIP_NOT_FOUND = 'TRIP_NOT_FOUND',
    TRIP_CREATION_FAILED = 'TRIP_CREATION_FAILED',
    NO_SEATS_AVAILABLE = 'NO_SEATS_AVAILABLE',
    TRIP_FULL = 'TRIP_FULL',
    HOLD_EXPIRED = 'HOLD_EXPIRED',
    TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
    REFUND_FAILED = 'REFUND_FAILED',
    NO_WEEK_TRIPS_AVAILABLE = 'NO_WEEK_TRIPS_AVAILABLE',

    // Quota Errors
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    NO_QUOTA_POLICY = 'NO_QUOTA_POLICY',

    // Validation Errors
    INVALID_PASSENGER_NAME = 'INVALID_PASSENGER_NAME',
    CANCELLATION_CLOSED = 'CANCELLATION_CLOSED',

    // Common Errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    INVALID_JSON = 'INVALID_JSON',
    INVALID_INPUT = 'INVALID_INPUT',
}

/**
 * Custom Application Error class
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: Record<string, unknown>;
    public readonly requestId?: string;

    constructor(
        code: string,
        message: string,
        statusCode: number = 500,
        details?: Record<string, unknown>,
        requestId?: string
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.requestId = requestId;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    /**
     * Get user-friendly error message based on error code
     */
    getUserMessage(): string {
        return ERROR_MESSAGES[this.code as TransportErrorCode] || this.message;
    }
}

/**
 * User-friendly error messages for transport module
 */
export const ERROR_MESSAGES: Record<string, string> = {
    // Route Errors
    [TransportErrorCode.ROUTE_NOT_FOUND]: 'The selected route could not be found',
    [TransportErrorCode.INVALID_ROUTE_ID]: 'Invalid route selection',

    // Trip Errors
    [TransportErrorCode.TRIP_NOT_FOUND]: 'The selected trip is no longer available',
    [TransportErrorCode.TRIP_CREATION_FAILED]: 'Failed to create trip. Please try again',
    [TransportErrorCode.NO_SEATS_AVAILABLE]: 'No seats are available for this trip',
    [TransportErrorCode.TRIP_FULL]: 'This trip is fully booked',
    [TransportErrorCode.HOLD_EXPIRED]: 'Your reservation has expired. Please try booking again',
    [TransportErrorCode.TICKET_NOT_FOUND]: 'Ticket not found',
    [TransportErrorCode.REFUND_FAILED]: 'Refund processing failed. Please contact support',
    [TransportErrorCode.NO_WEEK_TRIPS_AVAILABLE]: 'No trips available for the selected week',

    // Quota Errors
    [TransportErrorCode.QUOTA_EXCEEDED]: 'You have reached your weekly booking limit',
    [TransportErrorCode.NO_QUOTA_POLICY]: 'Unable to verify booking quota. Please contact support',

    // Validation Errors
    [TransportErrorCode.INVALID_PASSENGER_NAME]: 'Please enter a valid passenger name',
    [TransportErrorCode.CANCELLATION_CLOSED]: 'The cancellation window for this ticket has closed',

    // Common Errors
    [TransportErrorCode.UNAUTHORIZED]: 'Please log in to continue',
    [TransportErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',
    [TransportErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again',
    [TransportErrorCode.INVALID_JSON]: 'Invalid request format',
    [TransportErrorCode.INVALID_INPUT]: 'Please check your input and try again',
};

/**
 * Extract error from axios error response
 */
export function extractAPIError(error: unknown): AppError {
    // Check if it's an axios error
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as {
            response?: {
                data?: APIResponse<unknown>;
                status?: number;
            };
            message?: string;
        };

        const responseData = axiosError.response?.data;
        const statusCode = axiosError.response?.status || 500;

        // Check if response has our APIResponse structure
        if (responseData && 'error' in responseData && responseData.error) {
            const apiError = responseData.error as APIError;
            return new AppError(
                apiError.code || 'UNKNOWN_ERROR',
                apiError.message || 'An error occurred',
                statusCode,
                apiError.details,
                responseData.meta?.request_id
            );
        }

        // Fallback for non-structured errors
        return new AppError(
            'UNKNOWN_ERROR',
            axiosError.message || 'An unexpected error occurred',
            statusCode
        );
    }

    // Handle non-axios errors
    if (error instanceof Error) {
        return new AppError('CLIENT_ERROR', error.message, 0);
    }

    return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred', 0);
}

/**
 * Get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
    const appError = extractAPIError(error);
    return appError.getUserMessage();
}

/**
 * Log error to console (can be extended to send to logging service)
 */
export function logError(error: AppError, context?: Record<string, unknown>): void {
    console.error('[AppError]', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        requestId: error.requestId,
        details: error.details,
        context,
    });
}
