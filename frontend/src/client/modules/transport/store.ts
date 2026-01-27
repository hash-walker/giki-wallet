import { create } from 'zustand';
import {
    getAllUpcomingTrips,
    getQuota,
    getActiveHolds,
    releaseAllActiveHolds,
    holdSeats,
    confirmBatch,
    type Trip,
    type QuotaResponse,
    type ActiveHold,
    type HoldSeatsRequest,
    type ConfirmBatchRequest
} from './api';
import { toast } from 'sonner';

interface TransportState {
    allTrips: Trip[];
    quota: QuotaResponse | null;
    activeHolds: ActiveHold[];
    loading: boolean;
    initialized: boolean;
    error: string | null;

    fetchData: (showLoading?: boolean) => Promise<void>;
    releaseAllHolds: () => Promise<void>;
    reserveSeats: (payload: HoldSeatsRequest) => Promise<any>;
    confirmBooking: (payload: ConfirmBatchRequest) => Promise<any>;
    setAllTrips: (trips: Trip[]) => void;
    setQuota: (quota: QuotaResponse) => void;
    setActiveHolds: (holds: ActiveHold[]) => void;
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

    setAllTrips: (trips) => set({ allTrips: trips }),
    setQuota: (quota) => set({ quota }),
    setActiveHolds: (holds) => set({ activeHolds: holds }),

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
            toast.success('Reservations released');
        } catch (e) {
            toast.error(getApiErrorMessage(e));
        } finally {
            set({ loading: false });
        }
    },

    reserveSeats: async (payload) => {
        set({ loading: true });
        try {
            const resp = await holdSeats(payload);
            await get().fetchData(false);
            return resp;
        } catch (e) {
            const msg = getApiErrorMessage(e);
            toast.error(msg);
            throw e;
        } finally {
            set({ loading: false });
        }
    },

    confirmBooking: async (payload) => {
        set({ loading: true });
        try {
            const resp = await confirmBatch(payload);
            await get().fetchData(false);
            toast.success('Booking confirmed!');
            return resp;
        } catch (e) {
            const msg = getApiErrorMessage(e);
            toast.error(msg);
            throw e;
        } finally {
            set({ loading: false });
        }
    }
}));
