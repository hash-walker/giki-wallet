import { useState, useEffect } from 'react';
import { Ticket, ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketData, formatDate, groupTicketsByDirectionAndDate } from '../utils/ticketHelpers';
import { TicketCard } from '../components/TicketCard';
import { useTicketsStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import JazzCashPayment from '../../wallet/components/JazzCashPayment';
import { useAuthStore } from '@/shared/stores/authStore';

export const TicketsPage = () => {
    const navigate = useNavigate();
    const { tickets, loading, fetchTickets } = useTicketsStore();
    const { user } = useAuthStore();
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Map backend response ticket structure to TicketData (if needed)
    // Actually, backend response matches closely. 
    // We might need to ensure compatibility or just trust our Zod schema.
    const groupedTickets = groupTicketsByDirectionAndDate(tickets as unknown as TicketData[]);

    return (
        <div className="w-full pb-20 md:pb-6 relative">
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

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="text-slate-400 font-bold text-sm">Loading tickets...</p>
                </div>
            ) : groupedTickets.length === 0 ? (
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
                                            <TicketCard
                                                key={ticket.id}
                                                ticket={ticket}
                                                onBuyClick={(t) => setSelectedTicket(t)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-2 shadow-2xl">
                        <button
                            onClick={() => setSelectedTicket(null)}
                            className="absolute z-10 top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>

                        <div className="p-4">
                            <JazzCashPayment
                                amount={selectedTicket.price || 500} // Fallback price if 0 or missing
                                phoneNumber={user?.phone_number || ''}
                                cnicLast6={'123456'} // Fallback since CNIC might not be in auth user
                                onSuccess={() => {
                                    // Refresh tickets or show success logic
                                    setTimeout(() => setSelectedTicket(null), 3000);
                                }}
                                onFailure={(err) => {
                                    console.error('Payment failed', err);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
