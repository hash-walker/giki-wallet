import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, TableWrapper, WeekSelector, getWeekStart, getWeekEnd, formatWeekRange, PaginationControl } from '../../../shared';
import { TicketsTable } from '../components/TicketsTable';
import { AdminTicket } from '../types';
import { getAdminTickets } from '../service';
import { Download, Search, Bus, Ticket, GraduationCap, Briefcase } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/shared/hooks/useDebounce';

const STATUS_FILTERS = [
    { id: 'all', label: 'All Tickets' },
    { id: 'CONFIRMED', label: 'Confirmed' },
    { id: 'CANCELLED', label: 'Cancelled' },
];

export const TicketsPage = () => {
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState<string>('all');
    const [busType, setBusType] = useState<string>('all');

    const [tickets, setTickets] = useState<AdminTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ student_count: 0, employee_count: 0, total_confirmed: 0 });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(100);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const weekStart = useMemo(() => getWeekStart(currentWeek), [currentWeek]);
    const weekEnd = useMemo(() => getWeekEnd(currentWeek), [currentWeek]);
    const weekRange = useMemo(() => formatWeekRange(currentWeek), [currentWeek]);

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getAdminTickets(
                weekStart.toISOString(),
                weekEnd.toISOString(),
                busType,
                status,
                debouncedSearch,
                currentPage,
                pageSize
            );
            setTickets(response.data);
            setTotalCount(response.total_count);
            if (response.stats) {
                setStats(response.stats);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            toast.error('Failed to load tickets');
        } finally {
            setIsLoading(false);
        }
    }, [weekStart, weekEnd, busType, status, debouncedSearch, currentPage, pageSize]);

    useEffect(() => {
        void fetchTickets();
    }, [fetchTickets]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [currentWeek, busType, status, debouncedSearch]);


    const handleExport = () => {
        toast.info('Export functionality coming soon');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader
                    title="Tickets Management"
                    description="Manage bookings, verify tickets, and handle cancellations."
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
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Confirmed (Week)</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_confirmed}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <Ticket className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Student Bookings</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.student_count}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Employee Bookings</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.employee_count}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                        <Briefcase className="w-5 h-5 text-purple-600" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">

                {/* Left: Status Query Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                    {STATUS_FILTERS.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setStatus(filter.id)}
                            className={cn(
                                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                status === filter.id
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Right: Search & Bus Type */}
                <div className="flex flex-col sm:flex-row gap-3 xl:w-auto w-full">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search ticket, name, email..."
                            className="pl-9 h-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="sm:w-48">
                        <Select
                            value={busType}
                            onChange={setBusType}
                            options={[
                                { value: 'all', label: 'All Bus Types' },
                                { value: 'student', label: 'Student' },
                                { value: 'employee', label: 'Employee' }
                            ]}
                            placeholder="Bus Type"
                        />
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <TableWrapper count={totalCount} itemName="ticket" isLoading={isLoading}>
                {/* Pagination (Top) */}
                {totalCount > pageSize && (
                    <div className="mb-4 flex justify-end">
                        <PaginationControl
                            currentPage={currentPage}
                            totalPages={Math.ceil(totalCount / pageSize)}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}

                <TicketsTable tickets={tickets} />


            </TableWrapper>
        </div>
    );
};
