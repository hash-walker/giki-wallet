import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader, TableWrapper } from '../../../shared';
import { TransactionsTable } from '../components/TransactionsTable';
import { TransactionFilters } from '../components/TransactionFilters';
import { Transaction, TransactionCategory } from '../types';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '@/shared/stores/authStore';
import { getTransportTransactions } from '../service';
import { toast } from 'sonner';
import { PaginationControl } from '../../../shared/components/PaginationControl';

export const TransactionsPage = () => {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(100);
    const [totalCount, setTotalCount] = useState(0);

    const loadTransactions = useCallback(async (pageNum: number) => {
        if (user?.user_type === 'TRANSPORT_ADMIN') {
            setIsLoading(true);
            try {
                const response = await getTransportTransactions(pageNum, pageSize);
                setTransactions(response.data);
                setTotalCount(response.total_count);
                setPage(response.page);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
                toast.error("Failed to load transactions");
            } finally {
                setIsLoading(false);
            }
        } else {
            // Mock data for others
            const now = Date.now();
            setTransactions([
                {
                    id: '1',
                    category: 'wallet',
                    type: 'topup',
                    userId: 1,
                    userName: 'John Doe',
                    userEmail: 'john@example.com',
                    amount: 500,
                    timestamp: new Date(now).toISOString(),
                    status: 'completed',
                    paymentMethod: 'jazzcash',
                },
            ]);
            setTotalCount(1);
            setPage(1);
        }
    }, [user, pageSize]);

    useEffect(() => {
        loadTransactions(1);
    }, [loadTransactions]);

    const handlePageChange = (newPage: number) => {
        loadTransactions(newPage);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState<TransactionCategory | 'all'>('all');
    const [type, setType] = useState<string>('all');
    const [status, setStatus] = useState<string>('all');

    const filteredTransactions = useMemo(() => {
        // Important: this filtering is currently local to the fetched page
        return transactions.filter((transaction) => {
            const matchesSearch =
                transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (transaction.category === 'ticket' &&
                    transaction.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = category === 'all' || transaction.category === category;
            const matchesType = type === 'all' || transaction.type === type;
            const matchesStatus = status === 'all' || transaction.status === status;

            return matchesSearch && matchesCategory && matchesType && matchesStatus;
        });
    }, [transactions, searchTerm, category, type, status]);

    const handleExport = () => {
        console.log('Export transactions');
    };

    const tableCategory = category !== 'all' ? category : undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Transactions Management"
                description="View and manage all wallet and ticket transactions"
                action={
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                }
            />

            {/* Filters */}
            <TransactionFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                category={category}
                onCategoryChange={(value) => {
                    setCategory(value as TransactionCategory | 'all');
                    setType('all');
                }}
                type={type}
                onTypeChange={setType}
                status={status}
                onStatusChange={setStatus}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Transactions"
                    value={totalCount}
                    icon={<FileText className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Page Transactions"
                    value={filteredTransactions.length}
                    icon={<FileText className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Ticket (Page)"
                    value={filteredTransactions.filter(t => t.category === 'ticket').length}
                    icon={<FileText className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Page Amount"
                    value={`RS ${filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}`}
                    icon={<FileText className="w-5 h-5" />}
                />
            </div>

            {/* Transactions Table */}
            <TableWrapper
                count={totalCount}
                itemName="transaction"
                isLoading={isLoading}
            >
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <PaginationControl
                            currentPage={page}
                            totalPages={Math.ceil(totalCount / pageSize)}
                            onPageChange={handlePageChange}
                        />
                    </div>

                    <TransactionsTable
                        transactions={filteredTransactions}
                        category={tableCategory}
                    />
                </div>
            </TableWrapper>
        </div>
    );
};


const SummaryCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">{title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                    <div className="text-blue-600">{icon}</div>
                </div>
            </div>
        </div>
    );
};

