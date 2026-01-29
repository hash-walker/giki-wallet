import { create } from 'zustand';
import { Route, RouteTemplateResponse, TripResponse } from './types';
import { TripService } from './service';
import { toast } from 'sonner';

interface TripCreateState {
    // Data
    routes: Route[];
    template: RouteTemplateResponse | null;
    trips: TripResponse[];

    // UI State
    isLoadingRoutes: boolean;
    isLoadingTemplate: boolean;
    isLoadingTrips: boolean;
    isSubmitting: boolean;

    // Actions
    fetchRoutes: () => Promise<void>;
    fetchTrips: () => Promise<void>;
    selectRoute: (routeId: string) => Promise<void>;
    resetTemplate: () => void;
    createTrip: (payload: any) => Promise<boolean>;
}

export const useTripCreateStore = create<TripCreateState>((set, get) => ({
    routes: [],
    template: null,
    trips: [],

    isLoadingRoutes: false,
    isLoadingTemplate: false,
    isLoadingTrips: false,
    isSubmitting: false,

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

    fetchTrips: async () => {
        set({ isLoadingTrips: true });
        try {
            const trips = await TripService.getAllTrips();
            set({ trips });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load trips');
        } finally {
            set({ isLoadingTrips: false });
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
    }
}));
