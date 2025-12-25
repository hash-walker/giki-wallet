// Transaction types for admin management
export type TransactionCategory = 'wallet' | 'ticket';

export type WalletTransactionType = 'topup' | 'transfer' | 'received';
export type TicketTransactionType = 'purchase' | 'cancellation' | 'refund';

export type TransactionType = WalletTransactionType | TicketTransactionType;

export interface BaseTransaction {
    id: string;
    userId: number;
    userName: string;
    userEmail: string;
    amount: number;
    timestamp: string; // ISO format
    status: 'completed' | 'pending' | 'failed';
}

export interface WalletTransaction extends BaseTransaction {
    category: 'wallet';
    type: WalletTransactionType;
    // For topup
    paymentMethod?: 'jazzcash' | 'card';
    // For transfer/received
    recipientId?: number;
    recipientName?: string;
    recipientEmail?: string;
    senderId?: number;
    senderName?: string;
    senderEmail?: string;
}

export interface TicketTransaction extends BaseTransaction {
    category: 'ticket';
    type: TicketTransactionType;
    ticketId?: string;
    ticketNumber?: string;
    routeId?: number;
    routeName?: string;
    direction?: 'from-giki' | 'to-giki';
    cityId?: string;
    cityName?: string;
    stopId?: string;
    stopName?: string;
    travelDate?: string;
    passengerName?: string;
    // For cancellation/refund
    originalTransactionId?: string;
    refundAmount?: number;
}

export type Transaction = WalletTransaction | TicketTransaction;

