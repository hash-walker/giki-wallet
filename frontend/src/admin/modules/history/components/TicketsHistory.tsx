import { useState, useMemo } from 'react';
import { Table, TableWrapper, getWeekStart, getWeekEnd, isDateInWeek } from '../../../shared';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from './HistoryBadge';
import { formatDate, formatCurrency } from '../utils/formatting';
import { AdminTicket } from '../../tickets/types';

interface TicketsHistoryProps {
    selectedWeek: Date;
}

// Helper to create ticket data outside component render
const getMockTicketsData = (): AdminTicket[] => {
    const now = Date.now();
    const twoWeeksAgo = now - 604800000 * 2;
    const oneWeekAgo = now - 604800000;
    const threeWeeksAgo = now - 604800000 * 3;

    return [
        {
            ticket_id: '1',
            serial_no: 1,
            ticket_code: '1234',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            route_name: 'GIKI to Peshawar',
            direction: 'to-giki',
            pickup_location: 'University Stop',
            dropoff_location: 'Peshawar',
            departure_time: new Date(twoWeeksAgo).toISOString(),
            status: 'CONFIRMED',
            bus_type: 'Employee',
            passenger_name: 'John Doe',
            passenger_relation: 'Self',
            price: 200,
            booking_time: new Date(twoWeeksAgo - 86400000).toISOString(),
        },
        {
            ticket_id: '2',
            serial_no: 2,
            ticket_code: '5678',
            user_name: 'Alice Smith',
            user_email: 'alice@example.com',
            route_name: 'GIKI to Islamabad',
            direction: 'from-giki',
            pickup_location: 'F-6 Markaz',
            dropoff_location: 'Islamabad',
            departure_time: new Date(oneWeekAgo).toISOString(),
            status: 'CONFIRMED',
            bus_type: 'Student',
            passenger_name: 'Alice Smith',
            passenger_relation: 'Self',
            price: 200,
            booking_time: new Date(oneWeekAgo - 86400000).toISOString(),
        },
        {
            ticket_id: '3',
            serial_no: 3,
            ticket_code: '9012',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            route_name: 'GIKI to Lahore',
            direction: 'to-giki',
            pickup_location: 'Model Town',
            dropoff_location: 'Lahore',
            departure_time: new Date(threeWeeksAgo).toISOString(),
            status: 'CANCELLED',
            bus_type: 'Employee',
            passenger_name: 'Jane Doe',
            passenger_relation: 'Spouse',
            price: 200,
            refund_amount: 150,
            booking_time: new Date(threeWeeksAgo - 86400000).toISOString(),
            status_updated_at: new Date(threeWeeksAgo + 86400000).toISOString(),
        },
    ];
};

export const TicketsHistory = ({ selectedWeek }: TicketsHistoryProps) => {
    // Mock data - all tickets from previous weeks (replace with API calls)
    const [tickets] = useState<AdminTicket[]>(() => getMockTicketsData());

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterBusType, setFilterBusType] = useState<string>('all');

    const weekStart = getWeekStart(selectedWeek);
    const weekEnd = getWeekEnd(selectedWeek);

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            // Filter by selected week based on departure time
            const departureDate = new Date(ticket.departure_time);
            if (!isDateInWeek(departureDate, weekStart, weekEnd)) {
                return false;
            }

            const matchesSearch =
                ticket.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
            const matchesBusType = filterBusType === 'all' || ticket.bus_type === filterBusType;

            return matchesSearch && matchesStatus && matchesBusType;
        });
    }, [tickets, weekStart, weekEnd, searchTerm, filterStatus, filterBusType]);

    const headers = [
        { content: 'Travel Date', align: 'left' as const },
        { content: 'Ticket #', align: 'left' as const },
        { content: 'Passenger', align: 'left' as const },
        { content: 'Route', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Bus Type', align: 'left' as const },
        { content: 'Price', align: 'right' as const },
        { content: 'Booked At', align: 'left' as const },
    ];

    const rows = filteredTickets.map((ticket) => ({
        key: ticket.ticket_id,
        cells: [
            <div key="departureDate">
                <div className="text-sm font-medium text-gray-900">{formatDate(ticket.departure_time)}</div>
                <div className="text-xs text-gray-500">
                    {new Date(ticket.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>,
            <div key="ticketCode">
                <div className="text-sm font-medium text-gray-900">#{ticket.ticket_code}</div>
                <div className="text-xs text-gray-500">Serial: {ticket.serial_no}</div>
            </div>,
            <div key="passenger">
                <div className="text-sm font-medium text-gray-900">{ticket.passenger_name}</div>
                <div className="text-xs text-gray-500">
                    {ticket.user_name} ({ticket.passenger_relation})
                </div>
            </div>,
            <div key="route">
                <div className="text-sm font-medium text-gray-900">
                    {ticket.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {ticket.route_name}
                </div>
                <div className="text-xs text-gray-500">{ticket.pickup_location}</div>
            </div>,
            <Badge key="status" type="ticketStatus" value={ticket.status} />,
            <Badge key="bus_type" type="busType" value={ticket.bus_type} />,
            <div key="price" className="text-right">
                <div className="text-sm font-semibold text-gray-900">{formatCurrency(ticket.price)}</div>
                {ticket.refund_amount && (
                    <div className="text-xs text-red-600">Refund: {formatCurrency(ticket.refund_amount)}</div>
                )}
            </div>,
            <div key="bookedAt" className="text-sm text-gray-600">{formatDate(ticket.booking_time)}</div>,
        ],
    }));

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by ticket code, passenger, user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="w-full md:w-64">
                    <Select
                        value={filterStatus}
                        onChange={(value) => setFilterStatus(value)}
                        options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'CONFIRMED', label: 'Confirmed' },
                            { value: 'PENDING', label: 'Pending' },
                            { value: 'CANCELLED', label: 'Cancelled' },
                        ]}
                        placeholder="Status"
                    />
                </div>
                <div className="w-full md:w-64">
                    <Select
                        value={filterBusType}
                        onChange={(value) => setFilterBusType(value)}
                        options={[
                            { value: 'all', label: 'All Bus Types' },
                            { value: 'Student', label: 'Student' },
                            { value: 'Employee', label: 'Employee' },
                        ]}
                        placeholder="Bus Type"
                    />
                </div>
            </div>

            {/* Table */}
            <TableWrapper count={filteredTickets.length} itemName="ticket">
                <Table headers={headers} rows={rows} emptyMessage="No ticket history found." />
            </TableWrapper>
        </div>
    );
};
