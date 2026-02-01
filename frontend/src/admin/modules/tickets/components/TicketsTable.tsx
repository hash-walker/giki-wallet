import { AdminTicket } from '../types';
import { Table } from '../../../shared';
import { Badge } from './Badge';
import { formatDate, formatCurrency } from '../utils/formatting';

interface TicketsTableProps {
    tickets: AdminTicket[];
}

export const TicketsTable = ({ tickets }: TicketsTableProps) => {
    const headers = [
        { content: 'Ticket #', align: 'left' as const },
        { content: 'Passenger', align: 'left' as const },
        { content: 'Route', align: 'left' as const },
        { content: 'Date & Time', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Bus Type', align: 'left' as const },
        { content: 'Price', align: 'right' as const },
    ];

    const rows = tickets.map((ticket) => ({
        key: ticket.ticket_id,
        cells: [
            <div key="ticket-number">
                <div className="text-sm font-medium text-gray-900">#{ticket.ticket_code}</div>
                <div className="text-xs text-gray-500">Serial: {ticket.serial_no}</div>
            </div>,
            <div key="passenger">
                <div className="text-sm font-medium text-gray-900">{ticket.passenger_name}</div>
                <div className="text-xs text-gray-500">
                    {ticket.user_name} ({ticket.passenger_relation})
                </div>
                <div className="text-xs text-gray-400">{ticket.user_email}</div>
            </div>,
            <div key="route">
                <div className="text-sm font-medium text-gray-900">
                    {ticket.route_name} ({ticket.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'})
                </div>
                <div className="text-xs text-gray-500">
                    {ticket.pickup_location}
                </div>
            </div>,
            <div key="datetime">
                <div className="text-sm font-medium text-gray-900">{formatDate(ticket.departure_time)}</div>
                <div className="text-xs text-gray-500">
                    {new Date(ticket.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>,
            <Badge key="status" status={ticket.status as any} />,
            <Badge key="bus_type" status={ticket.bus_type as any} />,
            <div key="price" className="text-right">
                <div className="text-sm font-semibold text-gray-900">{formatCurrency(ticket.price)}</div>
                {ticket.status === 'CANCELLED' && (
                    <div className="text-xs text-red-600">Refunded</div>
                )}
            </div>,
        ],
    }));

    return (
        <Table
            headers={headers}
            rows={rows}
            emptyMessage="No tickets found for this week."
        />
    );
};
