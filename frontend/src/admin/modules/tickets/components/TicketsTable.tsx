import { AdminTicket } from '../types';
import { Table } from '../../shared/Table';
import { Badge } from './Badge';
import { formatDate, formatTime, formatCurrency } from '../utils/formatting';

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
        { content: 'Category', align: 'left' as const },
        { content: 'Price', align: 'right' as const },
    ];

    const rows = tickets.map((ticket) => ({
        key: ticket.id,
        cells: [
            <div key="ticket-number">
                <div className="text-sm font-medium text-gray-900">#{ticket.ticketNumber}</div>
                <div className="text-xs text-gray-500">Serial: {ticket.serialNumber}</div>
            </div>,
            <div key="passenger">
                <div className="text-sm font-medium text-gray-900">{ticket.passengerName}</div>
                <div className="text-xs text-gray-500">
                    {ticket.userName} {!ticket.isSelf && ticket.relation && `(${ticket.relation})`}
                </div>
                {ticket.passengerCNIC && (
                    <div className="text-xs text-gray-400">CNIC: {ticket.passengerCNIC}</div>
                )}
            </div>,
            <div key="route">
                <div className="text-sm font-medium text-gray-900">
                    {ticket.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {ticket.cityName}
                </div>
                <div className="text-xs text-gray-500">
                    {ticket.stopName} • {ticket.busType}
                </div>
            </div>,
            <div key="datetime">
                <div className="text-sm font-medium text-gray-900">{formatDate(ticket.travelDate)}</div>
                <div className="text-xs text-gray-500">{ticket.time}</div>
            </div>,
            <Badge key="status" status={ticket.status} />,
            <Badge key="category" category={ticket.ticketCategory} />,
            <div key="price" className="text-right">
                <div className="text-sm font-semibold text-gray-900">{formatCurrency(ticket.price)}</div>
                {ticket.refundAmount && (
                    <div className="text-xs text-red-600">Refund: {formatCurrency(ticket.refundAmount)}</div>
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

