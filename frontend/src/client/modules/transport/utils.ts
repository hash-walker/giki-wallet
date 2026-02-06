import type { Trip, TripStop } from './validators';

// ============================================================================
// DATE/TIME FORMATTING
// ============================================================================

export function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-PK', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', {
        timeZone: 'Asia/Karachi',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

export function statusBadge(status: string) {
    switch (status) {
        case 'OPEN':
            return { label: 'Open', cls: 'bg-green-100 text-green-800' };
        case 'FULL':
            return { label: 'Full', cls: 'bg-red-100 text-red-800' };
        case 'SCHEDULED':
            return { label: 'Scheduled', cls: 'bg-blue-100 text-blue-800' };
        case 'CLOSED':
            return { label: 'Closed', cls: 'bg-gray-100 text-gray-700' };
        case 'CANCELLED':
            return { label: 'Cancelled', cls: 'bg-gray-100 text-gray-700' };
        default:
            return { label: status, cls: 'bg-gray-100 text-gray-700' };
    }
}

// ============================================================================
// STOP HELPERS
// ============================================================================

/**
 * Get GIKI stop from trip stops
 */
export function getGIKIStopObject(stops: TripStop[]): TripStop | null {
    return stops.find(s => s.stop_name.toUpperCase().includes('GIKI')) || null;
}

/**
 * Build stop options sorted by sequence
 */
export function buildStopOptions(stops: TripStop[]) {
    return stops
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => ({ value: s.stop_id, label: s.stop_name }));
}

/**
 * Get stop by ID
 */
export function getStopById(stops: TripStop[], id: string | null) {
    if (!id) return null;
    return stops.find((s) => s.stop_id === id) || null;
}

/**
 * Filter dropoff options to only show stops after pickup
 */
export function filterDropoffOptions(stops: TripStop[], pickupId: string | null) {
    if (!pickupId) return buildStopOptions(stops);
    const pickup = stops.find((s) => s.stop_id === pickupId);
    if (!pickup) return buildStopOptions(stops);
    return stops
        .filter((s) => s.sequence > pickup.sequence)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => ({ value: s.stop_id, label: s.stop_name }));
}

/**
 * Filter pickup options to only show stops before dropoff
 */
export function filterPickupOptions(stops: TripStop[], dropoffId: string | null) {
    if (!dropoffId) return buildStopOptions(stops);
    const dropoff = stops.find((s) => s.stop_id === dropoffId);
    if (!dropoff) return buildStopOptions(stops);
    return stops
        .filter((s) => s.sequence < dropoff.sequence)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => ({ value: s.stop_id, label: s.stop_name }));
}

// ============================================================================
// DIRECTION HELPERS
// ============================================================================

/**
 * Check if trip is from GIKI (outbound) using backend direction field
 */
export function isFromGIKI(trip: Trip | undefined): boolean {
    if (!trip) return false;
    return trip.direction.toUpperCase() === 'OUTBOUND';
}

/**
 * Check if trip is to GIKI (inbound) using backend direction field
 */
export function isToGIKI(trip: Trip | undefined): boolean {
    if (!trip) return false;
    return trip.direction.toUpperCase() === 'INBOUND';
}

// ============================================================================
// BOOKING SELECTION HELPERS
// ============================================================================

/**
 * Create booking selection for OUTBOUND trips (FROM GIKI)
 * - Pickup is automatically set to GIKI
 * - User selects dropoff stop
 */
export function createOutboundSelection(
    tripId: string,
    dropoffStopId: string,
    stops: TripStop[],
    ticketCount: number
): { tripId: string; pickupId: string; dropoffId: string; ticketCount: number } | null {
    const gikiStop = getGIKIStopObject(stops);
    if (!gikiStop) {
        console.error('Could not determine GIKI/origin stop for outbound trip');
        return null;
    }

    return {
        tripId,
        pickupId: gikiStop.stop_id,
        dropoffId: dropoffStopId,
        ticketCount,
    };
}

/**
 * Create booking selection for INBOUND trips (TO GIKI)
 * - User selects pickup stop
 * - Dropoff is automatically set to GIKI
 */
export function createInboundSelection(
    tripId: string,
    pickupStopId: string,
    stops: TripStop[],
    ticketCount: number
): { tripId: string; pickupId: string; dropoffId: string; ticketCount: number } | null {
    const gikiStop = getGIKIStopObject(stops);
    if (!gikiStop) {
        console.error('Could not determine GIKI/destination stop for inbound trip');
        return null;
    }

    return {
        tripId,
        pickupId: pickupStopId,
        dropoffId: gikiStop.stop_id,
        ticketCount,
    };
}
