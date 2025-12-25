import { Transaction, TransactionCategory } from '../types';
import { Table } from '../../../shared';
import { Badge } from './Badge';
import { formatCurrency, formatDate, formatTime } from '../utils/formatting';

interface TransactionsTableProps {
    transactions: Transaction[];
    category?: TransactionCategory;
}

export const TransactionsTable = ({ transactions, category }: TransactionsTableProps) => {
    const getHeaders = () => {
        const baseHeaders = [
            { content: 'Date & Time', align: 'left' as const },
            { content: 'User', align: 'left' as const },
            { content: 'Type', align: 'left' as const },
            { content: 'Details', align: 'left' as const },
            { content: 'Amount', align: 'right' as const },
            { content: 'Status', align: 'left' as const },
        ];

        if (category === 'ticket') {
            return [
                ...baseHeaders.slice(0, 3),
                { content: 'Ticket Info', align: 'left' as const },
                ...baseHeaders.slice(3),
            ];
        }

        return baseHeaders;
    };

    const getRows = () => {
        return transactions.map((transaction) => {
            const cells: React.ReactNode[] = [];

            // Date & Time
            cells.push(
                <div key="datetime">
                    <div className="text-sm font-medium text-gray-900">{formatDate(transaction.timestamp)}</div>
                    <div className="text-xs text-gray-500">{formatTime(transaction.timestamp)}</div>
                </div>
            );

            // User
            cells.push(
                <div key="user">
                    <div className="text-sm font-medium text-gray-900">{transaction.userName}</div>
                    <div className="text-xs text-gray-500">{transaction.userEmail}</div>
                </div>
            );

            // Type
            cells.push(
                <Badge key="type" type={transaction.type} category={transaction.category} />
            );

            // Details (varies by category)
            if (transaction.category === 'wallet') {
                cells.push(
                    <WalletTransactionDetails key="details" transaction={transaction} />
                );
            } else {
                cells.push(
                    <TicketTransactionDetails key="details" transaction={transaction} />
                );
            }

            // Amount
            const isDebit = transaction.amount < 0;
            const amount = Math.abs(transaction.amount);
            cells.push(
                <div key="amount" className="text-right">
                    <span className={`text-sm font-semibold ${
                        isDebit ? 'text-red-600' : 'text-green-600'
                    }`}>
                        {isDebit ? '-' : '+'} {formatCurrency(amount)}
                    </span>
                </div>
            );

            // Status
            cells.push(
                <Badge key="status" status={transaction.status} />
            );

            return {
                key: transaction.id,
                cells,
            };
        });
    };

    const emptyMessage = category
        ? `No ${category} transactions found.`
        : 'No transactions found.';

    return (
        <Table
            headers={getHeaders()}
            rows={getRows()}
            emptyMessage={emptyMessage}
        />
    );
};

// Wallet Transaction Details Component
const WalletTransactionDetails = ({ transaction }: { transaction: Extract<Transaction, { category: 'wallet' }> }) => {
    if (transaction.type === 'topup') {
        return (
            <div className="text-sm text-gray-600">
                {transaction.paymentMethod === 'jazzcash' ? 'Jazzcash Wallet' : 'Debit Card'}
            </div>
        );
    }

    if (transaction.type === 'transfer') {
        return (
            <div className="text-sm text-gray-600">
                To: <span className="font-medium">{transaction.recipientName}</span>
                <div className="text-xs text-gray-500">{transaction.recipientEmail}</div>
            </div>
        );
    }

    if (transaction.type === 'received') {
        return (
            <div className="text-sm text-gray-600">
                From: <span className="font-medium">{transaction.senderName}</span>
                <div className="text-xs text-gray-500">{transaction.senderEmail}</div>
            </div>
        );
    }

    return null;
};

// Ticket Transaction Details Component
const TicketTransactionDetails = ({ transaction }: { transaction: Extract<Transaction, { category: 'ticket' }> }) => {
    return (
        <div className="text-sm text-gray-600">
            {transaction.ticketNumber && (
                <div className="font-medium">Ticket #{transaction.ticketNumber}</div>
            )}
            {transaction.routeName && (
                <div className="text-xs">
                    {transaction.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {transaction.cityName}
                </div>
            )}
            {transaction.passengerName && (
                <div className="text-xs text-gray-500">Passenger: {transaction.passengerName}</div>
            )}
            {transaction.travelDate && (
                <div className="text-xs text-gray-500">Date: {formatDate(transaction.travelDate)}</div>
            )}
        </div>
    );
};

