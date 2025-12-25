import { useState, useMemo } from 'react';
import { Table, TableWrapper } from '../../shared';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from './HistoryBadge';
import { formatDate, formatCurrency } from '../utils/formatting';
import { AdminTicket } from '../../tickets/types';

export const TicketsHistory = () => {
    // Mock data - all tickets from previous weeks (replace with API calls)
    const [tickets] = useState<AdminTicket[]>([
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
            travelDate: new Date(Date.now() - 604800000 * 2).toISOString().split('T')[0], // 2 weeks ago
            time: '9:00 AM',
            status: 'confirmed',
            busType: 'Employee',
            ticketCategory: 'employee',
            isSelf: true,
            passengerName: 'John Doe',
            price: 200,
            bookedAt: new Date(Date.now() - 604800000 * 2 - 86400000).toISOString(),
        },
        {
            id: '2',
            serialNumber: 2,
            ticketNumber: '5678',
            userId: 2,
            userName: 'Alice Smith',
            userEmail: 'alice@example.com',
            routeId: 2,
            routeName: 'GIKI to Islamabad',
            direction: 'from-giki',
            cityId: 'islamabad',
            cityName: 'Islamabad',
            stopId: 'isl_stop1',
            stopName: 'F-6 Markaz',
            travelDate: new Date(Date.now() - 604800000).toISOString().split('T')[0], // 1 week ago
            time: '2:00 PM',
            status: 'confirmed',
            busType: 'Student',
            ticketCategory: 'student',
            isSelf: true,
            passengerName: 'Alice Smith',
            price: 200,
            bookedAt: new Date(Date.now() - 604800000 - 86400000).toISOString(),
        },
        {
            id: '3',
            serialNumber: 3,
            ticketNumber: '9012',
            userId: 1,
            userName: 'John Doe',
            userEmail: 'john@example.com',
            routeId: 3,
            routeName: 'GIKI to Lahore',
            direction: 'to-giki',
            cityId: 'lahore',
            cityName: 'Lahore',
            stopId: 'lah_stop1',
            stopName: 'Model Town',
            travelDate: new Date(Date.now() - 604800000 * 3).toISOString().split('T')[0], // 3 weeks ago
            time: '5:00 PM',
            status: 'cancelled',
            busType: 'Employee',
            ticketCategory: 'family',
            isSelf: false,
            passengerName: 'Jane Doe',
            relation: 'Spouse',
            price: 200,
            refundAmount: 150,
            bookedAt: new Date(Date.now() - 604800000 * 3 - 86400000).toISOString(),
            cancelledAt: new Date(Date.now() - 604800000 * 3 + 86400000).toISOString(),
        },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterBusType, setFilterBusType] = useState<string>('all');

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            const matchesSearch =
                ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
            const matchesCategory = filterCategory === 'all' || ticket.ticketCategory === filterCategory;
            const matchesBusType = filterBusType === 'all' || ticket.busType === filterBusType;

            return matchesSearch && matchesStatus && matchesCategory && matchesBusType;
        });
    }, [tickets, searchTerm, filterStatus, filterCategory, filterBusType]);

    const headers = [
        { content: 'Travel Date', align: 'left' as const },
        { content: 'Ticket #', align: 'left' as const },
        { content: 'Passenger', align: 'left' as const },
        { content: 'Route', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Category', align: 'left' as const },
        { content: 'Price', align: 'right' as const },
        { content: 'Booked At', align: 'left' as const },
    ];

    const rows = filteredTickets.map((ticket) => ({
        key: ticket.id,
        cells: [
            <div key="travelDate">
                <div className="text-sm font-medium text-gray-900">{formatDate(ticket.travelDate)}</div>
                <div className="text-xs text-gray-500">{ticket.time}</div>
            </div>,
            <div key="ticketNumber">
                <div className="text-sm font-medium text-gray-900">#{ticket.ticketNumber}</div>
                <div className="text-xs text-gray-500">Serial: {ticket.serialNumber}</div>
            </div>,
            <div key="passenger">
                <div className="text-sm font-medium text-gray-900">{ticket.passengerName}</div>
                <div className="text-xs text-gray-500">
                    {ticket.userName} {!ticket.isSelf && ticket.relation && `(${ticket.relation})`}
                </div>
            </div>,
            <div key="route">
                <div className="text-sm font-medium text-gray-900">
                    {ticket.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {ticket.cityName}
                </div>
                <div className="text-xs text-gray-500">{ticket.stopName}</div>
            </div>,
            <Badge key="status" type="ticketStatus" value={ticket.status} />,
            <Badge key="category" type="ticketCategory" value={ticket.ticketCategory} />,
            <div key="price" className="text-right">
                <div className="text-sm font-semibold text-gray-900">{formatCurrency(ticket.price)}</div>
                {ticket.refundAmount && (
                    <div className="text-xs text-red-600">Refund: {formatCurrency(ticket.refundAmount)}</div>
                )}
            </div>,
            <div key="bookedAt" className="text-sm text-gray-600">{formatDate(ticket.bookedAt)}</div>,
        ],
    }));

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by ticket number, passenger name, user email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterStatus}
                        onChange={(value) => setFilterStatus(value)}
                        options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'confirmed', label: 'Confirmed' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        placeholder="Status"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterCategory}
                        onChange={(value) => setFilterCategory(value)}
                        options={[
                            { value: 'all', label: 'All Categories' },
                            { value: 'employee', label: 'Employee' },
                            { value: 'family', label: 'Family' },
                            { value: 'student', label: 'Student' },
                        ]}
                        placeholder="Category"
                    />
                </div>
                <div className="w-full md:w-48">
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

