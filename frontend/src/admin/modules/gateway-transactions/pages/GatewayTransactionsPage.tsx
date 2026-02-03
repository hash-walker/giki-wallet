import { useEffect, useMemo, useState } from 'react';
import { PageHeader, TableWrapper, WeekSelector, getWeekStart, getWeekEnd, formatWeekRange, PaginationControl } from '../../../shared';
import { useGatewayTransactionStore } from '../store';
import { GatewayTransactionsTable } from '../components/GatewayTransactionsTable';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/button';
import { Search, RotateCw, Filter } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { useDebounce } from '@/shared/hooks/useDebounce';

export const GatewayTransactionsPage = () => {
    const store = useGatewayTransactionStore();
    const {
        transactions,
        totalCount,
        isLoading,
        isUpdating,
        page,
        pageSize,
        search,
        status,
        paymentMethod,
        startDate,
        endDate,
        setPage,
        setSearch,
        setStatus,
        setPaymentMethod,
        setDateRange,
        fetchTransactions,
        verifyTransaction
    } = store;

    // Week Selector Logic
    const currentWeek = useMemo(() => startDate, [startDate]);
    const weekRange = useMemo(() => formatWeekRange(startDate), [startDate]);

    const handleWeekChange = (date: Date) => {
        const start = getWeekStart(date);
        const end = getWeekEnd(date);
        setDateRange(start, end);
    };

    // Debounced Search
    const [localSearch, setLocalSearch] = useState(search);
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        setSearch(debouncedSearch);
    }, [debouncedSearch, setSearch]);

    // Initial Fetch
    useEffect(() => {
        fetchTransactions();
    }, []); // Only mount, subsequent fetches handled by setters in store or effects if we were cleaner, but store handles it.

    // Actually store actions fetch immediately, so we don't need effects here except initial.

    const handleVerify = (txnRefNo: string) => {
        if (confirm('Verify Transaction Status?\n\nThis will query the payment gateway. If the transaction was successful but not recorded, the user will be credited immediately.\n\nProceed?')) {
            verifyTransaction(txnRefNo);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader
                    title="Gateway Transactions"
                    description="Monitor and verify external validation top-ups."
                />
                <Button variant="outline" size="sm" onClick={() => fetchTransactions()} disabled={isLoading}>
                    <RotateCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters Section */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">

                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    {/* Week Selector */}
                    <div className="w-full lg:w-auto">
                        <WeekSelector
                            currentWeek={currentWeek}
                            onWeekChange={handleWeekChange}
                            weekRange={weekRange}
                        />
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by Ref No, User Name or Email..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>

                    {/* Status Filter */}
                    <div className="w-[180px]">
                        <Select
                            options={[
                                { value: 'ALL', label: 'All Statuses' },
                                { value: 'PENDING', label: 'Pending' },
                                { value: 'SUCCESS', label: 'Success' },
                                { value: 'FAILED', label: 'Failed' },
                            ]}
                            value={status}
                            onChange={setStatus}
                            placeholder="Status"
                            showLabel={false}
                        />
                    </div>

                    {/* Method Filter */}
                    <div className="w-[180px]">
                        <Select
                            options={[
                                { value: 'ALL', label: 'All Methods' },
                                { value: 'MWALLET', label: 'Mobile Wallet' },
                                { value: 'CARD', label: 'Credit/Debit Card' },
                            ]}
                            value={paymentMethod}
                            onChange={setPaymentMethod}
                            placeholder="Payment Method"
                            showLabel={false}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
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

                    <GatewayTransactionsTable
                        transactions={transactions}
                        onVerify={handleVerify}
                        isUpdating={isUpdating}
                    />
                </div>
            </TableWrapper>
        </div>
    );
};
