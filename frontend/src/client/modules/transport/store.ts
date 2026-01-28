import { create } from 'zustand';
import {
    getAllUpcomingTrips,
    getQuota,
    getActiveHolds,
    releaseAllActiveHolds,
    holdSeats,
    confirmBatch,
    type Trip,
} from './api';
import {
    type QuotaResponse,
    type ActiveHold,
    type HoldSeatsRequest,
    type ConfirmBatchRequest,
    type BookingSelection,
    type Passenger,
    type HoldSeatsResponse,
} from './validators';
import { toast } from 'sonner';

type SessionHold = HoldSeatsResponse['holds'][number];

interface TransportState {
    // Data
    allTrips: Trip[];
    quota: QuotaResponse | null;
    activeHolds: ActiveHold[]; // All active holds from server
    loading: boolean;
    initialized: boolean;
    error: string | null;

    // Booking Flow State
    direction: 'from-giki' | 'to-giki';
    roundTrip: boolean;
    stage: 'select_outbound' | 'select_return';
    outboundSelection: BookingSelection | null;
    returnSelection: BookingSelection | null;

    // Current Flow Holds (subset of activeHolds that we are booking now)
    outboundHolds: SessionHold[];
    returnHolds: SessionHold[];

    // Confirmation State
    passengers: Record<string, Passenger>;
    confirmOpen: boolean;

    // Actions
    fetchData: (showLoading?: boolean) => Promise<void>;
    releaseAllHolds: () => Promise<void>;

    // Flow Actions
    setDirection: (d: 'from-giki' | 'to-giki') => void;
    setRoundTrip: (isRoundTrip: boolean) => void;
    setStage: (stage: 'select_outbound' | 'select_return') => void;
    setConfirmOpen: (isOpen: boolean) => void;
    updatePassenger: (holdId: string, passenger: Passenger) => void;
    resetBookingFlow: () => void;

    // Async Flow Actions
    reserveOutbound: (selection: BookingSelection, userName?: string) => Promise<void>;
    reserveReturn: (selection: BookingSelection, userName?: string) => Promise<void>;
    confirmCurrentBooking: () => Promise<void>;
}

function getApiErrorMessage(err: unknown): string {
    if (typeof err !== 'object' || err === null) return 'Something went wrong';
    const maybeAxios = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
    };
    return (
        maybeAxios.response?.data?.message ||
        maybeAxios.response?.data?.error ||
        maybeAxios.message ||
        'Something went wrong'
    );
}

