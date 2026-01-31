import { create } from 'zustand';
import { useAuthStore } from '@/shared/stores/authStore';
import {
    getWeeklySummary,
    getQuota,
    getActiveHolds,
    releaseAllActiveHolds,
    holdSeats,
    confirmBatch,
    getUserTickets,
    cancelTicket,
} from './api';
import type {
    Trip,
    QuotaResponse,
    ActiveHold,
    HoldSeatsResponse,
    BookingSelection,
    Passenger,
    MyTicket,
} from './validators';
import { bookingSelectionSchema } from './validators';
import { getGIKIStopObject } from './utils';
import { getErrorMessage, logError, AppError } from '@/lib/errors';
import { toast } from 'sonner';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface TransportState {
    // Data
    allTrips: Trip[];
    quota: QuotaResponse | null;
    activeHolds: ActiveHold[];
    myTickets: MyTicket[];
    loading: boolean;
    initialized: boolean;
    error: string | null;

    // Booking Flow
    direction: 'Outbound' | 'Inbound';
    isRoundTrip: boolean; // Feature 2: Round Trip Toggle
    outboundSelection: BookingSelection | null;
    returnSelection: BookingSelection | null;
    passengers: Record<string, Passenger>;

    // Actions
    fetchData: (showLoading?: boolean) => Promise<void>;
    releaseAllHolds: () => Promise<void>;
    setDirection: (d: 'Outbound' | 'Inbound') => void;
    setRoundTrip: (enabled: boolean) => void;
    updatePassenger: (holdId: string, passenger: Passenger) => void;
    resetBookingFlow: () => void;
    addSelection: (selection: BookingSelection) => Promise<void>;
    confirmBooking: (confirmations: Array<{ holdId: string; passengerName: string; passengerRelation: string }>) => Promise<void>;
    fetchUserTickets: () => Promise<void>;
    cancelTicket: (ticketId: string) => Promise<void>;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useTransportStore = create<TransportState>((set, get) => ({
    // Initial State
    allTrips: [],
    quota: null,
    activeHolds: [],
    myTickets: [],
    loading: false,
    initialized: false,
    error: null,
    direction: 'Outbound', // Default to Outbound (from GIKI)
    isRoundTrip: false,
    outboundSelection: null,
    returnSelection: null,
    passengers: {},

    // ========================================================================
    // ACTIONS
    // ========================================================================

    setRoundTrip: (enabled) => {
        const { activeHolds } = get();
        if (activeHolds.length > 0) {
            toast.error('Please release active reservations before changing mode');
            return;
        }
        set({ isRoundTrip: enabled });
    },

    setDirection: (direction) => {
        const { activeHolds, isRoundTrip } = get();

        // If Round Trip is enabled, we allow direction switching IF we are in the middle of the flow.
        // However, if manual switch is attempted while holds exist (and it's not the wizard auto-switch), we might want to block.
        // For simplicity: If holds exist, only allow switch if it aligns with Round Trip logic (e.g. going to next leg).
        // But the wizard auto-switch will use a direct state update perhaps? No, better to use action.

        // Standard check:
        if (!isRoundTrip && activeHolds.length > 0) {
            toast.error('Please release active holds before changing direction');
            return;
        }

        // Round Trip check: If we have holds, we can only switch if we haven't completed both legs? 
        // Or cleaner: `addSelection` handles the switching. Manual switching might be restricted.
        // Let's keep existing check for manual but relax it if isRoundTrip? 
        // Actually, if I have Outbound hold, and I click Inbound tab, it should be fine in Round Trip mode.
        // But if I have Inbound hold (2nd leg) and click Outbound?

        // Let's rely on the UI to guide them. If manual click:
        if (activeHolds.length > 0 && !isRoundTrip) {
            toast.error('Please release active holds before changing direction');
            return;
        }

        set({ direction });
    },

    updatePassenger: (holdId, passenger) => set(state => ({
        passengers: { ...state.passengers, [holdId]: passenger }
    })),

    resetBookingFlow: () => {
        set({
            outboundSelection: null,
            returnSelection: null,
            passengers: {},
            // Reset direction to Outbound? Or keep current? Keep current usually better UX.
        });
    },

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    fetchData: async (showLoading = true) => {
        if (showLoading) set({ loading: true });
        try {
            const [tripsData, quotaData, holdsData] = await Promise.all([
                getWeeklySummary(),
                getQuota(),
                getActiveHolds()
            ]);

            const user = useAuthStore.getState().user;
            const role = user?.user_type.toUpperCase();

            const filteredTrips = (tripsData || []).filter(trip => {
                if (!role || role.includes('ADMIN')) return true;
                return trip.bus_type.toUpperCase() === role;
            });

            set({
                allTrips: filteredTrips,
                quota: quotaData,
                activeHolds: holdsData,
                initialized: true,
                error: null
            });
        } catch (e) {
            const msg = getErrorMessage(e);
            set({ error: msg });
            toast.error(msg);
            if (e instanceof AppError) {
                logError(e, { action: 'fetchData' });
            }
        } finally {
            if (showLoading) set({ loading: false });
        }
    },

    fetchUserTickets: async () => {
        // Don't set global loading since this might be refreshed independently
        try {
            const tickets = await getUserTickets();
            set({ myTickets: tickets });
        } catch (e) {
            console.error('Failed to fetch tickets', e);
            // Silent fail or toast? Toast for now
            // toast.error('Failed to update tickets'); 
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
            const msg = getErrorMessage(e);
            toast.error(msg);
            if (e instanceof AppError) {
                logError(e, { action: 'releaseAllHolds' });
            }
        } finally {
            set({ loading: false });
        }
    },

    // ========================================================================
    // BOOKING FLOW
    // ========================================================================

    addSelection: async (selection: BookingSelection) => {
        const parseResult = bookingSelectionSchema.safeParse(selection);
        if (!parseResult.success) {
            toast.error('Invalid booking selection');
            return;
        }

        set({ loading: true });
        try {
            const trip = get().allTrips.find(t => t.id === selection.tripId);
            if (!trip) {
                toast.error('Trip not found');
                return;
            }

            const gikiStop = getGIKIStopObject(trip.stops || []);
            const direction = get().direction;

            if (direction === 'Outbound' && gikiStop && selection.pickupId !== gikiStop.stop_id) {
                toast.error('Outbound trips must pick up from GIKI');
                set({ loading: false });
                return;
            }

            if (direction === 'Inbound' && gikiStop && selection.dropoffId !== gikiStop.stop_id) {
                toast.error('Inbound trips must drop off at GIKI');
                set({ loading: false });
                return;
            }

            const resp = await holdSeats({
                trip_id: selection.tripId,
                count: selection.ticketCount,
                pickup_stop_id: selection.pickupId,
                dropoff_stop_id: selection.dropoffId,
            });

            await get().fetchData(false);

            const user = useAuthStore.getState().user;
            const newPassengers: Record<string, Passenger> = {};
            resp.holds.forEach(h => {
                newPassengers[h.hold_id] = {
                    name: '',
                    relation: 'GUEST' as const
                };
            });

            // Default first seat to SELF if user has no other passengers set for THIS trip
            if (resp.holds.length > 0) {
                const currentData = get();
                // Check if SELF exists in any holds for THIS trip
                const currentTripHolds = currentData.activeHolds.filter(h => h.trip_id === selection.tripId);
                const existingSelfOnTrip = currentTripHolds.some(h =>
                    currentData.passengers[h.id]?.relation === 'SELF'
                );

                if (!existingSelfOnTrip) {
                    newPassengers[resp.holds[0].hold_id] = {
                        name: user?.name || '',
                        relation: 'SELF'
                    };
                }
            }

            // direction is already declared above: const direction = get().direction;
            const { isRoundTrip } = get();

            if (direction === 'Outbound') {
                set(state => ({
                    outboundSelection: selection,
                    passengers: { ...state.passengers, ...newPassengers },
                    // Wizard Flow: If Round Trip, auto switch to Inbound
                    direction: isRoundTrip ? 'Inbound' : 'Outbound'
                }));
                if (isRoundTrip) {
                    toast.success('Outbound seat held! Now select Return trip.');
                }
            } else {
                set(state => ({
                    returnSelection: selection,
                    passengers: { ...state.passengers, ...newPassengers }
                    // If Inbound, stay here or maybe just done?
                }));
            }
        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);
            if (e instanceof AppError) {
                logError(e, { action: 'addSelection', tripId: selection.tripId });
            }
        } finally {
            set({ loading: false });
        }
    },

    confirmBooking: async (confirmations) => {
        if (confirmations.length === 0) return;

        set({ loading: true });
        try {
            const apiConfirmations = confirmations.map(h => ({
                hold_id: h.holdId,
                passenger_name: h.passengerName,
                passenger_relation: h.passengerRelation as 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'GUEST'
            }));

            await confirmBatch({ confirmations: apiConfirmations });
            await get().fetchData(false);

            toast.success('Booking confirmed!');
            get().resetBookingFlow();
        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);
            if (e instanceof AppError) {
                logError(e, { action: 'confirmBooking', count: confirmations.length });
            }
            throw e;
        } finally {
            set({ loading: false });
        }
    },

    cancelTicket: async (ticketId) => {
        set({ loading: true });
        try {
            await cancelTicket(ticketId);
            await get().fetchUserTickets();
            await get().fetchData(false); // Update quota/seats if necessary
            toast.success('Ticket cancelled successfully');
        } catch (e) {
            const msg = getErrorMessage(e);
            toast.error(msg);
            if (e instanceof AppError) {
                logError(e, { action: 'cancelTicket', ticketId });
            }
        } finally {
            set({ loading: false });
        }
    }
}));
