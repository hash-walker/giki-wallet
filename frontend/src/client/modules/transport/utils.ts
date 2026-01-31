import { Trip, TripStop } from './api';

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

export function filterPickupOptions(stops: TripStop[], dropoffId: string | null) {
    if (!dropoffId) return buildStopOptions(stops);
    const dropoff = stops.find((s) => s.stop_id === dropoffId);
    if (!dropoff) return buildStopOptions(stops);
    return stops
        .filter((s) => s.sequence < dropoff.sequence)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => ({ value: s.stop_id, label: s.stop_name }));
}

/**
 * Returns true if the trip is from GIKI (Outbound)
 */
export function isFromGIKI(trip: Trip | undefined): boolean {
    if (!trip) return false;
    if (trip.direction === 'OUTBOUND') return true;
    if (trip.direction === 'INBOUND') return false;

    // Fallback to stop name search
    const stops = trip.stops;
    if (!stops || stops.length === 0) return false;
    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    return sorted[0].stop_name.toLowerCase().includes('giki');
}

/**
 * Returns true if the trip is to GIKI (Inbound)
 */
export function isToGIKI(trip: Trip | undefined): boolean {
    if (!trip) return false;
    if (trip.direction === 'INBOUND') return true;
    if (trip.direction === 'OUTBOUND') return false;

    // Fallback to stop name search
    const stops = trip.stops;
    if (!stops || stops.length === 0) return false;
    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    return sorted[sorted.length - 1].stop_name.toLowerCase().includes('giki');
}

/**
 * Returns the stop ID for GIKI if found
 */
export function getGikiStop(stops: TripStop[] | undefined): string | null {
    if (!stops) return null;
    const giki = stops.find(s => s.stop_name.toLowerCase().includes('giki'));
    return giki ? giki.stop_id : null;
}

// ==========================================
// NEW UI HELPERS (for BookingCard Integration)
// ==========================================

export interface UISelectOption {
    value: string;
    label: string;
}

/**
 * Extracts unique target cities (Not GIKI) from trips.
 * For 'from-giki', target is the last stop (or any stop after GIKI).
 * For 'to-giki', target is the first stop (or any stop before GIKI).
 * Simplification: We'll assume the major city is the "Location" field in UI.
 * Since current UI assumes "City" selection first, we need to associate Trips with "Cities".
 * We can infer City from the Non-GIKI end of the route.
 */
export function getUniqueRoutes(trips: Trip[], direction: 'from-giki' | 'to-giki'): UISelectOption[] {
    const routesSet = new Set<string>();

    trips.forEach(trip => {
        const tripIsFromGIKI = isFromGIKI(trip);
        if ((direction === 'from-giki' && !tripIsFromGIKI) || (direction === 'to-giki' && tripIsFromGIKI)) {
            return;
        }

        if (trip.booking_status === 'CLOSED' || trip.booking_status === 'CANCELLED') {
            return;
        }

        routesSet.add(trip.route_name);
    });

    return Array.from(routesSet).sort().map(name => ({ value: name, label: name }));
}

/**
 * Get available time slots for a specific Route Name.
 */
export function getAvailableTimesForRoute(trips: Trip[], routeName: string, direction: 'from-giki' | 'to-giki'): UISelectOption[] {
    const relevantTrips = trips.filter(trip => {
        const tripIsFromGIKI = isFromGIKI(trip);
        if ((direction === 'from-giki' && !tripIsFromGIKI) || (direction === 'to-giki' && tripIsFromGIKI)) return false;

        // Filter out Closed or Cancelled trips for booking
        if (trip.booking_status === 'CLOSED' || trip.booking_status === 'CANCELLED') {
            return false;
        }

        return trip.route_name === routeName;
    });

    // Extract unique times
    const timesMap = new Map<string, string>(); // trip_id -> time label

    // We map Trip ID as the value, because selecting a time implies selecting a specific Trip (usually)
    // BUT what if multiple buses leave at same time? 
    // The UI `BookingCard` assumes time slots are distinct IDs. 
    // Let's use TripID as the value for the Time Slot selection.

    return relevantTrips.map(trip => {
        const date = new Date(trip.departure_time);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        return {
            value: trip.trip_id,
            label: `${dateStr} - ${timeStr}`
        };
    });
}

