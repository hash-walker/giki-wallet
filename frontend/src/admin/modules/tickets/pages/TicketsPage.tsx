import { useState, useMemo } from 'react';
import { PageHeader, TableWrapper, WeekSelector, getWeekStart, getWeekEnd, formatWeekRange, isDateInWeek } from '../../../shared';
import { TicketsTable } from '../components/TicketsTable';
import { TicketFilters } from '../components/TicketFilters';
import { AdminTicket } from '../types';
import { Ticket, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export const TicketsPage = () => {
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState<string>('all');
    const [category, setCategory] = useState<string>('all');
    const [busType, setBusType] = useState<string>('all');

    // Mock data - replace with API calls
    const [tickets] = useState<AdminTicket[]>(() => {
        const now = Date.now();
        return [
            {
                id: '1',
                serialNumber: 1,
                ticketNumber: '1234',
                userId: 1,
                userName: 'John Doe',
                userEmail: 'john@example.com',
                routeId: 1,
                routeName: 'GIKI to Peshawar',
                direction: 'to-giki',
                cityId: 'peshawar',
                cityName: 'Peshawar',
                stopId: 'pes_stop1',
                stopName: 'University Stop',
                travelDate: new Date(now).toISOString().split('T')[0],
                time: '9:00 AM',
                status: 'confirmed',
                busType: 'Employee',
                ticketCategory: 'employee',
                isSelf: true,
                passengerName: 'John Doe',
                passengerCNIC: '12345-1234567-1',
                price: 200,
                bookedAt: new Date(now - 86400000).toISOString(),
            },
            {
                id: '2',
                serialNumber: 2,
                ticketNumber: '5678',
                userId: 1,
                userName: 'John Doe',
                userEmail: 'john@example.com',
                routeId: 2,
                routeName: 'GIKI to Islamabad',
                direction: 'to-giki',
                cityId: 'islamabad',
                cityName: 'Islamabad',
                stopId: 'isl_stop1',
                stopName: 'F-6 Markaz',
                travelDate: new Date(now + 86400000).toISOString().split('T')[0],
                time: '2:00 PM',
                status: 'confirmed',
                busType: 'Employee',
                ticketCategory: 'family',
                isSelf: false,
                passengerName: 'Jane Doe',
                passengerCNIC: '12345-7654321-1',
                relation: 'Spouse',
                price: 200,
                bookedAt: new Date(now - 3600000).toISOString(),
            },
            {
                id: '3',
                serialNumber: 3,
                ticketNumber: '9012',
                userId: 2,
                userName: 'Alice Smith',
                userEmail: 'alice@example.com',
                routeId: 3,
                routeName: 'GIKI to Lahore',
                direction: 'from-giki',
                cityId: 'lahore',
                cityName: 'Lahore',
                stopId: 'lah_stop1',
                stopName: 'Model Town',
                travelDate: new Date(now + 172800000).toISOString().split('T')[0],
                time: '5:00 PM',
                status: 'pending',
                busType: 'Student',
                ticketCategory: 'student',
                isSelf: true,
                passengerName: 'Alice Smith',
                price: 200,
                bookedAt: new Date(now - 7200000).toISOString(),
            },
            {
                id: '4',
                serialNumber: 4,
                ticketNumber: '3456',
                userId: 3,
                userName: 'Bob Johnson',
                userEmail: 'bob@example.com',
                routeId: 1,
                routeName: 'GIKI to Peshawar',
                direction: 'to-giki',
                cityId: 'peshawar',
                cityName: 'Peshawar',
                stopId: 'pes_stop2',
                stopName: 'Hayatabad',
                travelDate: new Date(now - 86400000).toISOString().split('T')[0],
                time: '8:00 AM',
                status: 'cancelled',
                busType: 'Student',
                ticketCategory: 'student',
                isSelf: true,
                passengerName: 'Bob Johnson',
                price: 200,
                refundAmount: 150,
                bookedAt: new Date(now - 172800000).toISOString(),
                cancelledAt: new Date(now - 43200000).toISOString(),
            },
        ];
    });

    const weekStart = getWeekStart(currentWeek);
    const weekEnd = getWeekEnd(currentWeek);
    const weekRange = formatWeekRange(currentWeek);

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            // Week filter - only show tickets for the selected week
            const travelDate = new Date(ticket.travelDate);
            if (!isDateInWeek(travelDate, weekStart, weekEnd)) {
                return false;
            }

            // Search filter
            const matchesSearch =
                ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase());

            // Status filter
            const matchesStatus = status === 'all' || ticket.status === status;

            // Category filter
            const matchesCategory = category === 'all' || ticket.ticketCategory === category;

            // Bus type filter
            const matchesBusType = busType === 'all' || ticket.busType === busType;

            return matchesSearch && matchesStatus && matchesCategory && matchesBusType;
        });
    }, [tickets, weekStart, weekEnd, searchTerm, status, category, busType]);

    const handleExport = () => {
        // TODO: Implement export functionality
        console.log('Export tickets');
    };

    // Statistics
    const stats = useMemo(() => {
        return {
            total: filteredTickets.length,
            confirmed: filteredTickets.filter(t => t.status === 'confirmed').length,
            pending: filteredTickets.filter(t => t.status === 'pending').length,
            cancelled: filteredTickets.filter(t => t.status === 'cancelled').length,
            revenue: filteredTickets
                .filter(t => t.status === 'confirmed')
                .reduce((sum, t) => sum + t.price, 0),
        };
    }, [filteredTickets]);

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
                    title="Total Tickets"
                    value={stats.total}
                    icon={<Ticket className="w-5 h-5" />}
                />
                <SummaryCard
                    title="Confirmed"
                    value={stats.confirmed}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="success"
                />
                <SummaryCard
                    title="Pending"
                    value={stats.pending}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="warning"
                />
                <SummaryCard
                    title="Cancelled"
                    value={stats.cancelled}
                    icon={<Ticket className="w-5 h-5" />}
                    variant="danger"
                />
                <SummaryCard
                    title="Revenue"
                    value={`RS ${stats.revenue.toLocaleString()}`}
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
            <TableWrapper count={filteredTickets.length} itemName="ticket">
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

