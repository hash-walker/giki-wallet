import { Ticket, ArrowUpCircle, ArrowRightLeft, ArrowDownCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Transaction {
    id: string;
    type: 'ticket' | 'topup' | 'transfer' | 'received';
    description: string;
    amount: number;
    timestamp: string;
    date: string; // Format: YYYY-MM-DD
}

interface TransactionHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    transactions?: Transaction[];
}

const mockTransactions: Transaction[] = [
    {
        id: '1',
        type: 'ticket',
        description: 'Ticket',
        amount: -200,
        timestamp: '9:30',
        date: new Date().toISOString().split('T')[0] // Today
    },
    {
        id: '2',
        type: 'topup',
        description: 'Jazzcash Walet/card',
        amount: 200,
        timestamp: '9:30',
        date: new Date().toISOString().split('T')[0] // Today
    },
    {
        id: '3',
        type: 'transfer',
        description: 'Khizer',
        amount: -200,
        timestamp: '9:30',
        date: new Date().toISOString().split('T')[0] // Today
    },
    {
        id: '4',
        type: 'received',
        description: 'Hamza',
        amount: 200,
        timestamp: '9:30',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
    },
    {
        id: '5',
        type: 'ticket',
        description: 'Ticket',
        amount: -200,
        timestamp: '10:15',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
    },
    {
        id: '6',
        type: 'topup',
        description: 'Jazzcash Walet/card',
        amount: 500,
        timestamp: '14:20',
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0] // 2 days ago
    }
];

const getTransactionIcon = (type: Transaction['type']) => {
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

const getIconBackground = (type: Transaction['type']) => {
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

const formatDate = (dateString: string): string => {
    const today = new Date();
    const transactionDate = new Date(dateString);
    const todayStr = today.toISOString().split('T')[0];
    
    if (dateString === todayStr) {
        return 'Today';
    }
    
    // Format as "Mon DD, YYYY" or similar
    return transactionDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {};
    
    transactions.forEach(transaction => {
        if (!grouped[transaction.date]) {
            grouped[transaction.date] = [];
        }
        grouped[transaction.date].push(transaction);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(grouped).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
    );
    
    return sortedDates.map(date => ({
        date,
        transactions: grouped[date]
    }));
};

export const TransactionHistory = ({
    isOpen,
    onClose,
    transactions = mockTransactions
}: TransactionHistoryProps) => {
    if (!isOpen) return null;

    const groupedTransactions = groupTransactionsByDate(transactions);

    return (
        <div className="mt-6 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg h-8 w-8"
                        onClick={onClose}
                        aria-label="Close transaction history"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto">
                    <div className="space-y-6">
                        {groupedTransactions.map(({ date, transactions: dateTransactions }) => (
                            <div key={date}>
                                {/* Date Header */}
                                <div className="sticky top-0 bg-white py-2 mb-3 z-10">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        {formatDate(date)}
                                    </h3>
                                </div>
                                
                                {/* Transactions for this date */}
                                <div className="space-y-3">
                                    {dateTransactions.map((transaction) => {
                                        const isDebit = transaction.amount < 0;
                                        const amount = Math.abs(transaction.amount);

                                        return (
                                            <div
                                                key={transaction.id}
                                                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                                                    getIconBackground(transaction.type)
                                                )}>
                                                    {getTransactionIcon(transaction.type)}
                                                </div>

                                                {/* Transaction Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-bold text-gray-900 mb-1">
                                                        {transaction.description}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{transaction.timestamp}</p>
                                                </div>

                                                {/* Amount */}
                                                <div className="flex-shrink-0">
                                                    <p className="text-base font-semibold text-gray-900">
                                                        {isDebit ? '-' : '+'} RS {amount}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