/**
 * Get available stops for a specific Trip (Time Slot).
 */
export function getStopsForTrip(trips: Trip[], tripId: string, direction: 'from-giki' | 'to-giki'): UISelectOption[] {
    const trip = trips.find(t => t.trip_id === tripId);
    if (!trip) return [];

    const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);

    // Find GIKI stop index
    let gikiIndex = sortedStops.findIndex(s => s.stop_name.toLowerCase().includes('giki'));

    // Fallback: If no GIKI in name, use direction metadata
    if (gikiIndex === -1) {
        if (trip.direction === 'OUTBOUND' || direction === 'from-giki') gikiIndex = 0;
        else if (trip.direction === 'INBOUND' || direction === 'to-giki') gikiIndex = sortedStops.length - 1;
    }

    if (gikiIndex === -1) return [];

    let validStops: TripStop[] = [];
    if (direction === 'from-giki') {
        // Show stops AFTER GIKI
        validStops = sortedStops.slice(gikiIndex + 1);
    } else {
        // Show stops BEFORE GIKI
        validStops = sortedStops.slice(0, gikiIndex);
    }

    // Sort valid stops based on distance from GIKI (optional, but keep default sequence)
    return validStops.map(s => ({ value: s.stop_id, label: s.stop_name }));
}

export function getTripById(trips: Trip[], id: string) {
    return trips.find(t => t.trip_id === id);
}

// ==========================================
// BOOKING SELECTION HELPERS (with GIKI defaults)
// ==========================================

/**
 * Get GIKI stop from trip stops
 * @returns The TripStop object for GIKI, or null if not found
 */
export function getGIKIStopObject(stops: TripStop[]): TripStop | null {
    return stops.find(s => s.stop_name.toUpperCase().includes('GIKI')) || null;
}

/**
 * Create booking selection for INBOUND trips (TO GIKI)
 * - User selects pickup stop
 * - Dropoff is automatically set to GIKI
 * 
 * @param tripId - The trip UUID
 * @param pickupStopId - User-selected pickup stop
 * @param stops - All stops for this trip
 * @param ticketCount - Number of tickets (1-3)
 * @returns BookingSelection or null if GIKI stop not found
 */
export function createInboundSelection(
    tripId: string,
    pickupStopId: string,
    stops: TripStop[],
    ticketCount: number
): { tripId: string; pickupId: string; dropoffId: string; ticketCount: number; isFull: boolean } | null {
    const gikiStop = getGIKIStopObject(stops);
    if (!gikiStop) {
        console.error('GIKI stop not found in trip stops');
        return null;
    }

    return {
        tripId,
        pickupId: pickupStopId,
        dropoffId: gikiStop.stop_id,
        ticketCount,
        isFull: false
    };
}

/**
 * Create booking selection for OUTBOUND trips (FROM GIKI)
 * - Pickup is automatically set to GIKI
 * - User selects dropoff stop
 * 
 * @param tripId - The trip UUID
 * @param dropoffStopId - User-selected dropoff stop
 * @param stops - All stops for this trip
 * @param ticketCount - Number of tickets (1-3)
 * @returns BookingSelection or null if GIKI stop not found
 */
export function createOutboundSelection(
    tripId: string,
    dropoffStopId: string,
    stops: TripStop[],
    ticketCount: number
): { tripId: string; pickupId: string; dropoffId: string; ticketCount: number; isFull: boolean } | null {
    const gikiStop = getGIKIStopObject(stops);
    if (!gikiStop) {
        console.error('GIKI stop not found in trip stops');
        return null;
    }

    return {
        tripId,
        pickupId: gikiStop.stop_id,
        dropoffId: dropoffStopId,
        ticketCount,
        isFull: false
    };
}

/**
 * Validate that an inbound selection has GIKI as dropoff
 */
export function validateInboundSelection(
    selection: { pickupId: string; dropoffId: string },
    gikiStopId: string
): boolean {
    return selection.dropoffId === gikiStopId;
}

/**
 * Validate that an outbound selection has GIKI as pickup
 */
export function validateOutboundSelection(
    selection: { pickupId: string; dropoffId: string },
    gikiStopId: string
): boolean {
    return selection.pickupId === gikiStopId;
}

