import { z } from 'zod';

export const TicketSchema = z.object({
    id: z.string(),
    ticket_number: z.string(),
    route_name: z.string(),
    direction: z.string(),
    from_location: z.string(),
    to_location: z.string(),
    pickup_location: z.string(),
    dropoff_location: z.string(),
    date: z.string(),
    time: z.string(),
    status: z.string(), // 'CONFIRMED', 'CANCELLED'
    bus_type: z.string(),
    passenger_name: z.string(),
    passenger_relation: z.string(),
    is_self: z.boolean(),
    price: z.number(),
    can_cancel: z.boolean(),
});

export type Ticket = z.infer<typeof TicketSchema>;

// Booking Types
export type RouteDirection = 'from-giki' | 'to-giki';
export type BusType = 'Student' | 'Employee';
export type RouteStatus = 'available' | 'full';

export interface City {
    id: string;
    name: string;
}

export interface TimeSlot {
    id: string;
    time: string;
    date: string;
}

export interface Stop {
    id: string;
    name: string;
}

export interface Schedule {
    id: number;
    cityId: string;
    timeSlotId: string;
    stopId: string;
    bus_type: BusType;
    tickets: number;
    status: RouteStatus;
    is_held: boolean;
}

export interface BookingData {
    cities: City[];
    timeSlots: TimeSlot[];
    stops: Stop[];
    schedules: Schedule[];
}

export interface BookingSelection {
    cityId: string | null;
    timeSlotId: string | null;
    stopId: string | null;
    ticketCount: number;
}
