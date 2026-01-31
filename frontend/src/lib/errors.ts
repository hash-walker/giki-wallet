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

export enum CommonErrorCode {
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_FIELD = 'MISSING_FIELD',

    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    FORBIDDEN = 'FORBIDDEN',

    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',

    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export enum AuthErrorCode {
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

    USER_NOT_FOUND = 'USER_NOT_FOUND',
    USER_INACTIVE = 'USER_INACTIVE',
    USER_NOT_VERIFIED = 'USER_NOT_VERIFIED',
    USER_PENDING_APPROVAL = 'USER_PENDING_APPROVAL',

    INVALID_PASSWORD = 'INVALID_PASSWORD',

    INVALID_VERIFICATION_TOKEN = 'INVALID_VERIFICATION_TOKEN',
    VERIFICATION_TOKEN_EXPIRED = 'VERIFICATION_TOKEN_EXPIRED',
}

export enum UserErrorCode {
    EMAIL_RESTRICTED = 'EMAIL_RESTRICTED',
    INVALID_EMAIL = 'INVALID_EMAIL',
    INVALID_USER_TYPE = 'INVALID_USER_TYPE',

    DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
    DUPLICATE_PHONE = 'DUPLICATE_PHONE',
    DUPLICATE_REG_ID = 'DUPLICATE_REG_ID',

    MISSING_REG_ID = 'MISSING_REG_ID',
    INVALID_REG_ID = 'INVALID_REG_ID',
}

export enum PaymentErrorCode {
    INVALID_PAYMENT_METHOD = 'INVALID_PAYMENT_METHOD',
    INVALID_PHONE = 'INVALID_PHONE',
    INVALID_CNIC = 'INVALID_CNIC',

    TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
    DUPLICATE_IDEMPOTENCY = 'DUPLICATE_IDEMPOTENCY',

    GATEWAY_UNAVAILABLE = 'GATEWAY_UNAVAILABLE',
}

export enum WalletErrorCode {
    WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
    WALLET_INACTIVE = 'WALLET_INACTIVE',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
}

export enum TransportErrorCode {
    ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
    INVALID_ROUTE_ID = 'INVALID_ROUTE_ID',
    TRIP_NOT_FOUND = 'TRIP_NOT_FOUND',
    NO_SEATS_AVAILABLE = 'NO_SEATS_AVAILABLE',
    TRIP_FULL = 'TRIP_FULL',
    HOLD_EXPIRED = 'HOLD_EXPIRED',
    TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
    REFUND_FAILED = 'REFUND_FAILED',
    NO_WEEK_TRIPS_AVAILABLE = 'NO_WEEK_TRIPS_AVAILABLE',

    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    NO_QUOTA_POLICY = 'NO_QUOTA_POLICY',

    INVALID_PASSENGER_NAME = 'INVALID_PASSENGER_NAME',
    CANCELLATION_CLOSED = 'CANCELLATION_CLOSED',
}

// Union type of all error code enums
export type AppErrorCode =
    | CommonErrorCode
    | AuthErrorCode
    | UserErrorCode
    | PaymentErrorCode
    | WalletErrorCode
    | TransportErrorCode
    | string;

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

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    getUserMessage(): string {
        return ERROR_MESSAGES[this.code] || this.message || 'An unexpected error occurred. Please try again.';
    }
}

