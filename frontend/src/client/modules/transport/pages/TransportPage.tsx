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
import { TransportBookingCard } from '../components/TransportBookingCard'; // OLD UI - kept for rollback
import { RouteGrid } from '../components/RouteGrid'; // NEW TILE-BASED UI
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

    // Auto-refresh when bookings open for scheduled trips
    useEffect(() => {
        if (tripsLoading || !initialized) return;

        // Find all scheduled trips and their booking open times
        const scheduledTrips = allTrips.filter(trip => trip.status === 'SCHEDULED');
        if (scheduledTrips.length === 0) return;

        const now = new Date().getTime();
        const upcomingOpenings = scheduledTrips
            .map(trip => ({
                tripId: trip.id,
                opensAt: new Date(trip.booking_opens_at).getTime()
            }))
            .filter(({ opensAt }) => opensAt > now)
            .sort((a, b) => a.opensAt - b.opensAt);

        if (upcomingOpenings.length === 0) return;

        const nextOpening = upcomingOpenings[0];
        const timeUntilOpen = nextOpening.opensAt - now;

        // If booking opens within 5 minutes, poll every 30 seconds
        if (timeUntilOpen <= 5 * 60 * 1000) {
            const pollInterval = setInterval(() => {
                void fetchData(false);
            }, 30000); // Poll every 30 seconds

            return () => clearInterval(pollInterval);
        }

        // Otherwise, set a timer to refresh exactly when booking opens
        const openTimer = setTimeout(() => {
            void fetchData(false);
            toast.info('Booking now open!', { duration: 3000 });
        }, timeUntilOpen);

        return () => clearTimeout(openTimer);
    }, [allTrips, tripsLoading, initialized, fetchData]);

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

                {/* ROUND-TRIP MODE: Show both directions side-by-side */}
                {isRoundTrip ? (
                    <div className="space-y-6">
                        {/* Round Trip Mode Banner */}
                        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-2 border-blue-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center justify-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                        ↔
                                    </div>
                                    <span className="text-lg font-black text-blue-900 uppercase tracking-wide">
                                        Round Trip Mode
                                    </span>
                                </div>
                                <div className="hidden sm:block text-xs text-blue-600 font-medium bg-blue-100 px-3 py-1 rounded-full">
                                    Select both trips to continue
                                </div>
                            </div>
                        </div>

                        {/* Outbound Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                    outboundSelection ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                                )}>
                                    {outboundSelection ? '✓' : '1'}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                     Going From GIKI
                                </h2>
                                {outboundSelection && (
                                    <span className="text-sm text-green-600 font-semibold">Selected ✓</span>
                                )}
                            </div>
                            <RouteGrid
                                direction="OUTBOUND"
                                onBook={handleBook}
                            />
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Then</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                        </div>

                        {/* Return Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                    returnSelection ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                                )}>
                                    {returnSelection ? '✓' : '2'}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                     Coming Back to GIKI
                                </h2>
                                {returnSelection && (
                                    <span className="text-sm text-green-600 font-semibold">Selected ✓</span>
                                )}
                            </div>
                            <RouteGrid
                                direction="INBOUND"
                                onBook={handleBook}
                            />
                        </div>
                    </div>
                ) : (
                    /* SINGLE-TRIP MODE: Show only selected direction */
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">
                            {direction === 'OUTBOUND' ? '🚌 Going From GIKI' : '🏠 Coming Back to GIKI'}
                        </h2>
                        
                        <RouteGrid
                            direction={direction}
                            onBook={handleBook}
                        />
                    </div>
                )}

                {activeHolds.length > 0 && (
                    <div className="pt-4 flex flex-col items-center gap-3 sticky bottom-6 z-10">
                        {/* Progress Indicator for Round Trip */}
                        {isRoundTrip && (
                            <div className="bg-white border-2 border-gray-200 rounded-full px-4 py-2 shadow-lg">
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <span className={outboundSelection ? "text-green-600" : "text-gray-400"}>
                                        {outboundSelection ? "✓" : "○"} Outbound
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className={returnSelection ? "text-green-600" : "text-gray-400"}>
                                        {returnSelection ? "✓" : "○"} Return
                                    </span>
                                </div>
                            </div>
                        )}
                        
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
                                ? (outboundSelection && returnSelection ? "Finalize Round Trip 🎫" : "Select Both Trips to Continue")
                                : "Continue to Booking"}
                        </button>
                    </div>
                )}
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
