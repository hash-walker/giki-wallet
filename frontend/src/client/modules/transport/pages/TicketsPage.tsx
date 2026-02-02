import { useState, useMemo, useEffect } from 'react'; // You already added this
import { useTransportStore } from '../store';
import { formatDateTime } from '../utils';
import { TicketCard } from '../components/TicketCard';
import { TicketCardSkeleton } from '../components/TicketCardSkeleton';
import { Loader2 } from 'lucide-react';
import { MyTicket } from '../validators';

export const TicketsPage = () => {
    const {
        activeHolds,
        releaseAllHolds,
        fetchUserTickets,
        myTickets,
        loading
    } = useTransportStore();

    useEffect(() => {
        void fetchUserTickets();
    }, [fetchUserTickets]);


    const upcomingTickets = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - (3 * 60 * 60 * 1000));

        const list: MyTicket[] = [];

        myTickets.forEach(ticket => {
            const departure = new Date(ticket.departure_time);

            if (ticket.status === 'CANCELLED' || departure < cutoff) {
                return;
            }
            list.push(ticket);
        });

        list.sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
        return list;
    }, [myTickets]);

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">My Tickets</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage active reservations</p>
            </div>

            {/* Active Holds Section */}
            {activeHolds.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Active Reservations
                    </h2>
                    <div className="grid gap-4">
                        {activeHolds.map(hold => (
                            <div key={hold.id} className="bg-orange-50 p-5 rounded-xl border border-orange-100 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-orange-900 text-lg">{hold.route_name}</p>
                                    <p className="text-sm text-orange-800/80 mt-1">
                                        Expires at {formatDateTime(hold.expires_at)}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-white/50 rounded text-xs text-orange-800 font-medium">
                                            {hold.direction}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => releaseAllHolds()}
                                    className="px-4 py-2 bg-white text-orange-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-orange-100 border border-orange-200 transition"
                                >
                                    Release
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirmed Tickets Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Your Schedule</h2>
                    {loading && <span className="text-xs text-gray-400 font-medium animate-pulse">Syncing...</span>}
                </div>

                {loading && upcomingTickets.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <TicketCardSkeleton key={i} />
                        ))}
                    </div>
                ) : upcomingTickets.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No upcoming trips scheduled.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingTickets.map(ticket => (
                            <TicketCard key={ticket.ticket_id} ticket={ticket} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};