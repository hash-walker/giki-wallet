import { apiClient } from '@/lib/axios';

export type TransportRoute = {
    route_id: string;
    route_name: string;
};

export type RouteTemplate = {
    route_id: string;
    route_name: string;
    rules: {
        open_hours_before: number;
        close_hours_before: number;
    };
    stops: Array<{
        stop_id: string;
        name: string;
        sequence: number;
        is_active: boolean;
    }>;
    quick_slots: Array<{
        slot_id: string;
        day_of_week: string;
        departure_time: { time: string }; // backend types.LocalTime wrapper
    }>;
};

export type TripStop = {
    stop_id: string;
    stop_name: string;
    sequence: number;
};

export type Trip = {
    trip_id: string;
    departure_time: string;
    booking_status: 'OPEN' | 'LOCKED' | 'FULL' | 'CLOSED' | 'CANCELLED';
    opens_at: string;
    available_seats: number;
    price: number;
    stops: TripStop[];
};

export type HoldSeatsRequest = {
    trip_id: string;
    count: number;
    pickup_stop_id: string;
    dropoff_stop_id: string;
};

export type HoldSeatsResponse = {
    holds: Array<{
        hold_id: string;
        expires_at: string;
    }>;
};

export type ConfirmBatchRequest = {
    confirmations: Array<{
        hold_id: string;
        passenger_name: string;
        passenger_relation: 'SELF' | 'SPOUSE' | 'CHILD';
    }>;
};

export type ConfirmBatchResponse = {
    tickets: Array<{
        ticket_id: string;
        status: string;
    }>;
};

export async function listRoutes() {
    const res = await apiClient.get<TransportRoute[]>('/transport/routes');
    return res.data;
}

export async function getRouteTemplate(routeId: string) {
    const res = await apiClient.get<RouteTemplate>(`/transport/routes/${routeId}/template`);
    return res.data;
}

export async function getUpcomingTrips(routeId: string) {
    const res = await apiClient.get<Trip[]>(`/transport/routes/${routeId}/trips/upcoming`);
    return res.data;
}

export async function holdSeats(payload: HoldSeatsRequest) {
    const res = await apiClient.post<HoldSeatsResponse>('/transport/holds', payload);
    return res.data;
}

export async function confirmBatch(payload: ConfirmBatchRequest) {
    const res = await apiClient.post<ConfirmBatchResponse>('/transport/confirm', payload);
    return res.data;
}

export async function releaseHold(holdId: string) {
    await apiClient.delete(`/transport/holds/${holdId}`);
}

