import { useState, useMemo } from 'react';
import { Table, TableWrapper, getWeekStart, getWeekEnd, isDateInWeek } from '../../../shared';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from './HistoryBadge';
import { formatDate, formatTime, formatCurrency } from '../utils/formatting';
import { Transaction } from '../../transactions/types';

interface TransactionsHistoryProps {
    selectedWeek: Date;
}

// Helper to create transaction data outside component render
const getMockTransactionsData = (): Transaction[] => {
    const now = Date.now();
    const twoWeeksAgo = now - 604800000 * 2;
    const oneWeekAgo = now - 604800000;
    const threeWeeksAgo = now - 604800000 * 3;
    const fourWeeksAgo = now - 604800000 * 4;
    
    return [
        {
            id: '1',
            category: 'wallet',
            type: 'topup',
            userId: 1,
            userName: 'John Doe',
            userEmail: 'john@example.com',
            amount: 500,
            timestamp: new Date(twoWeeksAgo).toISOString(),
            status: 'completed',
            paymentMethod: 'jazzcash',
        },
        {
            id: '2',
            category: 'wallet',
            type: 'transfer',
            userId: 1,
            userName: 'John Doe',
            userEmail: 'john@example.com',
            amount: -200,
            timestamp: new Date(oneWeekAgo).toISOString(),
            status: 'completed',
            recipientId: 2,
            recipientName: 'Jane Smith',
            recipientEmail: 'jane@example.com',
        },
        {
            id: '3',
            category: 'ticket',
            type: 'purchase',
            userId: 2,
            userName: 'Alice Smith',
            userEmail: 'alice@example.com',
            amount: -200,
            timestamp: new Date(threeWeeksAgo).toISOString(),
            status: 'completed',
            ticketId: 'T001',
            ticketNumber: '1234',
            routeId: 1,
            routeName: 'GIKI to Peshawar',
            direction: 'to-giki',
            cityId: 'peshawar',
            cityName: 'Peshawar',
            travelDate: new Date(threeWeeksAgo).toISOString().split('T')[0],
        },
        {
            id: '4',
            category: 'ticket',
            type: 'cancellation',
            userId: 3,
            userName: 'Bob Johnson',
            userEmail: 'bob@example.com',
            amount: 150,
            timestamp: new Date(fourWeeksAgo).toISOString(),
            status: 'completed',
            ticketId: 'T002',
            ticketNumber: '5678',
            originalTransactionId: '3',
            refundAmount: 150,
        },
    ];
};

export const TransactionsHistory = ({ selectedWeek }: TransactionsHistoryProps) => {
    // Mock data - all transactions from previous weeks (replace with API calls)
    const [transactions] = useState<Transaction[]>(() => getMockTransactionsData());

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const weekStart = getWeekStart(selectedWeek);
    const weekEnd = getWeekEnd(selectedWeek);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            // Filter by selected week based on timestamp
            const transactionDate = new Date(transaction.timestamp);
            if (!isDateInWeek(transactionDate, weekStart, weekEnd)) {
                return false;
            }

            const matchesSearch =
                transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (transaction.category === 'ticket' &&
                    transaction.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
            const matchesType = filterType === 'all' || transaction.type === filterType;
            const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;

            return matchesSearch && matchesCategory && matchesType && matchesStatus;
        });
    }, [transactions, weekStart, weekEnd, searchTerm, filterCategory, filterType, filterStatus]);

    const headers = [
        { content: 'Date & Time', align: 'left' as const },
        { content: 'User', align: 'left' as const },
        { content: 'Type', align: 'left' as const },
        { content: 'Details', align: 'left' as const },
        { content: 'Amount', align: 'right' as const },
        { content: 'Status', align: 'left' as const },
    ];

    const rows = filteredTransactions.map((transaction) => {
        const isDebit = transaction.amount < 0;
        const amount = Math.abs(transaction.amount);

        let details: React.ReactNode = null;
        if (transaction.category === 'wallet') {
            if (transaction.type === 'topup') {
                details = (
                    <div className="text-sm text-gray-600">
                        {transaction.paymentMethod === 'jazzcash' ? 'Jazzcash Wallet' : 'Debit Card'}
                    </div>
                );
            } else if (transaction.type === 'transfer') {
                details = (
                    <div className="text-sm text-gray-600">
                        To: <span className="font-medium">{transaction.recipientName}</span>
                    </div>
                );
            } else if (transaction.type === 'received') {
                details = (
                    <div className="text-sm text-gray-600">
                        From: <span className="font-medium">{transaction.senderName}</span>
                    </div>
                );
            }
        } else {
            details = (
                <div className="text-sm text-gray-600">
                    {transaction.ticketNumber && `Ticket #${transaction.ticketNumber}`}
                    {transaction.routeName && (
                        <div className="text-xs text-gray-500">
                            {transaction.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {transaction.cityName}
                        </div>
                    )}
                </div>
            );
        }

        return {
            key: transaction.id,
            cells: [
                <div key="datetime">
                    <div className="text-sm font-medium text-gray-900">{formatDate(transaction.timestamp)}</div>
                    <div className="text-xs text-gray-500">{formatTime(transaction.timestamp)}</div>
                </div>,
                <div key="user">
                    <div className="text-sm font-medium text-gray-900">{transaction.userName}</div>
                    <div className="text-xs text-gray-500">{transaction.userEmail}</div>
                </div>,
                <Badge key="type" type="transactionType" value={transaction.type} category={transaction.category} />,
                details,
                <div key="amount" className="text-right">
                    <span className={`text-sm font-semibold ${
                        isDebit ? 'text-red-600' : 'text-green-600'
                    }`}>
                        {isDebit ? '-' : '+'} {formatCurrency(amount)}
                    </span>
                </div>,
                <Badge key="status" type="transactionStatus" value={transaction.status} />,
            ],
        };
    });

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by user name, email, ticket number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterCategory}
                        onChange={(value) => setFilterCategory(value)}
                        options={[
                            { value: 'all', label: 'All Categories' },
                            { value: 'wallet', label: 'Wallet' },
                            { value: 'ticket', label: 'Ticket' },
                        ]}
                        placeholder="Category"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterType}
                        onChange={(value) => setFilterType(value)}
                        options={[
                            { value: 'all', label: 'All Types' },
                            { value: 'topup', label: 'Top Up' },
                            { value: 'transfer', label: 'Transfer' },
                            { value: 'received', label: 'Received' },
                            { value: 'purchase', label: 'Purchase' },
                            { value: 'cancellation', label: 'Cancellation' },
                            { value: 'refund', label: 'Refund' },
                        ]}
                        placeholder="Type"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterStatus}
                        onChange={(value) => setFilterStatus(value)}
                        options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'failed', label: 'Failed' },
                        ]}
                        placeholder="Status"
                    />
                </div>
            </div>

            {/* Table */}
            <TableWrapper count={filteredTransactions.length} itemName="transaction">
                <Table headers={headers} rows={rows} emptyMessage="No transaction history found." />
            </TableWrapper>
        </div>
    );
};

