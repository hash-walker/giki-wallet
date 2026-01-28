// Wallet module types

export interface WalletTransaction {
    id: string;
    type: 'topup' | 'transfer' | 'received' | 'ticket_purchase' | 'refund';
    amount: number;
    description: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    paymentMethod?: 'jazzcash' | 'debit_card';
    recipientEmail?: string;
    senderEmail?: string;
}

export type PaymentMethod = 'MWALLET' | 'CARD';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';

export interface TopUpRequest {
    idempotency_key: string;
    amount: number;
    method: PaymentMethod;
    phone_number?: string;
    cnic_last6?: string;
}

export interface TopUpResult {
    id: string;
    txn_ref_no: string;
    status: PaymentStatus;
    message?: string;
    paymentMethod: PaymentMethod;
    redirect?: string;
    amount?: number;
}

export interface WalletBalance {
    balance: number;
    currency: string;
}

