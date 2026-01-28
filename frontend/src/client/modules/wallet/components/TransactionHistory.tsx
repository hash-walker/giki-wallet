import { useEffect, useMemo } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { formatDate, groupTransactionsByDate } from '../utils/walletHelpers';
import { Transaction, mapTxType } from '../utils/transactionHelpers';
import { TransactionCard } from './TransactionCard';
import { useWalletModuleStore } from '../store';
import { ApiTransaction } from '../api';

interface TransactionHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TransactionHistory = ({
    isOpen,
    onClose,
}: TransactionHistoryProps) => {
    const { transactions, fetchHistory, isDataLoading } = useWalletModuleStore();

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    // Map ApiTransaction to Transaction UI model if needed, or check compatibility
    // Helper expects Transaction which has { id, type, description, amount, timestamp, date }
    // ApiTransaction has { id, amount, balance_after, type, reference_id, description, created_at }

    // We need to map it locally or update helpers. Let's map locally to satisfy Transaction type.
    const mappedTransactions: Transaction[] = useMemo(() => {
        return transactions.map((t: ApiTransaction) => {
            const dateObj = new Date(t.created_at);
            return {
                id: t.id,
                type: mapTxType(t.type),
                description: t.description,
                amount: t.amount,
                timestamp: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                date: dateObj.toISOString().split('T')[0]
            };
        });
    }, [transactions]);

    const groupedTransactions = groupTransactionsByDate(mappedTransactions);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transaction History"
            size="lg"
        >
            <div className="space-y-6">
                {isDataLoading && transactions.length === 0 ? (
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
                                {dateTransactions.map((transaction) => (
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
