import { Ticket, Wallet, ArrowRightLeft, RotateCcw, Bus } from 'lucide-react';
import { ReactNode } from 'react';

export type TransactionType = 'ticket' | 'topup' | 'transfer' | 'received' | 'refund';

export interface Transaction {
    id: string;
    type: TransactionType;
    description: string;
    amount: number;
    timestamp: string;
    date: string; // Format: YYYY-MM-DD
    referenceId?: string;
}

export const getTransactionIcon = (type: TransactionType): ReactNode => {
    switch (type) {
        case 'ticket':
            return <Bus className="w-5 h-5 text-primary" />;
        case 'topup':
            return <Wallet className="w-5 h-5 text-accent" />;
        case 'transfer':
            return <ArrowRightLeft className="w-5 h-5 text-primary" />;
        case 'received':
            return <ArrowRightLeft className="w-5 h-5 text-green-600 flip-x" />; // Reuse and flip for received
        case 'refund':
            return <RotateCcw className="w-5 h-5 text-orange-500" />;
    }
};

export const getIconBackground = (type: TransactionType): string => {
    switch (type) {
        case 'ticket':
            return "bg-primary/10";
        case 'topup':
            return "bg-accent/10";
        case 'transfer':
            return "bg-primary/10";
        case 'received':
            return "bg-green-100";
        case 'refund':
            return "bg-orange-50";
    }
};

export const mapTxType = (type: string): TransactionType => {
    switch (type) {
        case 'TRANSPORT_BOOKING': return 'ticket';
        case 'JAZZCASH_DEPOSIT': return 'topup';
        case 'REFUND': return 'refund';
        case 'TRANSFER': return 'transfer';
        case 'TRANSFER_RECEIVED': return 'received';
        default: return 'ticket';
    }
};

export const getTransactionTitle = (transaction: Transaction): string => {
    switch (transaction.type) {
        case 'ticket':
            return 'Ticket Booking';
        case 'topup':
            return 'Wallet Top-up';
        case 'transfer':
            return 'Money Sent';
        case 'received':
            return 'Money Received';
        case 'refund':
            return 'Refund Received';
        default:
            return transaction.description;
    }
};
