import { cn } from '@/lib/utils';
import { Transaction, getTransactionIcon, getIconBackground } from '../utils/transactionHelpers';
import { useWalletModuleStore } from '../store';

interface TransactionCardProps {
    transaction: Transaction;
}

export const TransactionCard = ({ transaction }: TransactionCardProps) => {
    const { currency } = useWalletModuleStore();
    const isDebit = transaction.amount < 0;
    const amount = Math.abs(transaction.amount);

    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white transition-all duration-200">
            {/* Icon */}
            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm",
                getIconBackground(transaction.type)
            )}>
                {getTransactionIcon(transaction.type)}
            </div>

            {/* Transaction Details */}
            <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 mb-0.5 truncate">
                    {transaction.description}
                </p>
                <p className="text-xs text-gray-500 font-medium">{transaction.timestamp}</p>
            </div>

            {/* Amount */}
            <div className="flex-shrink-0 text-right">
                <p className={cn(
                    "text-base font-bold tracking-tight",
                    isDebit ? "text-gray-900" : "text-green-600"
                )}>
                    {isDebit ? '-' : '+'} <span className="text-sm font-medium text-gray-400 mr-0.5">{currency}</span>{amount.toLocaleString()}
                </p>
            </div>
        </div>
    );
};