export const ERROR_MESSAGES: Record<string, string> = {
    // --- Common Errors ---
    [CommonErrorCode.INVALID_INPUT]: 'Please check your input and try again',
    [CommonErrorCode.MISSING_FIELD]: 'A required field is missing',

    [CommonErrorCode.UNAUTHORIZED]: 'Please log in to continue',
    [CommonErrorCode.INVALID_TOKEN]: 'Your session has expired. Please log in again',
    [CommonErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',

    [CommonErrorCode.NOT_FOUND]: 'The requested resource could not be found',
    [CommonErrorCode.CONFLICT]: 'The request could not be completed at this time',

    [CommonErrorCode.RATE_LIMIT_EXCEEDED]: 'You are doing that too often. Please try again in a moment',

    // --- Auth Errors ---
    [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',

    [AuthErrorCode.USER_NOT_FOUND]: 'Account not found',
    [AuthErrorCode.USER_INACTIVE]: 'Account is inactive. Please contact support',
    [AuthErrorCode.USER_NOT_VERIFIED]: 'Please verify your email address to continue',
    [AuthErrorCode.USER_PENDING_APPROVAL]: 'Your account is pending approval',

    [AuthErrorCode.INVALID_PASSWORD]: 'The password you entered is incorrect',

    [AuthErrorCode.INVALID_VERIFICATION_TOKEN]: 'The verification link is invalid',
    [AuthErrorCode.VERIFICATION_TOKEN_EXPIRED]: 'The verification link has expired',

    // --- User Errors ---
    [UserErrorCode.EMAIL_RESTRICTED]: 'Please use your @giki.edu.pk email address',
    [UserErrorCode.INVALID_EMAIL]: 'Please enter a valid email address',
    [UserErrorCode.INVALID_USER_TYPE]: 'Invalid account type selected',

    [UserErrorCode.DUPLICATE_EMAIL]: 'An account with this email already exists',
    [UserErrorCode.DUPLICATE_PHONE]: 'This phone number is already registered',
    [UserErrorCode.DUPLICATE_REG_ID]: 'This registration ID is already registered',

    [UserErrorCode.MISSING_REG_ID]: 'Registration ID is required',
    [UserErrorCode.INVALID_REG_ID]: 'Please enter a valid Registration ID',

    // --- Payment Errors ---
    [PaymentErrorCode.INVALID_PAYMENT_METHOD]: 'The selected payment method is not supported',
    [PaymentErrorCode.INVALID_PHONE]: 'Please enter a valid phone number',
    [PaymentErrorCode.INVALID_CNIC]: 'Please enter a valid CNIC',

    [PaymentErrorCode.TRANSACTION_NOT_FOUND]: 'Transaction details not found',
    [PaymentErrorCode.DUPLICATE_IDEMPOTENCY]: 'This transaction is currently being processed',

    [PaymentErrorCode.GATEWAY_UNAVAILABLE]: 'Payment service is busy. Please try again later',

    // --- Wallet Errors ---
    [WalletErrorCode.WALLET_NOT_FOUND]: 'Wallet not found',
    [WalletErrorCode.WALLET_INACTIVE]: 'To perform this action, your wallet must be active',
    [WalletErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient balance',
    [WalletErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds to complete this action',

    // --- Transport Errors ---
    [TransportErrorCode.ROUTE_NOT_FOUND]: 'Route not found',
    [TransportErrorCode.INVALID_ROUTE_ID]: 'Invalid route selection',
    [TransportErrorCode.TRIP_NOT_FOUND]: 'Trip not found or no longer available',
    [TransportErrorCode.NO_SEATS_AVAILABLE]: 'Sorry, there are no seats available',
    [TransportErrorCode.TRIP_FULL]: 'Sorry, this trip is fully booked',
    [TransportErrorCode.HOLD_EXPIRED]: 'Reservation expired. Please try again',
    [TransportErrorCode.TICKET_NOT_FOUND]: 'Ticket not found',
    [TransportErrorCode.REFUND_FAILED]: 'Refund failed. Please contact support',
    [TransportErrorCode.NO_WEEK_TRIPS_AVAILABLE]: 'No trips scheduled for this week',
    [TransportErrorCode.QUOTA_EXCEEDED]: 'Weekly booking limit reached',
    [TransportErrorCode.NO_QUOTA_POLICY]: 'Booking policy error. Please contact support',
    [TransportErrorCode.INVALID_PASSENGER_NAME]: 'Please enter a valid passenger name',
    [TransportErrorCode.CANCELLATION_CLOSED]: 'Cancellation is no longer allowed for this trip',
};

export function extractAPIError(error: unknown): AppError {
    const fallbackError = new AppError('UNKNOWN_ERROR', 'An unexpected error occurred', 500);

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

        // Ensure responseData is an object before checking for properties with 'in'
        if (responseData && typeof responseData === 'object' && 'error' in responseData && (responseData as any).error) {
            const apiError = (responseData as any).error as APIError;
            return new AppError(
                apiError.code || 'UNKNOWN_ERROR',
                ERROR_MESSAGES[apiError.code] ? ERROR_MESSAGES[apiError.code] : (apiError.message || fallbackError.message),
                statusCode,
                apiError.details,
                (responseData as any).meta?.request_id
            );
        }

        return new AppError(
            'UNKNOWN_ERROR',
            axiosError.message || fallbackError.message,
            statusCode
        );
    }

    if (error instanceof Error) {
        return new AppError('CLIENT_ERROR', error.message, 0);
    }

    return fallbackError;
}

export function getErrorMessage(error: unknown): string {
    const appError = extractAPIError(error);
    return appError.getUserMessage();
}

export function logError(error: AppError, context?: Record<string, unknown>): void {
    console.error('[AppError]', {
        code: error.code,
        message: error.message,
        userMessage: error.getUserMessage(),
        statusCode: error.statusCode,
        requestId: error.requestId,
        details: error.details,
        context,
    });
}
