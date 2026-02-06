import { useEffect, useState } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import { useHoldTimer } from '../hooks';
import { TransportHeader } from '../components/TransportHeader';
import { TransportBookingModeSelector } from '../components/TransportBookingModeSelector';
import { PendingReservationBanner } from '../components/PendingReservationBanner';
import { AbandonBookingModal } from '../components/AbandonBookingModal';
import { TransportBookingCard } from '../components/TransportBookingCard';
import { BookingConfirmationModal, TripSummary } from '../components/BookingConfirmationModal';
import { SelectionSummary } from '../components/SelectionSummary';
import { formatDate, formatTime } from '../utils';
import type { BookingSelection } from '../validators';
import { toast } from 'sonner';

export const TransportPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        allTrips,
        activeHolds,
        passengers,
        updatePassenger,
        confirmBooking,
        loading: tripsLoading,
        initialized,
        fetchData,
        releaseAllHolds,
        direction,
        setDirection,
        addSelection,
        outboundSelection,
        returnSelection,
        isRoundTrip,
        setRoundTrip,
    } = useTransportStore();

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const timeLeft = useHoldTimer(activeHolds);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            activeHolds.length > 0 &&
            currentLocation.pathname !== nextLocation.pathname &&
            !nextLocation.pathname.includes('/transport/passengers')
    );

    useEffect(() => {
        void fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        if (activeHolds.length > 0 && timeLeft === 0 && !tripsLoading) {
            toast.error("Reservation expired. Please try again.");
            fetchData(false);
            useTransportStore.getState().resetBookingFlow();
        }
    }, [activeHolds.length, timeLeft, tripsLoading, fetchData]);

    const isStudent = user?.user_type === 'STUDENT';

    const handleBook = async (selection: BookingSelection) => {
        try {
            await addSelection(selection);
            const state = useTransportStore.getState();

            if (state.isRoundTrip) {
                if (state.outboundSelection && state.returnSelection) {
                    if (isStudent) {
                        setShowConfirmModal(true);
                    } else {
                        navigate('/transport/passengers');
                    }
                } else { }
            } else {
                if (isStudent) {
                    setShowConfirmModal(true);
                } else {
                    navigate('/transport/passengers');
                }
            }

        } catch (error) {
            console.error('handleBook error:', error);
        }
    };

    const handleConfirmBooking = async () => {
        setConfirming(true);
        try {
            const confirmations = activeHolds.map(h => ({
                holdId: h.id,
                passengerName: passengers[h.id]?.name || user?.name || '',
                passengerRelation: passengers[h.id]?.relation || 'SELF'
            }));
            await confirmBooking(confirmations);
            setShowConfirmModal(false);
            navigate('/transport/tickets');
        } catch (error) {
            console.error('Failed to confirm booking:', error);
        } finally {
            setConfirming(false);
        }
    };

    if (!initialized) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-600">
                Loading…
            </div>
        );
    }

    const getTripSummary = (selection: BookingSelection | null): TripSummary | null => {
        if (!selection) return null;
        const trip = allTrips.find(t => t.id === selection.tripId);
        if (!trip) return null;

        const pickup = trip.stops.find(s => s.stop_id === selection.pickupId)?.stop_name || 'Unknown';
        const dropoff = trip.stops.find(s => s.stop_id === selection.dropoffId)?.stop_name || 'Unknown';

        return {
            route: trip.route_name,
            when: `${formatDate(trip.departure_time)} • ${formatTime(trip.departure_time)}`,
            pickup,
            dropoff,
            seats: selection.ticketCount,
            priceEach: trip.base_price,
        };
    };

    const outboundSummary = getTripSummary(outboundSelection);
    const returnSummary = getTripSummary(returnSelection);

    const outboundHolds = activeHolds
        .filter(h => h.direction?.toUpperCase() === 'OUTBOUND')
        .map(h => ({ hold_id: h.id, expires_at: h.expires_at }));

    const returnHolds = activeHolds
        .filter(h => h.direction?.toUpperCase() === 'INBOUND')
        .map(h => ({ hold_id: h.id, expires_at: h.expires_at }));

    return (
        <div className="space-y-6">
            <PendingReservationBanner
                count={activeHolds.length}
                timeLeft={timeLeft}
                onReleaseAll={releaseAllHolds}
            />

            <TransportHeader />

            {/* Dynamic Selection Summary (Cart) */}
            <SelectionSummary
                isRoundTrip={isRoundTrip}
                allTrips={allTrips}
                outboundSelection={outboundSelection}
                returnSelection={returnSelection}
                activeHolds={activeHolds}
            />

            <div className="grid gap-6">
                <TransportBookingModeSelector
                    direction={direction}
                    onDirectionChange={setDirection}
                    isRoundTrip={isRoundTrip}
                    onRoundTripChange={setRoundTrip}
                    quota={useTransportStore.getState().quota}
                />

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 px-2">
                        {direction === 'OUTBOUND' ? 'Select Outbound Trip' : 'Select Inbound Trip'}
                    </h2>
                    <TransportBookingCard
                        direction={direction}
                        allTrips={allTrips}
                        onBook={handleBook}
                        loading={tripsLoading}
                        quota={useTransportStore.getState().quota}
                    />

                    {activeHolds.length > 0 && (
                        <div className="pt-4 flex justify-center sticky bottom-6 z-10">
                            <button
                                className={cn(
                                    "px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all duration-300 active:scale-95",
                                    (isRoundTrip && outboundSelection && returnSelection) || (!isRoundTrip && (outboundSelection || returnSelection))
                                        ? "bg-slate-900 text-white hover:bg-slate-800 scale-105"
                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                                disabled={!useTransportStore.getState().canProceed()}
                                onClick={() => {
                                    if (useTransportStore.getState().canProceed()) {
                                        if (isStudent) {
                                            setShowConfirmModal(true);
                                        } else {
                                            navigate('/transport/passengers');
                                        }
                                    }
                                }}
                            >
                                {isRoundTrip
                                    ? (outboundSelection && returnSelection ? "Finalize Booking" : "Select Both Trips to Continue")
                                    : "Continue to Booking"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <BookingConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                confirming={confirming}
                onConfirm={handleConfirmBooking}
                outboundSummary={outboundSummary}
                returnSummary={returnSummary}
                outboundHolds={outboundHolds}
                returnHolds={returnHolds}
                passengers={passengers}
                onUpdatePassenger={(holdId, data) => updatePassenger(holdId, data)}
                isStudent={isStudent}
            />

            {blocker.state === 'blocked' && (
                <AbandonBookingModal
                    isOpen={true}
                    timeLeft={timeLeft}
                    onClose={() => blocker.reset?.()}
                    onAbandon={() => {
                        releaseAllHolds().then(() => blocker.proceed?.());
                    }}
                    onStay={() => blocker.reset?.()}
                />
            )}
        </div>
    );
};

export default TransportPage;
