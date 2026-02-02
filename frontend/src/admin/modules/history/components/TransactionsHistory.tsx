import { useState, useMemo, useEffect } from 'react';
import { Table, TableWrapper, getWeekStart, getWeekEnd, isDateInWeek } from '../../../shared';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from './HistoryBadge';
import { formatDate, formatTime, formatCurrency } from '../utils/formatting';
import { Transaction, WeeklyStats } from '../../transactions/types';
import { getTransportTransactions } from '../../transactions/service';

interface TransactionsHistoryProps {
    selectedWeek: Date;
}

export const TransactionsHistory = ({ selectedWeek }: TransactionsHistoryProps) => {

    // 1. STATE
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<WeeklyStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');

    const weekStart = getWeekStart(selectedWeek);
    const weekEnd = getWeekEnd(selectedWeek);

    // 2. FETCH DATA on Week Change
    useEffect(() => {
        const fetch = async () => {
            setIsLoading(true);
            try {
                // Fetch ALL transactions for the week (high page size)
                // In production, you would implement proper server-side pagination for the table.
                const resp = await getTransportTransactions(1, 1000, weekStart, weekEnd);
                setTransactions(resp.data);
                setStats(resp.weekly_stats);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [selectedWeek]); // Re-fetch when week changes

    // 3. CLIENT-SIDE FILTERING (on the fetched dataset)
    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {

            const matchesSearch =
                transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (transaction.category === 'ticket' &&
                    transaction.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
            const matchesType = filterType === 'all' || transaction.type === filterType;

            return matchesSearch && matchesCategory && matchesType;
        });
    }, [transactions, searchTerm, filterCategory, filterType]);

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
            if (transaction.type === 'received') {
                details = (
                    <div className="text-sm text-gray-600">
                        {transaction.description || 'System Credit'}
                    </div>
                );
            }
        } else {
            details = (
                <div className="text-sm text-gray-600">
                    {transaction.ticketNumber && `Ref: ${transaction.ticketNumber}`}
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {transaction.description}
                    </div>
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
                    <span className={`text-sm font-semibold ${isDebit ? 'text-red-600' : 'text-green-600'
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

            {/* 1. WEEKLY STATS CARDS */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</span>
                        <span className="text-2xl font-black text-green-600">
                            {formatCurrency(stats.total_income / 100)}
                        </span>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Refunds</span>
                        <span className="text-2xl font-black text-red-500">
                            {formatCurrency(Math.abs(stats.total_refunds) / 100)}
                        </span>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Net Profit</span>
                        <span className="text-2xl font-black text-slate-800">
                            {formatCurrency((stats.total_income + stats.total_refunds) / 100)}
                        </span>
                    </div>
                </div>
            )}

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
                            { value: 'purchase', label: 'Purchase' },
                            { value: 'refund', label: 'Refund' },
                            { value: 'received', label: 'Received' },
                        ]}
                        placeholder="Type"
                    />
                </div>
            </div>

            {/* Table */}
            <TableWrapper
                count={filteredTransactions.length}
                itemName="transaction"
                isLoading={isLoading} // Need to update TableWrapper to support isLoading if not already
            >
                <Table headers={headers} rows={rows} emptyMessage="No transaction history found." />
            </TableWrapper>
        </div>
    );
};

