import { useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { formatDate, groupTransactionsByDate } from '../utils/walletHelpers';
import { Transaction } from '../utils/transactionHelpers';
import { TransactionCard } from './TransactionCard';
import { useWalletStore } from '../walletStore';

interface TransactionHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TransactionHistory = ({
    isOpen,
    onClose,
}: TransactionHistoryProps) => {
    const { transactions, fetchHistory, loading } = useWalletStore();

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    const groupedTransactions = groupTransactionsByDate(transactions);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transaction History"
            size="lg"
        >
            <div className="space-y-6">
                {loading ? (
                    <div className="py-10 text-center text-gray-500">Loading transactions...</div>
                ) : groupedTransactions.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">No transactions yet.</div>
                ) : (
                    groupedTransactions.map(({ date, transactions: dateTransactions }) => (
                        <div key={date}>
                            {/* Date Header */}
                            <div className="sticky top-0 bg-white/80 backdrop-blur-md py-3 mb-4 z-10 border-b border-gray-100 flex items-center gap-3">
                                <div className="w-1 h-4 bg-accent rounded-full" />
                                <h3 className="text-xs font-black text-primary/60 uppercase tracking-[0.2em]">
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
                    ))
                )}
            </div>
        </Modal>
    );
};
