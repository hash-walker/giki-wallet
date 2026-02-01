import { create } from 'zustand';
import { Route, RouteTemplateResponse, TripResponse } from './types';
import { TripService } from './service';
import { toast } from 'sonner';

interface TripCreateState {
    // Data
    routes: Route[];
    template: RouteTemplateResponse | null;
    trips: TripResponse[];
    deletedTrips: TripResponse[];
    deletedTripsPagination: {
        page: number;
        pageSize: number;
        totalCount: number;
    };

    // UI State
    isLoadingRoutes: boolean;
    isLoadingTemplate: boolean;
    isLoadingTrips: boolean;
    isLoadingDeletedTrips: boolean;
    isSubmitting: boolean;
    isDeletingTrip: boolean;

    // Actions
    fetchRoutes: () => Promise<void>;
    fetchTrips: (startDate?: Date, endDate?: Date) => Promise<void>;
    fetchDeletedTripsHistory: (page?: number) => Promise<void>;
    selectRoute: (routeId: string) => Promise<void>;
    resetTemplate: () => void;
    createTrip: (payload: any) => Promise<boolean>;
    deleteTrip: (tripId: string) => Promise<boolean>;
}

export const useTripCreateStore = create<TripCreateState>((set, get) => ({
    routes: [],
    template: null,
    trips: [],
    deletedTrips: [],
    deletedTripsPagination: {
        page: 1,
        pageSize: 20,
        totalCount: 0,
    },

    isLoadingRoutes: false,
    isLoadingTemplate: false,
    isLoadingTrips: false,
    isLoadingDeletedTrips: false,
    isSubmitting: false,
    isDeletingTrip: false,

    fetchRoutes: async () => {
        set({ isLoadingRoutes: true });
        try {
            const routes = await TripService.getAllRoutes();
            set({ routes });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load routes');
        } finally {
            set({ isLoadingRoutes: false });
        }
    },

    fetchTrips: async (startDate?: Date, endDate?: Date) => {
        set({ isLoadingTrips: true });
        try {
            const trips = await TripService.getAllTrips(startDate, endDate);
            set({ trips });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load trips');
        } finally {
            set({ isLoadingTrips: false });
        }
    },

    fetchDeletedTripsHistory: async (page = 1) => {
        set({ isLoadingDeletedTrips: true });
        try {
            const response = await TripService.getDeletedTripsHistory(page);
            set({
                deletedTrips: response.data,
                deletedTripsPagination: {
                    page: response.page,
                    pageSize: response.page_size,
                    totalCount: response.total_count,
                }
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load deleted trips history');
        } finally {
            set({ isLoadingDeletedTrips: false });
        }
    },

    selectRoute: async (routeId: string) => {
        set({ isLoadingTemplate: true, template: null });
        try {
            const template = await TripService.getRouteTemplate(routeId);
            set({ template });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load route template');
        } finally {
            set({ isLoadingTemplate: false });
        }
    },

    resetTemplate: () => {
        set({ template: null });
    },

    createTrip: async (payload) => {
        set({ isSubmitting: true });
        try {
            await TripService.createTrip(payload);
            toast.success("Trip created successfully!");
            get().fetchTrips(); // Refresh list after creation
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Failed to create trip");
            return false;
        } finally {
            set({ isSubmitting: false });
        }
    },

    deleteTrip: async (tripId: string) => {
        set({ isDeletingTrip: true });
        try {
            await TripService.deleteTrip(tripId);
            toast.success("Trip deleted successfully!");
            get().fetchTrips(); // Refresh list after deletion
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete trip");
            return false;
        } finally {
            set({ isDeletingTrip: false });
        }
    }
}));
