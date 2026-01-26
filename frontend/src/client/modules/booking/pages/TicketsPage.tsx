
import { Ticket, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketData, formatDate, groupTicketsByDirectionAndDate } from '../utils/ticketHelpers';
import { TicketCard } from '../components/TicketCard';

import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

// Mock data (same as modal)
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
];

export const TicketsPage = () => {
    const navigate = useNavigate();
    const tickets = mockTickets; // In real app, fetch from API
    const groupedTickets = groupTicketsByDirectionAndDate(tickets);

    return (
        <div className="w-full pb-20 md:pb-6">
            <div className="flex items-center justify-between gap-4 mb-6 pt-6">
                <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
                <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:flex"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </div>

            {groupedTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Ticket className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-600 font-medium">No tickets found</p>
                    <p className="text-sm text-gray-500 mt-2">Your booked tickets will appear here</p>
                    <Button variant="outline" className="mt-6" onClick={() => navigate('/transport')}>
                        Book a Trip
                    </Button>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedTickets.map(({ direction, dateGroups }: { direction: 'from-giki' | 'to-giki'; dateGroups: Array<{ date: string; tickets: TicketData[] }> }) => (
                        <div key={direction} className="space-y-6">
                            {/* Direction Header */}
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "p-2 rounded-lg",
                                    direction === 'from-giki'
                                        ? "bg-primary/10 text-primary"
                                        : "bg-teal-100 text-teal-700"
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
                            {dateGroups.map(({ date, tickets: dateTickets }: { date: string; tickets: TicketData[] }) => (
                                <div key={date} className="space-y-3">
                                    {/* Date Header */}
                                    <div className="sticky top-14 md:top-0 bg-light-background py-2 z-10">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            {formatDate(date)}
                                        </h3>
                                    </div>

                                    {/* Tickets for this date */}
                                    {dateTickets.map((ticket: TicketData) => (
                                        <TicketCard key={ticket.id} ticket={ticket} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
