import { Modal } from '@/shared/components/ui/Modal';
import { formatDate, groupTransactionsByDate } from '../utils/walletHelpers';
import { Transaction } from '../utils/transactionHelpers';
import { TransactionCard } from './TransactionCard';

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


export const TransactionHistory = ({
    isOpen,
    onClose,
    transactions = mockTransactions
}: TransactionHistoryProps) => {
    const groupedTransactions = groupTransactionsByDate(transactions);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transaction History"
            size="lg"
        >
            <div className="space-y-6">
                        {groupedTransactions.map(({ date, transactions: dateTransactions }: { date: string; transactions: Transaction[] }) => (
                            <div key={date}>
                                {/* Date Header */}
                                <div className="sticky top-0 bg-white py-2 mb-3 z-10">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        {formatDate(date)}
                                    </h3>
                                </div>
                                
                                {/* Transactions for this date */}
                                <div className="space-y-3">
                                    {dateTransactions.map((transaction: Transaction) => (
                                        <TransactionCard key={transaction.id} transaction={transaction} />
                                    ))}
                                </div>
                            </div>
                        ))}
            </div>
        </Modal>
    );
};

