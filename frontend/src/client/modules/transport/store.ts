import { create } from 'zustand';
import { useAuthStore } from '@/shared/stores/authStore';
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
    bookingSelectionSchema,
} from './validators';
import { getGIKIStopObject, isFromGIKI } from './utils';
import { getErrorMessage, logError, AppError } from '@/lib/errors';
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

    // Timer & Constraint State
    timeLeft: number; // Seconds remaining
    heldCity: string | null; // Locked city for round trip return
    isWarningModalOpen: boolean;

    // Confirmation State
    passengers: Record<string, Passenger>;
    confirmOpen: boolean;

    // Actions
    fetchData: (showLoading?: boolean) => Promise<void>;
    releaseAllHolds: () => Promise<void>;
    startTimer: (expiresAt: string) => void;
    stopTimer: () => void;

    // Flow Actions
    setDirection: (d: 'from-giki' | 'to-giki') => void;
    setRoundTrip: (isRoundTrip: boolean) => void;
    setStage: (stage: 'select_outbound' | 'select_return') => void;
    setConfirmOpen: (isOpen: boolean) => void;
    setWarningModalOpen: (isOpen: boolean) => void;
    updatePassenger: (holdId: string, passenger: Passenger) => void;
    resetBookingFlow: () => void;

    // Async Flow Actions
    reserveOutbound: (selection: BookingSelection, userName?: string) => Promise<void>;
    reserveReturn: (selection: BookingSelection, userName?: string) => Promise<void>;
    confirmCurrentBooking: () => Promise<void>;
}

// Removed getApiErrorMessage - now using getErrorMessage from lib/errors

