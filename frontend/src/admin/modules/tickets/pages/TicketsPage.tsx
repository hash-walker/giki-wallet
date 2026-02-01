import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, TableWrapper, WeekSelector, getWeekStart, getWeekEnd, formatWeekRange, PaginationControl } from '../../../shared';
import { TicketsTable } from '../components/TicketsTable';
import { TicketFilters } from '../components/TicketFilters';
import { AdminTicket } from '../types';
import { getAdminTickets } from '../service';
import { Ticket, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

export const TicketsPage = () => {
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState<string>('all');
    const [category, setCategory] = useState<string>('all');
    const [busType, setBusType] = useState<string>('all');

    const [tickets, setTickets] = useState<AdminTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(100);
    const [totalCount, setTotalCount] = useState(0);

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
                currentPage,
                pageSize
            );
            setTickets(response.data);
            setTotalCount(response.total_count);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            toast.error('Failed to load tickets');
        } finally {
            setIsLoading(false);
        }
    }, [weekStart, weekEnd, busType, currentPage, pageSize]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [currentWeek, busType]);

    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;

        return tickets.filter((ticket) => {
            const matchesSearch =
                ticket.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        });
    }, [tickets, searchTerm]);

    const handleExport = () => {
        // TODO: Implement export functionality using the same filters
        console.log('Export tickets');
        toast.info('Export functionality coming soon');
    };

    // Statistics (Note: These are for the current page only in this implementation)
    const stats = useMemo(() => {
        return {
            total: totalCount,
            confirmed: tickets.filter(t => t.status === 'CONFIRMED').length, // This is misleading if only current page
            pending: tickets.filter(t => t.status === 'PENDING').length,
            cancelled: tickets.filter(t => t.status === 'CANCELLED').length,
            revenue: tickets
                .filter(t => t.status === 'CONFIRMED')
                .reduce((sum, t) => sum + t.price, 0),
        };
    }, [tickets, totalCount]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tickets Management"
                description="View and manage tickets for the current week"
                action={
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                }
            />

            {/* Week Selector */}
            <WeekSelector
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
                weekRange={weekRange}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <SummaryCard
                    title="Total Tickets (Week)"
                    value={totalCount}
                    icon={<Ticket className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Confirmed (Page)"
                    value={stats.confirmed}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="success"
                />
                <SummaryCard
                    title="Pending (Page)"
                    value={stats.pending}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="warning"
                />
                <SummaryCard
                    title="Cancelled (Page)"
                    value={stats.cancelled}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="danger"
                />
                <SummaryCard
                    title="Revenue (Page)"
                    value={`RS ${(stats.revenue).toLocaleString()}`}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="info"
                />
            </div>

            {/* Filters */}
            <TicketFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                status={status}
                onStatusChange={setStatus}
                category={category}
                onCategoryChange={setCategory}
                busType={busType}
                onBusTypeChange={setBusType}
            />

            {/* Tickets Table */}
            <TableWrapper count={totalCount} itemName="ticket" isLoading={isLoading}>
                <div className="mb-4">
                    <PaginationControl
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalCount / pageSize)}
                        onPageChange={setCurrentPage}
                    />
                </div>
                <TicketsTable tickets={filteredTickets} />
            </TableWrapper>
        </div>
    );
};

const SummaryCard = ({
    title,
    value,
    icon,
    variant = 'default'
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) => {
    const bgColors = {
        default: 'bg-blue-100',
        success: 'bg-green-100',
        warning: 'bg-yellow-100',
        danger: 'bg-red-100',
        info: 'bg-indigo-100',
    };

    const iconColors = {
        default: 'text-blue-600',
        success: 'text-green-600',
        warning: 'text-yellow-600',
        danger: 'text-red-600',
        info: 'text-indigo-600',
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">{title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${bgColors[variant]}`}>
                    <div className={iconColors[variant]}>{icon}</div>
                </div>
            </div>
        </div>
    );
};

