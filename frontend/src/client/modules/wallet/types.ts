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

export interface WalletBalance {
    balance: number;
    currency: string;
}

