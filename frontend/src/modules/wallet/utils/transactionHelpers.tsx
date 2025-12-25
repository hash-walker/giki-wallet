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
            return <Ticket className="w-5 h-5 text-slate-600" />;
        case 'topup':
            return <ArrowUpCircle className="w-5 h-5 text-emerald-500" />;
        case 'transfer':
            return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
        case 'received':
            return <ArrowDownCircle className="w-5 h-5 text-rose-500" />;
    }
};

export const getIconBackground = (type: TransactionType): string => {
    switch (type) {
        case 'ticket':
            return "bg-slate-100";
        case 'topup':
            return "bg-emerald-50";
        case 'transfer':
            return "bg-blue-50";
        case 'received':
            return "bg-rose-50";
    }
};

