import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/shared/stores/authStore';
import {
    confirmBatch,
    getUpcomingTrips,
    holdSeats,
    listRoutes,
    releaseHold,
    type Trip,
    type TripStop,
    type TransportRoute,
} from '@/client/modules/transport/api';
import { TransportRouteSelector } from '../components/TransportRouteSelector';
import { TripList } from '../components/TripList';
import { BookingForm } from '../components/BookingForm';
import { BookingConfirmationModal, Passenger, HeldSeat } from '../components/BookingConfirmationModal';
import { formatDateTime, getStopById } from '../utils';

function getApiErrorMessage(err: unknown): string {
    if (typeof err !== 'object' || err === null) return 'Something went wrong';
    const maybeAxios = err as {
        response?: { data?: { code?: unknown; error?: unknown; message?: unknown } };
        message?: unknown;
    };
    const msg =
        maybeAxios.response?.data?.message ||
        maybeAxios.response?.data?.error ||
        maybeAxios.message;
    return typeof msg === 'string' && msg.trim() ? msg : 'Something went wrong';
}







export const TransportPage = () => {
    const navigate = useNavigate();
    const { initialized, user } = useAuthStore();

    const [routes, setRoutes] = useState<TransportRoute[]>([]);
    const [routesLoading, setRoutesLoading] = useState(false);

    const [roundTrip, setRoundTrip] = useState(false);

    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [tripsLoading, setTripsLoading] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const selectedTrip = useMemo(() => trips.find((t) => t.trip_id === selectedTripId) || null, [trips, selectedTripId]);

    const [pickupStopId, setPickupStopId] = useState<string | null>(null);
    const [dropoffStopId, setDropoffStopId] = useState<string | null>(null);
    const [seatCount, setSeatCount] = useState(1);

    // Round-trip: second leg
    const [returnRouteId, setReturnRouteId] = useState<string | null>(null);
    const [returnTrips, setReturnTrips] = useState<Trip[]>([]);
    const [returnTripId, setReturnTripId] = useState<string | null>(null);
    const returnTrip = useMemo(() => returnTrips.find((t) => t.trip_id === returnTripId) || null, [returnTrips, returnTripId]);
    const [returnPickupStopId, setReturnPickupStopId] = useState<string | null>(null);
    const [returnDropoffStopId, setReturnDropoffStopId] = useState<string | null>(null);
    const [returnSeatCount, setReturnSeatCount] = useState(1);

    const [stage, setStage] = useState<'select_outbound' | 'select_return'>('select_outbound');

    const [outboundHolds, setOutboundHolds] = useState<HeldSeat[]>([]);
    const [returnHolds, setReturnHolds] = useState<HeldSeat[]>([]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [passengers, setPassengers] = useState<Record<string, Passenger>>({});
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                setRoutesLoading(true);
                const data = await listRoutes();
                setRoutes(data);
            } catch (e) {
                toast.error(getApiErrorMessage(e));
            } finally {
                setRoutesLoading(false);
            }
        })();
    }, []);

    // Load trips for outbound
    useEffect(() => {
        if (!selectedRouteId) return;
        void (async () => {
            setTripsLoading(true);
            try {
                const data = await getUpcomingTrips(selectedRouteId);
                setTrips(data);
                setSelectedTripId(null);
                setPickupStopId(null);
                setDropoffStopId(null);
                setSeatCount(1);
            } catch (e) {
                toast.error(getApiErrorMessage(e));
            } finally {
                setTripsLoading(false);
            }
        })();
    }, [selectedRouteId]);

    // Load trips for return leg
    useEffect(() => {
        if (!roundTrip || stage !== 'select_return' || !returnRouteId) return;
        void (async () => {
            setTripsLoading(true);
            try {
                const data = await getUpcomingTrips(returnRouteId);
                setReturnTrips(data);
                setReturnTripId(null);
                setReturnPickupStopId(null);
                setReturnDropoffStopId(null);
                setReturnSeatCount(1);
            } catch (e) {
                toast.error(getApiErrorMessage(e));
            } finally {
                setTripsLoading(false);
            }
        })();
    }, [roundTrip, stage, returnRouteId]);

    const routeOptions = useMemo(
        () => routes.map((r) => ({ value: r.route_id, label: r.route_name })),
        [routes]
    );

    const selectedRouteName = useMemo(
        () => routes.find((r) => r.route_id === selectedRouteId)?.route_name || null,
        [routes, selectedRouteId]
    );

    const returnRouteOptions = routeOptions;
    const returnRouteName = useMemo(
        () => routes.find((r) => r.route_id === returnRouteId)?.route_name || null,
        [routes, returnRouteId]
    );

    // Auto-select return route logic
    const autoSelectReturn = (outboundId: string | null) => {
        if (!outboundId) return null;
        const outbound = routes.find(r => r.route_id === outboundId);
        if (!outbound) return null;

        // Try to find reverse name
        // Supports: "A to B", "A - B", "A -> B"
        const separators = [" to ", " - ", " -> ", " TO "];
        const name = outbound.route_name;

        for (const sep of separators) {
            if (name.includes(sep)) {
                const parts = name.split(sep);
                if (parts.length === 2) {
                    const reverseName = `${parts[1].trim()}${sep}${parts[0].trim()}`;
                    const match = routes.find(r => r.route_name.toLowerCase() === reverseName.toLowerCase());
                    if (match) return match.route_id;
                }
            }
        }
        return null;
    };

    // Effect: When roundTrip is turned on, or selectedRouteId changes while roundTrip is on, try to set returnRouteId
    useEffect(() => {
        if (roundTrip && selectedRouteId && !returnRouteId) {
            const autoId = autoSelectReturn(selectedRouteId);
            if (autoId) setReturnRouteId(autoId);
        }
    }, [roundTrip, selectedRouteId]);

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
        const all = [...outboundHolds, ...returnHolds];
        if (all.length === 0) return;
        await Promise.allSettled(all.map((h) => releaseHold(h.hold_id)));
        setOutboundHolds([]);
        setReturnHolds([]);
    }

    async function reserveOutbound() {
        if (!selectedTrip || !pickupStopId || !dropoffStopId) return;
        try {
            const resp = await holdSeats({
                trip_id: selectedTrip.trip_id,
                count: seatCount,
                pickup_stop_id: pickupStopId,
                dropoff_stop_id: dropoffStopId,
            });
            setOutboundHolds(resp.holds);

            // initialize passengers for holds
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
            toast.error(getApiErrorMessage(e));
        }
    }

    async function reserveReturnAndReview() {
        if (!returnTrip || !returnPickupStopId || !returnDropoffStopId) return;
        try {
            const resp = await holdSeats({
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
            toast.error(getApiErrorMessage(e));
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
            await confirmBatch({
                confirmations: allHolds.map((h) => ({
                    hold_id: h.hold_id,
                    passenger_name: passengers[h.hold_id].name.trim(),
                    passenger_relation: passengers[h.hold_id].relation,
                })),
            });

            toast.success('Booking confirmed');
            setConfirmOpen(false);
            setStage('select_outbound');
            setOutboundHolds([]);
            setReturnHolds([]);
            navigate('/', { replace: true });
        } catch (e) {
            toast.error(getApiErrorMessage(e));
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

    if (!user) {
        return (
            <div className="max-w-xl mx-auto py-10">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <h1 className="text-xl font-bold text-gray-900">Transport</h1>
                    <p className="text-sm text-gray-600 mt-2">Please sign in to book transport.</p>
                    <Button className="mt-4" onClick={() => navigate('/auth/sign-in?redirect=/transport')}>
                        Sign in
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary-dark p-8 text-white shadow-xl shadow-primary/20">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-accent/20 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <Bus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Book Transport</h1>
                            <p className="text-blue-100 font-medium opacity-90">Schedule your ride with ease</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/')}
                        className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md transition-all self-start md:self-center"
                        size="sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <TransportRouteSelector
                    routes={routes}
                    routesLoading={routesLoading}
                    selectedRouteId={selectedRouteId}
                    onSelectRoute={setSelectedRouteId}
                    returnRouteId={returnRouteId}
                    onSelectReturnRoute={setReturnRouteId}
                    stage={stage}
                    roundTrip={roundTrip}
                    onToggleRoundTrip={() => {
                        if (roundTrip && stage === 'select_return') {
                            void doReleaseHolds();
                            setStage('select_outbound');
                        }
                        setRoundTrip((v) => !v);
                    }}
                />

                <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-8 shadow-sm relative overflow-hidden ring-1 ring-black/5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                        <Clock className="w-4 h-4 text-primary" />
                        {stage === 'select_outbound' ? 'Select departure' : 'Select return'}
                    </div>

                    <TripList
                        trips={stage === 'select_outbound' ? trips : returnTrips}
                        loading={tripsLoading}
                        selectedTripId={stage === 'select_outbound' ? selectedTripId : returnTripId}
                        onSelectTrip={(id) => {
                            if (stage === 'select_outbound') setSelectedTripId(id);
                            else setReturnTripId(id);
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

                {/* Confirm modal */}
                <Modal
                    isOpen={confirmOpen}
                    onClose={async () => {
                        setConfirmOpen(false);
                        await doReleaseHolds();
                    }}
                    title="Confirm booking"
                    footer={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                disabled={confirming}
                                onClick={async () => {
                                    setConfirmOpen(false);
                                    await doReleaseHolds();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button className="flex-1 font-semibold" disabled={confirming} onClick={confirmBooking}>
                                {confirming ? 'Confirming…' : 'Confirm'}
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {outboundSummary && (
                            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                                <p className="font-semibold text-gray-900">Outbound</p>
                                <p className="text-sm text-gray-700 mt-1">{outboundSummary.route}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {outboundSummary.when} · {outboundSummary.pickup} → {outboundSummary.dropoff} · {outboundSummary.seats}{' '}
                                    seat(s)
                                </p>
                            </div>
                        )}

                        {roundTrip && returnSummary && (
                            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                                <p className="font-semibold text-gray-900">Return</p>
                                <p className="text-sm text-gray-700 mt-1">{returnSummary.route}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {returnSummary.when} · {returnSummary.pickup} → {returnSummary.dropoff} · {returnSummary.seats} seat(s)
                                </p>
                            </div>
                        )}

                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Passenger details</p>
                            <div className="space-y-3">
                                {[...outboundHolds, ...returnHolds].map((h, idx) => {
                                    const p = passengers[h.hold_id] || { name: '', relation: 'SELF' as const };
                                    return (
                                        <div key={h.hold_id} className="p-3 rounded-xl border border-gray-200">
                                            <p className="text-xs font-semibold text-gray-600 mb-2">Seat {idx + 1}</p>
                                            <input
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="Passenger name"
                                                value={p.name}
                                                onChange={(e) =>
                                                    setPassengers((prev) => ({
                                                        ...prev,
                                                        [h.hold_id]: { ...p, name: e.target.value },
                                                    }))
                                                }
                                            />
                                            <div className="mt-2">
                                                <Select
                                                    options={[
                                                        { value: 'SELF', label: 'Self' },
                                                        { value: 'SPOUSE', label: 'Spouse' },
                                                        { value: 'CHILD', label: 'Child' },
                                                    ]}
                                                    value={p.relation}
                                                    onChange={(v) =>
                                                        setPassengers((prev) => ({
                                                            ...prev,
                                                            [h.hold_id]: { ...p, relation: v as Passenger['relation'] },
                                                        }))
                                                    }
                                                    placeholder="Relation"
                                                    showLabel={false}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

