import { Ticket, ArrowUpCircle, ArrowRightLeft, ArrowDownCircle } from 'lucide-react';
import { ReactNode } from 'react';

export type TransactionType = 'ticket' | 'topup' | 'transfer' | 'received';

export interface Transaction {
    id: string;
    type: TransactionType;
    description: string;
    amount: number;
    timestamp: string;
    date: string; // Format: YYYY-MM-DD
}

export const getTransactionIcon = (type: TransactionType): ReactNode => {
    switch (type) {
        case 'ticket':
            return <Ticket className="w-5 h-5 text-primary" />;
        case 'topup':
            return <ArrowUpCircle className="w-5 h-5 text-accent" />;
        case 'transfer':
            return <ArrowRightLeft className="w-5 h-5 text-primary" />;
        case 'received':
            return <ArrowDownCircle className="w-5 h-5 text-destructive" />;
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
            return "bg-destructive/10";
    }
};
export const mapTxType = (type: string): TransactionType => {
    switch (type) {
        case 'TICKET_PURCHASE': return 'ticket';
        case 'TOP_UP': return 'topup';
        case 'TRANSFER': return 'transfer';
        case 'TRANSFER_RECEIVED': return 'received';
        default: return 'ticket';
    }
};
