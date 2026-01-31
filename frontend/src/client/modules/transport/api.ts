import { apiClient } from '@/lib/axios';
import type {
    Trip,
    HoldSeatsRequest,
    HoldSeatsResponse,
    ConfirmBatchRequest,
    ConfirmBatchResponse,
    QuotaResponse,
    ActiveHold,
    MyTicket
} from './validators';


/**
 * Get weekly summary of all trips
 */
export async function getWeeklySummary() {
    const res = await apiClient.get<Trip[]>('/transport/weekly-summary');
    return res.data;
}

/**
 * Get current user's quota
 */
export async function getQuota() {
    const res = await apiClient.get<QuotaResponse>('/transport/quota');
    return res.data;
}

/**
 * Get user's active holds
 */
export async function getActiveHolds() {
    const res = await apiClient.get<ActiveHold[]>('/transport/holds/active');
    return res.data;
}

/**
 * Release all active holds for current user
 */
export async function releaseAllActiveHolds() {
    await apiClient.delete('/transport/holds/active');
}

/**
 * Hold seats for a trip
 */
export async function holdSeats(payload: HoldSeatsRequest) {
    const res = await apiClient.post<HoldSeatsResponse>('/transport/holds', payload);
    return res.data;
}

/**
 * Confirm batch of holds with passenger details
 */
export async function confirmBatch(payload: ConfirmBatchRequest) {
    const res = await apiClient.post<ConfirmBatchResponse>('/transport/confirm', payload);
    return res.data;
}

/**
 * Get user's tickets
 */
export async function getUserTickets() {
    const res = await apiClient.get<MyTicket[]>('/transport/tickets');
    return res.data;
}

/**
 * Cancel a ticket
 */
export async function cancelTicket(ticketId: string) {
    const res = await apiClient.delete(`/transport/tickets/${ticketId}`);
    return res.data;
}


