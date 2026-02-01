
export interface Route {
    route_id: string; // UUID
    route_name: string;
}

export interface RouteTemplateResponse {
    route_id: string; // UUID
    route_name: string;
    rules: {
        open_hours_before: number;
        close_hours_before: number;
    };
    stops: StopItem[];
    quick_slots: QuickSlotItem[];
}

export interface StopItem {
    stop_id: string; // UUID
    name: string;
    sequence: number;
    is_active: boolean;
}

export interface QuickSlotItem {
    slot_id: string; // UUID
    day_of_week: string; // Monday, Tuesday, etc.
    departure_time: string; // "15:04:05" via types.LocalTime
}

export interface TripStopRequest {
    stop_id: string;
}

export interface CreateTripRequest {
    route_id: string;
    departure_time: string; // ISO String
    booking_open_offset_hours: number;
    booking_close_offset_hours: number;
    total_capacity: number;
    base_price: number;
    bus_type: string;
    direction: string;
    stops: TripStopRequest[];
}

export interface CreateTripResponse {
    trip_id: string;
}

export interface TripResponse {
    id: string; // Changed from trip_id to match backend
    route_name: string;
    departure_time: string; // ISO String
    status: string; // Changed from booking_status - OPEN, FULL, LOCKED, CLOSED, CANCELLED
    opens_at: string;
    available_seats: number;
    total_capacity: number;
    base_price: number; // Changed from price to match backend
    bus_type: string;
    direction: string;
    stops: TripStopItem[];
}

export interface TripStopItem {
    stop_id: string;
    stop_name: string;
    sequence: number;
}
