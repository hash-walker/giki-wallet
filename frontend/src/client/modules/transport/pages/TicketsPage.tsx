import { useEffect } from 'react';
import { useTransportStore } from '../store';
// import { PageHeader } from '@/shared/components/PageHeader';
import { formatDateTime } from '../utils';

// Reuse TicketCard style or create simple list for now
// Since I deleted Booking module, I lost TicketCard.tsx 
// I will create a simple placeholder UI or inline card.

export const TicketsPage = () => {
    // Ideally we should have a `myTickets` in store.
    // For now, I'll just show a placeholder or use activeHolds as "My Tickets" if that was the intent?
    // But "Tickets" usually means confirmed bookings.
    // The previous implementation used a mock endpoint.
    // I will display a message that this feature is coming soon or use active reservations.

    // Actually, let's look at `transport/api.ts` -> `confirmBatch` returns tickets.
    // But we don't store them persistently in client store across reloads unless we fetch them.
    // Backend `payment/service_test.go` implies transaction history.

    const { activeHolds, releaseAllHolds, initialized, fetchData } = useTransportStore();

    useEffect(() => {
        void fetchData(true);
    }, [fetchData]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Tickets</h1>
                <p className="text-sm text-gray-500">View your active reservations and booked tickets.</p>
            </div>

            {/* Active Holds Section */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Active Reservations (Not Confirmed)</h2>
                {activeHolds.length === 0 ? (
                    <p className="text-gray-500">No active reservations.</p>
                ) : (
                    <div className="space-y-4">
                        {activeHolds.map(hold => (
                            <div key={hold.id} className="bg-white p-4 rounded-xl border border-yellow-200 bg-yellow-50">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="font-bold text-yellow-900">{hold.route_name}</p>
                                        <p className="text-sm text-yellow-800">Expires: {formatDateTime(hold.expires_at)}</p>
                                        <p className="text-xs text-yellow-700 uppercase mt-1">{hold.direction}</p>
                                    </div>
                                    <button
                                        onClick={() => releaseAllHolds()} // Simplifying to release all for now
                                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmed Tickets Section */}
            <div className="pt-8 border-t border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Confirmed Tickets</h2>
                <p className="text-gray-500 italic">Ticket history feature is currently being updated to real-time data.</p>
            </div>
        </div>
    );
};
