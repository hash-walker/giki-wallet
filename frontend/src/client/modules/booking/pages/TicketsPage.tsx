
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
            <div className="flex items-center justify-between gap-4 mb-8 pt-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                        <Ticket className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">My Tickets</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manage your active bookings</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="h-12 px-6 rounded-2xl border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 hidden md:flex"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </div>

            {groupedTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                    <Ticket className="w-16 h-16 text-slate-200 mb-6" />
                    <p className="text-slate-900 text-lg font-bold">No tickets found</p>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Your booked tickets will appear here</p>
                    <Button
                        variant="default"
                        className="mt-8 h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        onClick={() => navigate('/transport')}
                    >
                        Book a Trip
                    </Button>
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedTickets.map(({ direction, dateGroups }: { direction: 'from-giki' | 'to-giki'; dateGroups: Array<{ date: string; tickets: TicketData[] }> }) => (
                        <div key={direction} className="space-y-8">
                            {/* Direction Header */}
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2.5 rounded-xl border",
                                    direction === 'from-giki'
                                        ? "bg-primary/5 text-primary border-primary/10"
                                        : "bg-accent/5 text-accent border-accent/10"
                                )}>
                                    {direction === 'from-giki' ? (
                                        <ArrowRight className="w-5 h-5" />
                                    ) : (
                                        <ArrowLeft className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {direction === 'from-giki' ? 'Departing From GIKI' : 'Returning To GIKI'}
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Route direction</p>
                                </div>
                            </div>

                            {/* Date Groups */}
                            {dateGroups.map(({ date, tickets: dateTickets }: { date: string; tickets: TicketData[] }) => (
                                <div key={date} className="space-y-4">
                                    {/* Date Header */}
                                    <div className="sticky top-14 md:top-0 bg-transparent backdrop-blur-md py-2 z-10">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {formatDate(date)}
                                        </h3>
                                    </div>

                                    {/* Tickets for this date */}
                                    <div className="grid gap-4">
                                        {dateTickets.map((ticket: TicketData) => (
                                            <TicketCard key={ticket.id} ticket={ticket} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
