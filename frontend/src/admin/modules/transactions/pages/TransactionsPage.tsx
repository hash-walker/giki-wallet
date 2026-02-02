import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader, TableWrapper, WeekSelector, getWeekStart, getWeekEnd, formatWeekRange, PaginationControl, getCurrentWeek } from '../../../shared';
import { TransactionsTable } from '../components/TransactionsTable';
import { TransactionFilters } from '../components/TransactionFilters';
import { Transaction, TransactionCategory, WeeklyStats } from '../types';
import { Download, FileText, Banknote, ArrowRightLeft, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '@/shared/stores/authStore';
import { getTransportTransactions } from '../service';
import { toast } from 'sonner';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Input } from '@/shared/components/ui/Input';

export const TransactionsPage = () => {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(100);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState<WeeklyStats>({ total_income: 0, total_refunds: 0, transaction_count: 0 });

    const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
    const weekStart = useMemo(() => getWeekStart(currentWeek), [currentWeek]);
    const weekEnd = useMemo(() => getWeekEnd(currentWeek), [currentWeek]);
    const weekRange = useMemo(() => formatWeekRange(currentWeek), [currentWeek]);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);

    const [category, setCategory] = useState<TransactionCategory | 'all'>('all');


    const loadTransactions = useCallback(async () => {
        if (user?.user_type === 'TRANSPORT_ADMIN') {
            setIsLoading(true);
            try {
                const response = await getTransportTransactions(
                    page,
                    pageSize,
                    weekStart,
                    weekEnd,
                    debouncedSearch
                );
                setTransactions(response.data);
                setTotalCount(response.total_count);
                if (response.stats) {
                    setStats(response.stats);
                } else if (response.weekly_stats) {
                    setStats(response.weekly_stats);
                }
            } catch (error) {
                console.error("Failed to fetch transactions", error);
                toast.error("Failed to load transactions");
            } finally {
                setIsLoading(false);
            }
        }
    }, [user, page, pageSize, weekStart, weekEnd, debouncedSearch]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [currentWeek, debouncedSearch]);


    const handleExport = () => {
        toast.info('Export functionality coming soon');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader
                    title="Transactions Ledger"
                    description="View and manage all wallet and ticket transactions."
                />
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Week Selector */}
            <WeekSelector
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
                weekRange={weekRange}
            />

            {/* Weekly Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    title="Total Revenue (Week)"
                    value={`RS ${stats.total_income.toLocaleString()}`}
                    icon={<Banknote className="w-5 h-5" />}
                    color="green"
                />
                <SummaryCard
                    title="Total Refunds (Week)"
                    value={`RS ${Math.abs(stats.total_refunds).toLocaleString()}`}
                    icon={<ArrowRightLeft className="w-5 h-5" />}
                    color="red"
                />
                <SummaryCard
                    title="Total Transactions (Week)"
                    value={stats.transaction_count}
                    icon={<FileText className="w-5 h-5" />}
                    color="blue"
                />
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex-1 relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by user name, email, or reference ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full xl:max-w-md"
                    />
                </div>
                {/* 
                <TransactionFilters 
                    ... 
                    // Keeping filters commented out regarding user request to 'align filters' 
                    // effectively meaning rely on Search + Date + Ledger logic.
                    // If Category filter needed, uncomment.
                /> 
                */}
            </div>

            {/* Transactions Table */}
            <TableWrapper
                count={totalCount}
                itemName="transaction"
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
            >
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <PaginationControl
                            currentPage={page}
                            totalPages={Math.ceil(totalCount / pageSize)}
                            onPageChange={setPage}
                        />
                    </div>

                    <TransactionsTable
                        transactions={transactions}
                    />
                </div>
            </TableWrapper>
        </div>
    );
};

const SummaryCard = ({ title, value, icon, color = 'blue' }: { title: string; value: string | number; icon: React.ReactNode, color?: 'blue' | 'green' | 'red' | 'purple' }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600'
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                {icon}
            </div>
        </div>
    );
};
