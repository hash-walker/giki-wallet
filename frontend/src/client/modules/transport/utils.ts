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
 * Returns true if the first stop is GIKI (Outbound)
 */
export function isFromGIKI(stops: TripStop[] | undefined): boolean {
    if (!stops || stops.length === 0) return false;
    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    return sorted[0].stop_name.toLowerCase().includes('giki');
}

/**
 * Returns true if the last stop is GIKI (Inbound)
 */
export function isToGIKI(stops: TripStop[] | undefined): boolean {
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
export function getUniqueCities(trips: Trip[], direction: 'from-giki' | 'to-giki'): UISelectOption[] {
    const citiesMap = new Map<string, string>(); // name -> id (we'll use name as ID if no dedicated ID)

    trips.forEach(trip => {
        // Determine trip direction
        const tripIsFromGIKI = isFromGIKI(trip.stops);
        if ((direction === 'from-giki' && !tripIsFromGIKI) || (direction === 'to-giki' && tripIsFromGIKI)) {
            return; // Skip trips not in requested direction
        }

        // Identify the "City" stop. 
        // If From GIKI, City is the last stop.
        // If To GIKI, City is the first stop.
        const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
        const cityStop = direction === 'from-giki' ? sortedStops[sortedStops.length - 1] : sortedStops[0];

        // We use stop_name as distinct city identifier for now, or we could group by route_name
        // Use stop_name for better granularity if multiple drops in same city, 
        // OR better: use route_name if it represents the city (e.g. "Islamabad Route")
        // frequent route names: "Daily Islamabad", "Weekend Lahore"
        // Let's try to extract City from Route Name or fallback to Stop Name

        let cityName = cityStop.stop_name;
        // Simple heuristic: If route name contains the stop name, use route name? 
        // Actually, just using the terminal stop name is safest for "Where do you want to go?"

        citiesMap.set(cityStop.stop_name, cityStop.stop_name);
    });

    return Array.from(citiesMap.values()).map(name => ({ value: name, label: name }));
}

/**
 * Get available time slots for a specific "City" (terminal stop name).
 */
export function getAvailableTimesForCity(trips: Trip[], cityName: string, direction: 'from-giki' | 'to-giki'): UISelectOption[] {
    const relevantTrips = trips.filter(trip => {
        const tripIsFromGIKI = isFromGIKI(trip.stops);
        if ((direction === 'from-giki' && !tripIsFromGIKI) || (direction === 'to-giki' && tripIsFromGIKI)) return false;

        const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
        const cityStop = direction === 'from-giki' ? sortedStops[sortedStops.length - 1] : sortedStops[0];
        return cityStop.stop_name === cityName;
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

    // Filter relevant stops based on direction
    // If From GIKI: Pickup is fixed (GIKI), user selects Dropoff.
    // So we return formatted dropoff options (all stops AFTER GIKI).
    // If To GIKI: Dropoff is fixed (GIKI), user selects Pickup.
    // So we return formatted pickup options (all stops BEFORE GIKI).

    const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
    const gikiIndex = sortedStops.findIndex(s => s.stop_name.toLowerCase().includes('giki'));

    if (gikiIndex === -1) return []; // Should not happen for valid trips

    let validStops: TripStop[] = [];
    if (direction === 'from-giki') {
        // Show stops AFTER GIKI
        validStops = sortedStops.slice(gikiIndex + 1);
    } else {
        // Show stops BEFORE GIKI
        validStops = sortedStops.slice(0, gikiIndex);
    }

    return validStops.map(s => ({ value: s.stop_id, label: s.stop_name }));
}

export function getTripById(trips: Trip[], id: string) {
    return trips.find(t => t.trip_id === id);
}
