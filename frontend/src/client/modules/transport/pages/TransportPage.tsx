import { useEffect, useMemo } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import { BookingConfirmationModal } from '../components/BookingConfirmationModal';
import { TransportHeader } from '../components/TransportHeader';
import { TransportBookingModeSelector } from '../components/TransportBookingModeSelector';
import { PendingReservationBanner } from '../components/PendingReservationBanner';
import { AbandonBookingModal } from '../components/AbandonBookingModal';
import { formatDateTime, getStopById } from '../utils';
import { TransportBookingCard } from '../components/TransportBookingCard';

export const TransportPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        // Data
        allTrips,
        activeHolds,
        loading: tripsLoading,
        initialized,
        fetchData,
        releaseAllHolds,

        // Flow State
        direction,
        roundTrip,
        stage,
        outboundSelection,
        returnSelection,
        outboundHolds,
        returnHolds,
        passengers,
        confirmOpen,

        // Actions
        setDirection,
        setRoundTrip,
        setStage,
        setConfirmOpen,
        updatePassenger,
        reserveOutbound,
        reserveReturn,
        confirmCurrentBooking
    } = useTransportStore();

    // Timer logic could still be local or moved to store
    const [timeLeft] = [0];

    // Blocker logic
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            activeHolds.length > 0 && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        void fetchData(true);
    }, [fetchData]);

    const outboundSummary = useMemo(() => {
        if (!outboundSelection) return null;
        const trip = allTrips.find(t => t.trip_id === outboundSelection.tripId);
        if (!trip) return null;

        const pickup = getStopById(trip.stops, outboundSelection.pickupId);
        const drop = getStopById(trip.stops, outboundSelection.dropoffId);
        return {
            route: trip.route_name,
            when: formatDateTime(trip.departure_time),
            pickup: pickup?.stop_name || '—',
            dropoff: drop?.stop_name || '—',
            seats: outboundSelection.ticketCount,
            priceEach: trip.price,
        };
    }, [outboundSelection, allTrips]);

    const returnSummary = useMemo(() => {
        if (!returnSelection) return null;
        const trip = allTrips.find(t => t.trip_id === returnSelection.tripId);
        if (!trip) return null;

        const pickup = getStopById(trip.stops, returnSelection.pickupId);
        const drop = getStopById(trip.stops, returnSelection.dropoffId);
        return {
            route: trip.route_name,
            when: formatDateTime(trip.departure_time),
            pickup: pickup?.stop_name || '—',
            dropoff: drop?.stop_name || '—',
            seats: returnSelection.ticketCount,
            priceEach: trip.price,
        };
    }, [returnSelection, allTrips]);

    if (!initialized) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-600">
                Loading…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PendingReservationBanner
                count={activeHolds.length}
                timeLeft={timeLeft}
                onReleaseAll={releaseAllHolds}
            />

            <TransportHeader />

            <div className="grid gap-6">
                <TransportBookingModeSelector
                    roundTrip={roundTrip}
                    onToggle={setRoundTrip}
                    direction={direction}
                    onDirectionChange={setDirection}
                />

                <div className="mt-2">
                    {stage === 'select_outbound' ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 px-2">Select Outbound Trip</h2>
                            <TransportBookingCard
                                direction={direction}
                                allTrips={allTrips}
                                onBook={(s) => reserveOutbound(s, user?.name)}
                                loading={tripsLoading}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-xl font-bold text-gray-900">Select Return Trip</h2>
                                <button
                                    onClick={() => releaseAllHolds()}
                                    className="text-sm text-primary font-medium hover:underline"
                                >
                                    Cancel & Restart
                                </button>
                            </div>
                            <TransportBookingCard
                                direction={direction === 'from-giki' ? 'to-giki' : 'from-giki'}
                                allTrips={allTrips}
                                onBook={(s) => reserveReturn(s, user?.name)}
                                loading={tripsLoading}
                            />
                        </div>
                    )}
                </div>

                <BookingConfirmationModal
                    isOpen={confirmOpen}
                    onClose={() => {
                        setConfirmOpen(false);
                        releaseAllHolds();
                    }}
                    confirming={tripsLoading}
                    onConfirm={confirmCurrentBooking}
                    outboundSummary={outboundSummary}
                    returnSummary={returnSummary}
                    outboundHolds={outboundHolds}
                    returnHolds={returnHolds}
                    passengers={passengers}
                    onUpdatePassenger={updatePassenger}
                />

                <AbandonBookingModal
                    isOpen={blocker.state === 'blocked'}
                    onClose={() => blocker.reset?.()}
                    timeLeft={0}
                    onAbandon={async () => {
                        await releaseAllHolds();
                        blocker.proceed?.();
                    }}
                    onStay={() => blocker.reset?.()}
                />
            </div>
        </div>
    );
};
