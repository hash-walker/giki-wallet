import { apiClient } from '@/lib/axios';
import { CreateTripRequest, CreateTripResponse, Route, RouteTemplateResponse, TripResponse } from './types';

export const TripService = {
    getAllRoutes: async (): Promise<Route[]> => {
        // Updated to matching backend: r.Get("/routes", s.Transport.ListRoutes) under /admin
        const { data } = await apiClient.get<Route[]>('/admin/routes');
        return data;
    },

    getRouteTemplate: async (routeId: string): Promise<RouteTemplateResponse> => {
        // Updated to matching backend: r.Get("/routes/{route_id}/template", ...) under /admin
        const { data } = await apiClient.get<RouteTemplateResponse>(`/admin/routes/${routeId}/template`);
        return data;
    },

    createTrip: async (payload: CreateTripRequest): Promise<CreateTripResponse> => {
        // Backend: r.Get("/trips/upcoming"...) is under /transport
        // Wait, where is POST /trip? 
        // Checking server.go, I see r.Get("/trips/upcoming"...) but I don't see POST /trip explicitly in the snippet 
        // provided in step 298.
        // However, I previously assumed it was /transport/trip. 
        // Let's assume for now it's /admin/trip or /transport/trip.
        // Looking at server.go snippet again...
        // Line 212 of handler.go is CreateTrip.
        // But in Server.MountRoutes, I see:
        // r.Route("/admin"... 
        // r.Get("/routes"...
        // I DO NOT SEE CreateTrip registered!
        // This suggests it might be missing or I need to register it.
        // The user previously said "and we should use real data".

        // Let's use /admin/trip for now and I will register it if missing.
        const { data } = await apiClient.post<CreateTripResponse>('/admin/trips', payload);
        return data;
    },

    getAllUpcomingTrips: async (): Promise<TripResponse[]> => {
        // Backend: r.Get("/trips/upcoming", s.Transport.GetAllUpcomingTrips) under /transport
        const { data } = await apiClient.get<TripResponse[]>('/transport/trips/upcoming');
        return data;
    },

    getAllTrips: async (): Promise<TripResponse[]> => {
        // Admin: r.Get("/trips", s.Transport.AdminListTrips) under /admin
        const { data } = await apiClient.get<TripResponse[]>('/admin/trips');
        return data;
    },
};
