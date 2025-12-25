import { Ticket, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { cn } from '@/lib/utils';
import { TicketData, formatDate, groupTicketsByDirectionAndDate } from '../../utils/ticketHelpers';
import { TicketCard } from '../shared';

interface MyTicketsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tickets?: TicketData[];
}

// Generate random 4-digit ticket number
const generateTicketNumber = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

const mockTickets: TicketData[] = [
    {
        id: '1',
        serialNumber: 1,
        ticketNumber: generateTicketNumber(),
        routeSerial: 'R001',
        direction: 'to-giki',
        fromLocation: 'Islamabad',
        toLocation: 'GIKI',
        pickupLocation: 'F-6 Markaz',
        date: new Date().toISOString().split('T')[0],
        time: '9:00 AM',
        status: 'confirmed',
        busType: 'Employee',
        ticketCategory: 'employee',
        isSelf: true,
        fullName: 'John Doe',
        canCancel: true
    },
    {
        id: '2',
        serialNumber: 2,
        ticketNumber: generateTicketNumber(),
        routeSerial: 'R002',
        direction: 'from-giki',
        fromLocation: 'GIKI',
        toLocation: 'Islamabad',
        dropLocation: 'F-7 Markaz',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '5:00 PM',
        status: 'confirmed',
        busType: 'Employee',
        ticketCategory: 'family',
        isSelf: false,
        relativeName: 'Jane Doe',
        relativeRelation: 'Spouse',
        canCancel: true
    },
    {
        id: '3',
        serialNumber: 3,
        ticketNumber: generateTicketNumber(),
        routeSerial: 'R003',
        direction: 'to-giki',
        fromLocation: 'Lahore',
        toLocation: 'GIKI',
        pickupLocation: 'Model Town',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        time: '8:00 AM',
        status: 'confirmed',
        busType: 'Student',
        ticketCategory: 'employee', // Employee on student bus
        isSelf: true,
        fullName: 'Alice Smith',
        canCancel: false
    }
];


export const MyTicketsModal = ({
    isOpen,
    onClose,
    tickets = mockTickets
}: MyTicketsModalProps) => {
    const groupedTickets = groupTicketsByDirectionAndDate(tickets);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="My Tickets"
            size="lg"
        >
            {groupedTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Ticket className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-600 font-medium">No tickets found</p>
                    <p className="text-sm text-gray-500 mt-2">Your booked tickets will appear here</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedTickets.map(({ direction, dateGroups }) => (
                        <div key={direction} className="space-y-6">
                            {/* Direction Header */}
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "p-2 rounded-lg",
                                    direction === 'from-giki' 
                                        ? "bg-blue-100 text-blue-700" 
                                        : "bg-green-100 text-green-700"
                                )}>
                                    {direction === 'from-giki' ? (
                                        <ArrowRight className="w-5 h-5" />
                                    ) : (
                                        <ArrowLeft className="w-5 h-5" />
                                    )}
                                </span>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {direction === 'from-giki' ? 'Departing From GIKI' : 'Returning To GIKI'}
                                </h2>
                            </div>
                            
                            {/* Date Groups */}
                            {dateGroups.map(({ date, tickets: dateTickets }) => (
                                <div key={date} className="space-y-3">
                                    {/* Date Header */}
                                    <div className="sticky top-0 bg-white py-2 mb-3 z-10">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            {formatDate(date)}
                                        </h3>
                                    </div>
                                    
                                    {/* Tickets for this date */}
                                    {dateTickets.map((ticket) => (
                                        <TicketCard key={ticket.id} ticket={ticket} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

