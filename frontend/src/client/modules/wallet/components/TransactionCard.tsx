import { cn } from '@/lib/utils';
import { Transaction, getTransactionIcon, getIconBackground, getTransactionTitle } from '../utils/transactionHelpers';
import { useWalletModuleStore } from '../store';

interface TransactionCardProps {
    transaction: Transaction;
}

export const TransactionCard = ({ transaction }: TransactionCardProps) => {
    const { currency } = useWalletModuleStore();
    const isDebit = transaction.amount < 0;
    const amount = Math.abs(transaction.amount);

    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100/80 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 bg-white transition-all duration-300 group">
            {/* Icon */}
            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300",
                getIconBackground(transaction.type)
            )}>
                {getTransactionIcon(transaction.type)}
            </div>

            {/* Transaction Details */}
            <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 mb-0.5 truncate leading-tight" title={transaction.description}>
                    {getTransactionTitle(transaction)}
                </p>
                <div className="flex flex-col gap-0.5">
                    {transaction.type === 'topup' && transaction.referenceId && (
                        <p className="text-[10px] text-gray-500 font-medium tabular-nums">Ref: {transaction.referenceId}</p>
                    )}
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{transaction.timestamp}</p>
                </div>
            </div>

            {/* Amount */}
            <div className="flex-shrink-0 text-right ml-2">
                <p className={cn(
                    "text-lg font-black tracking-tight",
                    isDebit ? "text-gray-900" : "text-green-600"
                )}>
                    {isDebit ? '-' : '+'} <span className="text-xs font-bold text-gray-400 mr-0.5">{currency}</span>{amount.toLocaleString()}
                </p>
            </div>
        </div>
    );
};