export const useTransportStore = create<TransportState>((set, get) => ({
    allTrips: [],
    quota: null,
    activeHolds: [],
    loading: false,
    initialized: false,
    error: null,

    // Booking Flow Defaults
    direction: 'from-giki',
    roundTrip: false,
    stage: 'select_outbound',
    outboundSelection: null,
    returnSelection: null,
    outboundHolds: [],
    returnHolds: [],
    passengers: {},
    confirmOpen: false,

    setDirection: (direction) => {
        // If changing direction, we should probably reset selections?
        // But user might just be exploring. Let's keep it simple.
        // If they had holds, we should probably release them if they switch context completely,
        // but let's let the user manually abandon or let timeouts handle it for now to avoid accidental data loss.
        // Actually, matching TransportPage logic: "if d !== direction void doReleaseHolds()"
        const current = get().direction;
        if (current !== direction) {
            get().releaseAllHolds(); // This resets flow too
            set({ direction, stage: 'select_outbound' });
        } else {
            set({ direction });
        }
    },

    setRoundTrip: (roundTrip) => {
        const { roundTrip: current, stage } = get();
        if (roundTrip) {
            set({ roundTrip: true });
        } else {
            // Switching to One Way
            if (current && stage === 'select_return') {
                // Abandon return holds if any?
                // Simple approach: Release all and restart flow if they are in middle of complicating things,
                // OR just clear return selection.
                // TransportPage logic: "void doReleaseHolds(); setStage('select_outbound')"
                get().releaseAllHolds();
                set({ stage: 'select_outbound' });
            }
            set({ roundTrip: false });
        }
    },

    setStage: (stage) => set({ stage }),
    setConfirmOpen: (confirmOpen) => set({ confirmOpen }),

    updatePassenger: (holdId, passenger) => set(state => ({
        passengers: { ...state.passengers, [holdId]: passenger }
    })),

    resetBookingFlow: () => set({
        stage: 'select_outbound',
        outboundSelection: null,
        returnSelection: null,
        outboundHolds: [],
        returnHolds: [],
        passengers: {},
        confirmOpen: false
    }),

    fetchData: async (showLoading = true) => {
        if (showLoading) set({ loading: true });
        try {
            const [tripsData, quotaData, holdsData] = await Promise.all([
                getAllUpcomingTrips(),
                getQuota(),
                getActiveHolds()
            ]);
            set({
                allTrips: tripsData,
                quota: quotaData,
                activeHolds: holdsData,
                initialized: true,
                error: null
            });
        } catch (e) {
            const msg = getApiErrorMessage(e);
            set({ error: msg });
            toast.error(msg);
        } finally {
            if (showLoading) set({ loading: false });
        }
    },

    releaseAllHolds: async () => {
        set({ loading: true });
        try {
            await releaseAllActiveHolds();
            await get().fetchData(false);
            get().resetBookingFlow();
            toast.success('Reservations released');
        } catch (e) {
            toast.error(getApiErrorMessage(e));
        } finally {
            set({ loading: false });
        }
    },

    reserveOutbound: async (selection, userName) => {
        set({ loading: true });
        try {
            const resp = await holdSeats({
                trip_id: selection.tripId,
                count: selection.ticketCount,
                pickup_stop_id: selection.pickupId,
                dropoff_stop_id: selection.dropoffId,
            });

            // Update Global Data
            await get().fetchData(false);

            // Update Flow State
            const newPassengers: Record<string, Passenger> = {};
            resp.holds.forEach(h => {
                newPassengers[h.hold_id] = { name: userName || '', relation: 'SELF' };
            });

            set(state => ({
                outboundSelection: selection,
                outboundHolds: resp.holds,
                passengers: { ...state.passengers, ...newPassengers }
            }));

            if (get().roundTrip) {
                set({ stage: 'select_return' });
                toast.success('Reserved. Now select your return trip.');
            } else {
                set({ confirmOpen: true });
            }
        } catch (e) {
            const msg = getApiErrorMessage(e);
            toast.error(msg);
        } finally {
            set({ loading: false });
        }
    },

    reserveReturn: async (selection, userName) => {
        set({ loading: true });
        try {
            const resp = await holdSeats({
                trip_id: selection.tripId,
                count: selection.ticketCount,
                pickup_stop_id: selection.pickupId,
                dropoff_stop_id: selection.dropoffId,
            });

            // Update Global Data
            await get().fetchData(false);

            // Update Flow State
            const newPassengers: Record<string, Passenger> = {};
            resp.holds.forEach(h => {
                newPassengers[h.hold_id] = { name: userName || '', relation: 'SELF' };
            });

            set(state => ({
                returnSelection: selection,
                returnHolds: resp.holds,
                passengers: { ...state.passengers, ...newPassengers },
                confirmOpen: true // Always confirm after return selection
            }));

        } catch (e) {
            const msg = getApiErrorMessage(e);
            toast.error(msg);
        } finally {
            set({ loading: false });
        }
    },

    confirmCurrentBooking: async () => {
        const { outboundHolds, returnHolds, passengers } = get();
        const allHolds = [...outboundHolds, ...returnHolds];
        if (allHolds.length === 0) return;

        set({ loading: true });
        try {
            const confirmations = allHolds.map(h => ({
                hold_id: h.hold_id,
                passenger_name: passengers[h.hold_id]?.name || '',
                passenger_relation: passengers[h.hold_id]?.relation || 'SELF'
            }));

            await confirmBatch({ confirmations });
            await get().fetchData(false);

            toast.success('Booking confirmed!');
            // Reset flow but maybe keep initialized true
            get().resetBookingFlow();

            // Note: We don't navigate here, component can react to change or we can add a 'bookingSuccessful' flag
        } catch (e) {
            const msg = getApiErrorMessage(e);
            toast.error(msg);
            throw e; // Component might want to know to close modal
        } finally {
            set({ loading: false });
        }
    }
}));
