import { useEffect, useState } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import { useHoldTimer } from '../hooks';
import { TransportHeader } from '../components/TransportHeader';
import { TransportBookingModeSelector } from '../components/TransportBookingModeSelector';
import { PendingReservationBanner } from '../components/PendingReservationBanner';
import { AbandonBookingModal } from '../components/AbandonBookingModal';
import { TransportBookingCard } from '../components/TransportBookingCard';
import { BookingConfirmationModal, TripSummary } from '../components/BookingConfirmationModal';
import { formatDate, formatTime } from '../utils';
import type { BookingSelection } from '../validators';

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
            nextLocation.pathname !== '/transport/passengers'
    );

    useEffect(() => {
        void fetchData(true);
    }, [fetchData]);

    // console.log('👤 User info:', { user, user_type: user?.user_type });

    const isStudent = user?.user_type === 'STUDENT';
    // const isEmployee = user?.user_type?.toLowerCase() === 'employee';

    const handleBook = async (selection: BookingSelection) => {
        // console.log('🎯 Book clicked', { userType: user?.user_type, direction });

        try {
            await addSelection(selection);
            // console.log('✅ addSelection completed');

            // Logic for navigation/modal
            // Note: addSelection in store already handles 'isRoundTrip' direction switching

            // We need to check the updated state (or infer it). 
            // Since `addSelection` is async and updates store, `outboundSelection` / `returnSelection` 
            // from the hook might not be updated in this render cycle immediately if we rely on closure.
            // Using `useTransportStore.getState()` is safer for immediate check.
            const state = useTransportStore.getState();

            if (state.isRoundTrip) {
                // If we have both selections, proceed to confirmation
                if (state.outboundSelection && state.returnSelection) {
                    if (isStudent) {
                        setShowConfirmModal(true);
                    } else {
                        navigate('/transport/passengers');
                    }
                } else {
                    // Waiting for second leg. Store already switched direction toast.
                    // Do nothing here.
                }
            } else {
                // Single trip flow
                if (isStudent) {
                    setShowConfirmModal(true);
                } else {
                    navigate('/transport/passengers');
                }
            }

        } catch (error) {
            console.error('❌ handleBook error:', error);
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

    // Prepare data for BookingConfirmationModal
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

    // Filter holds by direction (using trip direction from activeHolds)
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
