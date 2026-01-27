import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTransportStore } from '../store';
import { TripList } from '../components/TripList';
import { BookingForm } from '../components/BookingForm';
import { BookingConfirmationModal, type Passenger, type HeldSeat } from '../components/BookingConfirmationModal';
import { TransportHeader } from '../components/TransportHeader';
import { TransportBookingModeSelector } from '../components/TransportBookingModeSelector';
import { PendingReservationBanner } from '../components/PendingReservationBanner';
import { AbandonBookingModal } from '../components/AbandonBookingModal';
import { formatDateTime, getStopById, isFromGIKI, isToGIKI, getGikiStop } from '../utils';
import { type Trip } from '../api';








export const TransportPage = () => {
    const navigate = useNavigate();
    const { initialized: authInitialized, user } = useAuthStore();
    const {
        allTrips,
        quota,
        activeHolds,
        loading: tripsLoading,
        initialized,
        fetchData,
        releaseAllHolds,
        reserveSeats: storeReserveSeats,
        confirmBooking: storeConfirmBooking
    } = useTransportStore();

    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [abandonModalOpen, setAbandonModalOpen] = useState(false);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            activeHolds.length > 0 && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === 'blocked') {
            setAbandonModalOpen(true);
        }
    }, [blocker]);

    const getRemainingQuota = (trip: Trip | null) => {
        if (!trip || !quota) return 5;
        // For now we assume trips are either GIKI-based or City-based
        // isFromGIKI = OUTBOUND, isToGIKI = INBOUND
        if (isFromGIKI(trip.stops)) return quota.outbound.remaining;
        if (isToGIKI(trip.stops)) return quota.inbound.remaining;
        return 5; // Default
    };

    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const selectedTrip = useMemo(() => allTrips.find((t) => t.trip_id === selectedTripId) || null, [allTrips, selectedTripId]);

    const [pickupStopId, setPickupStopId] = useState<string | null>(null);
    const [dropoffStopId, setDropoffStopId] = useState<string | null>(null);
    const [seatCount, setSeatCount] = useState(1);

    // Round-trip: second leg
    const [returnTripId, setReturnTripId] = useState<string | null>(null);
    const returnTrip = useMemo(() => allTrips.find((t) => t.trip_id === returnTripId) || null, [allTrips, returnTripId]);
    const [returnPickupStopId, setReturnPickupStopId] = useState<string | null>(null);
    const [returnDropoffStopId, setReturnDropoffStopId] = useState<string | null>(null);
    const [returnSeatCount, setReturnSeatCount] = useState(1);

    const [stage, setStage] = useState<'select_outbound' | 'select_return'>('select_outbound');
    const [roundTrip, setRoundTrip] = useState(false);

    const [outboundHolds, setOutboundHolds] = useState<HeldSeat[]>([]);
    const [returnHolds, setReturnHolds] = useState<HeldSeat[]>([]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [passengers, setPassengers] = useState<Record<string, Passenger>>({});
    const [confirming, setConfirming] = useState(false);



    useEffect(() => {
        void fetchData(true);
    }, [fetchData]);

    const trips = useMemo(() => {
        if (stage === 'select_outbound') return allTrips;

        // For return leg, show trips that go in opposite direction of outbound
        if (selectedTrip) {
            return allTrips.filter(t => t.route_name !== selectedTrip.route_name && t.trip_id !== selectedTrip.trip_id);
        }
        return allTrips;
    }, [allTrips, stage, selectedTrip]);

    const selectedRouteName = selectedTrip?.route_name || null;
    const returnRouteName = returnTrip?.route_name || null;

    const canSelectOutbound =
        !!selectedTrip &&
        selectedTrip.booking_status === 'OPEN' &&
        !!pickupStopId &&
        !!dropoffStopId &&
        seatCount > 0 &&
        seatCount <= Math.max(1, selectedTrip.available_seats);

    const canSelectReturn =
        !!returnTrip &&
        returnTrip.booking_status === 'OPEN' &&
        !!returnPickupStopId &&
        !!returnDropoffStopId &&
        returnSeatCount > 0 &&
        returnSeatCount <= Math.max(1, returnTrip.available_seats);

    async function doReleaseHolds() {
        if (outboundHolds.length === 0 && returnHolds.length === 0) return;
        await releaseAllHolds();
        setOutboundHolds([]);
        setReturnHolds([]);
    }

    async function reserveOutbound() {
        if (!selectedTrip || !pickupStopId || !dropoffStopId) return;
        try {
            const resp = await storeReserveSeats({
                trip_id: selectedTrip.trip_id,
                count: seatCount,
                pickup_stop_id: pickupStopId,
                dropoff_stop_id: dropoffStopId,
            });
            setOutboundHolds(resp.holds);

            setPassengers((prev) => {
                const next = { ...prev };
                for (const h of resp.holds) {
                    if (!next[h.hold_id]) next[h.hold_id] = { name: user?.name || '', relation: 'SELF' };
                }
                return next;
            });

            if (roundTrip) {
                setStage('select_return');
                toast.success('Reserved. Now select your return trip.');
            } else {
                setConfirmOpen(true);
            }
        } catch (e) {
            // Error handled by store
        }
    }

    async function reserveReturnAndReview() {
        if (!returnTrip || !returnPickupStopId || !returnDropoffStopId) return;
        try {
            const resp = await storeReserveSeats({
                trip_id: returnTrip.trip_id,
                count: returnSeatCount,
                pickup_stop_id: returnPickupStopId,
                dropoff_stop_id: returnDropoffStopId,
            });
            setReturnHolds(resp.holds);

            setPassengers((prev) => {
                const next = { ...prev };
                for (const h of resp.holds) {
                    if (!next[h.hold_id]) next[h.hold_id] = { name: user?.name || '', relation: 'SELF' };
                }
                return next;
            });

            setConfirmOpen(true);
        } catch (e) {
            // Error handled by store
        }
    }

    async function confirmBooking() {
        const allHolds = [...outboundHolds, ...returnHolds];
        if (allHolds.length === 0) return;

        for (const h of allHolds) {
            const p = passengers[h.hold_id];
            if (!p || !p.name.trim()) {
                toast.error('Passenger name is required for all seats');
                return;
            }
        }

        setConfirming(true);
        try {
            await storeConfirmBooking({
                confirmations: allHolds.map((h) => ({
                    hold_id: h.hold_id,
                    passenger_name: passengers[h.hold_id].name.trim(),
                    passenger_relation: passengers[h.hold_id].relation,
                })),
            });

            setConfirmOpen(false);
            setStage('select_outbound');
            setOutboundHolds([]);
            setReturnHolds([]);
            navigate('/', { replace: true });
        } catch (e) {
            // Error handled by store
        } finally {
            setConfirming(false);
        }
    }

    const outboundSummary = useMemo(() => {
        if (!selectedTrip) return null;
        const pickup = getStopById(selectedTrip.stops, pickupStopId);
        const drop = getStopById(selectedTrip.stops, dropoffStopId);
        return {
            route: selectedRouteName,
            when: formatDateTime(selectedTrip.departure_time),
            pickup: pickup?.stop_name || '—',
            dropoff: drop?.stop_name || '—',
            seats: seatCount,
            priceEach: selectedTrip.price,
        };
    }, [dropoffStopId, pickupStopId, seatCount, selectedRouteName, selectedTrip]);

    const returnSummary = useMemo(() => {
        if (!returnTrip) return null;
        const pickup = getStopById(returnTrip.stops, returnPickupStopId);
        const drop = getStopById(returnTrip.stops, returnDropoffStopId);
        return {
            route: returnRouteName,
            when: formatDateTime(returnTrip.departure_time),
            pickup: pickup?.stop_name || '—',
            dropoff: drop?.stop_name || '—',
            seats: returnSeatCount,
            priceEach: returnTrip.price,
        };
    }, [returnDropoffStopId, returnPickupStopId, returnRouteName, returnSeatCount, returnTrip]);

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
                    onToggle={(isRoundTrip) => {
                        if (isRoundTrip) {
                            setRoundTrip(true);
                        } else {
                            if (roundTrip && stage === 'select_return') {
                                void doReleaseHolds();
                                setStage('select_outbound');
                            }
                            setRoundTrip(false);
                        }
                    }}
                />

                <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] p-5 md:p-8 shadow-sm relative overflow-hidden ring-1 ring-primary/5">
                    <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {stage === 'select_outbound' ? 'Select departure' : 'Select return'}
                    </div>

                    <TripList
                        trips={trips}
                        loading={tripsLoading}
                        selectedTripId={stage === 'select_outbound' ? selectedTripId : returnTripId}
                        onSelectTrip={(id) => {
                            if (stage === 'select_outbound') {
                                setSelectedTripId(id);
                                const trip = allTrips.find(t => t.trip_id === id);
                                if (trip && isFromGIKI(trip.stops)) {
                                    setPickupStopId(getGikiStop(trip.stops));
                                    setDropoffStopId(null);
                                } else if (trip && isToGIKI(trip.stops)) {
                                    setDropoffStopId(getGikiStop(trip.stops));
                                    setPickupStopId(null);
                                } else {
                                    setPickupStopId(null);
                                    setDropoffStopId(null);
                                }
                                // Initialize seat count based on remaining quota
                                if (trip && getRemainingQuota(trip) <= 0) {
                                    setSeatCount(0);
                                } else {
                                    setSeatCount(1);
                                }
                            } else {
                                setReturnTripId(id);
                                const trip = allTrips.find(t => t.trip_id === id);
                                if (trip && isFromGIKI(trip.stops)) {
                                    setReturnPickupStopId(getGikiStop(trip.stops));
                                    setReturnDropoffStopId(null);
                                } else if (trip && isToGIKI(trip.stops)) {
                                    setReturnDropoffStopId(getGikiStop(trip.stops));
                                    setReturnPickupStopId(null);
                                } else {
                                    setReturnPickupStopId(null);
                                    setReturnDropoffStopId(null);
                                }
                                // Initialize return seat count based on remaining quota
                                if (trip && getRemainingQuota(trip) <= 0) {
                                    setReturnSeatCount(0);
                                } else {
                                    setReturnSeatCount(1);
                                }
                            }
                        }}
                    />

                    {/* Trip details */}
                    {(stage === 'select_outbound' ? selectedTrip : returnTrip) && (
                        <BookingForm
                            trip={(stage === 'select_outbound' ? selectedTrip : returnTrip)!}
                            pickupStopId={stage === 'select_outbound' ? pickupStopId : returnPickupStopId}
                            onPickupChange={(v) => {
                                if (stage === 'select_outbound') setPickupStopId(v);
                                else setReturnPickupStopId(v);
                            }}
                            dropoffStopId={stage === 'select_outbound' ? dropoffStopId : returnDropoffStopId}
                            onDropoffChange={(v) => {
                                if (stage === 'select_outbound') setDropoffStopId(v);
                                else setReturnDropoffStopId(v);
                            }}
                            seatCount={stage === 'select_outbound' ? seatCount : returnSeatCount}
                            onSeatCountChange={(n) => {
                                if (stage === 'select_outbound') setSeatCount(n);
                                else setReturnSeatCount(n);
                            }}
                            remainingQuota={getRemainingQuota(stage === 'select_outbound' ? selectedTrip : returnTrip)}
                            primaryActionLabel={
                                stage === 'select_outbound'
                                    ? (roundTrip ? 'Reserve & continue' : 'Book')
                                    : 'Reserve & review'
                            }
                            onPrimaryAction={
                                stage === 'select_outbound' ? reserveOutbound : reserveReturnAndReview
                            }
                            primaryActionDisabled={
                                stage === 'select_outbound' ? !canSelectOutbound : !canSelectReturn
                            }
                            secondaryActionLabel={stage === 'select_return' ? 'Back to outbound' : undefined}
                            onSecondaryAction={
                                stage === 'select_return'
                                    ? async () => {
                                        await doReleaseHolds();
                                        setStage('select_outbound');
                                    }
                                    : undefined
                            }
                        />
                    )}
                </div>

                <BookingConfirmationModal
                    isOpen={confirmOpen}
                    onClose={async () => {
                        setConfirmOpen(false);
                        await doReleaseHolds();
                    }}
                    confirming={confirming}
                    onConfirm={confirmBooking}
                    outboundSummary={outboundSummary}
                    returnSummary={returnSummary}
                    outboundHolds={outboundHolds}
                    returnHolds={returnHolds}
                    passengers={passengers}
                    setPassengers={setPassengers}
                />

                <AbandonBookingModal
                    isOpen={abandonModalOpen}
                    onClose={() => {
                        setAbandonModalOpen(false);
                        blocker.reset?.();
                    }}
                    timeLeft={timeLeft}
                    onAbandon={async () => {
                        setAbandonModalOpen(false);
                        try {
                            await releaseAllHolds();
                            blocker.proceed?.();
                        } catch (e) {
                            // Error handled by store
                        }
                    }}
                    onStay={() => {
                        setAbandonModalOpen(false);
                        blocker.reset?.();
                    }}
                />
            </div>
        </div>
    );
};

