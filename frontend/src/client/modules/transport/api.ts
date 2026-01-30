import { apiClient } from '@/lib/axios';
import {
    type TransportRoute,
    type RouteTemplate,
    type Trip,
    type TripStop,
    type WeeklyTrip,
    type APIResponse,
    type HoldSeatsRequest,
    type HoldSeatsResponse,
    type ConfirmBatchRequest,
    type ConfirmBatchResponse,
    type QuotaResponse,
    type ActiveHold
} from './validators';

export type {
    TransportRoute,
    RouteTemplate,
    Trip,
    TripStop,
    WeeklyTrip,
    HoldSeatsRequest,
    HoldSeatsResponse,
    ConfirmBatchRequest,
    ConfirmBatchResponse,
    QuotaResponse,
    ActiveHold
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

export async function getQuota() {
    const res = await apiClient.get<QuotaResponse>('/transport/quota');
    return res.data;
}

export async function getActiveHolds() {
    const res = await apiClient.get<ActiveHold[]>('/transport/holds/active');
    return res.data;
}

export async function releaseAllActiveHolds() {
    await apiClient.delete('/transport/holds/active');
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


export async function getWeeklySummary() {
    const res = await apiClient.get<APIResponse<WeeklyTrip[]>>('/transport/weekly-summary');
    return res.data.data;
}

export async function getAllUpcomingTrips() {
    const res = await apiClient.get<Trip[]>('/transport/trips/upcoming');
    return res.data;
}

