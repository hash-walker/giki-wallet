import { cn } from '@/lib/utils';
import { Transaction, getTransactionIcon, getIconBackground } from '../../utils/transactionHelpers';

interface TransactionCardProps {
    transaction: Transaction;
}

export const TransactionCard = ({ transaction }: TransactionCardProps) => {
    const isDebit = transaction.amount < 0;
    const amount = Math.abs(transaction.amount);

    return (
        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
};

