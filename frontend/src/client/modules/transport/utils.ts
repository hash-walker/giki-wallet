import { Trip } from './api';

export function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function statusBadge(status: Trip['booking_status']) {
    switch (status) {
        case 'OPEN':
            return { label: 'Open', cls: 'bg-green-100 text-green-800' };
        case 'FULL':
            return { label: 'Full', cls: 'bg-red-100 text-red-800' };
        case 'LOCKED':
            return { label: 'Locked', cls: 'bg-yellow-100 text-yellow-800' };
        case 'CLOSED':
            return { label: 'Closed', cls: 'bg-gray-100 text-gray-700' };
        case 'CANCELLED':
            return { label: 'Cancelled', cls: 'bg-gray-100 text-gray-700' };
        default:
            return { label: status, cls: 'bg-gray-100 text-gray-700' };
    }
}

import { TripStop } from './api';

export function buildStopOptions(stops: TripStop[]) {
    return stops
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => ({ value: s.stop_id, label: s.stop_name }));
}

export function getStopById(stops: TripStop[], id: string | null) {
    if (!id) return null;
    return stops.find((s) => s.stop_id === id) || null;
}

export function filterDropoffOptions(stops: TripStop[], pickupId: string | null) {
    if (!pickupId) return buildStopOptions(stops);
    const pickup = stops.find((s) => s.stop_id === pickupId);
    if (!pickup) return buildStopOptions(stops);
    return stops
        .filter((s) => s.sequence > pickup.sequence)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => ({ value: s.stop_id, label: s.stop_name }));
}