let timerInterval: ReturnType<typeof setInterval> | null = null;

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
    timeLeft: 0,
    heldCity: null,
    isWarningModalOpen: false,
    passengers: {},
    confirmOpen: false,

    setDirection: (direction) => {
        const { direction: current, activeHolds } = get();
        if (current === direction) return;

        if (activeHolds.length > 0) {
            set({ isWarningModalOpen: true });
        } else {
            // Safe to switch
            set({ direction, stage: 'select_outbound' });
        }
    },

    setRoundTrip: (roundTrip) => {
        const { roundTrip: current, activeHolds } = get();
        if (current === roundTrip) return;

        if (activeHolds.length > 0 && current === true && roundTrip === false) {
            // Downgrading to One Way while having holds
            set({ isWarningModalOpen: true });
        } else {
            set({ roundTrip });
        }
    },

    setStage: (stage) => set({ stage }),
    setConfirmOpen: (confirmOpen) => set({ confirmOpen }),
    setWarningModalOpen: (isWarningModalOpen) => set({ isWarningModalOpen }),

    updatePassenger: (holdId, passenger) => set(state => ({
        passengers: { ...state.passengers, [holdId]: passenger }
    })),

    resetBookingFlow: () => {
        get().stopTimer();
        set({
            stage: 'select_outbound',
            outboundSelection: null,
            returnSelection: null,
            outboundHolds: [],
            returnHolds: [],
            heldCity: null,
            passengers: {},
            confirmOpen: false,
            isWarningModalOpen: false,
            timeLeft: 0
        });
    },

    startTimer: (expiresAt) => {
        get().stopTimer();
        const expiry = new Date(expiresAt).getTime();

        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((expiry - now) / 1000));
            set({ timeLeft: diff });

            if (diff <= 0) {
                get().stopTimer();
                get().releaseAllHolds();
                toast.error('Reservation expired');
            }
        };

        tick();
        timerInterval = setInterval(tick, 1000);
    },

    stopTimer: () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    },

    fetchData: async (showLoading = true) => {
        if (showLoading) set({ loading: true });
        try {
            const [tripsData, quotaData, holdsData] = await Promise.all([
                getAllUpcomingTrips(),
                getQuota(),
                getActiveHolds()
            ]);

            const user = useAuthStore.getState().user;
            const role = user?.user_type.toUpperCase();
            const filteredTrips = (tripsData || []).filter(trip => {
                if (!role || role.includes('ADMIN')) return true;
                return trip.bus_type === role;
            });

            set({
                allTrips: filteredTrips,
                quota: quotaData,
                activeHolds: holdsData,
                initialized: true,
                error: null
            });

            // If there's an active hold, start timer for the one expiring soonest
            if (holdsData.length > 0) {
                const soonest = holdsData.reduce((prev, curr) =>
                    new Date(prev.expires_at) < new Date(curr.expires_at) ? prev : curr
                );
                get().startTimer(soonest.expires_at);
            } else {
                get().stopTimer();
            }
        } catch (e) {
            const msg = getErrorMessage(e);
            set({ error: msg });
            toast.error(msg);

            // Log the error for debugging
            if (e instanceof AppError) {
                logError(e, { action: 'fetchData' });
            }
        } finally {
            if (showLoading) set({ loading: false });
        }
    },

    releaseAllHolds: async () => {
        set({ loading: true });
        try {
            await releaseAllActiveHolds();
            get().stopTimer(); // Explicit stop
            await get().fetchData(false);
            get().resetBookingFlow();
            toast.success('Reservations released');
        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);

            if (e instanceof AppError) {
                logError(e, { action: 'releaseAllHolds' });
            }
        } finally {
            set({ loading: false });
        }
    },

    reserveOutbound: async (selection, userName) => {
        // Validate selection with Zod schema
        const parseResult = bookingSelectionSchema.safeParse(selection);
        if (!parseResult.success) {
            toast.error('Invalid booking selection: ' + parseResult.error.issues[0]?.message);
            return;
        }

        set({ loading: true });
        try {
            // Additional validation: For OUTBOUND (from-giki), pickup must be GIKI
            const trip = get().allTrips.find(t => t.trip_id === selection.tripId);
            if (trip && get().direction === 'from-giki') {
                const gikiStop = getGIKIStopObject(trip.stops || []);
                if (gikiStop && selection.pickupId !== gikiStop.stop_id) {
                    toast.error('Outbound trips must pick up from GIKI');
                    set({ loading: false });
                    return;
                }
            }

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

            // Find the trip to lock the city
            const cityName = trip?.route_name.split(' - ').find(c => !c.toUpperCase().includes('GIKI')) || null;

            set(state => ({
                outboundSelection: selection,
                outboundHolds: resp.holds,
                heldCity: cityName,
                passengers: { ...state.passengers, ...newPassengers }
            }));

            // Start timer from response
            if (resp.holds.length > 0) {
                get().startTimer(resp.holds[0].expires_at);
            }

            if (get().roundTrip) {
                set({ stage: 'select_return' });
                toast.success('Reserved. Now select your return trip.');
            } else {
                set({ confirmOpen: true });
            }
        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);

            if (e instanceof AppError) {
                logError(e, {
                    action: 'reserveOutbound',
                    tripId: selection.tripId,
                    ticketCount: selection.ticketCount
                });
            }
        } finally {
            set({ loading: false });
        }
    },

    reserveReturn: async (selection, userName) => {
        // Validate selection with Zod schema
        const parseResult = bookingSelectionSchema.safeParse(selection);
        if (!parseResult.success) {
            toast.error('Invalid booking selection: ' + parseResult.error.issues[0]?.message);
            return;
        }

        set({ loading: true });
        try {
            // Additional validation: For INBOUND (to-giki), dropoff must be GIKI
            const trip = get().allTrips.find(t => t.trip_id === selection.tripId);
            if (trip && get().direction === 'to-giki') {
                const gikiStop = getGIKIStopObject(trip.stops || []);
                if (gikiStop && selection.dropoffId !== gikiStop.stop_id) {
                    toast.error('Inbound trips must drop off at GIKI');
                    set({ loading: false });
                    return;
                }
            }

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

            // Restart/Update timer if needed (usually expiry is synced in backend)
            if (resp.holds.length > 0) {
                get().startTimer(resp.holds[0].expires_at);
            }

        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);

            if (e instanceof AppError) {
                logError(e, {
                    action: 'reserveReturn',
                    tripId: selection.tripId,
                    ticketCount: selection.ticketCount
                });
            }
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
            get().stopTimer(); // Stop timer on success
            await get().fetchData(false);

            toast.success('Booking confirmed!');
            // Reset flow but maybe keep initialized true
            get().resetBookingFlow();

            // Note: We don't navigate here, component can react to change or we can add a 'bookingSuccessful' flag
        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);

            if (e instanceof AppError) {
                logError(e, {
                    action: 'confirmCurrentBooking',
                    holdCount: allHolds.length
                });
            }
            throw e; // Component might want to know to close modal
        } finally {
            set({ loading: false });
        }
    }
}));
