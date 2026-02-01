import { apiClient } from '@/lib/axios';
import { CreateTripRequest, CreateTripResponse, Route, RouteTemplateResponse, TripResponse, TripHistoryPaginationResponse } from './types';

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
        const { data } = await apiClient.post<CreateTripResponse>('/admin/trips', payload);
        return data;
    },

    deleteTrip: async (tripId: string): Promise<void> => {
        await apiClient.delete(`/admin/trips/${tripId}`);
    },

    getAllUpcomingTrips: async (): Promise<TripResponse[]> => {
        // Backend: r.Get("/trips/upcoming", s.Transport.GetAllUpcomingTrips) under /transport
        const { data } = await apiClient.get<TripResponse[]>('/transport/trips/upcoming');
        return data;
    },

    getAllTrips: async (startDate?: Date, endDate?: Date): Promise<TripResponse[]> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());

        const { data } = await apiClient.get<TripResponse[]>('/admin/trips', { params });
        return data;
    },

    getDeletedTripsHistory: async (page: number = 1, pageSize: number = 100): Promise<TripHistoryPaginationResponse> => {
        const { data } = await apiClient.get<TripHistoryPaginationResponse>('/admin/trips/history', {
            params: { page, page_size: pageSize }
        });
        return data;
    },

    exportTrips: async (startDate?: Date, endDate?: Date, routeIds?: string[]): Promise<Blob> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());
        if (routeIds && routeIds.length > 0) params.append('route_ids', routeIds.join(','));

        const { data } = await apiClient.get('/admin/transport/trips/export', {
            params,
            responseType: 'blob',
        });
        return data;
    },
};
